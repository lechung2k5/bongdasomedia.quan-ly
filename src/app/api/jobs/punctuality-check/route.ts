import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateStaffPunctuality, EtaEvaluation } from '@/lib/etaCalculator';

// GET /api/jobs/punctuality-check: Quét toàn bộ ca làm trong ngày và đánh giá nguy cơ đi muộn
export async function GET() {
  try {
    const now = new Date();
    // Quét các ca làm từ 1 tiếng trước tới 4 tiếng tới
    const timeWindowStart = new Date(now.getTime() - 60 * 60 * 1000);
    const timeWindowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const activeJobs = await prisma.job.findMany({
      where: {
        status: { in: ['ASSIGNED', 'IN_PROGRESS', 'PENDING'] },
        start_time: { gte: timeWindowStart, lte: timeWindowEnd },
      },
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
                current_lat: true,
                current_lng: true,
                operational_status: true,
                is_app_active: true,
              },
            },
          },
        },
        equipmentAssignments: {
          include: {
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
              },
            },
          },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    const lateWarnings: Array<{
      jobId: number;
      jobTitle: string;
      stadiumName: string;
      startTime: string;
      user: any;
      evaluation: EtaEvaluation;
    }> = [];

    // Duyệt qua từng job và nhân sự
    for (const job of activeJobs) {
      const venueLat = job.location?.latitude;
      const venueLng = job.location?.longitude;
      if (!venueLat || !venueLng) continue;

      // Danh sách unique user tham gia ca này
      const userMap = new Map<number, any>();
      job.staff.forEach((s) => {
        if (s.user) userMap.set(s.user.id, s.user);
      });
      job.equipmentAssignments.forEach((ea) => {
        if (ea.transportByUser) userMap.set(ea.transportByUser.id, ea.transportByUser);
      });

      for (const user of Array.from(userMap.values())) {
        // Kiểm tra xem nhân viên đã có mặt tại sân chưa
        const hasStadiumCheckIn = job.equipmentAssignments.some(
          (ea) => ea.transport_by_user_id === user.id && ea.stadium_check_in_time !== null
        );
        const isWorkingAtVenue = user.operational_status === 'WORKING';
        const hasArrived = hasStadiumCheckIn || isWorkingAtVenue;

        const evaluation = evaluateStaffPunctuality(
          user.current_lat,
          user.current_lng,
          venueLat,
          venueLng,
          job.start_time,
          hasArrived
        );

        if (!evaluation) continue;

        // Nếu có nguy cơ đi muộn hoặc cần xuất phát gấp
        if (evaluation.riskLevel === 'CRITICAL_LATE' || evaluation.riskLevel === 'WARNING_RUSH') {
          lateWarnings.push({
            jobId: job.id,
            jobTitle: job.title,
            stadiumName: job.location?.name || 'Sân bóng',
            startTime: job.start_time.toISOString(),
            user,
            evaluation,
          });

          // Nếu nguy cấp (CRITICAL_LATE), kiểm tra và tạo thông báo nếu chưa báo trong 25 phút qua
          if (evaluation.riskLevel === 'CRITICAL_LATE') {
            const twentyFiveMinsAgo = new Date(now.getTime() - 25 * 60 * 1000);
            const recentNotif = await (prisma as any).notification.findFirst({
              where: {
                type: 'LATE_WARNING',
                user_id: user.id,
                job_id: job.id,
                created_at: { gte: twentyFiveMinsAgo },
              },
            });

            if (!recentNotif) {
              const startStr = new Date(job.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const deadlineStr = evaluation.deadlineTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const etaStr = evaluation.estimatedArrivalTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

              await (prisma as any).notification.create({
                data: {
                  type: 'LATE_WARNING',
                  title: `🚨 CẢNH BÁO ĐI MUỘN: ${user.name}`,
                  message: `Nhân viên ${user.name} đang cách sân "${job.location?.name || 'Sân'}" ${evaluation.distanceKm} km (~${evaluation.travelMinutes} phút). Trận đấu bắt đầu lúc ${startStr} (Hạn chót có mặt: ${deadlineStr}). Dự kiến tới lúc ${etaStr} (Trễ ${evaluation.lateMinutes} phút so với mốc 30p trước giờ bóng lăn)!`,
                  user_id: user.id,
                  job_id: job.id,
                  metadata: JSON.stringify({
                    distanceKm: evaluation.distanceKm,
                    travelMinutes: evaluation.travelMinutes,
                    lateMinutes: evaluation.lateMinutes,
                    deadlineTime: deadlineStr,
                    stadiumName: job.location?.name,
                  }),
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: lateWarnings.length,
      warnings: lateWarnings,
      checkedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error('GET /api/jobs/punctuality-check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
