const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const region = process.env.AWS_REGION || 'ap-southeast-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'bongdaso-user';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const avatarMappings = [
  { fileName: 'lechung.png', userName: 'Lê Chung' },
  { fileName: 'minhnhat.png', userName: 'Minh Nhật (admin)' },
  { fileName: 'nhatha.png', userName: 'Nhật Hạ (admin)' },
  { fileName: 'pehoang.png', userName: 'Pé Hoàng' },
  { fileName: 'thanhminh.png', userName: 'Minh Tây Ninh' },
  { fileName: 'tuankiet.png', userName: 'Tuấn Kiệt' },
  { fileName: 'quocPham.png', userName: 'Quốc' },
  { fileName: 'tuongnguyen.png', userName: 'Bảo' },
  { fileName: 'nguyenvanpho.png', userName: 'Văn Phố' },
];

async function uploadFileToS3(filePath, keyName) {
  const fileContent = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: keyName,
    Body: fileContent,
    ContentType: 'image/png',
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${keyName}`;
}

async function main() {
  console.log(`Starting upload of staff avatars to AWS S3 bucket: ${BUCKET_NAME}...`);
  const avatarDir = path.join(__dirname, '..', 'public', 'avatar_nhanVien');

  if (!fs.existsSync(avatarDir)) {
    console.error(`Folder not found: ${avatarDir}`);
    process.exit(1);
  }

  const uploadedResults = [];

  for (const item of avatarMappings) {
    const filePath = path.join(avatarDir, item.fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const s3Key = `avatars/${item.fileName}`;
    try {
      console.log(`Uploading ${item.fileName} for ${item.userName}...`);
      const s3Url = await uploadFileToS3(filePath, s3Key);
      console.log(`-> S3 URL: ${s3Url}`);

      // Update database user
      const user = await prisma.user.findFirst({
        where: { name: item.userName },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar_url: s3Url },
        });
        console.log(`✓ Updated DB avatar_url for user "${user.name}" (ID: ${user.id})`);
      } else {
        console.warn(`User with name "${item.userName}" not found in DB`);
      }

      uploadedResults.push({
        userName: item.userName,
        fileName: item.fileName,
        s3Url,
      });
    } catch (err) {
      console.error(`Error uploading ${item.fileName}:`, err);
    }
  }

  console.log('\n--- UPLOAD SUMMARY ---');
  console.log(JSON.stringify(uploadedResults, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
