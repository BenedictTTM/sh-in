// Simple worker placeholder — replace with Bull/Agenda as needed
import { PrismaService } from '../prisma/prisma.service';

async function run() {
  const prisma = new PrismaService();
  await prisma.$connect();
  console.log('Worker started — placeholder job running every minute');
  setInterval(() => {
    try {

      console.log('Worker tick — no-op');
    } catch (err) {
      console.error('Worker error', err);
    }
  }, 60_000);
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
