/**
 * ไฟล์นี้ใช้สำหรับแก้ไขปัญหา Render.com และ Neon PostgreSQL
 * ใช้งานโดยสร้าง environment variable ดังนี้:
 * - DATABASE_URL_BACKUP = ใส่ connection string สำรองที่ได้จาก Railway หรือ Render PostgreSQL
 * 
 * วิธีใช้: npm run fix-render-database
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log("Render.com - Neon Database connection fix helper");

// ตรวจสอบว่าเป็นการทำงานบน Render.com หรือไม่
if (process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME) {
  console.log("Running on Render.com environment");
} else {
  console.log("Not running on Render.com environment");
}

// ตรวจสอบว่ามี DATABASE_URL หรือไม่
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set, please set it in your environment variables");
  process.exit(1);
}

const { Pool } = require('@neondatabase/serverless');

// ทดสอบการเชื่อมต่อกับฐานข้อมูล
async function testConnection() {
  console.log("Testing database connection...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log("Connection successful!");
    console.log("Current database time:", result.rows[0].time);
    await client.end();
    return true;
  } catch (error) {
    console.error("Connection failed:", error);
    return false;
  }
}

// ทดสอบการเชื่อมต่อกับฐานข้อมูลสำรอง (ถ้ามี)
async function testBackupConnection() {
  if (!process.env.DATABASE_URL_BACKUP) {
    console.log("No backup database URL provided");
    return false;
  }

  console.log("Testing backup database connection...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_BACKUP,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    console.log("Backup connection successful!");
    console.log("Current backup database time:", result.rows[0].time);
    await client.end();
    return true;
  } catch (error) {
    console.error("Backup connection failed:", error);
    return false;
  }
}

// ฟังก์ชันหลัก
async function main() {
  const mainConnectionOk = await testConnection();
  if (!mainConnectionOk) {
    console.log("Primary database connection failed. Checking backup...");
    const backupConnectionOk = await testBackupConnection();
    
    if (backupConnectionOk) {
      console.log("Recommendation: Use your backup database connection instead of Neon PostgreSQL");
    } else {
      console.log("Both primary and backup database connections failed.");
      console.log("Recommendation: Use memory storage or set up a Railway PostgreSQL database.");
    }
  } else {
    console.log("Database connection is working properly. No changes needed.");
  }
}

main().catch(error => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});