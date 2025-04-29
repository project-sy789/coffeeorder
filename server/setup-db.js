// ไฟล์สำหรับสร้างข้อมูลเริ่มต้นสำหรับร้านกาแฟ
// ใช้งานโดยรัน: node server/setup-db.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// สีสำหรับแสดงข้อความในคอนโซล
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

/**
 * แสดงข้อความในคอนโซลพร้อมสี
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// โหลด .env หากมี
try {
  const dotenv = require('dotenv');
  if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
    log('✅ โหลด .env.local สำเร็จ', colors.green);
  } else if (fs.existsSync('.env')) {
    dotenv.config();
    log('✅ โหลด .env สำเร็จ', colors.green);
  }
} catch (err) {
  log('⚠️ ไม่สามารถโหลดไฟล์ .env ได้: ' + err.message, colors.yellow);
}

// ตรวจสอบการตั้งค่า DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  log('❌ ไม่พบ DATABASE_URL ในตัวแปรแวดล้อม กรุณาตั้งค่าก่อนใช้งาน', colors.red);
  process.exit(1);
}

log('\n🔄 กำลังเชื่อมต่อกับฐานข้อมูล...', colors.cyan);

// ตรวจสอบว่าเป็น Render internal database URL หรือไม่
const isInternalDb = DATABASE_URL.includes("internal") || 
                    DATABASE_URL.includes("postgresql.render.com") || 
                    DATABASE_URL.includes("postgres.render.com");

// ตั้งค่าการเชื่อมต่อตามประเภทของฐานข้อมูล
const poolConfig = isInternalDb
  ? {
      connectionString: DATABASE_URL,
      ssl: false,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    }
  : {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    };

log(`📊 รายละเอียดการเชื่อมต่อ:`, colors.blue);
log(`- URL ประเภท: ${isInternalDb ? "Internal Render Database" : "External Database"}`, colors.blue);
log(`- SSL: ${isInternalDb ? "Disabled" : "Enabled (rejectUnauthorized: false)"}`, colors.blue);

// แสดงข้อมูลโฮสต์และฐานข้อมูล (ไม่เปิดเผยข้อมูลสำคัญ)
try {
  const url = new URL(DATABASE_URL);
  log(`- โฮสต์: ${url.hostname}`, colors.blue);
  log(`- ฐานข้อมูล: ${url.pathname.substring(1)}`, colors.blue);
} catch (e) {
  log(`⚠️ รูปแบบ URL ไม่ถูกต้อง: ${e.message}`, colors.yellow);
}

// สร้างการเชื่อมต่อ
const pool = new Pool(poolConfig);

// ข้อมูลการตั้งค่าเริ่มต้น
const initialSettings = [
  { key: 'store_name', value: 'คาเฟ่ของฉัน', description: 'ชื่อร้าน' },
  { key: 'store_status', value: 'open', description: 'สถานะร้าน (open/closed)' },
  { key: 'store_address', value: '123 ถนนสุขุมวิท กรุงเทพ 10110', description: 'ที่อยู่ร้าน' },
  { key: 'store_phone', value: '02-123-4567', description: 'เบอร์โทรร้าน' },
  { key: 'store_open_time', value: '08:00', description: 'เวลาเปิดร้าน' },
  { key: 'store_close_time', value: '20:00', description: 'เวลาปิดร้าน' },
];

// ข้อมูลผู้ใช้เริ่มต้น (admin)
const adminUser = {
  username: 'admin',
  password: '$2b$10$vSK.BXj7ykND5TkVuV1lj.dvnTfMJp94ZBVzDY29pTvh7oRZKAGJm', // admin123
  role: 'admin',
  name: 'ผู้ดูแลระบบ'
};

// ฟังก์ชันสำหรับตรวจสอบข้อมูลที่มีอยู่แล้ว
async function checkExistingData() {
  try {
    // ตรวจสอบการตั้งค่า
    const settingsResult = await pool.query('SELECT COUNT(*) FROM settings');
    const settingsCount = parseInt(settingsResult.rows[0].count);
    
    // ตรวจสอบผู้ใช้
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const usersCount = parseInt(usersResult.rows[0].count);
    
    return {
      hasSettings: settingsCount > 0,
      hasUsers: usersCount > 0,
      settingsCount,
      usersCount
    };
  } catch (error) {
    log(`⚠️ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: ${error.message}`, colors.yellow);
    return { hasSettings: false, hasUsers: false, error: true };
  }
}

// ฟังก์ชันเพิ่มข้อมูลการตั้งค่า
async function insertSettings() {
  try {
    for (const setting of initialSettings) {
      // ตรวจสอบก่อนว่ามีข้อมูลการตั้งค่านี้แล้วหรือไม่
      const existResult = await pool.query('SELECT COUNT(*) FROM settings WHERE key = $1', [setting.key]);
      const exists = parseInt(existResult.rows[0].count) > 0;
      
      if (exists) {
        log(`ℹ️ การตั้งค่า '${setting.key}' มีอยู่แล้ว`, colors.blue);
      } else {
        await pool.query(
          'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)',
          [setting.key, setting.value, setting.description]
        );
        log(`✅ เพิ่มการตั้งค่า '${setting.key}' สำเร็จ`, colors.green);
      }
    }
    return true;
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการเพิ่มการตั้งค่า: ${error.message}`, colors.red);
    return false;
  }
}

// ฟังก์ชันเพิ่มผู้ใช้ admin
async function insertAdminUser() {
  try {
    // ตรวจสอบก่อนว่ามี admin แล้วหรือไม่
    const existResult = await pool.query('SELECT COUNT(*) FROM users WHERE username = $1', [adminUser.username]);
    const exists = parseInt(existResult.rows[0].count) > 0;
    
    if (exists) {
      log(`ℹ️ ผู้ใช้ '${adminUser.username}' มีอยู่แล้ว`, colors.blue);
    } else {
      await pool.query(
        'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)',
        [adminUser.username, adminUser.password, adminUser.role, adminUser.name]
      );
      log(`✅ เพิ่มผู้ใช้ '${adminUser.username}' สำเร็จ (รหัสผ่าน: admin123)`, colors.green);
    }
    return true;
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการเพิ่มผู้ใช้: ${error.message}`, colors.red);
    return false;
  }
}

// ฟังก์ชันหลัก
async function main() {
  log('\n==================================================', colors.bright + colors.cyan);
  log('🚀 เครื่องมือสร้างข้อมูลเริ่มต้นสำหรับร้านกาแฟ', colors.bright + colors.cyan);
  log('==================================================\n', colors.bright + colors.cyan);
  
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    const client = await pool.connect();
    log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ', colors.green);
    
    try {
      // ตรวจสอบการมีอยู่ของตาราง
      const tablesQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('settings', 'users', 'products', 'categories')
      `;
      const tablesResult = await client.query(tablesQuery);
      const tables = tablesResult.rows.map(row => row.table_name);
      
      log('\n📋 ตารางที่พบในฐานข้อมูล:', colors.cyan);
      if (tables.length === 0) {
        log('❌ ไม่พบตารางในฐานข้อมูล กรุณารัน migration ก่อน', colors.red);
        return;
      } else {
        tables.forEach(table => {
          log(`- ${table}`, colors.green);
        });
      }
      
      // ตรวจสอบข้อมูลที่มีอยู่แล้ว
      const existingData = await checkExistingData();
      log('\n📊 ข้อมูลในฐานข้อมูล:', colors.cyan);
      if (existingData.error) {
        log('⚠️ ไม่สามารถตรวจสอบข้อมูลได้', colors.yellow);
      } else {
        log(`- การตั้งค่า: ${existingData.settingsCount} รายการ`, colors.blue);
        log(`- ผู้ใช้: ${existingData.usersCount} คน`, colors.blue);
      }
      
      // เพิ่มข้อมูลเริ่มต้น
      log('\n🔄 กำลังเพิ่มข้อมูลเริ่มต้น...', colors.cyan);
      
      // เพิ่มการตั้งค่า
      const settingsResult = await insertSettings();
      
      // เพิ่มผู้ใช้ admin
      const adminResult = await insertAdminUser();
      
      // แสดงผลสรุป
      log('\n==================================================', colors.bright + colors.cyan);
      log('✅ การสร้างข้อมูลเริ่มต้นเสร็จสิ้น', colors.bright + colors.green);
      log('==================================================', colors.bright + colors.cyan);
      log('\nข้อมูลการเข้าสู่ระบบ:', colors.bright);
      log('- ชื่อผู้ใช้: admin', colors.bright);
      log('- รหัสผ่าน: admin123', colors.bright);
      log('\nคุณสามารถเข้าสู่ระบบด้วยข้อมูลนี้ได้ทันที', colors.bright);
      
    } finally {
      client.release();
    }
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ${error.message}`, colors.red);
  } finally {
    // ปิดการเชื่อมต่อ pool
    await pool.end();
  }
}

// รันฟังก์ชันหลัก
main()
  .catch(error => {
    log(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}`, colors.red);
    log(`Stack trace: ${error.stack}`, colors.red);
    process.exit(1);
  });