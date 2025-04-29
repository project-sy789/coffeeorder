
/**
 * เครื่องมือแก้ไขปัญหาฐานข้อมูล Render โดยใช้ pg แพคเกจ
 * สำหรับรันเฉพาะบน Render shell เท่านั้น
 */

const { Pool } = require("pg");

// รับค่า DATABASE_URL จาก environment variable ในเซิร์ฟเวอร์
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("กรุณาตั้งค่า DATABASE_URL environment variable");
  process.exit(1);
}

// ตรวจสอบว่าเป็น Render internal database URL หรือไม่
const isInternalDb = DATABASE_URL.includes("internal") || 
                     DATABASE_URL.includes("postgresql.render.com") || 
                     DATABASE_URL.includes("postgres.render.com");

console.log("======================================");
console.log("🔧 RENDER DATABASE TROUBLESHOOTER 🔧");
console.log("======================================");
console.log(`URL ประเภท: ${isInternalDb ? "Internal Render Database" : "External Database"}`);

// ตั้งค่าการเชื่อมต่อตามประเภทของฐานข้อมูล
const poolConfig = {
  connectionString: DATABASE_URL,
  ssl: isInternalDb ? false : { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
};

console.log(`SSL: ${isInternalDb ? "ปิด (เหมาะสำหรับ internal)" : "เปิด (rejectUnauthorized: false)"}`);

// แสดงรายละเอียดข้อมูลการเชื่อมต่อ (ไม่แสดงข้อมูลสำคัญ)
try {
  const url = new URL(DATABASE_URL);
  console.log("ข้อมูลการเชื่อมต่อ:", {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.substring(1)
  });
} catch (e) {
  console.error("DATABASE_URL มีรูปแบบไม่ถูกต้อง:", e.message);
}

async function testConnection() {
  console.log("\nกำลังทดสอบการเชื่อมต่อฐานข้อมูล...");
  
  try {
    const pool = new Pool(poolConfig);
    
    console.log("กำลังเชื่อมต่อ...");
    const client = await pool.connect();
    console.log("✅ เชื่อมต่อสำเร็จ!");
    
    const result = await client.query("SELECT NOW() as time");
    console.log("✅ คำสั่ง SQL ทำงานได้!");
    console.log("⏰ เวลาปัจจุบันบนเซิร์ฟเวอร์:", result.rows[0].time);
    
    client.release();
    await pool.end();
    
    console.log("\n✅ ผลทดสอบฐานข้อมูล: ผ่าน");
    console.log("\nคำแนะนำสำหรับ Render:");
    console.log("1. ใช้ pg package กับฐานข้อมูล internal ของ Render");
    console.log("2. ปิดการใช้งาน SSL สำหรับ internal database (ssl: false)");
    console.log("3. จำกัดจำนวน connection (max: 3-5)");
    
    return true;
  } catch (error) {
    console.error("\n❌ ทดสอบฐานข้อมูลล้มเหลว:", error.message);
    
    console.log("\nวิธีการแก้ไขปัญหา:");
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
    console.error("เกิดข้อผิดพลาดที่ไม่คาดคิด:", err);
    process.exit(1);
  });

