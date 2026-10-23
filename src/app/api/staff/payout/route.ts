import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobStaffId, userId, markAllPaid, payoutStatus = 'PAID' } = body;

    const now = new Date();

    if (markAllPaid && userId) {
      const uId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
      await prisma.jobStaff.updateMany({
        where: {
          user_id: uId,
          job: { status: 'COMPLETED' },
        },
        data: {
          payout_status: 'PAID',
          paid_at: now,
        },
      });
      return NextResponse.json({ success: true, message: 'Đã cập nhật đã nhận lương cho tất cả các trận hoàn thành' });
    }

    if (jobStaffId) {
      const jsId = typeof jobStaffId === 'string' ? parseInt(jobStaffId, 10) : Number(jobStaffId);
      const updated = await prisma.jobStaff.update({
        where: { id: jsId },
        data: {
          payout_status: payoutStatus,
          paid_at: payoutStatus === 'PAID' ? now : null,
        },
      });
      return NextResponse.json({ success: true, jobStaff: updated });
    }

    return NextResponse.json({ error: 'jobStaffId hoặc userId với markAllPaid là bắt buộc' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
