const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function run() {
  const jobs = await prisma.job.findMany({ include: { staff: true } });
  for (const job of jobs) {
    const mCount = job.match_count || 1;
    for (const s of job.staff) {
      let amount = 200000 * mCount;
      if (s.duty === 'CASTER') amount = 300000 * mCount;
      else if (s.duty === 'CAMERAMAN') amount = 200000 * mCount;
      else if (s.duty === 'PHOTOGRAPHER') amount = 400000 * mCount;
      else if (s.duty === 'VMIX_OPERATOR') amount = 300000 * mCount;

      await prisma.jobStaff.update({
        where: { id: s.id },
        data: { payout_amount: amount },
      });
      console.log(`Job ${job.id} (${mCount} trận) - Staff ${s.id} [${s.duty}]: ${amount} đ`);
    }
  }
}

run()

  .catch(console.error)
  .finally(() => prisma.$disconnect());
