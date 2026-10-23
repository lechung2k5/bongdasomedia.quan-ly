import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, latitude, longitude } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên sân bóng là bắt buộc' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, address, latitude, longitude } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (latitude !== undefined) {
      updateData.latitude = latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude !== null && longitude !== '' ? parseFloat(longitude) : null;
    }

    const location = await prisma.location.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(location);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
