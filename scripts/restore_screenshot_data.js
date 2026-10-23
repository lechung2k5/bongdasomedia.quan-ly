const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('Restoring exact schedule and dispatch data from user screenshot...');

  // Clear existing job assignments & jobs
  await prisma.jobEquipmentAssignment.deleteMany();
  await prisma.jobStaff.deleteMany();
  await prisma.job.deleteMany();

  // Find Users
  const leChung = await prisma.user.findFirst({ where: { name: { contains: 'Lê Chung' } } });
  const tuanKiet = await prisma.user.findFirst({ where: { name: { contains: 'Tuấn Kiệt' } } });
  const minhNhat = await prisma.user.findFirst({ where: { name: { contains: 'Minh Nhật' } } });
  const nhatHa = await prisma.user.findFirst({ where: { name: { contains: 'Nhật Hạ' } } });
  const quocBao = await prisma.user.findFirst({ where: { name: { contains: 'Quốc Bảo' } } });
  const vanPho = await prisma.user.findFirst({ where: { name: { contains: 'Văn Phố' } } });

  // Find Locations
  const sanHoanAnh = await prisma.location.findFirst({ where: { name: { contains: 'Hoàn Anh' } } });
  const sanBinhTan = await prisma.location.findFirst({ where: { name: { contains: 'Phủi Bình Tân' } } });
  const sanProlux = await prisma.location.findFirst({ where: { name: { contains: 'Prolux' } } });

  // Find Equipments
  const eqMsi = await prisma.equipment.findFirst({ where: { name: { contains: 'MSI (Balo có chữ B)' } } });
  const eqCamLon1 = await prisma.equipment.findFirst({ where: { name: { contains: 'Máy quay lớn 1' } } });
  const eqLoaAlokio2 = await prisma.equipment.findFirst({ where: { name: { contains: 'Loa Alokio 2' } } });
  const eqChanQuay3 = await prisma.equipment.findFirst({ where: { name: { contains: 'Chân quay 3' } } });
  const eqDayDienXam2 = await prisma.equipment.findFirst({ where: { name: { contains: 'Dây điện xám dài 2' } } });

  const eqDellVmix1 = await prisma.equipment.findFirst({ where: { name: { contains: 'Dell Vmix 1' } } });
  const eqCamNhoXam = await prisma.equipment.findFirst({ where: { name: { contains: 'Máy quay nhỏ (Túi xám)' } } });
  const eqLoaAlokio1 = await prisma.equipment.findFirst({ where: { name: { contains: 'Loa Alokio 1' } } });
  const eqDayDienXam1 = await prisma.equipment.findFirst({ where: { name: { contains: 'Dây điện xám dài 1' } } });
  const eqChanQuay1 = await prisma.equipment.findFirst({ where: { name: { contains: 'Chân quay 1' } } });

  const eqCamNhoDen = await prisma.equipment.findFirst({ where: { name: { contains: 'Máy quay nhỏ (Túi đen)' } } });
  const eqDayDienDo = await prisma.equipment.findFirst({ where: { name: { contains: 'Dây điện đỏ ngắn' } } });
  const eqDellVmix2 = await prisma.equipment.findFirst({ where: { name: { contains: 'Dell Vmix 2' } } });
  const eqLoaBtTo = await prisma.equipment.findFirst({ where: { name: { contains: 'Loa BT Blutooth to' } } });
  const eqChanQuay2 = await prisma.equipment.findFirst({ where: { name: { contains: 'Chân quay 2' } } });

  // Times on 23/10/2026:
  // 18:00 VN = 11:00 UTC
  // 19:30 VN = 12:30 UTC
  // 18:15 VN = 11:15 UTC
  // 19:45 VN = 12:45 UTC
  const startTimeHoanAnh = new Date('2026-10-23T11:00:00.000Z');
  const endTimeHoanAnh = new Date('2026-10-23T12:30:00.000Z');

  const startTimeBinhTan = new Date('2026-10-23T11:15:00.000Z');
  const endTimeBinhTan = new Date('2026-10-23T12:45:00.000Z');

  const startTimeProlux = new Date('2026-10-23T11:15:00.000Z');
  const endTimeProlux = new Date('2026-10-23T12:45:00.000Z');

  // JOB 1: Sân Hoàn Anh
  const job1 = await prisma.job.create({
    data: {
      title: 'Giao hữu sân 7 (1 trận, 1 sân) - Sân bóng đá Hoàn Anh',
      location_id: sanHoanAnh.id,
      job_type: 'LIVESTREAM',
      match_type: 'Giao hữu sân 7',
      match_count: 1,
      pitch_count: 1,
      camera_count: 1,
      start_time: startTimeHoanAnh,
      end_time: endTimeHoanAnh,
      price: 2000000,
      payment_status: 'UNPAID',
      paid_amount: 0,
      status: 'ASSIGNED',
      notes: 'Chung mang theo pin máy quay, ghé prolux chở balo laptop và balo máy quay. Kiệt ghé văn phòng chở loa và lều',
    },
  });

  // Staff Job 1: Lê Chung (BLV - CASTER), Tuấn Kiệt (Cam - CAMERAMAN)
  await prisma.jobStaff.createMany({
    data: [
      { job_id: job1.id, user_id: leChung.id, duty: 'CASTER', payout_amount: 450000, payout_status: 'PENDING' },
      { job_id: job1.id, user_id: tuanKiet.id, duty: 'CAMERAMAN', payout_amount: 500000, payout_status: 'PENDING' },
    ],
  });

  // Equipments Job 1:
  // Lê Chung (2 món): MSI (Balo có chữ B), Máy quay lớn 1 (balo)
  // Tuấn Kiệt (3 món): Loa Alokio 2 (Mic 2), Chân quay 3, Dây điện xám dài 2
  const eqJob1 = [
    { job_id: job1.id, equipment_id: eqMsi.id, transport_by_user_id: leChung.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job1.id, equipment_id: eqCamLon1.id, transport_by_user_id: leChung.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job1.id, equipment_id: eqLoaAlokio2.id, transport_by_user_id: tuanKiet.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job1.id, equipment_id: eqChanQuay3.id, transport_by_user_id: tuanKiet.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job1.id, equipment_id: eqDayDienXam2.id, transport_by_user_id: tuanKiet.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
  ];
  for (const eq of eqJob1) {
    await prisma.jobEquipmentAssignment.create({ data: eq });
  }

  // JOB 2: Sân Phủi Bình Tân
  const job2 = await prisma.job.create({
    data: {
      title: 'Giao hữu sân 7 (2 trận, 1 sân) - Sân bóng đá Phủi Bình Tân',
      location_id: sanBinhTan.id,
      job_type: 'LIVESTREAM',
      match_type: 'Giao hữu sân 7',
      match_count: 2,
      pitch_count: 1,
      camera_count: 1,
      start_time: startTimeBinhTan,
      end_time: endTimeBinhTan,
      price: 3500000,
      payment_status: 'UNPAID',
      paid_amount: 0,
      status: 'ASSIGNED',
      notes: 'Loa với chân quay có sẵn ở sân',
    },
  });

  // Staff Job 2: Minh Nhật (BLV - CASTER), Nhật Hạ (Cam - CAMERAMAN)
  await prisma.jobStaff.createMany({
    data: [
      { job_id: job2.id, user_id: minhNhat.id, duty: 'CASTER', payout_amount: 450000, payout_status: 'PENDING' },
      { job_id: job2.id, user_id: nhatHa.id, duty: 'CAMERAMAN', payout_amount: 500000, payout_status: 'PENDING' },
    ],
  });

  // Equipments Job 2:
  // Minh Nhật (5 món): Dell Vmix 1 (Balo đen), Máy quay nhỏ (Túi xám), Loa Alokio 1 (Mic băng keo), Dây điện xám dài 1, Chân quay 1
  const eqJob2 = [
    { job_id: job2.id, equipment_id: eqDellVmix1.id, transport_by_user_id: minhNhat.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job2.id, equipment_id: eqCamNhoXam.id, transport_by_user_id: minhNhat.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job2.id, equipment_id: eqLoaAlokio1.id, transport_by_user_id: minhNhat.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job2.id, equipment_id: eqDayDienXam1.id, transport_by_user_id: minhNhat.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job2.id, equipment_id: eqChanQuay1.id, transport_by_user_id: minhNhat.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
  ];
  for (const eq of eqJob2) {
    await prisma.jobEquipmentAssignment.create({ data: eq });
  }

  // JOB 3: Sân Prolux
  const job3 = await prisma.job.create({
    data: {
      title: 'Giao hữu sân 7 (2 trận, 1 sân) - Sân bóng đá Prolux',
      location_id: sanProlux.id,
      job_type: 'LIVESTREAM',
      match_type: 'Giao hữu sân 7',
      match_count: 2,
      pitch_count: 1,
      camera_count: 1,
      start_time: startTimeProlux,
      end_time: endTimeProlux,
      price: 3500000,
      payment_status: 'UNPAID',
      paid_amount: 0,
      status: 'ASSIGNED',
      notes: 'Loa và chân quay có sẵn ở sân',
    },
  });

  // Staff Job 3: Nguyễn Quốc Bảo (BLV - CASTER), Văn Phố (Cam - CAMERAMAN)
  await prisma.jobStaff.createMany({
    data: [
      { job_id: job3.id, user_id: quocBao.id, duty: 'CASTER', payout_amount: 450000, payout_status: 'PENDING' },
      { job_id: job3.id, user_id: vanPho.id, duty: 'CAMERAMAN', payout_amount: 500000, payout_status: 'PENDING' },
    ],
  });

  // Equipments Job 3:
  // Văn Phố (5 món): Máy quay nhỏ (Túi đen), Dây điện đỏ ngắn, Dell Vmix 2 (Balo nâu), Loa BT Blutooth to, Chân quay 2
  const eqJob3 = [
    { job_id: job3.id, equipment_id: eqCamNhoDen.id, transport_by_user_id: vanPho.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job3.id, equipment_id: eqDayDienDo.id, transport_by_user_id: vanPho.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job3.id, equipment_id: eqDellVmix2.id, transport_by_user_id: vanPho.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job3.id, equipment_id: eqLoaBtTo.id, transport_by_user_id: vanPho.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
    { job_id: job3.id, equipment_id: eqChanQuay2.id, transport_by_user_id: vanPho.id, check_in_status: 'PENDING', check_out_status: 'PENDING' },
  ];
  for (const eq of eqJob3) {
    await prisma.jobEquipmentAssignment.create({ data: eq });
  }

  // Reset all equipment status to AVAILABLE and Kho văn phòng
  await prisma.equipment.updateMany({
    data: {
      status: 'AVAILABLE',
      current_holder_id: null,
      current_location: 'Kho văn phòng',
    },
  });

  // Set users to IDLE & ready
  await prisma.user.updateMany({
    data: {
      operational_status: 'IDLE',
      is_app_active: false,
    },
  });

  console.log('Restored exactly the 3 jobs and assignments from the user screenshot!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
