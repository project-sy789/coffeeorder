#!/usr/bin/env node

/**
 * เครื่องมือแก้ไขปัญหาการ deploy บน Render.com
 * 
 * ปัญหา: Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './pg-pool' 
 * สาเหตุ: มีการอ้างอิงถึง drizzle-orm/pg-pool ในโค้ดที่คอมไพล์แล้ว
 * 
 * วิธีใช้:
 * 1. อัปโหลดสคริปต์นี้ไปที่ Render.com
 * 2. รัน: node server/fix-render-deploy.js
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
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
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
    let content = fs.readFileSync(filePath, 'utf8');
    
    // ตรวจหาการอ้างอิงถึง drizzle-orm/pg-pool
    if (content.includes('./pg-pool') || content.includes('drizzle-orm/pg-pool')) {
      log(`📝 กำลังแก้ไขไฟล์: ${filePath}`, colors.yellow);
      
      // แทนที่การอ้างอิงทั้งหมด
      const originalContent = content;
      content = content.replace(/['"]drizzle-orm\/pg-pool['"]/g, '"drizzle-orm/neon-serverless"');
      content = content.replace(/['"]\.\/.+\/pg-pool['"]/g, '"drizzle-orm/neon-serverless"');
      
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
 * ฟังก์ชันหลัก
 */
function main() {
  log("\n🔧 เครื่องมือแก้ไขปัญหาการ deploy บน Render.com 🔧", colors.bright + colors.cyan);
  log("====================================================\n");
  
  // ตรวจสอบว่าอยู่บน Render.com หรือไม่
  const isRender = process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME;
  log(`สภาพแวดล้อม: ${isRender ? 'Render.com' : 'Local/Other'}`, colors.blue);
  
  // ค้นหาไฟล์ในโฟลเดอร์ dist
  log("กำลังค้นหาไฟล์ที่คอมไพล์แล้ว...", colors.cyan);
  const distDir = path.resolve(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    log(`❌ ไม่พบโฟลเดอร์ dist ที่ ${distDir}`, colors.red);
    log("ลองรันคำสั่ง npm run build ก่อนแล้วรันสคริปต์นี้อีกครั้ง", colors.yellow);
    return false;
  }
  
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
    log("\nคำแนะนำ:", colors.cyan);
    log("1. รันคำสั่ง npm start เพื่อเริ่มแอปพลิเคชัน", colors.yellow);
    log("2. ถ้ายังมีปัญหา ให้ตรวจสอบว่าติดตั้ง @neondatabase/serverless แล้ว", colors.yellow);
    log("3. ตรวจสอบการตั้งค่า DATABASE_URL ให้ถูกต้อง", colors.yellow);
  } else {
    log("\n❓ ไม่พบไฟล์ที่ต้องแก้ไข", colors.yellow);
    log("อาจมีปัญหาอื่นที่ทำให้ deploy ไม่สำเร็จ ลองตรวจสอบ error log อีกครั้ง", colors.yellow);
  }
  
  return fixedCount > 0;
}

// รันฟังก์ชันหลัก
main();