#!/usr/bin/env node

/**
 * ตัวติดตั้งอัตโนมัติสำหรับระบบคาเฟ่ของฉัน POS
 * สามารถ deploy ได้ง่ายๆ เพียงไม่กี่คลิก
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

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
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ฟังก์ชันสำหรับรันคำสั่ง shell
function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
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
  const dbChoice = await ask("ต้องการเพิ่มฐานข้อมูล PostgreSQL หรือไม่? (y/n): ");
  
  if (dbChoice.toLowerCase() === 'y') {
    log("กำลังเพิ่มฐานข้อมูล PostgreSQL...", "blue");
    runCommand("railway add");
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

  // แสดงคำแนะนำการ deploy
  log("\n=== คำแนะนำการ Deploy บน Railway.app ===", "cyan");
  log("1. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
  log("   $ npm run build", "white");
  log("\n2. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
  log("   $ railway up", "white");
  log("\n3. หลังจาก deploy สำเร็จ คุณจะได้รับ URL สำหรับเข้าถึงแอปพลิเคชัน", "yellow");
  log("\n4. รันคำสั่งต่อไปนี้เพื่ออัพเดตฐานข้อมูล:", "yellow");
  log("   $ railway run npm run db:push", "white");
  log("\n5. สร้างบัญชีผู้ดูแลระบบ (Admin) โดยเข้าที่ URL:", "yellow");
  log("   [URL ของคุณ]/api/setup-admin", "white");
  log("\n6. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
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
  
  // สร้างโฟลเดอร์ functions ถ้ายังไม่มี
  if (!fs.existsSync('functions')) {
    fs.mkdirSync('functions');
    
    // สร้าง package.json ในโฟลเดอร์ functions
    fs.writeFileSync('functions/package.json', 
`{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "express": "^4.21.2",
    "firebase-admin": "^11.10.1",
    "firebase-functions": "^4.5.0"
  },
  "private": true
}`);
    
    // สร้างไฟล์ index.js ในโฟลเดอร์ functions
    fs.writeFileSync('functions/index.js', 
`const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');
const fs = require('fs');

admin.initializeApp();

const app = express();

// สำหรับให้บริการ API
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Firebase Functions!' });
});

// ตัวอย่าง API สำหรับอ่านข้อมูลจาก Firestore
app.get('/api/data', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('data').get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export API เป็น Firebase Function
exports.api = functions.https.onRequest(app);`);
    
    log("✅ สร้างโฟลเดอร์ functions และไฟล์ที่จำเป็นเรียบร้อยแล้ว", "green");
  }
  
  // แสดงคำแนะนำการ deploy
  log("\n=== คำแนะนำการ Deploy บน Firebase ===", "cyan");
  log("1. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
  log("   $ npm run build", "white");
  log("\n2. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
  log("   $ firebase deploy", "white");
  log("\n3. หลังจาก deploy สำเร็จ คุณจะได้รับ URL สำหรับเข้าถึงแอปพลิเคชัน", "yellow");
  log("\n4. สร้างบัญชีผู้ดูแลระบบ (Admin) โดยเข้าที่ URL:", "yellow");
  log("   [URL ของคุณ]/api/setup-admin", "white");
  log("\n5. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
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
  
  // ตรวจสอบฐานข้อมูล
  log("\nคุณต้องมีฐานข้อมูล PostgreSQL สำหรับโปรเจคนี้", "yellow");
  const dbChoice = await ask("คุณต้องการคำแนะนำการติดตั้ง PostgreSQL หรือไม่? (y/n): ");
  
  if (dbChoice.toLowerCase() === 'y') {
    log("\n=== คำแนะนำการติดตั้ง PostgreSQL ===", "cyan");
    log("1. ติดตั้ง PostgreSQL จากเว็บไซต์ทางการ: https://www.postgresql.org/download/", "yellow");
    log("2. หลังจากติดตั้ง ให้สร้างฐานข้อมูลใหม่สำหรับโปรเจคนี้", "yellow");
    log("3. กำหนดตัวแปรสภาพแวดล้อม DATABASE_URL ในรูปแบบ:", "yellow");
    log("   postgresql://username:password@localhost:5432/database_name", "white");
  }
  
  // แสดงคำแนะนำการ deploy
  log("\n=== คำแนะนำการ Deploy บน Node.js + Express ===", "cyan");
  log("1. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
  log("   $ npm run build", "white");
  log("\n2. รันคำสั่งต่อไปนี้เพื่อเริ่มต้นเซิร์ฟเวอร์:", "yellow");
  log("   $ node start-server.js", "white");
  log("\n3. หากต้องการให้เซิร์ฟเวอร์ทำงานตลอดเวลา ให้ติดตั้ง PM2:", "yellow");
  log("   $ npm install -g pm2", "white");
  log("   $ pm2 start start-server.js --name cafe-pos", "white");
  log("\n4. กำหนดค่าเริ่มต้นแบบอัตโนมัติเมื่อระบบรีสตาร์ท:", "yellow");
  log("   $ pm2 startup", "white");
  log("   $ pm2 save", "white");
  log("\n5. สร้างบัญชีผู้ดูแลระบบ (Admin) โดยเข้าที่ URL:", "yellow");
  log("   http://localhost:5000/api/setup-admin หรือ [URL ของคุณ]/api/setup-admin", "white");
  log("\n6. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
}

// เริ่มต้นโปรแกรม
deploy().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, "red");
  rl.close();
});