import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
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
        is_app_active: true,
        current_lat: true,
        current_lng: true,
        last_location_update: true,
        heldEquipments: {
          select: {
            id: true,
            name: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        transportAssignments: {
          include: {
            equipment: {
              include: {
                category: true,
              },
            },
            job: {
              select: {
                id: true,
                title: true,
                location: true,
                start_time: true,
                end_time: true,
                status: true,
              },
            },
          },
        },
        jobStaffs: {
          where: {
            job: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS', 'PENDING'] },
            },
          },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                location: true,
                start_time: true,
                end_time: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// District coordinates mapping for TP.HCM
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      role = 'STAFF',
      address_district,
      skills,
      avatar_url,
      status = 'ACTIVE',
      operational_status = 'IDLE',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên nhân viên' }, { status: 400 });
    }

    // Check if phone already registered
    if (phone && phone.trim()) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: phone.trim() },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: `Số điện thoại ${phone} đã được đăng ký cho nhân viên ${existingPhone.name}` },
          { status: 400 }
        );
      }
    }

    const defaultCoords =
      (address_district && DISTRICT_COORDS[address_district]) || {
        lat: 10.7760,
        lng: 106.6600,
      };

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone && phone.trim() ? phone.trim() : null,
        role: role as any,
        address_district: address_district && address_district.trim() ? address_district.trim() : null,
        skills: skills && skills.trim() ? skills.trim() : null,
        avatar_url: avatar_url && avatar_url.trim() ? avatar_url.trim() : null,
        status: status as any,
        operational_status: operational_status as any,
        current_lat: defaultCoords.lat,
        current_lng: defaultCoords.lng,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo nhân viên' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      phone,
      role,
      address_district,
      skills,
      avatar_url,
      status,
      operational_status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Vui lòng cung cấp ID nhân viên' }, { status: 400 });
    }

    const userId = typeof id === 'string' ? parseInt(id, 10) : Number(id);

    // Validate phone uniqueness if changed
    if (phone && phone.trim()) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          NOT: { id: userId },
        },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: `Số điện thoại ${phone} đã thuộc về nhân viên khác (${existingPhone.name})` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null;
    if (role !== undefined) updateData.role = role;
    if (address_district !== undefined) {
      updateData.address_district = address_district && address_district.trim() ? address_district.trim() : null;
      if (address_district && DISTRICT_COORDS[address_district]) {
        updateData.current_lat = DISTRICT_COORDS[address_district].lat;
        updateData.current_lng = DISTRICT_COORDS[address_district].lng;
      }
    }
    if (skills !== undefined) updateData.skills = skills && skills.trim() ? skills.trim() : null;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url && avatar_url.trim() ? avatar_url.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (operational_status !== undefined) updateData.operational_status = operational_status;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật nhân viên' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, avatar_url, name, phone, address_district, operational_status } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = typeof id === 'string' ? parseInt(id, 10) : Number(id);

    const updateData: any = {};
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address_district !== undefined) updateData.address_district = address_district;
    if (operational_status !== undefined) updateData.operational_status = operational_status;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Vui lòng cung cấp ID nhân viên cần xóa' }, { status: 400 });
    }

    const userId = parseInt(idParam, 10);

    // Clean up related relations first to prevent FK constraint failures
    await prisma.equipment.updateMany({
      where: { current_holder_id: userId },
      data: { current_holder_id: null },
    });

    await prisma.jobEquipmentAssignment.deleteMany({
      where: { transport_by_user_id: userId },
    });

    await prisma.jobStaff.deleteMany({
      where: { user_id: userId },
    });

    const fallbackUser = await prisma.user.findFirst({
      where: { NOT: { id: userId } },
    });
    if (fallbackUser) {
      await prisma.transaction.updateMany({
        where: { recorded_by: userId },
        data: { recorded_by: fallbackUser.id },
      });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa nhân viên thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa nhân viên' }, { status: 500 });
  }
}

