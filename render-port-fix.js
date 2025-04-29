/**
 * เครื่องมือแก้ไขพอร์ตสำหรับ Render.com
 * 
 * ปัญหา: แอปพลิเคชันอาจไม่ได้แสดงผลที่พอร์ตที่ถูกต้อง
 * วิธีใช้: รัน node render-port-fix.js จาก Render Shell
 */

const fs = require('fs');
const path = require('path');

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

// ตรวจสอบค่า PORT ในสภาพแวดล้อม
log("\n🔍 กำลังตรวจสอบการตั้งค่าพอร์ต...", colors.cyan);
const port = process.env.PORT || 5000;
log(`📊 ค่าพอร์ตปัจจุบัน: ${port}`, colors.blue);

// ตรวจสอบไฟล์ index.js ในโฟลเดอร์ dist
const distIndexPath = path.resolve(process.cwd(), 'dist/index.js');
if (fs.existsSync(distIndexPath)) {
  log("✅ พบไฟล์ dist/index.js", colors.green);
  
  // อ่านเนื้อหาไฟล์
  let content = fs.readFileSync(distIndexPath, 'utf8');
  
  // หารูปแบบการตั้งค่าพอร์ตในไฟล์
  const portRegex = /const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*\d+/g;
  const listenRegex = /app\.listen\(\s*(\w+|\d+)\s*,/g;
  
  // ตรวจสอบและแก้ไขการตั้งค่าพอร์ต
  let portMatches = content.match(portRegex);
  let listenMatches = content.match(listenRegex);
  
  if (portMatches) {
    log(`🔍 พบการตั้งค่าพอร์ต: ${portMatches[0]}`, colors.blue);
    
    // แก้ไขการตั้งค่าพอร์ตให้ใช้ process.env.PORT ทุกครั้ง
    content = content.replace(portRegex, `const PORT = process.env.PORT || 5000`);
    log("✅ แก้ไขการตั้งค่าพอร์ตแล้ว", colors.green);
  } else {
    log("⚠️ ไม่พบการตั้งค่าพอร์ตในรูปแบบปกติ", colors.yellow);
  }
  
  if (listenMatches) {
    log(`🔍 พบการใช้พอร์ตใน app.listen: ${listenMatches[0]}`, colors.blue);
    
    // แก้ไขการใช้พอร์ตใน app.listen
    content = content.replace(listenRegex, `app.listen(PORT,`);
    log("✅ แก้ไขการใช้พอร์ตใน app.listen แล้ว", colors.green);
  } else {
    log("⚠️ ไม่พบการใช้พอร์ตใน app.listen", colors.yellow);
  }
  
  // เขียนเนื้อหาที่แก้ไขแล้วกลับไป
  fs.writeFileSync(distIndexPath, content);
  log("✅ บันทึกการแก้ไขไฟล์แล้ว", colors.green);
  
  // ตรวจสอบการมีอยู่ของ Procfile
  const procfilePath = path.resolve(process.cwd(), 'Procfile');
  if (fs.existsSync(procfilePath)) {
    log("✅ พบไฟล์ Procfile", colors.green);
    
    // อ่านเนื้อหา Procfile
    const procfileContent = fs.readFileSync(procfilePath, 'utf8');
    log(`📄 เนื้อหา Procfile: ${procfileContent}`, colors.blue);
  } else {
    log("⚠️ ไม่พบไฟล์ Procfile", colors.yellow);
    
    // สร้าง Procfile
    fs.writeFileSync(procfilePath, 'web: node dist/index.js');
    log("✅ สร้างไฟล์ Procfile แล้ว", colors.green);
  }
  
  // ตรวจสอบไฟล์ package.json
  const packagePath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    log("✅ พบไฟล์ package.json", colors.green);
    
    // อ่านเนื้อหา package.json
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (packageContent.scripts && packageContent.scripts.start) {
      log(`📄 สคริปต์ start: ${packageContent.scripts.start}`, colors.blue);
    } else {
      log("⚠️ ไม่พบสคริปต์ start ใน package.json", colors.yellow);
    }
  }
  
  log("\n==================================================", colors.bright + colors.cyan);
  log("✅ ตรวจสอบและแก้ไขการตั้งค่าพอร์ตเสร็จสิ้น", colors.bright + colors.green);
  log("==================================================", colors.bright + colors.cyan);
  log("\n🔍 คำแนะนำเพิ่มเติม:", colors.cyan);
  log("1. รีสตาร์ทแอปพลิเคชันเพื่อใช้การตั้งค่าใหม่", colors.yellow);
  log("2. แน่ใจว่าแอปพลิเคชันใช้ PORT จากตัวแปรแวดล้อม", colors.yellow);
  log("3. ถ้ายังมีปัญหา ให้เพิ่มโค้ดนี้ที่ต้นไฟล์ index.js:", colors.yellow);
  log("   console.log(`App is listening on port ${process.env.PORT || 5000}`);", colors.yellow);
} else {
  log("❌ ไม่พบไฟล์ dist/index.js", colors.red);
  log("กรุณาตรวจสอบว่ามีการ build โปรเจคแล้ว", colors.yellow);
}