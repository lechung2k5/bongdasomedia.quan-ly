import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = parseInt(id, 10);
    const body = await request.json();
    const currentUser = await getCurrentUser();

    const {
      payment_status = 'PAID', // UNPAID, PARTIAL, PAID
      paid_amount,
      payment_proof_url,
      payment_notes,
    } = body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { location: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Không tìm thấy trận đấu' }, { status: 404 });
    }

    const finalPaidAmount = paid_amount !== undefined
      ? parseFloat(paid_amount)
      : payment_status === 'PAID'
      ? job.price
      : payment_status === 'PARTIAL'
      ? (job.deposit_amount || 0)
      : 0;

    // 1. Cập nhật trạng thái thanh toán trên Job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        payment_status,
        paid_amount: finalPaidAmount,
        payment_proof_url: payment_proof_url || null,
        payment_notes: payment_notes || null,
      },
      include: {
        location: true,
        staff: {
          include: { user: true },
        },
        equipmentAssignments: {
          include: {
            equipment: true,
            transportByUser: true,
          },
        },
      },
    });

    // 2. Đồng bộ giao dịch Thu tiền hợp đồng (INCOME)
    const existingIncomeTx = await prisma.transaction.findFirst({
      where: {
        job_id: jobId,
        type: 'INCOME',
        category: 'CLIENT_PAYMENT',
      },
    });

    if (finalPaidAmount > 0) {
      if (existingIncomeTx) {
        await prisma.transaction.update({
          where: { id: existingIncomeTx.id },
          data: {
            amount: finalPaidAmount,
            receipt_url: payment_proof_url || existingIncomeTx.receipt_url,
            notes: `Thu tiền hợp đồng khách hàng: ${job.title} (${payment_status === 'PAID' ? 'Đã thu đủ 100%' : 'Đã cọc / thu 1 phần'})${payment_notes ? ` [${payment_notes}]` : ''}`,
          },
        });
      } else {
        await prisma.transaction.create({
          data: {
            job_id: jobId,
            type: 'INCOME',
            category: 'CLIENT_PAYMENT',
            amount: finalPaidAmount,
            recorded_by: currentUser?.id || 1,
            receipt_url: payment_proof_url || null,
            payment_method: 'BANK_TRANSFER',
            status: 'COMPLETED',
            notes: `Thu tiền hợp đồng khách hàng: ${job.title} (${payment_status === 'PAID' ? 'Đã thu đủ 100%' : 'Đã cọc / thu 1 phần'})${payment_notes ? ` [${payment_notes}]` : ''}`,
          },
        });
      }
    } else if (existingIncomeTx && payment_status === 'UNPAID') {
      await prisma.transaction.delete({
        where: { id: existingIncomeTx.id },
      });
    }

    // Broadcast real-time update
    broadcastRealtimeEvent({ type: 'PAYMENT_UPDATED', payload: { jobId, payment_status, paid_amount: finalPaidAmount } });

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: `Đã cập nhật trạng thái thanh toán: ${
        payment_status === 'PAID'
          ? 'ĐÃ THU ĐỦ 100%'
          : payment_status === 'PARTIAL'
          ? 'ĐÃ CỌC 1 PHẦN'
          : 'CHƯA THANH TOÁN'
      }`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
