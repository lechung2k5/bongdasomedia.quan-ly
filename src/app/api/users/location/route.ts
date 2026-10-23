import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, lat, lng, status, operational_status } = body;

    let targetUserId = userId ? (typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)) : null;
    if (!targetUserId) {
      const currentUser = await getCurrentUser();
      targetUserId = currentUser?.id ?? null;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Kiểm tra trạng thái bật/tắt app của nhân viên
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, is_app_active: true },
    });

    if (existingUser && existingUser.is_app_active === false) {
      return NextResponse.json({
        success: false,
        app_disabled: true,
        message: 'Ứng dụng đang tắt, vị trí không được chia sẻ',
      });
    }

    const updateData: any = {
      last_location_update: new Date(),
    };

    if (lat !== undefined && lng !== undefined) {
      updateData.current_lat = parseFloat(lat);
      updateData.current_lng = parseFloat(lng);
    }

    if (operational_status !== undefined) {
      updateData.operational_status = operational_status;
    } else if (status !== undefined) {
      if (['IDLE', 'MOVING', 'WORKING'].includes(status)) {
        updateData.operational_status = status;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        status: true,
        operational_status: true,
        is_app_active: true,
        address_district: true,
        current_lat: true,
        current_lng: true,
        last_location_update: true,
      },
    });

    broadcastRealtimeEvent({ type: 'USER_LOCATION_UPDATED', payload: { userId: updatedUser.id, lat: updatedUser.current_lat, lng: updatedUser.current_lng, status: updatedUser.operational_status } });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
