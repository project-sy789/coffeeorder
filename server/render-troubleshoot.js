/**
 * ไฟล์นี้เป็นเครื่องมือสำหรับการแก้ไขปัญหาฐานข้อมูลบน Render.com
 * 
 * คำแนะนำ:
 * 1. ตั้งค่า environment variables ที่จำเป็นบน Render.com dashboard:
 *   - DATABASE_URL: เป็น internal connection string จาก PostgreSQL service
 *   - RENDER_DB_FIX_MODE: ตั้งเป็น "true" เพื่อเปิดใช้งานการแก้ไขปัญหา
 * 
 * 2. ถ้าใช้ Render internal database URL ให้ใช้รูปแบบนี้:
 *   - postgresql://[username]:[password]@[host-internal]:[port]/[database]
 * 
 * 3. รันคำสั่งนี้เพื่อทดสอบการเชื่อมต่อฐานข้อมูล:
 *   - node server/render-troubleshoot.js
 */

// Import dependencies
const { Pool } = require('@neondatabase/serverless');

// โหลด .env ถ้าไม่ใช่บน production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('กรุณาตั้งค่า DATABASE_URL ใน environment variables');
  process.exit(1);
}

console.log('⚡ เครื่องมือทดสอบการเชื่อมต่อฐานข้อมูลบน Render.com');
console.log('-----------------------------------------------------');

// ตรวจสอบว่าเป็น Render.com environment หรือไม่
const isRender = process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME;
console.log(`กำลังทำงานบน ${isRender ? 'Render.com' : 'เครื่องอื่น/local'}`);

// ตรวจสอบว่า DATABASE_URL เป็น internal connection หรือไม่
const isInternalDb = DATABASE_URL.includes('internal') || 
                     DATABASE_URL.includes('postgresql.render.com') || 
                     DATABASE_URL.includes('postgres.render.com');
console.log(`DATABASE_URL เป็น ${isInternalDb ? 'Internal Render Database' : 'External Database'}`);

// ตั้งค่าการเชื่อมต่อตามประเภทของฐานข้อมูล
let poolConfig;

if (isInternalDb) {
  console.log('กำลังใช้การตั้งค่าสำหรับฐานข้อมูลภายใน');
  poolConfig = {
    connectionString: DATABASE_URL,
    ssl: false,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
  };
} else {
  console.log('กำลังใช้การตั้งค่าสำหรับฐานข้อมูลภายนอก');
  poolConfig = {
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000
  };
}

// ทดสอบการเชื่อมต่อ
async function testConnection() {
  console.log('\nกำลังทดสอบการเชื่อมต่อกับฐานข้อมูล...');
  
  try {
    const pool = new Pool(poolConfig);
    
    // แสดงข้อมูลทั่วไปของ connection string (ไม่แสดงข้อมูลที่ละเอียดอ่อน)
    try {
      const url = new URL(DATABASE_URL);
      console.log('รายละเอียดการเชื่อมต่อ:', {
        host: url.hostname,
        port: url.port || '5432 (default)',
        database: url.pathname.substring(1),
        ssl: poolConfig.ssl ? 'enabled' : 'disabled'
      });
    } catch (e) {
      console.error('รูปแบบของ DATABASE_URL ไม่ถูกต้อง');
    }
    
    console.log('กำลังเชื่อมต่อกับฐานข้อมูล...');
    const client = await pool.connect();
    
    console.log('✅ เชื่อมต่อสำเร็จ! กำลังทดสอบคำสั่ง SQL...');
    
    // ทดสอบคำสั่ง SQL ง่ายๆ
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ คำสั่ง SQL สำเร็จ!');
    console.log('🕐 เวลาของเซิร์ฟเวอร์ฐานข้อมูล:', result.rows[0].time);
    
    // ทดสอบการสร้างตาราง (ถ้าเปิดใช้งาน fix mode)
    if (process.env.RENDER_DB_FIX_MODE === 'true') {
      console.log('\nโหมดแก้ไขปัญหาเปิดใช้งานอยู่ - กำลังทดสอบการสร้างตาราง...');
      
      try {
        // สร้างตารางทดสอบ
        await client.query(`
          CREATE TABLE IF NOT EXISTS render_test (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ สร้างตารางทดสอบสำเร็จ');
        
        // เพิ่มข้อมูลลงในตาราง
        await client.query(`
          INSERT INTO render_test (name) VALUES ('ทดสอบจาก render-troubleshoot.js')
        `);
        console.log('✅ เพิ่มข้อมูลทดสอบสำเร็จ');
        
        // ดึงข้อมูลจากตาราง
        const data = await client.query('SELECT * FROM render_test ORDER BY id DESC LIMIT 5');
        console.log('✅ ดึงข้อมูลสำเร็จ:');
        console.log(data.rows);
      } catch (err) {
        console.error('❌ การทดสอบการสร้างตารางล้มเหลว:', err.message);
      }
    }
    
    await client.end();
    console.log('\n✨ ทดสอบการเชื่อมต่อฐานข้อมูลสำเร็จ!');
    
    // คำแนะนำและขั้นตอนต่อไป
    console.log('\nคำแนะนำ:');
    console.log('1. ตั้งค่า DATABASE_URL ใน Render.com dashboard ให้เป็น connection string ที่ทำงานได้');
    console.log('2. ถ้าใช้ Render internal database ให้ตั้งค่า ssl: false ในการเชื่อมต่อ');
    console.log('3. ลดจำนวน connection pool size เพื่อไม่ให้ใช้ทรัพยากรมากเกินไป');
    console.log('4. เพิ่มระบบ fallback ไปยัง memory storage เมื่อฐานข้อมูลไม่ตอบสนอง');
    
    return true;
  } catch (error) {
    console.error('❌ การเชื่อมต่อฐานข้อมูลล้มเหลว:', error.message);
    
    // แสดงคำแนะนำในการแก้ไขปัญหา
    console.log('\nวิธีแก้ปัญหา:');
    if (isInternalDb) {
      console.log('1. ตรวจสอบว่า DATABASE_URL ถูกต้องและเป็น internal connection string');
      console.log('2. ตรวจสอบว่าบริการ PostgreSQL บน Render.com กำลังทำงานอยู่');
      console.log('3. ลองตั้งค่า ssl: false ในการเชื่อมต่อเพราะ internal connections ไม่ต้องใช้ SSL');
    } else {
      console.log('1. ตรวจสอบว่า DATABASE_URL ถูกต้อง');
      console.log('2. ตรวจสอบว่าฐานข้อมูลภายนอกอนุญาตการเชื่อมต่อจาก Render.com');
      console.log('3. ตรวจสอบการตั้งค่า SSL - ฐานข้อมูลภายนอกมักต้องการ SSL');
      console.log('4. ลองใช้ Render internal database แทนเพื่อหลีกเลี่ยงปัญหาการเชื่อมต่อ');
    }
    
    console.log('\nทางเลือกอื่น:');
    console.log('- ใช้ memory storage สำหรับการพัฒนาหรือทดสอบ');
    console.log('- ลองใช้ฐานข้อมูลจาก provider อื่น เช่น Railway หรือ ElephantSQL');
    
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
    console.error('เกิดข้อผิดพลาดที่ไม่คาดคิด:', err);
    process.exit(1);
  });