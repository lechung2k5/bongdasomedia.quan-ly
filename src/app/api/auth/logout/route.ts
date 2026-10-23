import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true, message: 'Đã đăng xuất thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi đăng xuất' }, { status: 500 });
  }
}
