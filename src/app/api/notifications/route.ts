import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/notifications: Lấy danh sách thông báo cho Admin & nhân viên
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '40', 10);
    const unreadOnly = searchParams.get('unread') === 'true';

    const whereClause: any = {
      type: { not: 'APP_STATUS' },
    };
    if (unreadOnly) {
      whereClause.is_read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      (prisma as any).notification.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
              role: true,
              operational_status: true,
              is_app_active: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              start_time: true,
              location: {
                select: { name: true },
              },
            },
          },
        },
      }),
      (prisma as any).notification.count({
        where: { is_read: false, type: { not: 'APP_STATUS' } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications: Tạo thông báo mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, message, user_id, job_id, photo_url, metadata } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const notification = await (prisma as any).notification.create({
      data: {
        type: type || 'SYSTEM',
        title,
        message,
        user_id: user_id ? Number(user_id) : null,
        job_id: job_id ? Number(job_id) : null,
        photo_url: photo_url || null,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar_url: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications: Đánh dấu đã đọc
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      await (prisma as any).notification.updateMany({
        where: { is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true, message: 'Đã đánh dấu đọc tất cả' });
    }

    if (id) {
      const updated = await (prisma as any).notification.update({
        where: { id: Number(id) },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ error: 'ID hoặc markAll là bắt buộc' }, { status: 400 });
  } catch (error: any) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
