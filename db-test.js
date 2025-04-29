// ไฟล์ทดสอบการเชื่อมต่อฐานข้อมูล Render

const { Pool } = require('pg');
const fs = require('fs');

// ข้อความสี
function colorText(text, colorCode) {
  return `${colorCode}${text}\x1b[0m`;
}

// โหลด .env หากมี
try {
  if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
    console.log(colorText('✅ โหลดไฟล์ .env.local สำเร็จ', '\x1b[32m'));
  } else if (fs.existsSync('.env')) {
    require('dotenv').config();
    console.log(colorText('✅ โหลดไฟล์ .env สำเร็จ', '\x1b[32m'));
  }
} catch (err) {
  console.error(colorText('⚠️ ไม่สามารถโหลดไฟล์ .env ได้', '\x1b[33m'));
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(colorText('❌ ไม่พบ DATABASE_URL', '\x1b[31m'));
  process.exit(1);
}

console.log('================================================================');
console.log(colorText('🔍 ทดสอบการเชื่อมต่อฐานข้อมูลบน Render', '\x1b[36m'));
console.log('================================================================');

// ตรวจสอบว่าเป็น Render internal database URL หรือไม่
const isInternalDb = DATABASE_URL.includes("internal") || 
                     DATABASE_URL.includes("postgresql.render.com") || 
                     DATABASE_URL.includes("postgres.render.com");

console.log(`URL ประเภท: ${isInternalDb ? "Internal Render Database" : "External Database"}`);

// แสดงข้อมูลการเชื่อมต่อโดยไม่เปิดเผยข้อมูลสำคัญ
try {
  const url = new URL(DATABASE_URL);
  console.log("ข้อมูลการเชื่อมต่อ:", {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.substring(1)
  });
} catch (e) {
  console.error(colorText("DATABASE_URL มีรูปแบบไม่ถูกต้อง:", '\x1b[31m'), e.message);
}

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
      connectionTimeoutMillis: 5000
    };

console.log(`SSL: ${isInternalDb ? "ปิด (สำหรับ internal database)" : "เปิด (rejectUnauthorized: false)"}`);
console.log(`Max connections: ${poolConfig.max}`);
console.log(`Connection timeout: ${poolConfig.connectionTimeoutMillis}ms`);

async function testConnection() {
  console.log(colorText("\nกำลังทดสอบการเชื่อมต่อฐานข้อมูล...", '\x1b[36m'));
  
  try {
    const pool = new Pool(poolConfig);
    
    console.log("กำลังเชื่อมต่อ...");
    const client = await pool.connect();
    console.log(colorText("✅ เชื่อมต่อสำเร็จ!", '\x1b[32m'));
    
    const result = await client.query("SELECT NOW() as time");
    console.log(colorText("✅ คำสั่ง SQL ทำงานได้!", '\x1b[32m'));
    console.log("⏰ เวลาปัจจุบันบนเซิร์ฟเวอร์:", result.rows[0].time);
    
    client.release();
    await pool.end();
    
    console.log(colorText("\n✅ ผลทดสอบฐานข้อมูล: ผ่าน", '\x1b[32m'));
    return true;
  } catch (error) {
    console.error(colorText("\n❌ ทดสอบฐานข้อมูลล้มเหลว:", '\x1b[31m'), error.message);
    
    console.log(colorText("\nวิธีการแก้ไขปัญหา:", '\x1b[36m'));
    if (isInternalDb) {
      console.log("- ตรวจสอบว่า internal database ทำงานอยู่");
      console.log("- ตั้งค่า ssl: false สำหรับ internal database");
      console.log("- ลองสร้าง internal database ใหม่");
    } else {
      console.log("- ตรวจสอบว่า DATABASE_URL ถูกต้อง");
      console.log("- ตรวจสอบว่าฐานข้อมูลอนุญาตให้เชื่อมต่อจาก Render");
      console.log("- ลองใช้ internal database ของ Render แทน");
    }
    
    return false;
  }
}

// รันการทดสอบ
testConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(colorText("เกิดข้อผิดพลาดที่ไม่คาดคิด:", '\x1b[31m'), err);
    process.exit(1);
  });