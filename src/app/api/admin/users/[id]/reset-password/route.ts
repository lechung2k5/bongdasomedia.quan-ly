import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền đổi mật khẩu cho nhân sự' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'ID nhân sự không hợp lệ' }, { status: 400 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có tối thiểu 4 ký tự' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy nhân sự này' }, { status: 404 });
    }

    // Mã hóa mật khẩu mới với bcrypt
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Cập nhật mật khẩu trong cơ sở dữ liệu
    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    // Thu hồi toàn bộ session hiện tại của nhân sự này để bắt buộc đăng nhập bằng mật khẩu mới
    await prisma.session.updateMany({
      where: { user_id: targetUserId, is_active: true },
      data: { is_active: false },
    });

    return NextResponse.json({
      success: true,
      message: `Đã đổi mật khẩu cho nhân sự ${targetUser.name} thành công. Toàn bộ thiết bị cũ đã được đăng xuất.`,
    });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi đổi mật khẩu' }, { status: 500 });
  }
}
