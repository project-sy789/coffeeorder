/**
 * สคริปต์เริ่มต้นเซิร์ฟเวอร์สำหรับระบบคาเฟ่ของฉัน POS
 * ใช้ในการเริ่มต้นเซิร์ฟเวอร์บนสภาพแวดล้อมการใช้งานจริง
 */

// ระบบการแสดงผลล็อก
function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// จัดการกับข้อผิดพลาดที่ไม่ได้จัดการ
process.on('uncaughtException', (error) => {
  log('เกิดข้อผิดพลาดที่ไม่ได้จัดการ (uncaughtException):', 'red');
  log(error.stack || error.toString(), 'red');
  log('กำลังพยายามรันต่อไป...', 'yellow');
});

process.on('unhandledRejection', (reason, promise) => {
  log('เกิดข้อผิดพลาดที่ไม่ได้จัดการ (unhandledRejection):', 'red');
  log(`${reason}`, 'red');
  log('กำลังพยายามรันต่อไป...', 'yellow');
});

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env และ .env.local (ถ้ามี)
try {
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');
  
  // โหลด .env.production ก่อน (ค่าเริ่มต้น)
  const envProductionPath = path.resolve(process.cwd(), '.env.production');
  if (fs.existsSync(envProductionPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envProductionPath));
    for (const k in envConfig) {
      if (!process.env[k]) {
        process.env[k] = envConfig[k];
      }
    }
    log('โหลดตัวแปรสภาพแวดล้อมจาก .env.production', 'blue');
  }
  
  // โหลด .env.local ทีหลัง (ค่าที่กำหนดเอง)
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
      if (!process.env[k]) {
        process.env[k] = envConfig[k];
      }
    }
    log('โหลดตัวแปรสภาพแวดล้อมจาก .env.local', 'blue');
  }
} catch (error) {
  log(`ไม่สามารถโหลดไฟล์ .env: ${error.message}`, 'yellow');
}

// เริ่มกระบวนการหลัก
log('กำลังเริ่มต้นเซิร์ฟเวอร์ POS คาเฟ่...', 'cyan');

// ดึงข้อมูลสภาพแวดล้อม
const PORT = process.env.PORT || 5000;
log(`พอร์ตที่กำหนด: ${PORT}`, 'yellow');

// ตรวจสอบโหมดการทำงาน
if (process.env.NODE_ENV === 'production') {
  log('โหมดการทำงาน: Production', 'green');
} else {
  log('โหมดการทำงาน: Development', 'yellow');
}

// ตรวจสอบตัวแปรฐานข้อมูล
if (process.env.DATABASE_URL) {
  // ไม่แสดง DATABASE_URL เต็มเพื่อความปลอดภัย
  const dbUrlMasked = process.env.DATABASE_URL.replace(/:\/\/.*@/, '://****@');
  log(`พบการกำหนดค่า DATABASE_URL: ${dbUrlMasked}`, 'green');
} else {
  log('ไม่พบการกำหนดค่า DATABASE_URL จะใช้การเก็บข้อมูลในหน่วยความจำแทน', 'yellow');
}

// แสดงตัวแปรแวดล้อมอื่นๆ ที่สำคัญ (ไม่รวมค่าลับ)
log('ตัวแปรแวดล้อมอื่นๆ:', 'cyan');
log(`- NODE_ENV: ${process.env.NODE_ENV || 'ไม่ได้กำหนด'}`, 'blue');
log(`- PORT: ${process.env.PORT || 'ไม่ได้กำหนด (ใช้ค่าเริ่มต้น 5000)'}`, 'blue');
log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'กำหนดแล้ว' : 'ไม่ได้กำหนด'}`, 'blue');
log(`- ADMIN_RESET_SECRET: ${process.env.ADMIN_RESET_SECRET ? 'กำหนดแล้ว' : 'ไม่ได้กำหนด'}`, 'blue');

// รันเซิร์ฟเวอร์ด้วยการโหลดไฟล์ build
try {
  log('กำลังโหลดแอปพลิเคชัน...', 'blue');
  // นำเข้าไฟล์หลักที่ผ่านการ build แล้ว
  import('./dist/index.js')
    .then(() => {
      log('เซิร์ฟเวอร์เริ่มต้นเรียบร้อยแล้ว! 🚀', 'green');
      log(`เข้าถึงแอปพลิเคชันได้ที่: http://localhost:${PORT}`, 'cyan');
    })
    .catch((err) => {
      log(`เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน:`, 'red');
      log(err.stack || err.toString(), 'red');
      
      if (err.message.includes('DATABASE_URL') || err.message.includes('database')) {
        log('ปัญหาเกี่ยวกับฐานข้อมูล - ตรวจสอบว่า DATABASE_URL ถูกต้องหรือไม่', 'yellow');
      }
      
      process.exit(1);
    });
} catch (err) {
  log(`เกิดข้อผิดพลาดขณะเริ่มต้นเซิร์ฟเวอร์:`, 'red');
  log(err.stack || err.toString(), 'red');
  process.exit(1);
}