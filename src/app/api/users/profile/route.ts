import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DISTRICT_COORDS: { [key: string]: { lat: number; lng: number } } = {
  'Gò Vấp': { lat: 10.8385, lng: 106.6650 },
  'Bình Chánh': { lat: 10.7180, lng: 106.6250 },
  'Tân Bình': { lat: 10.7950, lng: 106.6550 },
  'Bình Tân': { lat: 10.7650, lng: 106.6050 },
  'Quận 1': { lat: 10.7760, lng: 106.7000 },
  'Quận 3': { lat: 10.7840, lng: 106.6840 },
  'Quận 7': { lat: 10.7340, lng: 106.7210 },
  'Quận 10': { lat: 10.7710, lng: 106.6670 },
  'Quận 12': { lat: 10.8670, lng: 106.6410 },
  'Thủ Đức': { lat: 10.8490, lng: 106.7530 },
  'Bình Thạnh': { lat: 10.8010, lng: 106.6990 },
  'Phú Nhuận': { lat: 10.7990, lng: 106.6800 },
  'Tân Phú': { lat: 10.7900, lng: 106.6280 },
};

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Bạn chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address_district, skills, avatar_url, currentPassword, newPassword } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng' }, { status: 404 });
    }

    const updateData: any = {};

    // 1. Cập nhật tên hiển thị
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Tên hiển thị không được để trống' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // 2. Cập nhật số điện thoại (tài khoản đăng nhập)
    if (phone !== undefined && phone.trim()) {
      const cleanPhone = phone.trim();
      if (cleanPhone !== dbUser.phone) {
        const existing = await prisma.user.findFirst({
          where: {
            phone: cleanPhone,
            NOT: { id: currentUser.id },
          },
        });
        if (existing) {
          return NextResponse.json(
            { error: `Số điện thoại ${cleanPhone} đã được sử dụng bởi nhân sự khác (${existing.name})` },
            { status: 400 }
          );
        }
        updateData.phone = cleanPhone;
      }
    }

    // 3. Cập nhật khu vực sinh sống
    if (address_district !== undefined) {
      updateData.address_district = address_district ? address_district.trim() : null;
      if (address_district && DISTRICT_COORDS[address_district.trim()]) {
        updateData.current_lat = DISTRICT_COORDS[address_district.trim()].lat;
        updateData.current_lng = DISTRICT_COORDS[address_district.trim()].lng;
      }
    }

    // 4. Cập nhật kỹ năng
    if (skills !== undefined) {
      updateData.skills = skills ? skills.trim() : null;
    }

    // 5. Cập nhật ảnh đại diện S3
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    // 6. Nếu có yêu cầu đổi mật khẩu
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới' }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isMatch) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
      }
      if (newPassword.trim().length < 4) {
        return NextResponse.json({ error: 'Mật khẩu mới phải từ 4 ký tự trở lên' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật hồ sơ cá nhân thành công!',
      user: updated,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật hồ sơ' }, { status: 500 });
  }
}
