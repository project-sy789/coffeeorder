#!/usr/bin/env node

/**
 * สคริปต์ build และแก้ไขไฟล์ dist เพื่อแก้ปัญหาการ deploy บน Render.com
 * ใช้สำหรับแก้ไขปัญหา drizzle-orm/pg-pool โดยเฉพาะ
 * 
 * วิธีใช้:
 * 1. รัน: node build-dist-fix.js
 * 2. รอให้สคริปต์สร้างและแก้ไขไฟล์เสร็จ
 * 3. นำไฟล์ที่แก้ไขแล้วไป deploy บน Render.com
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
 * รันคำสั่ง shell
 */
function runCommand(command) {
  try {
    log(`🔄 กำลังรันคำสั่ง: ${command}`, colors.blue);
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการรันคำสั่ง: ${error.message}`, colors.red);
    return false;
  }
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
    if (content.includes('./pg-pool') || 
        content.includes('drizzle-orm/pg-pool') || 
        content.includes('pg-pool')) {
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
 * ฟังก์ชันหลัก
 */
function main() {
  log("\n🔧 เครื่องมือ build และแก้ไขไฟล์สำหรับ Render.com 🔧", colors.bright + colors.cyan);
  log("====================================================\n");
  
  // Build โปรเจค
  log("📦 กำลัง build โปรเจค...", colors.cyan);
  if (!runCommand('npm run build')) {
    log("❌ Build โปรเจคไม่สำเร็จ กรุณาแก้ไขข้อผิดพลาดและลองอีกครั้ง", colors.red);
    return false;
  }
  
  // ค้นหาไฟล์ในโฟลเดอร์ dist
  log("\n🔍 กำลังค้นหาไฟล์ที่คอมไพล์แล้ว...", colors.cyan);
  const distDir = path.resolve(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    log(`❌ ไม่พบโฟลเดอร์ dist ที่ ${distDir}`, colors.red);
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
    log("1. นำโค้ดที่แก้ไขแล้วไป deploy บน Render.com", colors.yellow);
    log("2. ควรตั้งค่า DATABASE_URL บน Render.com ให้เป็น internal database URL", colors.yellow);
    log("3. ตรวจสอบว่าติดตั้ง @neondatabase/serverless แล้ว", colors.yellow);
  } else {
    log("\n⚠️ ไม่พบไฟล์ที่ต้องแก้ไข แต่ build สำเร็จ", colors.yellow);
    log("สามารถ deploy ต่อได้ แต่ถ้ายังมีปัญหาให้ตรวจสอบ error log อีกครั้ง", colors.yellow);
  }
  
  return true;
}

// รันฟังก์ชันหลัก
main();