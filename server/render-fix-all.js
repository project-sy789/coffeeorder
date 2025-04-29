#!/usr/bin/env node

/**
 * เครื่องมือแก้ไขปัญหาการ deploy บน Render.com แบบครบวงจร
 * 
 * ปัญหาที่แก้ไข:
 * 1. Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './pg-pool'
 * 2. Database connection test failed: ErrorEvent
 * 3. WebSocket connection issues
 * 
 * วิธีใช้:
 * 1. อัปโหลดสคริปต์นี้ไปที่ Render.com
 * 2. รัน: node server/render-fix-all.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// สีสำหรับข้อความในคอนโซล
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

/**
 * หาไฟล์ที่คอมไพล์แล้วในโฟลเดอร์ dist
 */
function findCompiledFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findCompiledFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * แก้ไขการ import drizzle-orm/pg-pool เป็น drizzle-orm/neon-serverless
 */
function fixImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`⚠️ ไฟล์ไม่พบ: ${filePath}`, colors.yellow);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // ตรวจหาการอ้างอิงถึง drizzle-orm/pg-pool
    const needsFixing = content.includes('./pg-pool') || 
                       content.includes('drizzle-orm/pg-pool') || 
                       content.includes('pg-pool');
                       
    if (needsFixing) {
      log(`📝 กำลังแก้ไขไฟล์: ${filePath}`, colors.yellow);
      
      // แทนที่การอ้างอิงทั้งหมด
      const originalContent = content;
      content = content.replace(/['"]drizzle-orm\/pg-pool['"]/g, '"drizzle-orm/neon-serverless"');
      content = content.replace(/['"]\.\/.+\/pg-pool['"]/g, '"drizzle-orm/neon-serverless"');
      content = content.replace(/["']\.\.\/pg-pool["']/g, '"drizzle-orm/neon-serverless"');
      content = content.replace(/["']\.\/pg-pool["']/g, '"drizzle-orm/neon-serverless"');
      
      // บันทึกไฟล์ที่แก้ไขแล้ว
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        log(`✅ แก้ไขไฟล์ ${filePath} สำเร็จ`, colors.green);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการแก้ไขไฟล์ ${filePath}: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * ปรับปรุงไฟล์ db.js/db.ts เพื่อใช้ pg แทน @neondatabase/serverless
 */
function fixDatabaseConnection(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`⚠️ ไม่พบไฟล์ฐานข้อมูล: ${filePath}`, colors.yellow);
    return false;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // ตรวจสอบว่ามีการใช้ @neondatabase/serverless หรือไม่
    const hasNeonImport = content.includes("@neondatabase/serverless");
    
    if (hasNeonImport) {
      log(`📝 แก้ไขการใช้งาน database ใน: ${filePath}`, colors.yellow);
      
      // สร้างเนื้อหาใหม่สำหรับไฟล์ db.js หรือคล้ายกัน
      const newContent = content
        .replace(/['"]@neondatabase\/serverless['"]/g, "'pg'")
        .replace(/neonConfig\.webSocketConstructor\s*=\s*[^;]+;/g, '// WebSocket connection removed for Render compatibility')
        .replace(/import\s+{\s*neonConfig\s*}/g, '// import { neonConfig } removed for Render compatibility');
      
      // บันทึกไฟล์ที่แก้ไขแล้ว
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        log(`✅ แก้ไขการเชื่อมต่อฐานข้อมูลสำเร็จ: ${filePath}`, colors.green);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการแก้ไขไฟล์ฐานข้อมูล: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * สร้างไฟล์ทดสอบฐานข้อมูลอย่างง่าย
 */
function createDatabaseTestFile() {
  const filePath = path.resolve(process.cwd(), 'db-test.js');
  
  const content = `
// ไฟล์ทดสอบการเชื่อมต่อฐานข้อมูล Render

const { Pool } = require('pg');
const fs = require('fs');

// ข้อความสี
function colorText(text, colorCode) {
  return \`\${colorCode}\${text}\x1b[0m\`;
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

console.log(\`URL ประเภท: \${isInternalDb ? "Internal Render Database" : "External Database"}\`);

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

console.log(\`SSL: \${isInternalDb ? "ปิด (สำหรับ internal database)" : "เปิด (rejectUnauthorized: false)"}\`);
console.log(\`Max connections: \${poolConfig.max}\`);
console.log(\`Connection timeout: \${poolConfig.connectionTimeoutMillis}ms\`);

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
`;

  fs.writeFileSync(filePath, content);
  log(`✅ สร้างไฟล์ทดสอบฐานข้อมูลแล้ว: ${filePath}`, colors.green);
  return true;
}

/**
 * ฟังก์ชันหลัก
 */
function main() {
  log("\n🔧 เครื่องมือแก้ไขปัญหาการ deploy บน Render.com แบบครบวงจร 🔧", colors.bright + colors.cyan);
  log("=================================================================\n");
  
  // ตรวจสอบว่าอยู่บน Render.com หรือไม่
  const isRender = process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME;
  log(`สภาพแวดล้อม: ${isRender ? 'Render.com' : 'Local/Other'}`, colors.blue);
  
  // ตรวจสอบการติดตั้ง pg
  let pgInstalled = false;
  try {
    require.resolve('pg');
    pgInstalled = true;
    log("✅ pg package ถูกติดตั้งแล้ว", colors.green);
  } catch (error) {
    log("❌ ไม่พบ pg package - กรุณาติดตั้งด้วย npm install pg", colors.red);
    return false;
  }
  
  // ค้นหาและแก้ไขไฟล์ db.js/db.ts
  let dbFixed = false;
  const possibleDbPaths = [
    path.resolve(process.cwd(), 'dist/db.js'),
    path.resolve(process.cwd(), 'dist/server/db.js'),
    path.resolve(process.cwd(), 'server/db.js')
  ];
  
  for (const dbPath of possibleDbPaths) {
    if (fs.existsSync(dbPath)) {
      log(`พบไฟล์ฐานข้อมูล: ${dbPath}`, colors.blue);
      if (fixDatabaseConnection(dbPath)) {
        dbFixed = true;
      }
    }
  }
  
  // ค้นหาไฟล์ในโฟลเดอร์ dist
  log("\n🔍 กำลังค้นหาไฟล์ที่คอมไพล์แล้ว...", colors.cyan);
  const distDir = path.resolve(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    log(`❌ ไม่พบโฟลเดอร์ dist ที่ ${distDir}`, colors.red);
    log("ลองรันคำสั่ง npm run build ก่อนแล้วรันสคริปต์นี้อีกครั้ง", colors.yellow);
  } else {
    const files = findCompiledFiles(distDir);
    log(`พบไฟล์ที่คอมไพล์แล้วจำนวน ${files.length} ไฟล์`, colors.blue);
    
    // แก้ไขการ import ในไฟล์ทั้งหมด
    let fixedCount = 0;
    for (const file of files) {
      if (fixImports(file)) {
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      log(`\n✅ แก้ไขไฟล์ทั้งหมด ${fixedCount} ไฟล์`, colors.green);
    } else {
      log("\n⚠️ ไม่พบไฟล์ที่ต้องแก้ไข", colors.yellow);
    }
  }
  
  // สร้างไฟล์ทดสอบฐานข้อมูล
  log("\n📝 กำลังสร้างไฟล์ทดสอบฐานข้อมูล...", colors.cyan);
  createDatabaseTestFile();
  
  // แสดงคำแนะนำ
  log("\n🔍 คำแนะนำสำหรับแก้ปัญหา Render.com:", colors.bright + colors.cyan);
  log("1. ตรวจสอบว่ามีการเปลี่ยน @neondatabase/serverless เป็น pg แล้ว", colors.yellow);
  log("2. ตรวจสอบการเชื่อมต่อฐานข้อมูลด้วย node db-test.js", colors.yellow);
  log("3. หากใช้ internal database ของ Render ให้ตั้งค่า ssl: false", colors.yellow);
  log("4. ลดจำนวน max connections (max: 3) เพื่อประหยัดทรัพยากร", colors.yellow);
  log("5. หากยังมีปัญหา ลองใช้ internal database ของ Render แทน", colors.yellow);
  log("6. ตรวจสอบ logs บน Render dashboard เพื่อหาข้อผิดพลาดเพิ่มเติม", colors.yellow);
  
  return true;
}

// รันฟังก์ชันหลัก
main();