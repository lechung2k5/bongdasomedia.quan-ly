import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const {
      jobId, // If editing existing job, exclude it
      startTime,
      endTime,
      userIds = [],
      equipmentIds = [],
    } = await request.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ conflicts: [] });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const parsedJobId = jobId ? (typeof jobId === 'string' ? parseInt(jobId, 10) : Number(jobId)) : undefined;

    const parsedUserIds = userIds.map((u: any) => (typeof u === 'string' ? parseInt(u, 10) : Number(u)));
    const parsedEquipmentIds = equipmentIds.map((e: any) => (typeof e === 'string' ? parseInt(e, 10) : Number(e)));

    // Find any active jobs that overlap in time
    const overlappingJobs = await prisma.job.findMany({
      where: {
        id: parsedJobId ? { not: parsedJobId } : undefined,
        status: { not: 'CANCELLED' },
        AND: [
          { start_time: { lt: end } },
          { end_time: { gt: start } },
        ],
      },
      include: {
        location: true,
        staff: {
          include: {
            user: {
              select: { id: true, name: true, address_district: true },
            },
          },
        },
        equipmentAssignments: {
          include: {
            equipment: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const conflicts: {
      type: 'USER' | 'EQUIPMENT';
      id: number;
      name: string;
      conflictingJobId: number;
      conflictingJobTitle: string;
      timeRange: string;
    }[] = [];

    for (const job of overlappingJobs) {
      const timeStr = `${new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(job.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`;

      // Check users
      for (const st of job.staff) {
        if (st.user_id && parsedUserIds.includes(st.user_id) && st.user) {
          conflicts.push({
            type: 'USER',
            id: st.user_id,
            name: `${st.user.name} (${st.duty})`,
            conflictingJobId: job.id,
            conflictingJobTitle: job.title,
            timeRange: timeStr,
          });
        }
      }

      // Check equipment
      for (const ea of job.equipmentAssignments) {
        if (parsedEquipmentIds.includes(ea.equipment_id)) {
          conflicts.push({
            type: 'EQUIPMENT',
            id: ea.equipment_id,
            name: ea.equipment.name,
            conflictingJobId: job.id,
            conflictingJobTitle: job.title,
            timeRange: timeStr,
          });
        }
      }
    }

    return NextResponse.json({
      hasConflict: conflicts.length > 0,
      conflicts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
