#!/usr/bin/env node

/**
 * ตัวติดตั้ง Firebase สำหรับระบบคาเฟ่ของฉัน POS
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

// ฟังก์ชันสร้างไฟล์ firebase.json
function createFirebaseJson() {
  const content = `{
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
}`;

  fs.writeFileSync('firebase.json', content);
  logStep("สร้างไฟล์ firebase.json เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างไฟล์ .firebaserc
function createFirebaserc(projectId) {
  const content = `{
  "projects": {
    "default": "${projectId}"
  }
}`;

  fs.writeFileSync('.firebaserc', content);
  logStep("สร้างไฟล์ .firebaserc เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างไฟล์ firestore.rules
function createFirestoreRules() {
  const content = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if
          request.auth != null;
    }
  }
}`;

  fs.writeFileSync('firestore.rules', content);
  logStep("สร้างไฟล์ firestore.rules เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสร้างโครงสร้างโฟลเดอร์ functions
function createFunctionsFolder() {
  // สร้างโฟลเดอร์ถ้ายังไม่มี
  if (!fs.existsSync('functions')) {
    fs.mkdirSync('functions');
  }

  // สร้างไฟล์ package.json สำหรับ functions
  const packageJson = `{
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
}`;

  fs.writeFileSync('functions/package.json', packageJson);
  logStep("สร้างไฟล์ functions/package.json เรียบร้อยแล้ว", "✓", "green");

  // สร้างไฟล์ index.js สำหรับ functions
  const indexJs = `const functions = require('firebase-functions');
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

// API สำหรับการตั้งค่าผู้ดูแลระบบเริ่มต้น
app.get('/api/setup-admin', async (req, res) => {
  try {
    // ตรวจสอบว่ามีผู้ใช้ admin อยู่แล้วหรือไม่
    const userSnapshot = await admin.firestore().collection('users').where('username', '==', 'admin').get();
    
    if (!userSnapshot.empty) {
      return res.json({ success: false, message: 'ผู้ดูแลระบบมีอยู่แล้ว' });
    }
    
    // สร้างผู้ใช้ admin เริ่มต้น
    const result = await admin.firestore().collection('users').add({
      username: 'admin',
      password: 'admin123', // ในระบบจริงควรเข้ารหัสรหัสผ่าน
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'สร้างผู้ดูแลระบบเริ่มต้นเรียบร้อยแล้ว',
      username: 'admin',
      password: 'admin123'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: \`เกิดข้อผิดพลาด: \${error.message}\` });
  }
});

// API สำหรับการจัดการข้อมูลผู้ใช้
app.get('/api/users', async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // ไม่ส่งรหัสผ่านกลับไป
      const { password, ...userWithoutPassword } = userData;
      users.push({
        id: doc.id,
        ...userWithoutPassword
      });
    });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export API เป็น Firebase Function
exports.api = functions.https.onRequest(app);`;

  fs.writeFileSync('functions/index.js', indexJs);
  logStep("สร้างไฟล์ functions/index.js เรียบร้อยแล้ว", "✓", "green");
}

// ฟังก์ชันสำหรับ deploy บน Firebase
async function deployToFirebase() {
  log("\n=== การติดตั้งและ Deploy บน Firebase ===", "cyan");

  // ตรวจสอบว่ามี Firebase CLI หรือไม่
  logStep("กำลังตรวจสอบ Firebase CLI...", "⚙️", "blue");
  
  if (!hasCommand("firebase")) {
    log("ไม่พบ Firebase CLI จะทำการติดตั้งให้...", "yellow");
    const installFirebase = await ask("ต้องการติดตั้ง Firebase CLI หรือไม่? (y/n): ");
    
    if (installFirebase.toLowerCase() === 'y') {
      logStep("กำลังติดตั้ง Firebase CLI...", "⏳", "blue");
      runCommand("npm install -g firebase-tools");
    } else {
      log("คุณจำเป็นต้องติดตั้ง Firebase CLI เพื่อดำเนินการต่อ", "red");
      log("รันคำสั่ง: npm install -g firebase-tools", "yellow");
      return;
    }
  } else {
    logStep("พบ Firebase CLI แล้ว", "✓", "green");
  }
  
  // ตรวจสอบการเข้าสู่ระบบ
  logStep("\nคุณต้องเข้าสู่ระบบ Firebase ก่อน", "🔑", "yellow");
  const loginChoice = await ask("ต้องการเข้าสู่ระบบตอนนี้หรือไม่? (y/n): ");
  
  if (loginChoice.toLowerCase() === 'y') {
    logStep("กำลังเข้าสู่ระบบ Firebase...", "⏳", "blue");
    runCommand("firebase login");
  }
  
  // ถามคำถามเกี่ยวกับโปรเจค Firebase
  let projectId = "";
  logStep("\nต้องการตั้งค่าโปรเจคบน Firebase", "❓", "cyan");
  log("1. สร้างโปรเจคใหม่", "yellow");
  log("2. ใช้โปรเจคที่มีอยู่แล้ว", "yellow");
  log("3. ให้ Firebase CLI สร้างตั้งค่าอัตโนมัติ", "yellow");
  
  const projectChoice = await ask("เลือกตัวเลือก (1/2/3): ");
  
  if (projectChoice === '1') {
    logStep("หมายเหตุ: คุณต้องสร้างโปรเจคใหม่ผ่าน Firebase Console ก่อน", "ℹ️", "blue");
    log("ไปที่: https://console.firebase.google.com/", "yellow");
    
    projectId = await ask("ระบุ Project ID ของโปรเจคที่คุณสร้างไว้: ");
    createFirebaserc(projectId);
  } else if (projectChoice === '2') {
    projectId = await ask("ระบุ Project ID ของโปรเจคที่มีอยู่แล้ว: ");
    createFirebaserc(projectId);
  } else if (projectChoice === '3') {
    logStep("กำลังเริ่มต้นการตั้งค่า Firebase...", "⏳", "blue");
    log("ทำตามคำแนะนำของ Firebase CLI ในขั้นตอนต่อไป", "yellow");
    runCommand("firebase init");
    
    // ตรวจสอบว่าไฟล์ .firebaserc มีอยู่หรือไม่
    if (fs.existsSync('.firebaserc')) {
      try {
        const firebaserc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
        projectId = firebaserc.projects.default;
        logStep(`เชื่อมต่อกับโปรเจค '${projectId}' เรียบร้อยแล้ว`, "✓", "green");
      } catch (error) {
        logStep("ไม่สามารถอ่านไฟล์ .firebaserc ได้", "⚠️", "yellow");
        projectId = await ask("ระบุ Project ID ของโปรเจคที่คุณเลือก: ");
      }
    } else {
      projectId = await ask("ระบุ Project ID ของโปรเจคที่คุณเลือก: ");
      createFirebaserc(projectId);
    }
    
    // ถามว่าต้องการสร้างไฟล์อื่นๆ เพิ่มเติมหรือไม่
    const createFiles = await ask("ต้องการสร้างไฟล์การตั้งค่า Firebase เพิ่มเติมหรือไม่? (y/n): ");
    
    if (createFiles.toLowerCase() === 'n') {
      // ข้ามขั้นตอนการสร้างไฟล์เพิ่มเติม
      logStep("ข้ามการสร้างไฟล์เพิ่มเติม", "ℹ️", "blue");
      
      // ตรวจสอบว่าควรสร้างไฟล์สำคัญที่อาจหายไปหรือไม่
      if (!fs.existsSync('firebase.json')) {
        createFirebaseJson();
      }
      
      if (!fs.existsSync('firestore.rules')) {
        createFirestoreRules();
      }
      
      if (!fs.existsSync('functions')) {
        createFunctionsFolder();
      }
      
      logStep("สร้างไฟล์ที่จำเป็นเพิ่มเติมเรียบร้อยแล้ว", "✓", "green");
    }
  }
  
  // สร้างไฟล์ที่จำเป็นถ้ายังไม่ถูกสร้าง
  if (projectChoice !== '3' || !fs.existsSync('firebase.json')) {
    logStep("\nกำลังสร้างไฟล์ที่จำเป็นสำหรับ Firebase...", "📁", "blue");
    
    if (!fs.existsSync('firebase.json')) {
      createFirebaseJson();
    }
    
    if (!fs.existsSync('firestore.rules')) {
      createFirestoreRules();
    }
    
    if (!fs.existsSync('functions')) {
      createFunctionsFolder();
    }
  }

  // ถามว่าต้องการติดตั้งแพ็คเกจสำหรับ functions หรือไม่
  logStep("\nต้องการติดตั้งแพ็คเกจสำหรับ Firebase Functions หรือไม่?", "❓", "cyan");
  const installFunctionDeps = await ask("ติดตั้งแพ็คเกจสำหรับ Functions? (y/n): ");
  
  if (installFunctionDeps.toLowerCase() === 'y') {
    logStep("กำลังติดตั้งแพ็คเกจสำหรับ Firebase Functions...", "⏳", "blue");
    runCommand("cd functions && npm install");
  }
  
  // ถามว่าต้องการ deploy ทันทีหรือไม่
  const deployNow = await ask("\nต้องการ deploy ทันทีหรือไม่? (y/n): ");
  
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
    logStep("กำลัง deploy โปรเจคขึ้น Firebase...", "⏳", "blue");
    const deploySuccess = runCommand("firebase deploy");
    
    if (!deploySuccess) {
      log("เกิดข้อผิดพลาดในการ deploy", "red");
      return;
    }
    
    logStep("\n✨ การติดตั้งและ Deploy สำเร็จ! ✨", "✓", "green");
    log("สามารถเข้าถึงแอปพลิเคชันของคุณได้ที่:", "green");
    log(`https://${projectId}.web.app`, "cyan");
    log(`https://${projectId}.firebaseapp.com`, "cyan");
    
    log("\nขั้นตอนถัดไป:", "cyan");
    log("1. สร้างบัญชีผู้ดูแลระบบที่ URL: [URL ของคุณ]/api/setup-admin", "yellow");
    log("2. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
    log("3. เปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ", "yellow");
  } else {
    // แสดงคำแนะนำการ deploy ด้วยตนเอง
    logStep("\nคำแนะนำการ Deploy ด้วยตนเอง:", "📝", "cyan");
    log("1. รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:", "yellow");
    log("   $ npm install", "white");
    log("   $ cd functions && npm install", "white");
    log("\n2. รันคำสั่งต่อไปนี้เพื่อ build โปรเจค:", "yellow");
    log("   $ npm run build", "white");
    log("\n3. รันคำสั่งต่อไปนี้เพื่อ deploy:", "yellow");
    log("   $ firebase deploy", "white");
    log("\n4. สร้างบัญชีผู้ดูแลระบบที่ URL: [URL ของคุณ]/api/setup-admin", "yellow");
    log("5. เข้าสู่ระบบด้วย Username: admin และ Password: admin123", "yellow");
    log("6. เปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ", "yellow");
  }
}

// ฟังก์ชันหลัก
async function main() {
  log("\n====== ตัวช่วย Deploy ระบบคาเฟ่ของฉัน POS สำหรับ Firebase ======", "green");
  log("สคริปต์นี้จะช่วยให้คุณติดตั้งและ deploy ระบบ POS คาเฟ่บน Firebase ได้ง่ายๆ", "yellow");
  
  await deployToFirebase();
  
  log("\nขอบคุณที่ใช้ตัวช่วย Deploy!", "green");
  rl.close();
}

// เริ่มต้นโปรแกรม
main().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, "red");
  rl.close();
});