import { config } from './lib/config.js';
import app from './app.js';
import prisma from './lib/prisma.js';

async function main() {
  try {
    await prisma.$connect();
    console.log('✓ เชื่อมต่อฐานข้อมูล MySQL สำเร็จ');
  } catch (err) {
    console.error('✗ เชื่อมต่อฐานข้อมูลไม่สำเร็จ ตรวจสอบ DATABASE_URL ในไฟล์ .env');
    console.error(err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`✓ WMS API กำลังทำงานที่ http://localhost:${config.port}/api`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
