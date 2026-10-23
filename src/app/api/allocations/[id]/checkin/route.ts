import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = parseInt(id, 10);

    let photo_url: string | null = null;
    let notes: string | null = null;
    let return_location_type: string = 'WAREHOUSE';
    let return_location_name: string | null = null;
    let assignment_ids: number[] = [assignmentId];

    try {
      const body = await request.json();
      photo_url = body.photo_url || null;
      notes = body.notes || null;
      if (body.return_location_type) return_location_type = body.return_location_type;
      if (body.return_location_name) return_location_name = body.return_location_name;
      if (Array.isArray(body.assignment_ids) && body.assignment_ids.length > 0) {
        assignment_ids = body.assignment_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
      }
    } catch {
      // Body may be empty
    }

    const assignments = await prisma.jobEquipmentAssignment.findMany({
      where: { id: { in: assignment_ids } },
      include: {
        equipment: true,
        transportByUser: true,
        job: { include: { location: true } },
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'Assignments not found' }, { status: 404 });
    }

    const primaryAssignment = assignments[0];
    const now = new Date();

    // Determine human-readable location label
    let finalLocationLabel = 'Kho văn phòng';
    if (return_location_type === 'STADIUM') {
      finalLocationLabel = return_location_name || (primaryAssignment.job?.location?.name ? `Để lại tại sân: ${primaryAssignment.job.location.name}` : 'Để lại tại sân bóng');
    } else if (return_location_type === 'KEEP') {
      finalLocationLabel = return_location_name || `Nhân viên giữ (${primaryAssignment.transportByUser?.name || 'Nhân viên'})`;
    } else if (return_location_type === 'OTHER') {
      finalLocationLabel = return_location_name || 'Nơi khác';
    } else {
      finalLocationLabel = return_location_name || 'Kho văn phòng';
    }

    const equipIds = assignments.map((a) => a.equipment_id);
    const carrierUserId = primaryAssignment.transport_by_user_id;

    // Transaction to update assignments, equipments, and carrier user status
    await prisma.$transaction([
      prisma.jobEquipmentAssignment.updateMany({
        where: { id: { in: assignment_ids } },
        data: {
          check_out_status: 'CONFIRMED',
          check_out_time: now,
          check_out_photo_url: photo_url || undefined,
          check_out_notes: notes || undefined,
          return_location_type: return_location_type,
          return_location_name: finalLocationLabel,
        },
      }),
      prisma.equipment.updateMany({
        where: { id: { in: equipIds } },
        data: {
          status: return_location_type === 'KEEP' ? 'IN_USE' : 'AVAILABLE',
          current_holder_id: return_location_type === 'KEEP' ? carrierUserId : null,
          current_location: finalLocationLabel,
        },
      }),
      ...(carrierUserId && return_location_type !== 'KEEP'
        ? [
            prisma.user.update({
              where: { id: carrierUserId },
              data: {
                operational_status: 'IDLE',
              },
            }),
          ]
        : []),
    ]);

    // Tạo thông báo gửi cho Admin
    try {
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const staffName = primaryAssignment.transportByUser?.name || 'Nhân viên';
      const countStr = assignments.length > 1 ? `${assignments.length} thiết bị` : `thiết bị "${primaryAssignment.equipment?.name}"`;

      await (prisma as any).notification.create({
        data: {
          type: 'CHECK_OUT',
          title: `✅ ${staffName} đã bàn giao đồ (${finalLocationLabel})`,
          message: `${staffName} đã hoàn thành bàn giao & kiểm kê ${countStr} lúc ${timeStr}. Vị trí hiện tại: ${finalLocationLabel}.${notes ? ` Ghi chú: "${notes}"` : ''}`,
          user_id: carrierUserId,
          job_id: primaryAssignment.job_id,
          photo_url: photo_url || null,
          metadata: JSON.stringify({
            return_location_type,
            return_location_name: finalLocationLabel,
            count: assignments.length,
            notes,
          }),
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create return notification:', notifErr);
    }

    // Broadcast real-time update
    broadcastRealtimeEvent({ type: 'EQUIPMENT_CHECKED_OUT', payload: { count: assignments.length, location: finalLocationLabel } });

    return NextResponse.json({
      success: true,
      message: `Đã bàn giao thành công ${assignments.length} thiết bị tại ${finalLocationLabel}`,
      location: finalLocationLabel,
      count: assignments.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
