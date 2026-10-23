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

    try {
      const body = await request.json();
      photo_url = body.photo_url || null;
      notes = body.notes || null;
    } catch {
      // Body may be empty
    }

    const assignment = await prisma.jobEquipmentAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        equipment: true,
        transportByUser: true,
        job: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const now = new Date();

    // Transaction to update assignment check_in_status and equipment status to IN_USE
    const [updatedAssignment, updatedEquipment] = await prisma.$transaction([
      prisma.jobEquipmentAssignment.update({
        where: { id: assignmentId },
        data: {
          check_in_status: 'CONFIRMED',
          check_in_time: now,
          check_in_photo_url: photo_url || undefined,
          handover_notes: notes || assignment.handover_notes,
        },
        include: {
          equipment: { include: { category: true } },
          transportByUser: true,
          job: { include: { location: true } },
        },
      }),
      prisma.equipment.update({
        where: { id: assignment.equipment_id },
        data: {
          status: 'IN_USE',
          current_holder_id: assignment.transport_by_user_id,
        },
      }),
      prisma.user.update({
        where: { id: assignment.transport_by_user_id },
        data: {
          operational_status: 'MOVING',
        },
      }),
    ]);

    // Tạo thông báo gửi cho Admin
    try {
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      await (prisma as any).notification.create({
        data: {
          type: 'CHECK_IN',
          title: `📦 ${assignment.transportByUser?.name || 'Nhân viên'} đã lấy đồ lên xe`,
          message: `${assignment.transportByUser?.name || 'Nhân viên'} đã lấy thiết bị "${assignment.equipment?.name || 'Thiết bị'}" lên xe lúc ${timeStr} để di chuyển đến sân.${notes ? ` Ghi chú: ${notes}` : ''}`,
          user_id: assignment.transport_by_user_id,
          job_id: assignment.job_id,
          photo_url: photo_url || null,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create single checkout notification:', notifErr);
    }

    // Broadcast real-time update
    broadcastRealtimeEvent({ type: 'EQUIPMENT_TAKEN', payload: { assignmentId, equipmentId: assignment.equipment_id } });

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      equipment: updatedEquipment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
