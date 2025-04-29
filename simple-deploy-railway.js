#!/usr/bin/env node

/**
 * ตัวติดตั้ง Railway สำหรับระบบคาเฟ่ของฉัน POS
 * สามารถ deploy ได้ง่ายๆ เพียงไม่กี่คลิก
 */

import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// สร้าง readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ฟังก์ชันสำหรับแสดงข้อความในคอนโซล
function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// แสดงขั้นตอนพร้อมสัญลักษณ์
function logStep(message, symbol = '▶', color = 'cyan') {
  log(`${symbol} ${message}`, color);
}

// ตรวจสอบว่ามีคำสั่งอยู่หรือไม่
function hasCommand(command) {
  try {
    execSync(`which ${command} > /dev/null 2>&1`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// ฟังก์ชันสำหรับรันคำสั่ง shell
function runCommand(command, showOutput = true) {
  try {
    log(`\nรันคำสั่ง: $ ${command}`, "gray");
    if (showOutput) {
      execSync(command, { stdio: 'inherit' });
    } else {
      execSync(command, { stdio: 'ignore' });
    }
    return true;
  } catch (error) {
    log(`เกิดข้อผิดพลาดในการรันคำสั่ง: ${command}`, "red");
    return false;
  }
}

// ฟังก์ชันสำหรับถามคำถาม
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// ฟังก์ชันสร้างไฟล์เริ่มต้นเซิร์ฟเวอร์
function createStartServerFile() {
  const content = `/**
 * สคริปต์เริ่มต้นเซิร์ฟเวอร์สำหรับระบบคาเฟ่ของฉัน POS
 * ใช้ในการเริ่มต้นเซิร์ฟเวอร์บนสภาพแวดล้อมการใช้งานจริง
 */

// ระบบการแสดงผลล็อก
function log(message, color = 'reset') {
  const colors = {
    reset: '\\x1b[0m',
    red: '\\x1b[31m',
    green: '\\x1b[32m',
    yellow: '\\x1b[33m',
    blue: '\\x1b[34m',
    magenta: '\\x1b[35m',
    cyan: '\\x1b[36m',
  };
  console.log(\`\${colors[color]}\${message}\${colors.reset}\`);
}

// เริ่มกระบวนการหลัก
log('กำลังเริ่มต้นเซิร์ฟเวอร์ POS คาเฟ่...', 'cyan');

// ดึงข้อมูลสภาพแวดล้อม
const PORT = process.env.PORT || 5000;
log(\`พอร์ตที่กำหนด: \${PORT}\`, 'yellow');

// ตรวจสอบโหมดการทำงาน
if (process.env.NODE_ENV === 'production') {
  log('โหมดการทำงาน: Production', 'green');
} else {
  log('โหมดการทำงาน: Development', 'yellow');
}

// ตรวจสอบตัวแปรฐานข้อมูล
if (process.env.DATABASE_URL) {
  log('พบการกำหนดค่า DATABASE_URL', 'green');
} else {
  log('ไม่พบการกำหนดค่า DATABASE_URL จะใช้การเก็บข้อมูลในหน่วยความจำแทน', 'yellow');
}

// รันเซิร์ฟเวอร์ด้วยการโหลดไฟล์ build
try {
  log('กำลังโหลดแอปพลิเคชัน...', 'blue');
  // นำเข้าไฟล์หลักที่ผ่านการ build แล้ว
  import('./dist/index.js')
    .then(() => {
      log('เซิร์ฟเวอร์เริ่มต้นเรียบร้อยแล้ว! 🚀', 'green');
      log(\`เข้าถึงแอปพลิเคชันได้ที่: http://localhost:\${PORT}\`, 'cyan');
    })
    .catch((err) => {
      log(\`เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน: \${err.message}\`, 'red');
      process.exit(1);
    });
} catch (err) {
  log(\`เกิดข้อผิดพลาดขณะเริ่มต้นเซิร์ฟเวอร์: \${err.message}\`, 'red');
  process.exit(1);
}`;

  fs.writeFileSync('start-server.js', content);
  logStep("สร้างไฟล์ start-server.js เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างไฟล์ Procfile
function createProcfile() {
  fs.writeFileSync('Procfile', 'web: node start-server.js');
  logStep("สร้างไฟล์ Procfile เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างไฟล์ .dockerignore
function createDockerignore() {
  const content = `node_modules
npm-debug.log
.env
.git
.gitignore
Dockerfile
.dockerignore
.DS_Store`;

  fs.writeFileSync('.dockerignore', content);
  logStep("สร้างไฟล์ .dockerignore เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างไฟล์ railway.toml
function createRailwayToml() {
  const content = `[build]
builder = "NIXPACKS"
nixpacksPlan = { nixpacksVersion = "1.13.0" }

[deploy]
numReplicas = 1
sleepApplication = false
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3`;

  fs.writeFileSync('railway.toml', content);
  logStep("สร้างไฟล์ railway.toml เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสำหรับ deploy บน Railway
async function deployToRailway() {
  log("\n=== การติดตั้งและ Deploy บน Railway ===", "cyan");

  // ตรวจสอบว่ามี Railway CLI หรือไม่
  logStep("กำลังตรวจสอบ Railway CLI...", "⚙️", "blue");
  
  if (!hasCommand("railway")) {
    log("ไม่พบ Railway CLI จะทำการติดตั้งให้...", "yellow");
    const installRailway = await ask("ต้องการติดตั้ง Railway CLI หรือไม่? (y/n): ");
    
    if (installRailway.toLowerCase() === 'y') {
      logStep("กำลังติดตั้ง Railway CLI...", "⏳", "blue");
      runCommand("npm install -g @railway/cli");
    } else {
      log("คุณจำเป็นต้องติดตั้ง Railway CLI เพื่อดำเนินการต่อ", "red");
      log("รันคำสั่ง: npm install -g @railway/cli", "yellow");
      return;
    }
  } else {
    logStep("พบ Railway CLI แล้ว", "✓", "green");
  }
  
  // ตรวจสอบการเข้าสู่ระบบ
  logStep("\nคุณต้องเข้าสู่ระบบ Railway ก่อน", "🔑", "yellow");
  const loginChoice = await ask("ต้องการเข้าสู่ระบบตอนนี้หรือไม่? (y/n): ");
  
  if (loginChoice.toLowerCase() === 'y') {
    logStep("กำลังเข้าสู่ระบบ Railway...", "⏳", "blue");
    runCommand("railway login");
  }
  
  // สร้างไฟล์ที่จำเป็นสำหรับ Railway
  logStep("\nกำลังสร้างไฟล์ที่จำเป็นสำหรับ Railway...", "📁", "blue");
  createStartServerFile();
  createProcfile();
  createRailwayToml();
  createDockerignore();

  // ถามคำถามเกี่ยวกับโปรเจค Railway
  logStep("\nต้องการสร้างโปรเจคใหม่บน Railway หรือเชื่อมต่อกับโปรเจคที่มีอยู่แล้ว?", "❓", "cyan");
  log("1. สร้างโปรเจคใหม่", "yellow");
  log("2. เชื่อมต่อกับโปรเจคที่มีอยู่แล้ว", "yellow");
  
  const projectChoice = await ask("เลือกตัวเลือก (1/2): ");
  
  if (projectChoice === '1') {
    const projectName = await ask("ระบุชื่อโปรเจคใหม่: ");
    logStep(`กำลังสร้างโปรเจค '${projectName}' บน Railway...`, "⏳", "blue");
    runCommand(`railway init --name "${projectName}"`);
  } else if (projectChoice === '2') {
    logStep("กำลังเชื่อมต่อกับโปรเจคที่มีอยู่แล้ว...", "⏳", "blue");
    runCommand("railway link");
  }

  // ตรวจสอบว่าต้องการเพิ่มฐานข้อมูลหรือไม่
  logStep("\nคุณต้องมีฐานข้อมูล PostgreSQL สำหรับโปรเจคนี้", "💽", "yellow");
  log("หากไม่เพิ่มฐานข้อมูล ระบบจะใช้การเก็บข้อมูลในหน่วยความจำแทน ซึ่งข้อมูลจะหายเมื่อรีสตาร์ทเซิร์ฟเวอร์", "yellow");
  
  const dbChoice = await ask("ต้องการเพิ่มฐานข้อมูล PostgreSQL หรือไม่? (y/n): ");
  
  if (dbChoice.toLowerCase() === 'y') {
    logStep("\nกำลังเพิ่มฐานข้อมูล PostgreSQL...", "⏳", "blue");
    log("หมายเหตุ: คุณจะต้องเลือก Database และ PostgreSQL ในขั้นตอนถัดไป", "yellow");
    runCommand("railway add");
  }

  // บิวด์และเตรียมโปรเจคสำหรับ deploy
  logStep("\nกำลังเตรียมไฟล์สำหรับการ deploy...", "⚙️", "blue");
  
  // ถามว่าต้องการ deploy ทันทีหรือไม่
  const deployNow = await ask("ต้องการ deploy ทันทีหรือไม่? (y/n): ");
  
  if (deployNow.toLowerCase() === 'y') {
    // ติดตั้งแพ็คเกจและ build
    logStep("กำลังติดตั้งแพ็คเกจและ build โปรเจค...", "⏳", "blue");
    log("โปรดรอสักครู่ อาจใช้เวลานานขึ้นอยู่กับขนาดของโปรเจค", "yellow");
    
    runCommand("npm install");
    const buildSuccess = runCommand("npm run build");
    
    if (!buildSuccess) {
      log("เกิดข้อผิดพลาดในการ build โปรเจค", "red");
      return;
    }
    
    // Deploy โปรเจค
    logStep("กำลัง deploy โปรเจคขึ้น Railway...", "⏳", "blue");
    const deploySuccess = runCommand("railway up");
    
    if (!deploySuccess) {
      log("เกิดข้อผิดพลาดในการ deploy", "red");
      return;
    }
    
    // ตั้งค่า URL สำหรับเข้าถึงแอปพลิเคชัน
    logStep("กำลังตั้งค่า URL สำหรับเข้าถึงแอปพลิเคชัน...", "⏳", "blue");
    runCommand("railway domain");
    
    if (dbChoice.toLowerCase() === 'y') {
      // อัพเดตโครงสร้างฐานข้อมูล
      logStep("กำลังอัพเดตโครงสร้างฐานข้อมูล...", "⏳", "blue");
      const dbUpdateSuccess = runCommand("railway run npm run db:push");
      
      if (dbUpdateSuccess) {
        logStep("อัพเดตโครงสร้างฐานข้อมูลสำเร็จ", "✓", "green");
      } else {
        log("ไม่สามารถอัพเดตโครงสร้างฐานข้อมูลโดยอัตโนมัติได้", "yellow");
        log("คุณสามารถอัพเดตฐานข้อมูลด้วยตนเองโดยใช้คำสั่ง: railway run npm run db:push", "yellow");
      }
    }
    
    logStep("\n✨ การติดตั้งและ Deploy สำเร็จ! ✨", "✓", "green");
    log("สามารถเข้าถึงแอปพลิเคชันของคุณได้จาก URL ด้านบน", "green");
    log("\nขั้นตอนถัดไป:", "cyan");
    log("1. สร้างบัญชีผู้ดูแลระบบที่ URL: [URL ของคุณ]/api/setup-admin", "yellow");
    log("2. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
    log("3. เปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ", "yellow");
  } else {
    // แสดงคำแนะนำการ deploy ด้วยตนเอง
    logStep("\nคำแนะนำการ Deploy ด้วยตนเอง:", "📝", "cyan");
    log("1. รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:", "yellow");
    log("   $ npm install", "white");
    log("\n2. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
    log("   $ npm run build", "white");
    log("\n3. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
    log("   $ railway up", "white");
    log("\n4. รันคำสั่งต่อไปนี้เพื่อตั้งค่า URL สำหรับเข้าถึงแอปพลิเคชัน:", "yellow");
    log("   $ railway domain", "white");
    log("\n5. รันคำสั่งต่อไปนี้เพื่ออัพเดตโครงสร้างฐานข้อมูล:", "yellow");
    log("   $ railway run npm run db:push", "white");
    log("\n6. สร้างบัญชีผู้ดูแลระบบที่ URL: [URL ของคุณ]/api/setup-admin", "yellow");
    log("7. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
    log("8. เปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ", "yellow");
  }
}

// ฟังก์ชันหลัก
async function main() {
  log("\n====== ตัวช่วย Deploy ระบบคาเฟ่ของฉัน POS สำหรับ Railway ======", "green");
  log("สคริปต์นี้จะช่วยให้คุณติดตั้งและ deploy ระบบ POS คาเฟ่บน Railway ได้ง่ายๆ", "yellow");
  
  await deployToRailway();
  
  log("\nขอบคุณที่ใช้ตัวช่วย Deploy!", "green");
  rl.close();
}

// เริ่มต้นโปรแกรม
main().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, "red");
  rl.close();
});