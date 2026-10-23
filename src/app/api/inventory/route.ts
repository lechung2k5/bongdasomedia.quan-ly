import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status');

    const where: any = {};
    if (categoryId && categoryId !== 'ALL') {
      where.category_id = parseInt(categoryId, 10);
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [equipments, categories] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          category: true,
          currentHolder: {
            select: {
              id: true,
              name: true,
              phone: true,
              address_district: true,
              avatar_url: true,
              status: true,
            },
          },
          assignments: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  start_time: true,
                  end_time: true,
                  status: true,
                  location: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              transportByUser: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  address_district: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
            take: 3,
          },
        },
        orderBy: [{ category_id: 'asc' }, { id: 'asc' }],
      }),
      prisma.equipmentCategory.findMany({
        include: {
          _count: {
            select: { equipments: true },
          },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    return NextResponse.json({
      equipments,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category_id, qr_code, image_url, status = 'AVAILABLE', current_location = 'Kho văn phòng' } = body;

    if (!name || !category_id) {
      return NextResponse.json(
        { error: 'Vui lòng điền tên thiết bị và chọn phân loại' },
        { status: 400 }
      );
    }

    const newEquipment = await prisma.equipment.create({
      data: {
        name,
        category_id: parseInt(category_id, 10),
        status,
        current_location: current_location || 'Kho văn phòng',
        image_url: image_url || null,
        qr_code: qr_code || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(newEquipment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category_id, status, current_holder_id, qr_code, image_url, current_location } = body;

    if (!id) {
      return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 });
    }

    const equipId = typeof id === 'string' ? parseInt(id, 10) : Number(id);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category_id !== undefined) updateData.category_id = parseInt(category_id, 10);
    if (status !== undefined) updateData.status = status;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (current_location !== undefined) updateData.current_location = current_location;
    if (current_holder_id !== undefined) {
      updateData.current_holder_id = current_holder_id ? parseInt(current_holder_id, 10) : null;
    }
    if (qr_code !== undefined) updateData.qr_code = qr_code;

    const updated = await prisma.equipment.update({
      where: { id: equipId },
      data: updateData,
      include: {
        category: true,
        currentHolder: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Equipment ID is required' }, { status: 400 });
    }

    const equipId = parseInt(id, 10);

    await prisma.equipment.delete({
      where: { id: equipId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
