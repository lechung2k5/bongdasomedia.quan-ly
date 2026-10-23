import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    let targetUserId: number | null = null;
    if (userIdParam) {
      targetUserId = parseInt(userIdParam, 10);
    } else {
      const currentUser = await getCurrentUser();
      targetUserId = currentUser?.id ?? null;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // 1. Find all job duties assigned to this user
    const jobStaffs = await prisma.jobStaff.findMany({
      where: { user_id: targetUserId },
      include: {
        job: {
          include: {
            location: true,
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatar_url: true,
                    status: true,
                    operational_status: true,
                    is_app_active: true,
                    address_district: true,
                    current_lat: true,
                    current_lng: true,
                    last_location_update: true,
                  },
                },
              },
            },
            equipmentAssignments: {
              include: {
                equipment: {
                  include: {
                    category: true,
                    currentHolder: {
                      select: { id: true, name: true, phone: true, address_district: true },
                    },
                  },
                },
                transportByUser: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatar_url: true,
                    current_lat: true,
                    current_lng: true,
                    operational_status: true,
                    is_app_active: true,
                    address_district: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        job: { start_time: 'asc' },
      },
    });

    // 2. Find all equipment assigned to this user to transport/chở đồ
    const transportAssignments = await prisma.jobEquipmentAssignment.findMany({
      where: { transport_by_user_id: targetUserId },
      include: {
        equipment: {
          include: {
            category: true,
            currentHolder: {
              select: { id: true, name: true, phone: true, address_district: true },
            },
          },
        },
        job: {
          include: {
            location: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // 3. Find active colleagues from user's current/upcoming jobs for GPS radar
    const jobIds = jobStaffs.map((js) => js.job_id);
    const colleagues = await prisma.user.findMany({
      where: {
        id: { not: targetUserId },
        jobStaffs: {
          some: { job_id: { in: jobIds } },
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar_url: true,
        role: true,
        operational_status: true,
        is_app_active: true,
        address_district: true,
        current_lat: true,
        current_lng: true,
        last_location_update: true,
        transportAssignments: {
          where: { job_id: { in: jobIds } },
          include: {
            equipment: true,
          },
        },
      },
    });

    // 4. Calculate wages statistics
    const totalWageEarned = jobStaffs.reduce((acc, curr) => acc + (curr.payout_amount || 0), 0);
    const completedWageEarned = jobStaffs
      .filter((js) => js.job.status === 'COMPLETED')
      .reduce((acc, curr) => acc + (curr.payout_amount || 0), 0);
    const paidWageEarned = jobStaffs
      .filter((js) => js.payout_status === 'PAID')
      .reduce((acc, curr) => acc + (curr.payout_amount || 0), 0);
    const unpaidWageEarned = completedWageEarned - paidWageEarned;

    return NextResponse.json({
      jobStaffs,
      transportAssignments,
      colleagues,
      stats: {
        totalAssignments: jobStaffs.length,
        totalWageEarned,
        completedWageEarned,
        paidWageEarned,
        unpaidWageEarned: Math.max(0, unpaidWageEarned),
        pendingWage: totalWageEarned - completedWageEarned,
        assignedEquipmentsCount: transportAssignments.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
