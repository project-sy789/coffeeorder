/**
 * เครื่องมือตรวจสอบปัญหา PostgreSQL บน Render.com แบบ CommonJS
 * ใช้ pg แทน @neondatabase/serverless เพื่อความเข้ากันได้ดีกว่า
 */

const { Pool } = require('pg');

// รับค่า DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL ไม่ได้ถูกกำหนด โปรดตั้งค่า environment variable');
  process.exit(1);
}

console.log('🛠️ เครื่องมือตรวจสอบการเชื่อมต่อ PostgreSQL');
console.log('---------------------------------------');

// ตรวจสอบว่ากำลังรันบน Render.com หรือไม่
const isRender = process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME;
console.log(`สภาพแวดล้อม: ${isRender ? 'Render.com' : 'Local/Other'}`);

// ตรวจสอบประเภทของ DATABASE_URL
const isInternalUrl = DATABASE_URL.includes('internal') || 
                      DATABASE_URL.includes('postgresql.render.com') || 
                      DATABASE_URL.includes('postgres.render.com');
console.log(`URL แบบ: ${isInternalUrl ? 'Internal Render URL' : 'External URL'}`);

// กำหนดค่า SSL ตามประเภท URL
const sslConfig = isInternalUrl 
  ? false 
  : { rejectUnauthorized: false };

console.log(`ค่า SSL: ${sslConfig ? 'enabled with rejectUnauthorized=false' : 'disabled'}`);

// สร้าง pool สำหรับเชื่อมต่อฐานข้อมูล
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

// ทดสอบการเชื่อมต่อ
async function testConnection() {
  console.log('\nกำลังทดสอบการเชื่อมต่อ PostgreSQL...');
  
  try {
    // แสดงรายละเอียดการเชื่อมต่อ (ไม่แสดงข้อมูลความลับ)
    try {
      const url = new URL(DATABASE_URL);
      console.log('ข้อมูลการเชื่อมต่อ:', {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.substring(1),
        user: url.username ? '(hidden)' : 'none',
        password: url.password ? '(hidden)' : 'none',
        ssl: sslConfig ? 'enabled' : 'disabled'
      });
    } catch (e) {
      console.error('รูปแบบ URL ไม่ถูกต้อง:', e.message);
    }
    
    // เชื่อมต่อฐานข้อมูล
    console.log('กำลังเชื่อมต่อกับฐานข้อมูล...');
    const client = await pool.connect();
    console.log('✅ เชื่อมต่อสำเร็จ!');
    
    // ทดสอบ query
    console.log('กำลังทดสอบ query...');
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ Query สำเร็จ!');
    console.log('เวลาปัจจุบันบนเซิร์ฟเวอร์:', result.rows[0].time);
    
    // ทดสอบตรวจสอบตาราง
    console.log('\nกำลังตรวจสอบตารางในฐานข้อมูล...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('ไม่พบตารางในฐานข้อมูล');
    } else {
      console.log(`พบตารางทั้งหมด ${tablesResult.rows.length} ตาราง:`);
      tablesResult.rows.forEach((row, i) => {
        console.log(`${i+1}. ${row.table_name}`);
      });
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ การทดสอบเสร็จสมบูรณ์ - การเชื่อมต่อทำงานได้ดี!');
    console.log('\nคำแนะนำสำหรับ Render.com:');
    console.log('1. ใช้ pg แทน @neondatabase/serverless');
    console.log('2. สำหรับ internal database ให้ตั้งค่า ssl: false');
    console.log('3. จำกัดจำนวน connection เพื่อประหยัดทรัพยากร (max: 3)');
    console.log('4. ลดเวลา timeout เพื่อเพิ่มประสิทธิภาพ (10 วินาที)');
    
    return true;
  } catch (error) {
    console.error('❌ การเชื่อมต่อล้มเหลว:', error.message);
    
    console.log('\nวิธีแก้ปัญหา:');
    console.log('1. ตรวจสอบว่า DATABASE_URL ถูกต้อง');
    console.log('2. ถ้าใช้ internal database ให้ตั้งค่า ssl: false');
    console.log('3. ถ้าใช้ external database ให้ตั้งค่า ssl: { rejectUnauthorized: false }');
    console.log('4. ตรวจสอบว่าบริการ PostgreSQL กำลังทำงาน');
    console.log('5. ใช้ pg แทน @neondatabase/serverless');
    
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