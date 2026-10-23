import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        location: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                address_district: true,
                role: true,
                avatar_url: true,
                skills: true,
              },
            },
          },
        },
        equipmentAssignments: {
          include: {
            equipment: {
              include: {
                category: true,
              },
            },
            transportByUser: {
              select: {
                id: true,
                name: true,
                phone: true,
                address_district: true,
              },
            },
          },
        },
        transactions: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);
    const body = await request.json();
    const currentUser = await getCurrentUser();

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        location: true,
        staff: {
          include: { user: true },
        },
        transactions: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const {
      status,
      title,
      location_id,
      location_address,
      location_lat,
      location_lng,
      job_type,
      match_type,
      match_count,
      pitch_count,
      camera_count,
      has_photo,
      live_price,
      photo_fee,
      duration_hours,
      is_deposited,
      deposit_amount,
      start_time,
      end_time,
      price,
      notes,
      equipment_photo_url,
      staff,
      equipment_assignments,
    } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    let targetLocationId: number | null = null;
    if (body.is_new_location && body.new_location_name) {
      const newLoc = await prisma.location.create({
        data: {
          name: body.new_location_name.trim(),
          address: location_address ? location_address.trim() : null,
          latitude: location_lat ? parseFloat(location_lat) : null,
          longitude: location_lng ? parseFloat(location_lng) : null,
        },
      });
      targetLocationId = newLoc.id;
      updateData.location = {
        connect: { id: newLoc.id },
      };
    } else if (location_id !== undefined && location_id !== null) {
      targetLocationId = parseInt(location_id, 10);
      updateData.location = {
        connect: { id: targetLocationId },
      };
    } else {
      targetLocationId = existingJob.location_id;
    }

    if (targetLocationId && (location_address !== undefined || location_lat !== undefined || location_lng !== undefined)) {
      await prisma.location.update({
        where: { id: targetLocationId },
        data: {
          ...(location_address !== undefined ? { address: location_address ? location_address.trim() : null } : {}),
          ...(location_lat !== undefined ? { latitude: location_lat ? parseFloat(location_lat) : null } : {}),
          ...(location_lng !== undefined ? { longitude: location_lng ? parseFloat(location_lng) : null } : {}),
        },
      });
    }
    if (job_type !== undefined) updateData.job_type = job_type;
    if (match_type !== undefined) updateData.match_type = match_type;
    if (match_count !== undefined) updateData.match_count = parseInt(match_count, 10);
    if (pitch_count !== undefined) updateData.pitch_count = parseInt(pitch_count, 10);
    if (camera_count !== undefined) updateData.camera_count = parseInt(camera_count, 10);
    if (has_photo !== undefined) updateData.has_photo = Boolean(has_photo);
    if (live_price !== undefined) updateData.live_price = parseFloat(live_price) || 0;
    if (photo_fee !== undefined) updateData.photo_fee = parseFloat(photo_fee) || 0;
    if (duration_hours !== undefined) updateData.duration_hours = parseFloat(duration_hours) || 1.5;
    if (is_deposited !== undefined) updateData.is_deposited = Boolean(is_deposited);
    if (deposit_amount !== undefined) updateData.deposit_amount = parseFloat(deposit_amount) || 0;
    if (start_time !== undefined) updateData.start_time = new Date(start_time);
    if (end_time !== undefined) updateData.end_time = new Date(end_time);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (notes !== undefined) updateData.notes = notes;
    if (equipment_photo_url !== undefined) updateData.equipment_photo_url = equipment_photo_url;

    // Handle updating staff assignments if passed
    if (Array.isArray(staff)) {
      await prisma.jobStaff.deleteMany({ where: { job_id: jobId } });
      const effectiveMatchCount = match_count !== undefined ? (parseInt(match_count, 10) || 1) : (existingJob.match_count || 1);
      updateData.staff = {
        create: staff.map((s: any) => {
          const duty = s.duty || 'CAMERAMAN';
          let defaultWage = 200000 * effectiveMatchCount;
          if (duty === 'CASTER') defaultWage = 300000 * effectiveMatchCount;
          else if (duty === 'CAMERAMAN') defaultWage = 200000 * effectiveMatchCount;
          else if (duty === 'PHOTOGRAPHER') defaultWage = 400000 * effectiveMatchCount;
          else if (duty === 'VMIX_OPERATOR') defaultWage = 300000 * effectiveMatchCount;

          const finalPayout = s.payout_amount !== undefined && s.payout_amount !== null && s.payout_amount !== '' && !isNaN(parseFloat(s.payout_amount))
            ? parseFloat(s.payout_amount)
            : defaultWage;

          return {
            user_id: s.user_id ? (typeof s.user_id === 'string' ? parseInt(s.user_id, 10) : Number(s.user_id)) : null,
            external_name: s.external_name || null,
            external_duty: s.external_duty || null,
            duty,
            payout_amount: finalPayout,
            payout_status: s.payout_status || 'UNPAID',
          };
        }),
      };
    }

    // Handle updating equipment assignments if passed
    if (Array.isArray(equipment_assignments)) {
      await prisma.jobEquipmentAssignment.deleteMany({ where: { job_id: jobId } });
      updateData.equipmentAssignments = {
        create: equipment_assignments.map((ea: any) => ({
          equipment_id: typeof ea.equipment_id === 'string' ? parseInt(ea.equipment_id, 10) : Number(ea.equipment_id),
          transport_by_user_id: typeof ea.transport_by_user_id === 'string' ? parseInt(ea.transport_by_user_id, 10) : Number(ea.transport_by_user_id),
          handover_notes: ea.handover_notes || null,
          check_in_status: ea.check_in_status || 'PENDING',
          check_out_status: ea.check_out_status || 'PENDING',
        })),
      };
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        location: true,
        staff: {
          include: { user: true },
        },
        equipmentAssignments: {
          include: {
            equipment: {
              include: {
                category: true,
              },
            },
            transportByUser: true,
          },
        },
        transactions: true,
      },
    });

    // If status became COMPLETED, automatically generate wage expenses & client income
    if (status === 'COMPLETED' && existingJob.status !== 'COMPLETED') {
      const recorderId = currentUser?.id || 1;

      // 1. Generate Client Income transaction
      const hasIncomeTransaction = existingJob.transactions.some(
        (t) => t.type === 'INCOME' && t.job_id === jobId
      );

      if (!hasIncomeTransaction && updatedJob.price > 0) {
        await prisma.transaction.create({
          data: {
            job_id: jobId,
            type: 'INCOME',
            category: 'CLIENT_PAYMENT',
            amount: updatedJob.price,
            recorded_by: recorderId,
            notes: `Thu tiền hợp đồng khách hàng: ${updatedJob.title} (${updatedJob.location?.name || ''})`,
          },
        });
      }

      // 2. Automatically generate wage expense for each internal staff
      for (const st of updatedJob.staff) {
        if (st.payout_amount > 0) {
          const staffName = st.user?.name || st.external_name || 'Nhân viên';
          const wageDescription = `Chi trả tiền công: ${staffName} (${st.duty}) - ${updatedJob.title}`;
          const alreadyPaid = existingJob.transactions.some(
            (t) => t.type === 'EXPENSE' && t.notes && t.notes.includes(staffName)
          );

          if (!alreadyPaid) {
            await prisma.transaction.create({
              data: {
                job_id: jobId,
                type: 'EXPENSE',
                category: 'STAFF_SALARY',
                amount: st.payout_amount,
                recorded_by: recorderId,
                notes: wageDescription,
              },
            });
          }
        }
      }
    }

    // Broadcast real-time update to all clients
    broadcastRealtimeEvent({ type: 'JOB_UPDATED', payload: { jobId: updatedJob.id } });

    return NextResponse.json(updatedJob);
  } catch (error: any) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);

    await prisma.job.delete({
      where: { id: jobId },
    });
    broadcastRealtimeEvent({ type: 'JOB_DELETED', payload: { jobId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
