import { NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetType = formData.get('targetType') as string | null; // 'equipment' | 'user'
    const targetId = formData.get('targetId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to AWS S3
    const s3Url = await uploadFileToS3(buffer, file.name, file.type || 'image/jpeg');

    // Automatically update target if targetType and targetId provided
    if (targetType === 'equipment' && targetId) {
      const equipId = parseInt(targetId, 10);
      const exists = await prisma.equipment.findUnique({ where: { id: equipId } });
      if (exists) {
        await prisma.equipment.update({
          where: { id: equipId },
          data: { image_url: s3Url },
        });
      }
    } else if (targetType === 'user' && targetId) {
      const userId = parseInt(targetId, 10);
      const exists = await prisma.user.findUnique({ where: { id: userId } });
      if (exists) {
        await prisma.user.update({
          where: { id: userId },
          data: { avatar_url: s3Url },
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: s3Url,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tải ảnh' }, { status: 500 });
  }
}
