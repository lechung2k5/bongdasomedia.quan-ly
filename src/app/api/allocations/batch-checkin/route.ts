import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assignment_ids = [], photo_url = null, notes = null } = body;
    const currentUser = await getCurrentUser();

    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một thiết bị để check-in' },
        { status: 400 }
      );
    }

    const numericIds = assignment_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));

    const assignments = await prisma.jobEquipmentAssignment.findMany({
      where: { id: { in: numericIds } },
      include: { equipment: true },
    });

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin phân công' }, { status: 404 });
    }

    const now = new Date();
    const equipIds = assignments.map((a) => a.equipment_id);
    const carrierUserId = assignments[0]?.transport_by_user_id || currentUser?.id;

    // Transaction: Batch update all assignments, equipments, and carrier user status
    await prisma.$transaction([
      // 1. Update all assignments to CONFIRMED
      prisma.jobEquipmentAssignment.updateMany({
        where: { id: { in: numericIds } },
        data: {
          check_in_status: 'CONFIRMED',
          check_in_time: now,
          check_in_photo_url: photo_url || undefined,
          handover_notes: notes || undefined,
        },
      }),

      // 2. Update all equipments to IN_USE and set current holder
      prisma.equipment.updateMany({
        where: { id: { in: equipIds } },
        data: {
          status: 'IN_USE',
          current_holder_id: carrierUserId,
        },
      }),

      // 3. Update carrier operational status to MOVING
      ...(carrierUserId
        ? [
            prisma.user.update({
              where: { id: carrierUserId },
              data: { operational_status: 'MOVING' },
            }),
          ]
        : []),
    ]);

    // Tạo thông báo tự động gửi cho Admin
    try {
      const carrierUser = await prisma.user.findUnique({
        where: { id: carrierUserId },
        select: { name: true },
      });
      const firstJobId = assignments[0]?.job_id;
      const jobInfo = firstJobId
        ? await prisma.job.findUnique({
            where: { id: firstJobId },
            select: { title: true, location: { select: { name: true } } },
          })
        : null;

      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      await (prisma as any).notification.create({
        data: {
          type: 'CHECK_IN',
          title: `📦 ${carrierUser?.name || 'Nhân viên'} đã Check-in lấy đồ`,
          message: `${carrierUser?.name || 'Nhân viên'} đã lấy ${numericIds.length} thiết bị lên xe lúc ${timeStr}${jobInfo ? ` cho ca "${jobInfo.title}" (${jobInfo.location?.name || ''})` : ''}.${notes ? ` Ghi chú: ${notes}` : ''}`,
          user_id: carrierUserId,
          job_id: firstJobId,
          photo_url: photo_url || null,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create notification on batch-checkin:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Đã check-in thành công ${numericIds.length} thiết bị`,
      count: numericIds.length,
      check_in_time: now,
    });
  } catch (error: any) {
    console.error('Batch Check-In Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi check-in thiết bị' }, { status: 500 });
  }
}
