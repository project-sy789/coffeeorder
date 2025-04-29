/**
 * เครื่องมือแก้ไขพอร์ตสำหรับ Railway ด้วย ES Module
 * 
 * ปัญหา: Railway ไม่สามารถเชื่อมต่อกับแอปพลิเคชันเนื่องจากปัญหาพอร์ต
 * วิธีใช้: รัน NODE_OPTIONS=--experimental-vm-modules node railway-port-fix.mjs 
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

// สำหรับโหลดไลบรารีแบบ CommonJS
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const distIndexPath = resolve(process.cwd(), 'dist/index.js');
try {
  const indexExists = await fs.access(distIndexPath).then(() => true).catch(() => false);
  
  if (indexExists) {
    log("✅ พบไฟล์ dist/index.js", colors.green);
    
    // อ่านเนื้อหาไฟล์
    let content = await fs.readFile(distIndexPath, 'utf8');
    
    // หารูปแบบการตั้งค่าพอร์ตในไฟล์
    const portRegex = /const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*\d+/g;
    const listenRegex = /app\.listen\(\s*(\w+|\d+)\s*,/g;
    
    // ตรวจสอบและแก้ไขการตั้งค่าพอร์ต
    let portMatches = content.match(portRegex);
    let listenMatches = content.match(listenRegex);
    
    if (portMatches) {
      log(`🔍 พบการตั้งค่าพอร์ต: ${portMatches[0]}`, colors.blue);
      
      // แก้ไขการตั้งค่าพอร์ตให้ใช้ process.env.PORT ทุกครั้ง
      content = content.replace(portRegex, `const PORT = process.env.PORT || 8080`);
      log("✅ แก้ไขการตั้งค่าพอร์ตแล้ว", colors.green);
    } else {
      log("⚠️ ไม่พบการตั้งค่าพอร์ตในรูปแบบปกติ", colors.yellow);
      
      // เพิ่มการประกาศ PORT ที่ต้นไฟล์
      const mainImports = content.match(/^(import.+\n)+/);
      if (mainImports) {
        const importSection = mainImports[0];
        content = content.replace(importSection, `${importSection}\n// Railway port configuration\nconst PORT = process.env.PORT || 8080;\nconsole.log("Server will start on PORT:", PORT);\n`);
        log("✅ เพิ่มการประกาศ PORT สำหรับ Railway แล้ว", colors.green);
      }
    }
    
    if (listenMatches) {
      log(`🔍 พบการใช้พอร์ตใน app.listen: ${listenMatches[0]}`, colors.blue);
      
      // แก้ไขการใช้พอร์ตใน app.listen
      content = content.replace(listenRegex, `app.listen(PORT,`);
      log("✅ แก้ไขการใช้พอร์ตใน app.listen แล้ว", colors.green);
    } else {
      log("⚠️ ไม่พบการใช้พอร์ตใน app.listen", colors.yellow);
    }
    
    // เพิ่มโค้ดเพื่อแสดงค่าพอร์ตเมื่อเริ่มเซิร์ฟเวอร์
    if (!content.includes('console.log(`Server is running on port')) {
      const serverStartPattern = /app\.listen\(.*\)/;
      content = content.replace(
        serverStartPattern, 
        match => `${match}\n  console.log(\`Server is running on port \${PORT}\`);`
      );
      log("✅ เพิ่มโค้ดแสดงค่าพอร์ตเมื่อเริ่มเซิร์ฟเวอร์แล้ว", colors.green);
    }
    
    // เขียนเนื้อหาที่แก้ไขแล้วกลับไป
    await fs.writeFile(distIndexPath, content);
    log("✅ บันทึกการแก้ไขไฟล์แล้ว", colors.green);
    
    // ตรวจสอบและสร้างไฟล์ railway.json
    const railwayJsonPath = resolve(process.cwd(), 'railway.json');
    const railwayJsonExists = await fs.access(railwayJsonPath).then(() => true).catch(() => false);
    
    if (railwayJsonExists) {
      log("✅ พบไฟล์ railway.json", colors.green);
      const railwayJson = JSON.parse(await fs.readFile(railwayJsonPath, 'utf8'));
      log(`📄 Railway.json: ${JSON.stringify(railwayJson, null, 2)}`, colors.blue);
    } else {
      log("⚠️ ไม่พบไฟล์ railway.json", colors.yellow);
      
      // สร้าง railway.json
      const railwayJson = {
        "$schema": "https://railway.app/railway.schema.json",
        "build": {
          "builder": "NIXPACKS",
          "buildCommand": "npm run build"
        },
        "deploy": {
          "startCommand": "node dist/index.js",
          "healthcheckPath": "/",
          "healthcheckTimeout": 100,
          "restartPolicyType": "ON_FAILURE",
          "restartPolicyMaxRetries": 10
        }
      };
      
      await fs.writeFile(railwayJsonPath, JSON.stringify(railwayJson, null, 2));
      log("✅ สร้างไฟล์ railway.json แล้ว", colors.green);
    }
    
    // ตรวจสอบไฟล์ Procfile
    const procfilePath = resolve(process.cwd(), 'Procfile');
    const procfileExists = await fs.access(procfilePath).then(() => true).catch(() => false);
    
    if (procfileExists) {
      log("✅ พบไฟล์ Procfile", colors.green);
      const procfileContent = await fs.readFile(procfilePath, 'utf8');
      log(`📄 เนื้อหา Procfile: ${procfileContent}`, colors.blue);
      
      // ตรวจสอบว่าในไฟล์ Procfile มีการกำหนด web: node dist/index.js หรือไม่
      if (!procfileContent.includes('web: node dist/index.js')) {
        await fs.writeFile(procfilePath, 'web: node dist/index.js');
        log("✅ อัปเดตไฟล์ Procfile แล้ว", colors.green);
      }
    } else {
      log("⚠️ ไม่พบไฟล์ Procfile", colors.yellow);
      
      // สร้าง Procfile
      await fs.writeFile(procfilePath, 'web: node dist/index.js');
      log("✅ สร้างไฟล์ Procfile แล้ว", colors.green);
    }
    
    log("\n==================================================", colors.bright + colors.cyan);
    log("✅ ตรวจสอบและแก้ไขการตั้งค่าพอร์ตสำหรับ Railway เสร็จสิ้น", colors.bright + colors.green);
    log("==================================================", colors.bright + colors.cyan);
    log("\n🔍 คำแนะนำเพิ่มเติม:", colors.cyan);
    log("1. รีเดพลอยแอปพลิเคชันบน Railway", colors.yellow);
    log("2. ตรวจสอบว่า PORT ของ Railway กำหนดเป็น 8080", colors.yellow);
    log("3. หากมีปัญหา ลองลบการเดพลอยและติดตั้งใหม่", colors.yellow);
    log("4. ตรวจสอบว่า WebSocket และ HTTP ใช้พอร์ตเดียวกัน", colors.yellow);
  } else {
    log("❌ ไม่พบไฟล์ dist/index.js", colors.red);
    log("กรุณาตรวจสอบว่ามีการ build โปรเจคแล้ว", colors.yellow);
  }
} catch (error) {
  log(`❌ เกิดข้อผิดพลาด: ${error.message}`, colors.red);
  if (error.stack) {
    log(`Stack trace: ${error.stack}`, colors.red);
  }
}