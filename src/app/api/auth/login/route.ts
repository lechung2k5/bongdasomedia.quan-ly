import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.toString().trim();

    // Tìm kiếm user theo số điện thoại
    const user = await prisma.user.findFirst({
      where: {
        phone: cleanPhone,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Số điện thoại hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tài khoản này đã bị khóa hoặc ngừng hoạt động' },
        { status: 403 }
      );
    }

    // So khớp mật khẩu với bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Số điện thoại hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // Tạo Session mới (7 ngày, đơn thiết bị cho Staff, đa thiết bị cho Admin)
    await createSession(user.id, request);

    const redirectUrl = user.role === 'ADMIN' ? '/admin' : '/staff';

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      redirectUrl,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        address_district: user.address_district,
        operational_status: user.operational_status,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi đăng nhập' }, { status: 500 });
  }
}
