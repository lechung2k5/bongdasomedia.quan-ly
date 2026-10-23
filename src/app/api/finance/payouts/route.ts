import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET() {
  try {
    const [users, allStaffAssignments] = await Promise.all([
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          avatar_url: true,
          address_district: true,
          skills: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.jobStaff.findMany({
        include: {
          job: {
            select: {
              id: true,
              title: true,
              start_time: true,
              end_time: true,
              status: true,
              price: true,
              payment_status: true,
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Nhóm các ca làm theo từng nhân sự
    const staffPayrollList = users.map((u) => {
      const userAssignments = allStaffAssignments.filter((a) => a.user_id === u.id);
      let totalEarned = 0;
      let totalPaid = 0;

      for (const a of userAssignments) {
        totalEarned += a.payout_amount || 0;
        if (a.payout_status === 'PAID') {
          totalPaid += a.payout_amount || 0;
        }
      }

      const totalUnpaid = Math.max(0, totalEarned - totalPaid);

      return {
        user: u,
        total_jobs: userAssignments.length,
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_unpaid: totalUnpaid,
        assignments: userAssignments,
      };
    });

    return NextResponse.json({
      staffPayrollList,
      totalUnpaidAllStaff: staffPayrollList.reduce((acc, s) => acc + s.total_unpaid, 0),
      totalPaidAllStaff: staffPayrollList.reduce((acc, s) => acc + s.total_paid, 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentUser = await getCurrentUser();
    const {
      assignment_ids = [],
      user_id,
      payout_proof_url,
      payout_notes,
    } = body;

    if (!Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một ca làm để thanh toán lương' },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin các ca làm được thanh toán
    const targetAssignments = await prisma.jobStaff.findMany({
      where: { id: { in: assignment_ids } },
      include: {
        user: true,
        job: true,
      },
    });

    if (targetAssignments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy ca làm' }, { status: 404 });
    }

    const recipient = targetAssignments[0].user;
    const recipientName = recipient?.name || 'Nhân sự';
    const totalAmount = targetAssignments.reduce((sum, a) => sum + (a.payout_amount || 0), 0);

    // 2. Cập nhật trạng thái PAID cho các ca làm
    const now = new Date();
    await prisma.jobStaff.updateMany({
      where: { id: { in: assignment_ids } },
      data: {
        payout_status: 'PAID',
        paid_at: now,
        payout_proof_url: payout_proof_url || null,
        payout_notes: payout_notes || null,
      },
    });

    // 3. Tự động ghi nhận giao dịch chi lương (Transaction)
    const jobTitles = targetAssignments.map((a) => a.job?.title).filter(Boolean).join(', ');
    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        category: 'STAFF_SALARY',
        amount: totalAmount,
        recorded_by: currentUser?.id || 1,
        receipt_url: payout_proof_url || null,
        payment_method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        notes: `Chi lương cho ${recipientName} (${totalAmount.toLocaleString('vi-VN')} đ) - Ca: ${jobTitles}${payout_notes ? ` [${payout_notes}]` : ''}`,
      },
    });

    // 4. Tạo thông báo cho nhân viên nhận lương
    if (recipient?.id) {
      await prisma.notification.create({
        data: {
          type: 'SYSTEM',
          title: `💵 Bạn đã nhận thanh toán ${totalAmount.toLocaleString('vi-VN')} đ`,
          message: `Admin đã thanh toán tiền công cho ${targetAssignments.length} ca làm việc.${payout_notes ? ` Ghi chú: "${payout_notes}"` : ''} Bạn có thể kiểm tra ảnh bill chuyển khoản trong lịch làm việc.`,
          user_id: recipient.id,
          photo_url: payout_proof_url || null,
        },
      });
    }

    // Broadcast real-time update
    broadcastRealtimeEvent({ type: 'PAYOUT_COMPLETED', payload: { recipientId: recipient?.id, totalAmount } });

    return NextResponse.json({
      success: true,
      message: `Đã thanh toán thành công ${totalAmount.toLocaleString('vi-VN')} đ cho ${recipientName}`,
      totalAmount,
      paidCount: targetAssignments.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
