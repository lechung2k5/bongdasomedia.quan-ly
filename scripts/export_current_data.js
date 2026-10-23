const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Exporting all data from current database...');

  const users = await prisma.user.findMany();
  const locations = await prisma.location.findMany();
  const equipmentCategories = await prisma.equipmentCategory.findMany();
  const equipments = await prisma.equipment.findMany();
  const jobs = await prisma.job.findMany({
    include: {
      staff: true,
      equipmentAssignments: true,
    }
  });
  const transactions = await prisma.transaction.findMany();
  const notifications = await prisma.notification.findMany();

  const exportData = {
    exportedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      locations: locations.length,
      equipmentCategories: equipmentCategories.length,
      equipments: equipments.length,
      jobs: jobs.length,
      transactions: transactions.length,
      notifications: notifications.length,
    },
    users,
    locations,
    equipmentCategories,
    equipments,
    jobs,
    transactions,
    notifications,
  };

  const outputPath = path.join(__dirname, 'db_dump_full.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

  console.log('Export completed successfully!');
  console.log('Summary:', exportData.counts);
  console.log('Saved to:', outputPath);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
