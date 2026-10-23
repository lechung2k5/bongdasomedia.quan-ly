import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const jobs = await prisma.job.findMany({
      where,
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
                avatar_url: true,
                role: true,
                status: true,
                operational_status: true,
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
      orderBy: {
        start_time: 'asc',
      },
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentUser = await getCurrentUser();
    const {
      title,
      location_id,
      new_location_name,
      location_address,
      location_lat,
      location_lng,
      job_type = 'LIVESTREAM',
      match_type,
      match_count = 1,
      pitch_count = 1,
      camera_count = 1,
      has_photo = false,
      duration_hours = 1.5,
      is_deposited = false,
      deposit_amount = 0,
      start_time,
      end_time,
      price = 0,
      notes,
      equipment_photo_url,
      staff = [],
      equipment_assignments = [],
    } = body;

    // Resolve Location: if user typed a new stadium, create and persist it in DB
    let finalLocationId: number | null = null;
    if (new_location_name && new_location_name.trim().length > 0) {
      const trimmedName = new_location_name.trim();
      let existingLoc = await prisma.location.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } },
      });
      if (!existingLoc) {
        existingLoc = await prisma.location.create({
          data: {
            name: trimmedName,
            address: location_address ? location_address.trim() : null,
            latitude: location_lat ? parseFloat(location_lat) : null,
            longitude: location_lng ? parseFloat(location_lng) : null,
          },
        });
      } else if (location_address !== undefined || location_lat !== undefined || location_lng !== undefined) {
        existingLoc = await prisma.location.update({
          where: { id: existingLoc.id },
          data: {
            ...(location_address !== undefined ? { address: location_address ? location_address.trim() : null } : {}),
            ...(location_lat !== undefined ? { latitude: location_lat ? parseFloat(location_lat) : null } : {}),
            ...(location_lng !== undefined ? { longitude: location_lng ? parseFloat(location_lng) : null } : {}),
          },
        });
      }
      finalLocationId = existingLoc.id;
    } else if (location_id) {
      finalLocationId = typeof location_id === 'string' ? parseInt(location_id, 10) : Number(location_id);
      if (location_address !== undefined || location_lat !== undefined || location_lng !== undefined) {
        await prisma.location.update({
          where: { id: finalLocationId },
          data: {
            ...(location_address !== undefined ? { address: location_address ? location_address.trim() : null } : {}),
            ...(location_lat !== undefined ? { latitude: location_lat ? parseFloat(location_lat) : null } : {}),
            ...(location_lng !== undefined ? { longitude: location_lng ? parseFloat(location_lng) : null } : {}),
          },
        });
      }
    }

    if (!title || !finalLocationId || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ tiêu đề, chọn hoặc nhập sân bóng và thời gian bắt đầu/kết thúc' },
        { status: 400 }
      );
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start >= end) {
      return NextResponse.json(
        { error: 'Thời gian kết thúc phải sau thời gian bắt đầu' },
        { status: 400 }
      );
    }

    const parsedPrice = parseFloat(price) || 0;
    const parsedDeposit = parseFloat(deposit_amount) || 0;

    // Create Job with all quick-selection fields
    const newJob = await prisma.job.create({
      data: {
        title,
        location_id: finalLocationId,
        job_type,
        match_type: match_type || null,
        match_count: parseInt(match_count, 10) || 1,
        pitch_count: parseInt(pitch_count, 10) || 1,
        camera_count: parseInt(camera_count, 10) || 1,
        has_photo: Boolean(has_photo),
        live_price: parseFloat(body.live_price) || 0,
        photo_fee: parseFloat(body.photo_fee) || 0,
        duration_hours: parseFloat(duration_hours) || 1.5,
        is_deposited: Boolean(is_deposited),
        deposit_amount: parsedDeposit,
        start_time: start,
        end_time: end,
        price: parsedPrice,
        notes: notes || null,
        equipment_photo_url: equipment_photo_url || null,
        status: staff.length > 0 ? 'ASSIGNED' : 'PENDING',
        staff: {
          create: staff.map((s: any) => {
            const duty = s.duty || 'CAMERAMAN';
            const mCount = parseInt(match_count, 10) || 1;
            let defaultWage = 200000 * mCount;
            if (duty === 'CASTER') defaultWage = 300000 * mCount;
            else if (duty === 'CAMERAMAN') defaultWage = 200000 * mCount;
            else if (duty === 'PHOTOGRAPHER') defaultWage = 400000 * mCount;
            else if (duty === 'VMIX_OPERATOR') defaultWage = 300000 * mCount;

            const finalPayout = s.payout_amount !== undefined && s.payout_amount !== null && s.payout_amount !== '' && !isNaN(parseFloat(s.payout_amount))
              ? parseFloat(s.payout_amount)
              : defaultWage;

            return {
              user_id: s.user_id && s.user_id !== 'external' ? (typeof s.user_id === 'string' ? parseInt(s.user_id, 10) : Number(s.user_id)) : null,
              external_name: s.external_name || null,
              external_duty: s.external_duty || null,
              duty,
              payout_amount: finalPayout,
              payout_status: 'UNPAID',
            };
          }),
        },
        equipmentAssignments: {
          create: equipment_assignments.map((ea: any) => ({
            equipment_id: typeof ea.equipment_id === 'string' ? parseInt(ea.equipment_id, 10) : Number(ea.equipment_id),
            transport_by_user_id: typeof ea.transport_by_user_id === 'string' ? parseInt(ea.transport_by_user_id, 10) : Number(ea.transport_by_user_id),
            handover_notes: ea.handover_notes || null,
            check_in_status: 'PENDING',
            check_out_status: 'PENDING',
          })),
        },
      },
      include: {
        location: true,
        staff: {
          include: {
            user: true,
          },
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
      },
    });

    // If client paid a deposit, record it into transactions immediately
    if (is_deposited && parsedDeposit > 0) {
      await prisma.transaction.create({
        data: {
          job_id: newJob.id,
          type: 'INCOME',
          category: 'CLIENT_PAYMENT',
          amount: parsedDeposit,
          recorded_by: currentUser?.id || 1,
          notes: `Thu tiền cọc: ${newJob.title} (${newJob.location?.name || ''})`,
        },
      });
    }

    // Broadcast real-time event to all listening clients
    broadcastRealtimeEvent({ type: 'JOB_CREATED', payload: { jobId: newJob.id } });

    return NextResponse.json(newJob, { status: 201 });
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
