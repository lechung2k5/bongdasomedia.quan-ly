import { NextResponse } from 'next/server';
import { verifyCurrentSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sessionResult = await verifyCurrentSession();

    if (!sessionResult.valid) {
      if (sessionResult.code === 'SESSION_REVOKED') {
        return NextResponse.json(
          {
            error: 'SESSION_REVOKED',
            message: 'Tài khoản của bạn đã được đăng nhập trên một thiết bị khác. Vui lòng đăng nhập lại.',
          },
          { status: 401 }
        );
      }
      if (sessionResult.code === 'SESSION_EXPIRED') {
        return NextResponse.json(
          {
            error: 'SESSION_EXPIRED',
            message: 'Phiên đăng nhập 7 ngày đã hết hạn. Vui lòng đăng nhập lại.',
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Bạn chưa đăng nhập' },
        { status: 401 }
      );
    }

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        address_district: true,
        role: true,
        skills: true,
        avatar_url: true,
        status: true,
        operational_status: true,
        current_lat: true,
        current_lng: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      currentUser: sessionResult.user,
      availableUsers: allUsers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
