import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (jobId) where.job_id = Number(jobId);
    if (userId) where.transport_by_user_id = Number(userId);

    const allocations = await prisma.jobEquipmentAssignment.findMany({
      where,
      include: {
        job: true,
        equipment: true,
        transportByUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(allocations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { job_id, equipment_id, transport_by_user_id, assigned_to_user_id, notes, handover_notes } = body;
    const finalUserId = transport_by_user_id || assigned_to_user_id;

    if (!job_id || !equipment_id || !finalUserId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn Job, Thiết bị và Nhân viên vận chuyển' },
        { status: 400 }
      );
    }

    const allocation = await prisma.jobEquipmentAssignment.create({
      data: {
        job_id: Number(job_id),
        equipment_id: Number(equipment_id),
        transport_by_user_id: Number(finalUserId),
        handover_notes: handover_notes || notes || null,
        check_in_status: 'PENDING',
        check_out_status: 'PENDING',
      },
      include: {
        job: true,
        equipment: true,
        transportByUser: true,
      },
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.jobEquipmentAssignment.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
