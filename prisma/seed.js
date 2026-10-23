const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exact standardized operational data for Bong Da So Media ERP...');

  // Clean existing data in order
  await prisma.transaction.deleteMany();
  await prisma.jobEquipmentAssignment.deleteMany();
  await prisma.jobStaff.deleteMany();
  await prisma.job.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.equipmentCategory.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('staff123', salt);
  const adminPassword = await bcrypt.hash('admin123', salt);

  // 1. NẠP DỮ LIỆU NHÂN VIÊN (10 Users)
  const usersData = [
    {
      name: 'Lê Chung',
      phone: '0901111001',
      address_district: 'Gò Vấp',
      role: 'STAFF',
      skills: 'Bình Luận Viên, Kỹ thuật viên',
      current_lat: 10.8385,
      current_lng: 106.6650,
      operational_status: 'MOVING',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/lechung.png',
    },
    {
      name: 'Minh Nhật (admin)',
      phone: '0901111002',
      address_district: 'Bình Chánh',
      role: 'ADMIN',
      skills: 'Quản lý, bình luận viên, kỹ thuật viên',
      current_lat: 10.7180,
      current_lng: 106.6250,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/minhnhat.png',
    },
    {
      name: 'Nhật Hạ (admin)',
      phone: '0901111003',
      address_district: 'Bình Chánh',
      role: 'ADMIN',
      skills: 'Quản lý, quay phim, chụp hình',
      current_lat: 10.7190,
      current_lng: 106.6260,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/nhatha.png',
    },
    {
      name: 'Pé Hoàng',
      phone: '0901111004',
      address_district: 'Bình Tân',
      role: 'STAFF',
      skills: 'Quay phim',
      current_lat: 10.7620,
      current_lng: 106.6010,
      operational_status: 'WORKING',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/pehoang.png',
    },
    {
      name: 'Minh Tây Ninh',
      phone: '0901111005',
      address_district: 'Bình Chánh',
      role: 'STAFF',
      skills: 'Quay phim',
      current_lat: 10.7150,
      current_lng: 106.6300,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/thanhminh.png',
    },
    {
      name: 'Tuấn Kiệt',
      phone: '0901111006',
      address_district: 'Tân Bình',
      role: 'STAFF',
      skills: 'Quay phim',
      current_lat: 10.8010,
      current_lng: 106.6520,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/tuankiet.png',
    },
    {
      name: 'Quốc',
      phone: '0901111007',
      address_district: '?',
      role: 'STAFF',
      skills: 'Bình Luận Viên',
      current_lat: 10.7760,
      current_lng: 106.6670,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/quocPham.png',
    },
    {
      name: 'Bảo',
      phone: '0901111008',
      address_district: 'Bình Chánh',
      role: 'STAFF',
      skills: 'Bình Luận Viên, Chụp hình',
      current_lat: 10.7170,
      current_lng: 106.6220,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/tuongnguyen.png',
    },
    {
      name: 'Văn Phố',
      phone: '0901111009',
      address_district: 'Bình Chánh',
      role: 'STAFF',
      skills: 'Quay phim, chụp hình',
      current_lat: 10.7140,
      current_lng: 106.6280,
      operational_status: 'IDLE',
      avatar_url: 'https://bongdaso-user.s3.ap-southeast-1.amazonaws.com/avatars/nguyenvanpho.png',
    },
    {
      name: 'Nhân viên gọi ngoài theo trận',
      phone: '0901111010',
      address_district: 'Gọi theo trận',
      role: 'FREELANCER',
      skills: 'Gọi ngoài theo trận',
      current_lat: 10.7750,
      current_lng: 106.6800,
      operational_status: 'IDLE',
      avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        ...u,
        password: u.role === 'ADMIN' ? adminPassword : defaultPassword,
        last_location_update: new Date(),
      },
    });
    createdUsers.push(user);
  }
  console.log(`Created ${createdUsers.length} Users successfully.`);

  // 2. NẠP PHÂN LOẠI THIẾT BỊ (5 Categories)
  const catNames = ['Laptop, PC', 'Máy quay', 'Loa', 'Chân quay', 'Dây điện'];
  const createdCats = [];
  for (let i = 0; i < catNames.length; i++) {
    const cat = await prisma.equipmentCategory.create({
      data: {
        id: i + 1,
        name: catNames[i],
      },
    });
    createdCats.push(cat);
  }
  console.log(`Created ${createdCats.length} Equipment Categories.`);

  // 3. NẠP DANH MỤC 25 THIẾT BỊ (MÁY MÓC) KÈM ẢNH MINH HỌA
  const equipmentsData = [
    // Laptop, PC (Cat 1)
    {
      category_id: 1,
      name: 'Dell Vmix 1 (Balo đen)',
      qr_code: 'EQ-LAP-001',
      image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 1,
      name: 'Dell Vmix 1 (Balo nâu)',
      qr_code: 'EQ-LAP-002',
      image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 1,
      name: 'MSI (Balo có chữ B)',
      qr_code: 'EQ-LAP-003',
      image_url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 1,
      name: 'TUF (Balo hư khóa)',
      qr_code: 'EQ-LAP-004',
      image_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 1,
      name: 'PC Trạm vMix Studio',
      qr_code: 'EQ-PC-005',
      image_url: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=500&auto=format&fit=crop&q=80',
    },
    // Máy quay (Cat 2)
    {
      category_id: 2,
      name: 'Máy quay nhỏ (Túi đen)',
      qr_code: 'EQ-CAM-006',
      image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 2,
      name: 'Máy quay nhỏ (Túi xám)',
      qr_code: 'EQ-CAM-007',
      image_url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 2,
      name: 'Máy quay lớn 1 (balo)',
      qr_code: 'EQ-CAM-008',
      image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 2,
      name: 'Máy quay lớn 2 (túi xách)',
      qr_code: 'EQ-CAM-009',
      image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500&auto=format&fit=crop&q=80',
    },
    // Loa (Cat 3)
    {
      category_id: 3,
      name: 'Loa Dalton',
      qr_code: 'EQ-SPEAKER-010',
      image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 3,
      name: 'Loa BT Blutooth to',
      qr_code: 'EQ-SPEAKER-011',
      image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 3,
      name: 'Loa Alokio 1 (Mic băng keo)',
      qr_code: 'EQ-SPEAKER-012',
      image_url: 'https://images.unsplash.com/photo-1520523839898-50712140683a?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 3,
      name: 'Loa Alokio 2 (Mic 2)',
      qr_code: 'EQ-SPEAKER-013',
      image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 3,
      name: 'Loa nhỏ S1000 Nano',
      qr_code: 'EQ-SPEAKER-014',
      image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80',
    },
    // Chân quay (Cat 4)
    {
      category_id: 4,
      name: 'Chân quay 1',
      qr_code: 'EQ-TRIPOD-015',
      image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 4,
      name: 'Chân quay 2',
      qr_code: 'EQ-TRIPOD-016',
      image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 4,
      name: 'Chân quay 3',
      qr_code: 'EQ-TRIPOD-017',
      image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 4,
      name: 'Chân quay 4',
      qr_code: 'EQ-TRIPOD-018',
      image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
    },
    // Dây điện (Cat 5)
    {
      category_id: 5,
      name: 'Dây điện đỏ ngắn',
      qr_code: 'EQ-CABLE-019',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện xám ngắn',
      qr_code: 'EQ-CABLE-020',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện vàng dài',
      qr_code: 'EQ-CABLE-021',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện trắng dài',
      qr_code: 'EQ-CABLE-022',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện xám dài 1',
      qr_code: 'EQ-CABLE-023',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện xám dài 2',
      qr_code: 'EQ-CABLE-024',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
    {
      category_id: 5,
      name: 'Dây điện xám dài 3',
      qr_code: 'EQ-CABLE-025',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const createdEquipments = [];
  for (const eq of equipmentsData) {
    const item = await prisma.equipment.create({
      data: {
        ...eq,
        status: 'AVAILABLE',
      },
    });
    createdEquipments.push(item);
  }
  console.log(`Created ${createdEquipments.length} Equipment items.`);

  // 4. NẠP 18 SÂN BÓNG THƯỜNG XUYÊN TÁC NGHIỆP
  const locationsData = [
    { name: 'Sân bóng đá Prolux', address: 'Bình Tân, TP.HCM', latitude: 10.7485, longitude: 106.6025 },
    { name: 'Sân bóng đá Phủi Bình Tân', address: 'Bình Tân, TP.HCM', latitude: 10.7650, longitude: 106.5980 },
    { name: 'Sân bóng đá Cây Cám', address: 'Bình Hưng Hòa B, Bình Tân, TP.HCM', latitude: 10.7812, longitude: 106.5890 },
    { name: 'Sân bóng đá Hoàn Anh', address: 'Bình Chánh, TP.HCM', latitude: 10.7180, longitude: 106.6210 },
    { name: 'Sân bóng đá Gia Phú', address: 'Bình Hưng Hòa, Bình Tân, TP.HCM', latitude: 10.7950, longitude: 106.6050 },
    { name: 'Sân bóng đá H2', address: 'Tân Bình, TP.HCM', latitude: 10.8020, longitude: 106.6540 },
    { name: 'Sân bóng đá Thanh Thảo', address: 'Gò Vấp, TP.HCM', latitude: 10.8420, longitude: 106.6710 },
    { name: 'Sân bóng đá Phúc Lợi', address: 'Tân Bình, TP.HCM', latitude: 10.8120, longitude: 106.6480 },
    { name: 'Sân bóng đá Khôi Nguyên', address: 'Bình Chánh, TP.HCM', latitude: 10.7250, longitude: 106.6780 },
    { name: 'Sân bóng đá Hồng Ngọc', address: 'Bình Tân, TP.HCM', latitude: 10.7890, longitude: 106.6220 },
    { name: 'Sân bóng đá IFS Park', address: 'Gò Vấp, TP.HCM', latitude: 10.8350, longitude: 106.6620 },
    { name: 'Sân bóng đá Thăng Long', address: 'Tân Bình, TP.HCM', latitude: 10.8050, longitude: 106.6610 },
    { name: 'Sân bóng đá PM Sport', address: 'Bình Chánh, TP.HCM', latitude: 10.7120, longitude: 106.6350 },
    { name: 'Sân bóng đá Sông Quê', address: 'Bình Chánh, TP.HCM', latitude: 10.7020, longitude: 106.6190 },
    { name: 'Sân bóng đá Mizuki', address: 'Khu đô thị Mizuki Park, Bình Chánh, TP.HCM', latitude: 10.7150, longitude: 106.6690 },
    { name: 'Sân bóng đá Đại Long 1', address: 'Bình Chánh, TP.HCM', latitude: 10.7310, longitude: 106.6110 },
    { name: 'Sân bóng đá Quốc Hưng Arena', address: 'Gò Vấp, TP.HCM', latitude: 10.8560, longitude: 106.6750 },
    { name: 'Sân bóng đá Tân Tạo - Đức Hòa', address: 'Tân Tạo, Bình Chánh / Đức Hòa', latitude: 10.7720, longitude: 106.5410 },
  ];

  const createdLocations = [];
  for (const loc of locationsData) {
    const item = await prisma.location.create({
      data: loc,
    });
    createdLocations.push(item);
  }
  console.log(`Created ${createdLocations.length} Stadium Locations.`);

  // 5. TẠO CÁC JOB MẪU THỰC TẾ
  const now = new Date();

  // Job 1: Sân Phủi Bình Tân (Đang diễn ra)
  const job1 = await prisma.job.create({
    data: {
      title: 'Livestream Chung kết Giải Phủi Bình Tân League Cup',
      location_id: createdLocations[1].id, // Sân Phủi Bình Tân
      job_type: 'LIVESTREAM',
      start_time: new Date(now.getTime() - 30 * 60 * 1000), // Bắt đầu 30 phút trước
      end_time: new Date(now.getTime() + 90 * 60 * 1000),
      price: 4500000,
      status: 'IN_PROGRESS',
      notes: 'Trận đại chiến FC Anh Em vs FC Nam Sài Gòn. Cần 2 máy quay + 1 vMix bình luận.',
    },
  });

  // Job 2: Sân Hoàn Anh - Bình Chánh (Chiều nay)
  const job2 = await prisma.job.create({
    data: {
      title: 'Quay & Chụp Giải Doanh Nghiệp Bình Chánh Mở Rộng',
      location_id: createdLocations[3].id, // Sân Hoàn Anh
      job_type: 'BOTH',
      start_time: new Date(now.getTime() + 3 * 3600 * 1000),
      end_time: new Date(now.getTime() + 6 * 3600 * 1000),
      price: 6000000,
      status: 'ASSIGNED',
      notes: 'Giao cho nhóm Bình Chánh chở máy móc gần sân.',
    },
  });

  // Job 3: Sân Thanh Thảo - Gò Vấp (Đã hoàn thành hôm qua)
  const job3 = await prisma.job.create({
    data: {
      title: 'Livestream Giao Hữu Nghệ Sỹ Sài Gòn',
      location_id: createdLocations[6].id, // Sân Thanh Thảo
      job_type: 'LIVESTREAM',
      start_time: new Date(now.getTime() - 28 * 3600 * 1000),
      end_time: new Date(now.getTime() - 25 * 3600 * 1000),
      price: 5000000,
      status: 'COMPLETED',
      notes: 'Đã hoàn thành và thanh toán.',
    },
  });

  // 6. PHÂN CÔNG NHÂN SỰ CHO JOB (job_staff)
  // Job 1: Lê Chung (Cameraman), Pé Hoàng (vMix), Văn Phố (Caster)
  await prisma.jobStaff.createMany({
    data: [
      {
        job_id: job1.id,
        user_id: createdUsers[0].id, // Lê Chung
        duty: 'CAMERAMAN',
        payout_amount: 500000,
      },
      {
        job_id: job1.id,
        user_id: createdUsers[3].id, // Pé Hoàng
        duty: 'VMIX_OPERATOR',
        payout_amount: 600000,
      },
      {
        job_id: job1.id,
        user_id: createdUsers[8].id, // Văn Phố
        duty: 'CASTER',
        payout_amount: 450000,
      },
      // Job 2: Tuấn Kiệt, Bảo
      {
        job_id: job2.id,
        user_id: createdUsers[5].id, // Tuấn Kiệt
        duty: 'CAMERAMAN',
        payout_amount: 500000,
      },
      {
        job_id: job2.id,
        user_id: createdUsers[7].id, // Bảo
        duty: 'PHOTOGRAPHER',
        payout_amount: 600000,
      },
      // Job 3: Lê Chung, Minh Tây Ninh
      {
        job_id: job3.id,
        user_id: createdUsers[0].id, // Lê Chung
        duty: 'CAMERAMAN',
        payout_amount: 550000,
      },
      {
        job_id: job3.id,
        user_id: createdUsers[4].id, // Minh Tây Ninh
        duty: 'VMIX_OPERATOR',
        payout_amount: 650000,
      },
    ],
  });

  // 7. PHÂN CÔNG THIẾT BỊ, NGƯỜI CHỞ VÀ CHECK-IN / CHECK-OUT (job_equipment_assignments)
  // Lê Chung chở: Dell Vmix 1 (Balo đen) + Máy quay lớn 1 (balo)
  // Pé Hoàng chở: Loa Dalton + Chân quay 1 + Dây điện xám dài 1
  const eqDellVmix1 = createdEquipments[0];
  const eqCamLon1 = createdEquipments[7];
  const eqLoaDalton = createdEquipments[9];
  const eqChanQuay1 = createdEquipments[14];
  const eqDayDienXam = createdEquipments[22];

  await prisma.jobEquipmentAssignment.create({
    data: {
      job_id: job1.id,
      equipment_id: eqDellVmix1.id,
      transport_by_user_id: createdUsers[0].id, // Lê Chung chở
      check_in_status: 'CONFIRMED', // Đã lấy đồ đi
      check_in_time: new Date(now.getTime() - 50 * 60 * 1000),
      handover_notes: 'Balo đen còn nguyên tem sạc',
    },
  });

  await prisma.jobEquipmentAssignment.create({
    data: {
      job_id: job1.id,
      equipment_id: eqCamLon1.id,
      transport_by_user_id: createdUsers[0].id, // Lê Chung chở
      check_in_status: 'CONFIRMED',
      check_in_time: new Date(now.getTime() - 45 * 60 * 1000),
      handover_notes: 'Kèm túi phụ kiện và 2 pin dự phòng',
    },
  });

  await prisma.jobEquipmentAssignment.create({
    data: {
      job_id: job1.id,
      equipment_id: eqLoaDalton.id,
      transport_by_user_id: createdUsers[3].id, // Pé Hoàng chở
      check_in_status: 'CONFIRMED',
      check_in_time: new Date(now.getTime() - 40 * 60 * 1000),
      handover_notes: 'Loa kéo kèm 2 mic không dây',
    },
  });

  await prisma.jobEquipmentAssignment.create({
    data: {
      job_id: job1.id,
      equipment_id: eqChanQuay1.id,
      transport_by_user_id: createdUsers[3].id, // Pé Hoàng chở
      check_in_status: 'CONFIRMED',
      check_in_time: new Date(now.getTime() - 40 * 60 * 1000),
      handover_notes: 'Chân quay chắc chắn',
    },
  });

  await prisma.jobEquipmentAssignment.create({
    data: {
      job_id: job1.id,
      equipment_id: eqDayDienXam.id,
      transport_by_user_id: createdUsers[3].id, // Pé Hoàng chở
      check_in_status: 'CONFIRMED',
      check_in_time: new Date(now.getTime() - 40 * 60 * 1000),
      handover_notes: 'Cuộn dây 30m',
    },
  });

  // Cập nhật trạng thái thiết bị đang được sử dụng và người đang giữ
  await prisma.equipment.update({
    where: { id: eqDellVmix1.id },
    data: { status: 'IN_USE', current_holder_id: createdUsers[0].id },
  });
  await prisma.equipment.update({
    where: { id: eqCamLon1.id },
    data: { status: 'IN_USE', current_holder_id: createdUsers[0].id },
  });
  await prisma.equipment.update({
    where: { id: eqLoaDalton.id },
    data: { status: 'IN_USE', current_holder_id: createdUsers[3].id },
  });
  await prisma.equipment.update({
    where: { id: eqChanQuay1.id },
    data: { status: 'IN_USE', current_holder_id: createdUsers[3].id },
  });
  await prisma.equipment.update({
    where: { id: eqDayDienXam.id },
    data: { status: 'IN_USE', current_holder_id: createdUsers[3].id },
  });

  // Thiết bị hỏng: TUF (Balo hư khóa)
  await prisma.equipment.update({
    where: { id: createdEquipments[3].id }, // TUF
    data: { status: 'MAINTENANCE' },
  });

  // 8. NẠP DỮ LIỆU THU CHI (transactions)
  // Thu tiền từ Job 3 (Hoàn thành)
  await prisma.transaction.create({
    data: {
      job_id: job3.id,
      type: 'INCOME',
      category: 'CLIENT_PAYMENT',
      amount: 5000000,
      recorded_by: createdUsers[1].id, // Minh Nhật (admin)
      notes: 'Thanh toán hợp đồng livestream Giao hữu Nghệ sỹ',
      transaction_date: new Date(now.getTime() - 24 * 3600 * 1000),
    },
  });

  // Chi tiền công Job 3 cho Lê Chung
  await prisma.transaction.create({
    data: {
      job_id: job3.id,
      type: 'EXPENSE',
      category: 'STAFF_SALARY',
      amount: 550000,
      recorded_by: createdUsers[1].id,
      notes: 'Chi tiền công quay phim: Lê Chung (Sân Thanh Thảo)',
      transaction_date: new Date(now.getTime() - 20 * 3600 * 1000),
    },
  });

  // Chi tiền công Job 3 cho Minh Tây Ninh
  await prisma.transaction.create({
    data: {
      job_id: job3.id,
      type: 'EXPENSE',
      category: 'STAFF_SALARY',
      amount: 650000,
      recorded_by: createdUsers[1].id,
      notes: 'Chi tiền công kỹ thuật vMix: Minh Tây Ninh',
      transaction_date: new Date(now.getTime() - 20 * 3600 * 1000),
    },
  });

  // Chi phí sửa khóa Balo laptop TUF
  await prisma.transaction.create({
    data: {
      type: 'EXPENSE',
      category: 'MAINTENANCE',
      amount: 150000,
      recorded_by: createdUsers[1].id,
      notes: 'Thay dây kéo khóa balo laptop ASUS TUF',
      transaction_date: new Date(now.getTime() - 48 * 3600 * 1000),
    },
  });

  console.log('Seeded exact operational data successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
