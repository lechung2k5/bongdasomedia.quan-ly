const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const dumpPath = path.join(__dirname, 'db_dump_full.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('File db_dump_full.json not found!');
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  console.log('Importing data into production database...');
  console.log('Source export date:', dump.exportedAt);

  // 1. Users
  console.log(`Importing ${dump.users.length} users...`);
  for (const u of dump.users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        phone: u.phone,
        password: u.password,
        address_district: u.address_district,
        role: u.role,
        skills: u.skills,
        status: u.status,
        operational_status: u.operational_status,
        is_app_active: u.is_app_active,
        avatar_url: u.avatar_url,
        current_lat: u.current_lat,
        current_lng: u.current_lng,
      },
      create: {
        id: u.id,
        name: u.name,
        phone: u.phone,
        password: u.password,
        address_district: u.address_district,
        role: u.role,
        skills: u.skills,
        status: u.status,
        operational_status: u.operational_status,
        is_app_active: u.is_app_active,
        avatar_url: u.avatar_url,
        current_lat: u.current_lat,
        current_lng: u.current_lng,
      },
    });
  }

  // 2. Locations
  console.log(`Importing ${dump.locations.length} locations...`);
  for (const loc of dump.locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
      create: {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
    });
  }

  // 3. Equipment Categories
  console.log(`Importing ${dump.equipmentCategories.length} equipment categories...`);
  for (const cat of dump.equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: { id: cat.id, name: cat.name },
    });
  }

  // 4. Equipments
  console.log(`Importing ${dump.equipments.length} equipments...`);
  for (const eq of dump.equipments) {
    await prisma.equipment.upsert({
      where: { id: eq.id },
      update: {
        name: eq.name,
        category_id: eq.category_id,
        image_url: eq.image_url,
        status: eq.status,
        qr_code: eq.qr_code,
        current_holder_id: eq.current_holder_id,
        current_location: eq.current_location,
      },
      create: {
        id: eq.id,
        name: eq.name,
        category_id: eq.category_id,
        image_url: eq.image_url,
        status: eq.status,
        qr_code: eq.qr_code,
        current_holder_id: eq.current_holder_id,
        current_location: eq.current_location,
      },
    });
  }

  // 5. Jobs & Assignments
  console.log(`Importing ${dump.jobs.length} jobs with staff and equipment assignments...`);
  for (const j of dump.jobs) {
    const jobData = {
      title: j.title,
      location_id: j.location_id,
      job_type: j.job_type,
      match_type: j.match_type,
      match_count: j.match_count,
      pitch_count: j.pitch_count,
      camera_count: j.camera_count,
      has_photo: j.has_photo,
      live_price: j.live_price,
      photo_fee: j.photo_fee,
      duration_hours: j.duration_hours,
      is_deposited: j.is_deposited,
      deposit_amount: j.deposit_amount,
      start_time: new Date(j.start_time),
      end_time: new Date(j.end_time),
      price: j.price,
      payment_status: j.payment_status,
      paid_amount: j.paid_amount,
      payment_proof_url: j.payment_proof_url,
      payment_notes: j.payment_notes,
      status: j.status,
      notes: j.notes,
      equipment_photo_url: j.equipment_photo_url,
    };

    const existingJob = await prisma.job.findUnique({ where: { id: j.id } });
    let jobId = j.id;
    if (existingJob) {
      await prisma.job.update({ where: { id: j.id }, data: jobData });
    } else {
      const created = await prisma.job.create({ data: { id: j.id, ...jobData } });
      jobId = created.id;
    }

    // Recreate staff
    await prisma.jobStaff.deleteMany({ where: { job_id: jobId } });
    if (j.staff && j.staff.length > 0) {
      for (const st of j.staff) {
        await prisma.jobStaff.create({
          data: {
            job_id: jobId,
            user_id: st.user_id,
            external_name: st.external_name,
            external_duty: st.external_duty,
            duty: st.duty,
            payout_amount: st.payout_amount,
            payout_status: st.payout_status,
            paid_at: st.paid_at ? new Date(st.paid_at) : null,
            payout_proof_url: st.payout_proof_url,
            payout_notes: st.payout_notes,
          },
        });
      }
    }

    // Recreate equipment assignments
    await prisma.jobEquipmentAssignment.deleteMany({ where: { job_id: jobId } });
    if (j.equipmentAssignments && j.equipmentAssignments.length > 0) {
      for (const eqAssign of j.equipmentAssignments) {
        await prisma.jobEquipmentAssignment.create({
          data: {
            job_id: jobId,
            equipment_id: eqAssign.equipment_id,
            transport_by_user_id: eqAssign.transport_by_user_id,
            check_in_status: eqAssign.check_in_status,
            check_out_status: eqAssign.check_out_status,
            check_in_time: eqAssign.check_in_time ? new Date(eqAssign.check_in_time) : null,
            check_out_time: eqAssign.check_out_time ? new Date(eqAssign.check_out_time) : null,
            stadium_check_in_time: eqAssign.stadium_check_in_time ? new Date(eqAssign.stadium_check_in_time) : null,
            check_in_photo_url: eqAssign.check_in_photo_url,
            check_out_photo_url: eqAssign.check_out_photo_url,
            handover_notes: eqAssign.handover_notes,
            check_out_notes: eqAssign.check_out_notes,
            return_location_type: eqAssign.return_location_type,
            return_location_name: eqAssign.return_location_name,
          },
        });
      }
    }
  }

  console.log('✅ Import completed successfully! Database is completely synced.');
}

main()
  .catch(e => {
    console.error('Import error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
