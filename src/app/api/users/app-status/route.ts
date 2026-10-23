import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, is_app_active } = body;

    let targetUserId = userId ? Number(userId) : null;
    if (!targetUserId) {
      const currentUser = await getCurrentUser();
      targetUserId = currentUser?.id ?? null;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const appActive = Boolean(is_app_active);

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        is_app_active: appActive,
        // Nếu tắt app thì đưa trạng thái vận hành về IDLE
        ...(appActive ? {} : { operational_status: 'IDLE' }),
      },
      select: {
        id: true,
        name: true,
        is_app_active: true,
        operational_status: true,
        current_lat: true,
        current_lng: true,
        last_location_update: true,
      },
    });


    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: appActive
        ? '✓ Đã BẬT ứng dụng và kích hoạt chia sẻ GPS'
        : '✓ Đã TẮT ứng dụng và bảo mật vị trí',
    });
  } catch (error: any) {
    console.error('POST /api/users/app-status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
