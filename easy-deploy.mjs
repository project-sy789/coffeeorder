#!/usr/bin/env node

/**
 * ตัวติดตั้งอัตโนมัติสำหรับระบบคาเฟ่ของฉัน POS
 * สามารถ deploy ได้ง่ายๆ เพียงไม่กี่คลิก
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ฟังก์ชันสำหรับรันคำสั่ง shell
function runCommand(command, returnOutput = false) {
  try {
    log(`\nรันคำสั่ง: $ ${command}`, "gray");
    
    if (returnOutput) {
      // ใช้ execSync เพื่อรันคำสั่งแบบซิงโครนัสและรับผลลัพธ์
      const stdout = execSync(command, { encoding: 'utf8' });
      return stdout;
    } else {
      // ใช้ execSync เพื่อรันคำสั่งแบบซิงโครนัสและแสดงผลลัพธ์
      execSync(command, { stdio: 'inherit' });
      return true;
    }
  } catch (error) {
    console.error(error);
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

// ฟังก์ชันสำหรับเลือกแพลตฟอร์ม
async function selectPlatform() {
  log("\n=== เลือกแพลตฟอร์มที่ต้องการ deploy ===", "cyan");
  log("1. Railway.app (แนะนำ)");
  log("2. Firebase Hosting");
  log("3. Node.js + Express (Server ของคุณเอง)");
  log("4. ออกจากโปรแกรม");
  
  const choice = await ask("\nเลือกตัวเลือก (1-4): ");
  
  switch (choice) {
    case '1':
      return 'railway';
    case '2':
      return 'firebase';
    case '3':
      return 'nodejs';
    case '4':
      return 'exit';
    default:
      log("ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่", "red");
      return selectPlatform();
  }
}

// ฟังก์ชันหลัก
async function deploy() {
  log("\n====== ตัวช่วย Deploy คาเฟ่ของฉัน POS ======", "green");
  log("ระบบนี้จะช่วยให้คุณ deploy ระบบ POS คาเฟ่ได้ง่ายๆ", "yellow");
  
  const platform = await selectPlatform();
  
  if (platform === 'exit') {
    log("\nยกเลิกการ deploy", "yellow");
    rl.close();
    return;
  }
  
  log("\n=== กำลังเตรียมไฟล์สำหรับการ deploy ===", "blue");

  // สร้างไฟล์ตามแพลตฟอร์มที่เลือก
  switch (platform) {
    case 'railway':
      await deployToRailway();
      break;
    case 'firebase':
      await deployToFirebase();
      break;
    case 'nodejs':
      await deployToNodejs();
      break;
  }
  
  log("\n=== การเตรียมการเสร็จสิ้น ===", "green");
  log("คุณสามารถเริ่มการ deploy ได้ตามคำแนะนำด้านบน", "green");
  
  rl.close();
}

// ฟังก์ชันสำหรับ deploy บน Railway.app
async function deployToRailway() {
  log("\n=== การ Deploy บน Railway.app ===", "cyan");
  
  // ตรวจสอบว่ามี Railway CLI หรือไม่
  log("กำลังตรวจสอบ Railway CLI...", "yellow");
  const hasRailwayCLI = runCommand("railway --version > /dev/null 2>&1");
  
  if (!hasRailwayCLI) {
    log("ไม่พบ Railway CLI จะทำการติดตั้งให้...", "yellow");
    const installRailway = await ask("ต้องการติดตั้ง Railway CLI หรือไม่? (y/n): ");
    
    if (installRailway.toLowerCase() === 'y') {
      log("กำลังติดตั้ง Railway CLI...", "blue");
      runCommand("npm install -g @railway/cli");
    } else {
      log("คุณจำเป็นต้องติดตั้ง Railway CLI เพื่อดำเนินการต่อ", "red");
      log("รันคำสั่ง: npm install -g @railway/cli", "yellow");
      return;
    }
  }
  
  // ตรวจสอบการเข้าสู่ระบบ
  log("\nคุณต้องเข้าสู่ระบบ Railway ก่อน", "yellow");
  const loginChoice = await ask("ต้องการเข้าสู่ระบบตอนนี้หรือไม่? (y/n): ");
  
  if (loginChoice.toLowerCase() === 'y') {
    log("กำลังเข้าสู่ระบบ Railway...", "blue");
    runCommand("railway login");
  }
  
  // สร้างโปรเจค
  log("\nคุณต้องเชื่อมต่อกับโปรเจคบน Railway", "yellow");
  log("ตัวเลือก:", "yellow");
  log("1. สร้างโปรเจคใหม่", "yellow");
  log("2. เชื่อมต่อกับโปรเจคที่มีอยู่แล้ว", "yellow");
  
  const projectChoice = await ask("เลือกตัวเลือก (1/2): ");
  
  if (projectChoice === '1') {
    const projectName = await ask("ชื่อโปรเจคใหม่: ");
    runCommand(`railway project create ${projectName}`);
  } else if (projectChoice === '2') {
    runCommand("railway link");
  }
  
  // ตรวจสอบว่ามีฐานข้อมูลหรือไม่
  log("\nคุณต้องมีฐานข้อมูล PostgreSQL สำหรับโปรเจคนี้", "yellow");
  log("แต่หากไม่สร้างฐานข้อมูล ระบบจะใช้การเก็บข้อมูลในหน่วยความจำแทน", "yellow");
  const dbChoice = await ask("ต้องการเพิ่มฐานข้อมูล PostgreSQL หรือไม่? (y/n): ");
  
  if (dbChoice.toLowerCase() === 'y') {
    // ใช้คำสั่ง railway add สำหรับเพิ่มฐานข้อมูล
    log("กำลังเพิ่มฐานข้อมูล PostgreSQL...", "blue");
    log("1. เมื่อมีตัวเลือกปรากฏ ให้เลือก 'Database'", "yellow");
    log("2. เมื่อถามว่าต้องการ database ประเภทไหน ให้เลือก 'PostgreSQL'", "yellow");
    const addDbSuccess = runCommand("railway add");
    
    if (!addDbSuccess) {
      log("\nไม่สามารถเพิ่มฐานข้อมูลได้ ระบบจะทำงานโดยใช้ฐานข้อมูลในหน่วยความจำแทน", "yellow");
      log("คุณสามารถเพิ่มฐานข้อมูลได้ภายหลังผ่านเว็บไซต์ Railway", "yellow");
    } else {
      // ทำการสร้างโปรเจคใหม่บน Railway และเพิ่มทั้งแอปและฐานข้อมูล
      log("\n=== กำลังเชื่อมต่อฐานข้อมูล ===", "blue");
      log("กำลังตั้งค่าฐานข้อมูลสำหรับแอปพลิเคชัน...", "yellow");
      
      // เชื่อมต่อกับบริการ PostgreSQL ที่เพิ่งสร้าง
      log("\nเลือกพื้นที่ทำงาน, โปรเจค, และสภาพแวดล้อมบน Railway", "yellow");
      
      // ถามว่าต้องการเชื่อมต่อฐานข้อมูลใหม่หรือไม่
      const connectDbAgain = await ask("ต้องการเชื่อมต่อกับฐานข้อมูลที่สร้างขึ้นหรือไม่? (y/n): ");
      
      if (connectDbAgain.toLowerCase() === 'y') {
        log("\nเลือกพื้นที่ทำงาน, โปรเจค, และสภาพแวดล้อมในขั้นตอนต่อไป", "yellow");
        runCommand("railway link");
      }
    }
  }
  
  // สร้างไฟล์ที่จำเป็น
  log("\nกำลังสร้างไฟล์ที่จำเป็นสำหรับ Railway...", "blue");
  
  // สร้าง Procfile
  fs.writeFileSync('Procfile', 'web: node start-server.js');
  log("✅ สร้างไฟล์ Procfile เรียบร้อยแล้ว", "green");
  
  // สร้าง railway.toml
  fs.writeFileSync('railway.toml', 
`[build]
builder = "NIXPACKS"
nixpacksPlan = { nixpacksVersion = "1.13.0" }

[deploy]
numReplicas = 1
sleepApplication = false
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3`);
  log("✅ สร้างไฟล์ railway.toml เรียบร้อยแล้ว", "green");
  
  // สร้าง start-server.js
  fs.writeFileSync('start-server.js', 
`/**
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
}`);
  log("✅ สร้างไฟล์ start-server.js เรียบร้อยแล้ว", "green");

  // สร้าง .dockerignore
  fs.writeFileSync('.dockerignore',
`node_modules
npm-debug.log
.env
.git
.gitignore
Dockerfile
.dockerignore
.DS_Store`);
  log("✅ สร้างไฟล์ .dockerignore เรียบร้อยแล้ว", "green");

  // ถามว่าต้องการ deploy อัตโนมัติหรือไม่
  log("\nต้องการ deploy อัตโนมัติหรือไม่?", "cyan");
  log("ถ้าเลือก 'y' ระบบจะทำการ build, deploy และตั้งค่า URL ให้อัตโนมัติ", "yellow");
  const autoDeploy = await ask("ต้องการ deploy อัตโนมัติหรือไม่? (y/n): ");
  
  if (autoDeploy.toLowerCase() === 'y') {
    // ติดตั้งแพ็คเกจ
    log("\n=== กำลังติดตั้งแพ็คเกจที่จำเป็น ===", "blue");
    runCommand("npm install");
    
    // Build โปรเจค
    log("\n=== กำลัง Build โปรเจค ===", "blue");
    const buildSuccess = runCommand("npm run build");
    
    if (!buildSuccess) {
      log("เกิดข้อผิดพลาดระหว่างการ build โปรเจค", "red");
      log("ลองรันคำสั่ง 'npm install' เพื่อติดตั้งแพ็คเกจที่จำเป็นก่อน", "yellow");
      return;
    }
    
    // ตรวจสอบว่าได้สร้างฐานข้อมูลแล้วหรือไม่
    if (dbChoice.toLowerCase() === 'y') {
      log("\n=== กำลังเชื่อมต่อฐานข้อมูลอัตโนมัติ ===", "blue");
      
      // ถามว่าได้สร้างบริการแอปแล้วหรือไม่
      log("ก่อนจะดำเนินการต่อ เราต้องตรวจสอบว่าคุณมีบริการสำหรับแอปพลิเคชันแล้วหรือไม่", "yellow");
      log("หากยังไม่มี คุณจำเป็นต้องสร้างบริการสำหรับแอปพลิเคชันบน Railway ก่อน", "yellow");
      const hasService = await ask("คุณมีบริการสำหรับแอปพลิเคชันบน Railway แล้วหรือไม่? (y/n): ");
      
      if (hasService.toLowerCase() !== 'y') {
        log("\n=== วิธีการสร้างบริการใหม่บน Railway ===", "cyan");
        log("1. ไปที่ https://railway.app และเข้าสู่ระบบ", "yellow");
        log("2. เลือกโปรเจคของคุณจากหน้าแดชบอร์ด", "yellow");
        log("3. คลิกปุ่ม 'New Service' หรือ '+' บนหน้าแดชบอร์ดโปรเจค", "yellow");
        log("4. เลือก 'Deploy from GitHub' หรือ 'Empty Service' ตามความเหมาะสม", "yellow");
        log("5. ตั้งชื่อบริการ (เช่น 'coffeeapp') และกด Create", "yellow");
        log("\nกรุณาสร้างบริการบน Railway ก่อนดำเนินการต่อ", "red");
        process.exit(1);
      }
      
      // ถามชื่อบริการสำหรับแอปพลิเคชันหลัก
      log("เราจำเป็นต้องคัดลอกตัวแปร DATABASE_URL จากบริการฐานข้อมูลไปยังบริการแอปพลิเคชันหลัก", "yellow");
      const mainServiceName = await ask("ชื่อบริการหลักของแอปพลิเคชันที่คุณสร้างไว้: ");
      
      // กำหนดชื่อบริการหลัก
      const targetService = mainServiceName.trim() !== "" ? mainServiceName : "default";
      
      // ดึงค่า DATABASE_URL จากหน้าเว็บไซต์ Railway
      log(`Railway CLI เวอร์ชันใหม่ไม่รองรับการดึงค่าตัวแปรจากคำสั่ง CLI โดยตรง`, "yellow");
      log(`คุณจำเป็นต้องตั้งค่า DATABASE_URL ด้วยตนเอง`, "yellow");
      
      // แนะนำวิธีการคัดลอก DATABASE_URL ด้วยตนเอง
      log(`\n=== วิธีตั้งค่า DATABASE_URL ด้วยตนเอง ===`, "cyan");
      log(`1. ไปที่ https://railway.app และเข้าสู่ระบบ`, "yellow");
      log(`2. เลือกโปรเจคของคุณจากหน้าแดชบอร์ด`, "yellow");
      log(`3. เลือกบริการ 'PostgreSQL' ที่คุณเพิ่งสร้าง (สังเกตไอคอนรูปฐานข้อมูล)`, "yellow");
      log(`4. คลิกที่แท็บ "Variables" เพื่อดูค่าตัวแปร`, "yellow");
      log(`5. คัดลอกค่า DATABASE_URL (เริ่มด้วย postgresql://...)`, "yellow");
      log(`6. ต้องสร้างบริการแอปพลิเคชันก่อน โดยคลิกปุ่ม "New Service" หรือ "+" บนหน้าแดชบอร์ดโปรเจค`, "yellow");
      log(`7. เลือก "Empty Service" หรือ "GitHub Repo" แล้วตั้งชื่อบริการ (เช่น "coffeeapp")`, "yellow");
      log(`8. หลังจากสร้างบริการใหม่แล้ว ให้คลิกที่บริการนั้น`, "yellow");
      log(`9. คลิกที่แท็บ "Variables" ของบริการแอปพลิเคชัน`, "yellow");
      log(`10. คลิกปุ่ม "New Variable" หรือ "+" เพื่อเพิ่มตัวแปรใหม่`, "yellow");
      log(`11. ตั้งชื่อตัวแปรเป็น "DATABASE_URL" (ตรงตามตัวพิมพ์ใหญ่-เล็ก)`, "yellow");
      log(`12. ใส่ค่า DATABASE_URL ที่คัดลอกมาจากบริการ PostgreSQL ในขั้นตอนที่ 5`, "yellow");
      log(`13. คลิกปุ่ม "Add" หรือ "Save" เพื่อบันทึกตัวแปร`, "yellow");
      
      // ถามว่าผู้ใช้ได้ดำเนินการแล้วหรือไม่
      const manualSuccess = await ask("คุณได้ตั้งค่า DATABASE_URL ด้วยตนเองเรียบร้อยแล้วใช่หรือไม่? (y/n): ");
      if (manualSuccess.toLowerCase() === 'y') {
        log("✅ ใช้ค่า DATABASE_URL ที่ตั้งค่าด้วยตนเอง", "green");
        return true;
      }
      return false;
    }
    
    // Deploy ขึ้น Railway
    log("\n=== กำลัง Deploy ขึ้น Railway ===", "blue");
    
    // ถามชื่อบริการที่ต้องการ deploy
    log("บนโปรเจคของคุณอาจมีหลายบริการ เช่น แอปพลิเคชันหลัก, ฐานข้อมูล, ฯลฯ", "yellow");
    const serviceName = await ask("ชื่อบริการที่ต้องการ deploy (ถ้าไม่ทราบให้กด Enter): ");
    
    let deploySuccess;
    
    if (serviceName.trim() !== "") {
      // Deploy เฉพาะบริการที่ระบุ
      log(`กำลัง deploy บริการ '${serviceName}'...`, "blue");
      deploySuccess = runCommand(`railway up --service ${serviceName}`);
    } else {
      // Deploy ทั้งหมด
      log("กำลัง deploy ทุกบริการ...", "blue");
      deploySuccess = runCommand("railway up");
    }
    
    if (!deploySuccess) {
      log("เกิดข้อผิดพลาดระหว่างการ Deploy", "red");
      log("ตรวจสอบว่าชื่อบริการถูกต้องหรือลองใช้คำสั่ง `railway up` โดยไม่ระบุ service", "yellow");
      
      const retryDeploy = await ask("ต้องการลอง deploy อีกครั้งโดยไม่ระบุชื่อบริการหรือไม่? (y/n): ");
      if (retryDeploy.toLowerCase() === 'y') {
        runCommand("railway up");
      }
    }
    
    // อัพเดตฐานข้อมูล
    if (dbChoice.toLowerCase() === 'y') {
      log("\n=== กำลังอัพเดตโครงสร้างฐานข้อมูล ===", "blue");
      const dbPushSuccess = runCommand("railway run npm run db:push");
      
      if (dbPushSuccess) {
        log("✅ อัพเดตโครงสร้างฐานข้อมูลสำเร็จ", "green");
      } else {
        log("⚠️ ไม่สามารถอัพเดตโครงสร้างฐานข้อมูลโดยอัตโนมัติได้", "yellow");
        log("คุณสามารถอัพเดตฐานข้อมูลด้วยตนเองโดยใช้คำสั่ง:", "yellow");
        log("   $ railway run npm run db:push", "white");
      }
    }
    
    // สร้าง domain และแสดง URL
    log("\n=== กำลังตั้งค่า URL สำหรับเข้าถึงแอปพลิเคชัน ===", "blue");
    runCommand("railway domain");
    
    log("\n=== การ Deploy เสร็จสมบูรณ์ ===", "green");
    log("คุณสามารถเข้าถึงแอปพลิเคชันได้จาก URL ด้านบน", "green");
  } else {
    // แสดงคำแนะนำตามปกติ
    log("\n=== คำแนะนำการ Deploy บน Railway.app ===", "cyan");
    log("1. รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:", "yellow");
    log("   $ npm install", "white");
    log("\n2. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
    log("   $ npm run build", "white");
    log("\n3. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
    log("   $ railway up", "white");
    log("\n4. เพื่อดู URL สำหรับเข้าถึงแอปพลิเคชัน รันคำสั่ง:", "yellow");
    log("   $ railway domain", "white");
    log("\n5. รันคำสั่งต่อไปนี้เพื่ออัพเดตฐานข้อมูล:", "yellow");
    log("   $ railway run npm run db:push", "white");
  }
}

// ฟังก์ชันสำหรับ deploy บน Firebase
async function deployToFirebase() {
  log("\n=== การ Deploy บน Firebase ===", "cyan");
  
  // ตรวจสอบว่ามี Firebase CLI หรือไม่
  log("กำลังตรวจสอบ Firebase CLI...", "yellow");
  const hasFirebaseCLI = runCommand("firebase --version > /dev/null 2>&1");
  
  if (!hasFirebaseCLI) {
    log("ไม่พบ Firebase CLI จะทำการติดตั้งให้...", "yellow");
    const installFirebase = await ask("ต้องการติดตั้ง Firebase CLI หรือไม่? (y/n): ");
    
    if (installFirebase.toLowerCase() === 'y') {
      log("กำลังติดตั้ง Firebase CLI...", "blue");
      runCommand("npm install -g firebase-tools");
    } else {
      log("คุณจำเป็นต้องติดตั้ง Firebase CLI เพื่อดำเนินการต่อ", "red");
      log("รันคำสั่ง: npm install -g firebase-tools", "yellow");
      return;
    }
  }
  
  // ตรวจสอบการเข้าสู่ระบบ
  log("\nคุณต้องเข้าสู่ระบบ Firebase ก่อน", "yellow");
  const loginChoice = await ask("ต้องการเข้าสู่ระบบตอนนี้หรือไม่? (y/n): ");
  
  if (loginChoice.toLowerCase() === 'y') {
    log("กำลังเข้าสู่ระบบ Firebase...", "blue");
    runCommand("firebase login");
  }
  
  // สร้างโปรเจค Firebase
  log("\nคุณต้องเชื่อมต่อกับโปรเจคบน Firebase", "yellow");
  const initChoice = await ask("ต้องการสร้างโปรเจคใหม่หรือเชื่อมต่อกับโปรเจคที่มีอยู่แล้ว? (y/n): ");
  
  if (initChoice.toLowerCase() === 'y') {
    log("กำลังเริ่มต้นโปรเจค Firebase...", "blue");
    runCommand("firebase init");
  }
  
  // สร้างไฟล์ที่จำเป็น
  log("\nกำลังสร้างไฟล์ที่จำเป็นสำหรับ Firebase...", "blue");
  
  // สร้าง firebase.json ถ้ายังไม่มี
  if (!fs.existsSync('firebase.json')) {
    fs.writeFileSync('firebase.json', 
`{
  "hosting": {
    "public": "dist/public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "function": "api"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  }
}`);
    log("✅ สร้างไฟล์ firebase.json เรียบร้อยแล้ว", "green");
  }
  
  // แสดงคำแนะนำการ deploy
  log("\n=== คำแนะนำการ Deploy บน Firebase ===", "cyan");
  log("1. รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:", "yellow");
  log("   $ npm install", "white");
  log("\n2. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
  log("   $ npm run build", "white");
  log("\n3. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
  log("   $ firebase deploy", "white");
  log("\n4. หลังจาก deploy สำเร็จ คุณจะได้รับ URL สำหรับเข้าถึงแอปพลิเคชัน", "yellow");
}

// ฟังก์ชันสำหรับ deploy บน Node.js + Express
async function deployToNodejs() {
  log("\n=== การ Deploy บน Node.js + Express ===", "cyan");
  
  // สร้างไฟล์ที่จำเป็น
  log("\nกำลังสร้างไฟล์ที่จำเป็นสำหรับ Node.js + Express...", "blue");
  
  // สร้าง start-server.js
  fs.writeFileSync('start-server.js', 
`/**
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
}`);
  log("✅ สร้างไฟล์ start-server.js เรียบร้อยแล้ว", "green");
  
  // แสดงคำแนะนำการ deploy
  log("\n=== คำแนะนำการ Deploy บน Node.js + Express ===", "cyan");
  log("1. รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:", "yellow");
  log("   $ npm install", "white");
  log("\n2. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
  log("   $ npm run build", "white");
  log("\n3. รันคำสั่งต่อไปนี้เพื่อเริ่มเซิร์ฟเวอร์:", "yellow");
  log("   $ node start-server.js", "white");
  log("\n4. ตั้งค่าเซิร์ฟเวอร์ของคุณให้รันคำสั่งนี้เมื่อเริ่มต้น", "yellow");
  log("5. ตรวจสอบให้แน่ใจว่าพอร์ต 5000 เปิดใช้งานบนเซิร์ฟเวอร์ของคุณ", "yellow");
}

// เริ่มต้นทันทีเมื่อรันสคริปต์
deploy();