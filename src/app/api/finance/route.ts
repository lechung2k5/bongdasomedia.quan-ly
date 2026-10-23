import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET() {
  try {
    const [transactions, allJobs, allJobStaff] = await Promise.all([
      prisma.transaction.findMany({
        include: {
          job: {
            select: {
              id: true,
              title: true,
              price: true,
              payment_status: true,
              paid_amount: true,
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          recorder: {
            select: {
              id: true,
              name: true,
              address_district: true,
            },
          },
        },
        orderBy: { transaction_date: 'desc' },
      }),
      prisma.job.findMany({
        select: {
          id: true,
          title: true,
          price: true,
          payment_status: true,
          paid_amount: true,
          is_deposited: true,
          deposit_amount: true,
          status: true,
          start_time: true,
        },
      }),
      prisma.jobStaff.findMany({
        select: {
          id: true,
          payout_amount: true,
          payout_status: true,
          user_id: true,
        },
      }),
    ]);

    // 1. Dòng tiền giao dịch thực tế
    let totalRevenue = 0;
    let totalExpense = 0;
    let wageExpense = 0;
    let operationalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalRevenue += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (tx.category === 'STAFF_SALARY') {
          wageExpense += tx.amount;
        } else {
          operationalExpense += tx.amount;
        }
      }
    }

    // 2. Tính toán công nợ khách hàng từ Jobs
    let totalContractValue = 0;
    let collectedFromClients = 0;
    for (const j of allJobs) {
      totalContractValue += j.price;
      const paid = j.payment_status === 'PAID'
        ? j.price
        : (j.paid_amount || (j.is_deposited ? j.deposit_amount : 0));
      collectedFromClients += paid;
    }
    const clientReceivables = Math.max(0, totalContractValue - collectedFromClients);

    // 3. Tính toán lương nhân viên (Đã trả vs Còn nợ)
    let totalStaffWages = 0;
    let wagesPaid = 0;
    for (const js of allJobStaff) {
      totalStaffWages += js.payout_amount;
      if (js.payout_status === 'PAID') {
        wagesPaid += js.payout_amount;
      }
    }
    const wagesPending = Math.max(0, totalStaffWages - wagesPaid);

    const netProfit = totalRevenue - totalExpense;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpense,
        netProfit,
        wageExpense,
        operationalExpense,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0',
        // Thống kê chi tiết nâng cao
        totalContractValue,
        collectedFromClients,
        clientReceivables,
        totalStaffWages,
        wagesPaid,
        wagesPending,
      },
      transactions,
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
      type,
      category = 'OTHER',
      amount,
      notes,
      job_id,
      transaction_date,
      receipt_url,
      payment_method = 'BANK_TRANSFER',
      status = 'COMPLETED',
    } = body;

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp loại giao dịch và số tiền' },
        { status: 400 }
      );
    }

    const newTx = await prisma.transaction.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        notes: notes || null,
        receipt_url: receipt_url || null,
        payment_method: payment_method || 'BANK_TRANSFER',
        status: status || 'COMPLETED',
        transaction_date: transaction_date ? new Date(transaction_date) : new Date(),
        job_id: job_id ? parseInt(job_id, 10) : null,
        recorded_by: currentUser?.id || 1,
      },
      include: {
        job: {
          include: { location: true },
        },
        recorder: true,
      },
    });

    broadcastRealtimeEvent({ type: 'FINANCE_UPDATED', payload: { transactionId: newTx.id } });

    return NextResponse.json(newTx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    let targetId: number | null = null;

    if (idParam) {
      targetId = parseInt(idParam, 10);
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.id) targetId = parseInt(body.id, 10);
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Thiếu ID giao dịch cần xóa' }, { status: 400 });
    }

    await prisma.transaction.delete({
      where: { id: targetId },
    });

    broadcastRealtimeEvent({ type: 'FINANCE_UPDATED', payload: { deletedId: targetId } });

    return NextResponse.json({ success: true, message: `Đã xóa giao dịch #${targetId}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
