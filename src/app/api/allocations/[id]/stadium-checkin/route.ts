import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = parseInt(id, 10);

    const assignment = await prisma.jobEquipmentAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const now = new Date();

    const [updatedAssignment, updatedUser] = await prisma.$transaction([
      prisma.jobEquipmentAssignment.update({
        where: { id: assignmentId },
        data: {
          stadium_check_in_time: now,
        },
      }),
      prisma.user.update({
        where: { id: assignment.transport_by_user_id },
        data: {
          operational_status: 'WORKING',
        },
      }),
    ]);

    // Tạo thông báo gửi cho Admin
    try {
      const user = await prisma.user.findUnique({ where: { id: assignment.transport_by_user_id }, select: { name: true } });
      const job = await prisma.job.findUnique({ where: { id: assignment.job_id }, select: { title: true, location: { select: { name: true } } } });
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      await (prisma as any).notification.create({
        data: {
          type: 'STADIUM_CHECK_IN',
          title: `📍 ${user?.name || 'Nhân viên'} đã có mặt tại sân`,
          message: `${user?.name || 'Nhân viên'} đã check-in có mặt tại sân "${job?.location?.name || 'Sân bóng'}" lúc ${timeStr} để chuẩn bị tác nghiệp ca "${job?.title || ''}".`,
          user_id: assignment.transport_by_user_id,
          job_id: assignment.job_id,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create stadium checkin notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      user: updatedUser,
      message: 'Đã check-in có mặt tại sân bóng!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
