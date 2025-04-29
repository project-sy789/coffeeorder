/**
 * ไฟล์นี้เป็นเครื่องมือแก้ไขปัญหาฐานข้อมูลบน Render.com
 * ใช้รูปแบบ CommonJS เพื่อความเข้ากันได้กับเซิร์ฟเวอร์ที่ไม่รองรับ ES Modules
 */

const { Pool } = require('pg');

// โหลด environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('กรุณาตั้งค่า DATABASE_URL ใน environment variables');
  process.exit(1);
}

console.log('⚡ เครื่องมือแก้ไขปัญหาฐานข้อมูลบน Render.com');
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
          INSERT INTO render_test (name) VALUES ('ทดสอบจาก render-fix.js')
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
    
    await client.release();
    await pool.end();
    console.log('\n✨ ทดสอบการเชื่อมต่อฐานข้อมูลสำเร็จ!');
    
    // คำแนะนำต่อไป
    console.log('\nคำแนะนำในการแก้ไขปัญหา:');
    console.log('1. แก้ไข server/db.ts ให้ใช้การตั้งค่าเดียวกันนี้');
    console.log('2. ในโค้ดของคุณ ให้กำหนดค่า ssl: false ถ้าใช้ internal database');
    console.log('3. ตั้งค่า max: 3 เพื่อไม่ให้ใช้ connection มากเกินไป');
    console.log('4. หลีกเลี่ยงการใช้ WebSocket สำหรับ PostgreSQL บน Render');
    
    return true;
  } catch (error) {
    console.error('❌ การเชื่อมต่อฐานข้อมูลล้มเหลว:', error.message);
    
    // แสดงคำแนะนำในการแก้ไขปัญหา
    console.log('\nวิธีแก้ปัญหา:');
    if (isInternalDb) {
      console.log('1. ตรวจสอบว่า DATABASE_URL เป็น internal connection string');
      console.log('2. ตั้งค่า ssl: false สำหรับ internal connection');
      console.log('3. ตรวจสอบว่าบริการ PostgreSQL บน Render ทำงานอยู่');
      console.log('4. ลองใช้ pg แทน @neondatabase/serverless');
    } else {
      console.log('1. ลองใช้ Render internal database แทน');
      console.log('2. ลองเปลี่ยนไปใช้ pg แทน @neondatabase/serverless');
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
    console.error('เกิดข้อผิดพลาดที่ไม่คาดคิด:', err);
    process.exit(1);
  });