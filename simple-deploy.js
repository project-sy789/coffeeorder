#!/usr/bin/env node

/**
 * ตัวติดตั้งง่ายๆ สำหรับระบบคาเฟ่ของฉัน POS
 * สามารถ deploy ได้ง่ายๆ เพียงไม่กี่คลิก
 * ปรับปรุงให้ทำงานได้จริงและมีความน่าเชื่อถือมากขึ้น
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

// สีสำหรับข้อความในเทอร์มินัล
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// แสดงข้อความในคอนโซล
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// แสดงข้อความโดยมีสัญลักษณ์ด้านหน้า
function logStep(message, symbol = '▶', color = 'cyan') {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

// เช็คว่ามีคำสั่งหรือไม่ (ไม่แสดงผลลัพธ์)
function hasCommand(command) {
  try {
    execSync(`${command} --version > /dev/null 2>&1`);
    return true;
  } catch (error) {
    return false;
  }
}

// รันคำสั่ง shell และแสดงผลลัพธ์
function runCommand(command, showOutput = true) {
  log(`รันคำสั่ง: $ ${command}`, 'white');
  try {
    const output = execSync(command, { stdio: showOutput ? 'inherit' : 'pipe' });
    return { success: true, output: output ? output.toString() : null };
  } catch (error) {
    if (showOutput) {
      log(`เกิดข้อผิดพลาด: ${error.message}`, 'red');
    }
    return { success: false, error };
  }
}

// ถามคำถามและรอคำตอบ
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// แสดงเมนูและรับการเลือก
async function showMenu(title, options) {
  log(`\n=== ${title} ===`, 'cyan');
  options.forEach((option, index) => {
    log(`${index + 1}. ${option}`, 'yellow');
  });
  
  const answer = await ask(`\nเลือกตัวเลือก (1-${options.length}): `);
  const choice = parseInt(answer);
  if (isNaN(choice) || choice < 1 || choice > options.length) {
    log('ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่', 'red');
    return showMenu(title, options);
  }
  return choice;
}

// สร้างไฟล์ start-server.js
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
  logStep('สร้างไฟล์ start-server.js เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ Procfile สำหรับ Heroku
function createProcfile() {
  fs.writeFileSync('Procfile', 'web: npm start');
  logStep('สร้างไฟล์ Procfile เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ .dockerignore
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
  logStep('สร้างไฟล์ .dockerignore เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ railway.toml
function createRailwayToml() {
  const content = `[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/"
healthcheckTimeout = 180
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10`;

  fs.writeFileSync('railway.toml', content);
  logStep('สร้างไฟล์ railway.toml เรียบร้อยแล้ว', '✅', 'green');
}

// ฟังก์ชันสำหรับ deploy บน Vercel
async function deployToVercel() {
  log('\n== เริ่มการ deploy บน Vercel ==', 'cyan');
  
  // ตรวจสอบว่ามี Vercel CLI หรือไม่
  if (!hasCommand('vercel')) {
    log('ไม่พบ Vercel CLI จะทำการติดตั้งให้...', 'yellow');
    const installVercel = await ask('ต้องการติดตั้ง Vercel CLI ตอนนี้หรือไม่? (y/n): ');
    
    if (installVercel.toLowerCase() === 'y') {
      log('กำลังติดตั้ง Vercel CLI...', 'blue');
      const result = runCommand('npm install -g vercel');
      if (!result.success) {
        log('ไม่สามารถติดตั้ง Vercel CLI ได้ กรุณาติดตั้งเองด้วยคำสั่ง: npm install -g vercel', 'red');
        return false;
      }
    } else {
      log('คุณต้องติดตั้ง Vercel CLI ก่อนดำเนินการต่อ (npm install -g vercel)', 'yellow');
      return false;
    }
  }
  
  // สร้างไฟล์ vercel.json
  const vercelConfig = {
    "version": 2,
    "builds": [
      {
        "src": "start-server.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "start-server.js"
      }
    ]
  };
  
  fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
  logStep('สร้างไฟล์ vercel.json เรียบร้อยแล้ว', '✅', 'green');
  
  // ถามว่าต้องการ deploy เลยหรือไม่
  const deployNow = await ask('ต้องการ deploy บน Vercel ตอนนี้หรือไม่? (y/n): ');
  
  if (deployNow.toLowerCase() === 'y') {
    // deploy ด้วย Vercel CLI
    log('\nกำลัง deploy แอปพลิเคชันบน Vercel...', 'blue');
    
    const result = runCommand('vercel --prod');
    
    if (result.success) {
      log('\nแอปพลิเคชันได้รับการ deploy บน Vercel เรียบร้อยแล้ว! 🚀', 'green');
      return true;
    } else {
      log('เกิดข้อผิดพลาดระหว่างการ deploy บน Vercel', 'red');
      return false;
    }
  } else {
    log('\nคุณสามารถ deploy ด้วยตนเองในภายหลังด้วยคำสั่ง: vercel --prod', 'yellow');
    return true;
  }
}

// ฟังก์ชันสำหรับ deploy บน Render
async function deployToRender() {
  log('\n== เริ่มการ deploy บน Render ==', 'cyan');
  
  // สร้างไฟล์ render.yaml
  const renderConfig = `
services:
  - type: web
    name: coffee-pos
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
`;
  
  fs.writeFileSync('render.yaml', renderConfig);
  logStep('สร้างไฟล์ render.yaml เรียบร้อยแล้ว', '✅', 'green');
  
  log('\n=== ขั้นตอนการ deploy บน Render ===', 'cyan');
  logStep('ไปที่ https://dashboard.render.com และสร้าง Account หรือ เข้าสู่ระบบ', '1️⃣', 'yellow');
  logStep('คลิกที่ปุ่ม "New" และเลือก "Web Service"', '2️⃣', 'yellow');
  logStep('เชื่อมต่อกับ GitHub Repository ของคุณ หรือเลือก "Upload Repository"', '3️⃣', 'yellow');
  logStep('ตั้งค่าดังนี้:', '4️⃣', 'yellow');
  log('   - Name: coffee-pos หรือชื่อที่คุณต้องการ', 'white');
  log('   - Build Command: npm install && npm run build', 'white');
  log('   - Start Command: npm start', 'white');
  log('   - เลือก Free plan', 'white');
  logStep('คลิก "Create Web Service"', '5️⃣', 'yellow');
  
  log('\nRender จะ deploy แอปพลิเคชันโดยอัตโนมัติ', 'green');
  log('คุณสามารถเข้าถึงแอปพลิเคชันได้ผ่าน URL ที่ Render สร้างให้', 'green');
  
  return true;
}

// ฟังก์ชันสำหรับ deploy บน Netlify
async function deployToNetlify() {
  log('\n== เริ่มการ deploy บน Netlify ==', 'cyan');
  
  // ตรวจสอบว่ามี Netlify CLI หรือไม่
  if (!hasCommand('netlify')) {
    log('ไม่พบ Netlify CLI จะทำการติดตั้งให้...', 'yellow');
    const installNetlify = await ask('ต้องการติดตั้ง Netlify CLI ตอนนี้หรือไม่? (y/n): ');
    
    if (installNetlify.toLowerCase() === 'y') {
      log('กำลังติดตั้ง Netlify CLI...', 'blue');
      const result = runCommand('npm install -g netlify-cli');
      if (!result.success) {
        log('ไม่สามารถติดตั้ง Netlify CLI ได้ กรุณาติดตั้งเองด้วยคำสั่ง: npm install -g netlify-cli', 'red');
        return false;
      }
    } else {
      log('คุณต้องติดตั้ง Netlify CLI ก่อนดำเนินการต่อ (npm install -g netlify-cli)', 'yellow');
      return false;
    }
  }
  
  // สร้างไฟล์ netlify.toml
  const netlifyConfig = `
[build]
  command = "npm run build"
  publish = "dist/public"
  functions = "functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/"
  status = 200
`;
  
  fs.writeFileSync('netlify.toml', netlifyConfig);
  logStep('สร้างไฟล์ netlify.toml เรียบร้อยแล้ว', '✅', 'green');
  
  // ถามว่าต้องการ deploy เลยหรือไม่
  const deployNow = await ask('ต้องการ deploy บน Netlify ตอนนี้หรือไม่? (y/n): ');
  
  if (deployNow.toLowerCase() === 'y') {
    // deploy ด้วย Netlify CLI
    log('\nกำลัง deploy แอปพลิเคชันบน Netlify...', 'blue');
    
    log('1. เริ่มต้นเชื่อมต่อกับ Netlify...', 'yellow');
    runCommand('netlify init');
    
    log('2. กำลัง build และ deploy โปรเจค...', 'yellow');
    const result = runCommand('netlify deploy --prod');
    
    if (result.success) {
      log('\nแอปพลิเคชันได้รับการ deploy บน Netlify เรียบร้อยแล้ว! 🚀', 'green');
      return true;
    } else {
      log('เกิดข้อผิดพลาดระหว่างการ deploy บน Netlify', 'red');
      return false;
    }
  } else {
    log('\nคุณสามารถ deploy ด้วยตนเองในภายหลังด้วยคำสั่ง:', 'yellow');
    log('1. netlify init', 'white');
    log('2. netlify deploy --prod', 'white');
    return true;
  }
}

// ฟังก์ชันสำหรับ deploy บน Railway
async function deployToRailway() {
  log('\n== เริ่มการ deploy บน Railway ==', 'cyan');
  
  // คำแนะนำและข้อควรระวังสำหรับ Railway
  log('\n=== ข้อควรระวังสำหรับ Railway ===', 'yellow');
  log('1. Railway มีเวลาสำหรับ healthcheck จำกัด (อาจเกิด timeout ได้)', 'white');
  log('2. หากเกิด healthcheck timeout ในครั้งแรก ให้ลอง deploy อีกครั้ง', 'white');
  log('3. อีกวิธีคือให้ใช้ Render แทน เนื่องจากมีค่า timeout ที่นานกว่า', 'white');
  log('4. คุณสามารถแก้ไขปัญหานี้ได้โดยการตั้งค่า healthcheck ใน Railway Dashboard:', 'white');
  log('   - เลือกโปรเจคของคุณ > เลือกบริการแอป > Settings > Health Checks', 'white');
  log('   - เพิ่ม timeout เป็น 180 วินาที (หรือมากกว่า)', 'white');
  log('   - ตั้งค่า path เป็น / หรือ /api/health\n', 'white');
  
  // ตรวจสอบว่ามี Railway CLI หรือไม่
  if (!hasCommand('railway')) {
    log('ไม่พบ Railway CLI จะทำการติดตั้งให้...', 'yellow');
    const installRailway = await ask('ต้องการติดตั้ง Railway CLI ตอนนี้หรือไม่? (y/n): ');
    
    if (installRailway.toLowerCase() === 'y') {
      log('กำลังติดตั้ง Railway CLI...', 'blue');
      let result = runCommand('npm install -g @railway/cli');
      if (!result.success) {
        log('ทดลองใช้ชื่อแพ็คเกจอื่น...', 'yellow');
        result = runCommand('npm install -g railway');
        if (!result.success) {
          log('ไม่สามารถติดตั้ง Railway CLI ได้ กรุณาติดตั้งเองด้วยคำสั่ง: npm install -g railway', 'red');
          return false;
        }
      }
    } else {
      log('คุณต้องติดตั้ง Railway CLI ก่อนดำเนินการต่อ (npm install -g railway)', 'yellow');
      return false;
    }
  }
  
  createRailwayToml();
  
  // ตรวจสอบการล็อกอิน
  log('\nต้องเข้าสู่ระบบ Railway ก่อน', 'yellow');
  const loginChoice = await ask('ต้องการเข้าสู่ระบบตอนนี้หรือไม่? (y/n): ');
  
  if (loginChoice.toLowerCase() === 'y') {
    log('กำลังเปิดเบราว์เซอร์เพื่อให้คุณเข้าสู่ระบบ Railway...', 'blue');
    const result = runCommand('railway login');
    if (!result.success) {
      log('ไม่สามารถเข้าสู่ระบบ Railway ได้', 'red');
      return false;
    }
  } else {
    log('คุณต้องเข้าสู่ระบบ Railway ก่อนดำเนินการต่อ', 'yellow');
    return false;
  }
  
  // ถามว่าต้องการสร้างโปรเจคใหม่หรือใช้โปรเจคที่มีอยู่
  log('\nต้องเชื่อมต่อกับโปรเจคบน Railway', 'yellow');
  const projectChoice = await showMenu('เลือกตัวเลือก', [
    'สร้างโปรเจคใหม่',
    'เชื่อมต่อกับโปรเจคที่มีอยู่แล้ว'
  ]);
  
  if (projectChoice === 1) {
    // สร้างโปรเจคใหม่
    const projectName = await ask('ชื่อโปรเจคใหม่: ');
    if (projectName.trim() === '') {
      log('ชื่อโปรเจคไม่ถูกต้อง', 'red');
      return false;
    }
    
    const createResult = runCommand(`railway project create ${projectName}`);
    if (!createResult.success) {
      log('ใช้รูปแบบคำสั่งใหม่...', 'yellow');
      const newCreateResult = runCommand(`railway new -n ${projectName}`);
      if (!newCreateResult.success) {
        log('ไม่สามารถสร้างโปรเจคใหม่ได้', 'red');
        
        // แนะนำวิธีการสร้างโปรเจคผ่านเว็บไซต์
        log('\n=== วิธีสร้างโปรเจคผ่านเว็บไซต์ Railway ===', 'cyan');
        logStep('ไปที่ https://railway.app และเข้าสู่ระบบ', '1️⃣', 'yellow');
        logStep('คลิกที่ปุ่ม "New Project"', '2️⃣', 'yellow');
        logStep('เลือก "Empty Project" และตั้งชื่อโปรเจค', '3️⃣', 'yellow');
        logStep('หลังจากสร้างโปรเจคแล้ว กลับมาที่เทอร์มินัลและรัน `railway link`', '4️⃣', 'yellow');
        
        const manualCreate = await ask('คุณได้สร้างโปรเจคผ่านเว็บไซต์แล้วหรือไม่? (y/n): ');
        if (manualCreate.toLowerCase() !== 'y') {
          return false;
        }
      }
    }
  }
  
  // เชื่อมต่อกับโปรเจค
  log('\nกำลังเชื่อมต่อกับโปรเจค Railway...', 'blue');
  const linkResult = runCommand('railway link');
  if (!linkResult.success) {
    log('ไม่สามารถเชื่อมต่อกับโปรเจค Railway ได้', 'red');
    return false;
  }
  
  // ถามว่าต้องการเพิ่มฐานข้อมูล PostgreSQL หรือไม่
  log('\nคุณต้องมีฐานข้อมูล PostgreSQL สำหรับโปรเจคนี้', 'yellow');
  log('แต่หากไม่สร้างฐานข้อมูล ระบบจะใช้การเก็บข้อมูลในหน่วยความจำแทน', 'yellow');
  const dbChoice = await ask('ต้องการเพิ่มฐานข้อมูล PostgreSQL หรือไม่? (y/n): ');
  
  if (dbChoice.toLowerCase() === 'y') {
    log('กำลังเพิ่มฐานข้อมูล PostgreSQL...', 'blue');
    log('1. เมื่อมีตัวเลือกปรากฏ ให้เลือก \'Database\'', 'yellow');
    log('2. เมื่อถามว่าต้องการ database ประเภทไหน ให้เลือก \'PostgreSQL\'', 'yellow');
    
    const addResult = runCommand('railway add');
    if (!addResult.success) {
      log('ลองใช้คำสั่งอื่นในการเพิ่มฐานข้อมูล...', 'yellow');
      const addPluginResult = runCommand('railway add plugin postgresql');
      
      if (!addPluginResult.success) {
        log('\nไม่สามารถเพิ่มฐานข้อมูลผ่าน CLI ได้โดยอัตโนมัติ', 'red');
        log('คุณต้องเพิ่มฐานข้อมูลด้วยตนเองผ่านเว็บไซต์ Railway', 'yellow');
        
        // แนะนำวิธีการเพิ่มฐานข้อมูลผ่านเว็บไซต์
        log('\n=== วิธีเพิ่มฐานข้อมูลผ่านเว็บไซต์ Railway ===', 'cyan');
        logStep('ไปที่ https://railway.app และเข้าสู่ระบบ', '1️⃣', 'yellow');
        logStep('เลือกโปรเจคของคุณ', '2️⃣', 'yellow');
        logStep('คลิกที่ปุ่ม "New" และเลือก "Database"', '3️⃣', 'yellow');
        logStep('เลือก "PostgreSQL"', '4️⃣', 'yellow');
        logStep('รอให้ฐานข้อมูลถูกสร้าง', '5️⃣', 'yellow');
        
        const manualDb = await ask('คุณได้เพิ่มฐานข้อมูลผ่านเว็บไซต์แล้วหรือไม่? (y/n): ');
        if (manualDb.toLowerCase() !== 'y') {
          log('คุณสามารถเพิ่มฐานข้อมูลในภายหลังได้ ระบบจะใช้การเก็บข้อมูลในหน่วยความจำไปก่อน', 'yellow');
        }
      }
    }
    
    // วิธีการตั้งค่า DATABASE_URL
    log('\n=== วิธีการตั้งค่า DATABASE_URL ===', 'cyan');
    logStep('ตรวจสอบว่าคุณได้เพิ่มบริการ PostgreSQL และเพิ่มบริการแอปพลิเคชันแล้ว', '1️⃣', 'yellow');
    logStep('ไปที่ https://railway.app และเข้าสู่ระบบ', '2️⃣', 'yellow');
    logStep('เลือกโปรเจคของคุณ', '3️⃣', 'yellow');
    logStep('คลิกที่บริการ PostgreSQL', '4️⃣', 'yellow');
    logStep('ไปที่แท็บ "Variables" และคัดลอกค่า DATABASE_URL', '5️⃣', 'yellow');
    logStep('กลับไปที่บริการแอปพลิเคชัน คลิกที่แท็บ "Variables"', '6️⃣', 'yellow');
    logStep('เพิ่มตัวแปร DATABASE_URL และวางค่าที่คัดลอกมา', '7️⃣', 'yellow');
    
    const dbUrlSet = await ask('คุณได้ตั้งค่า DATABASE_URL เรียบร้อยแล้วหรือไม่? (y/n): ');
    if (dbUrlSet.toLowerCase() !== 'y') {
      log('คุณสามารถตั้งค่า DATABASE_URL ในภายหลังได้', 'yellow');
    }
  }
  
  // ถามว่าต้องการ deploy ตอนนี้หรือไม่
  const deployNow = await ask('\nต้องการ deploy แอปพลิเคชันตอนนี้หรือไม่? (y/n): ');
  
  if (deployNow.toLowerCase() === 'y') {
    // Build และ deploy
    log('\n=== กำลัง Build และ Deploy ===', 'blue');
    
    log('1. กำลังติดตั้งแพ็คเกจที่จำเป็น...', 'yellow');
    const installResult = runCommand('npm install');
    if (!installResult.success) {
      log('เกิดข้อผิดพลาดในการติดตั้งแพ็คเกจ', 'red');
      return false;
    }
    
    log('\n2. กำลัง Build โปรเจค...', 'yellow');
    const buildResult = runCommand('npm run build');
    if (!buildResult.success) {
      log('เกิดข้อผิดพลาดในการ Build โปรเจค', 'red');
      return false;
    }
    
    log('\n3. กำลัง Deploy ขึ้น Railway...', 'yellow');
    const upResult = runCommand('railway up');
    
    if (!upResult.success) {
      log('เกิดข้อผิดพลาดในการ Deploy', 'red');
      return false;
    }
    
    // สร้าง Domain
    log('\n4. กำลังสร้าง URL สำหรับเข้าถึงแอปพลิเคชัน...', 'yellow');
    const domainResult = runCommand('railway domain');
    
    if (domainResult.success) {
      log('\nแอปพลิเคชันได้รับการ deploy และสร้าง URL เรียบร้อยแล้ว! 🚀', 'green');
    } else {
      log('ไม่สามารถสร้าง URL ได้โดยอัตโนมัติ', 'red');
      log('คุณสามารถสร้าง URL ด้วยตนเองผ่านเว็บไซต์ Railway หรือรันคำสั่ง railway domain ในภายหลัง', 'yellow');
    }
  } else {
    // แสดงคำแนะนำการ deploy
    log('\n=== คำแนะนำการ Deploy แบบแมนวล ===', 'cyan');
    logStep('รันคำสั่งต่อไปนี้เพื่อติดตั้งแพ็คเกจที่จำเป็น:', '1️⃣', 'yellow');
    log('   npm install', 'white');
    
    logStep('รันคำสั่งต่อไปนี้เพื่อ Build โปรเจค:', '2️⃣', 'yellow');
    log('   npm run build', 'white');
    
    logStep('รันคำสั่งต่อไปนี้เพื่อ Deploy:', '3️⃣', 'yellow');
    log('   railway up', 'white');
    
    logStep('รันคำสั่งต่อไปนี้เพื่อสร้าง URL:', '4️⃣', 'yellow');
    log('   railway domain', 'white');
    
    if (dbChoice.toLowerCase() === 'y') {
      logStep('รันคำสั่งต่อไปนี้เพื่ออัพเดตฐานข้อมูล:', '5️⃣', 'yellow');
      log('   railway run npm run db:push', 'white');
    }
  }
  
  return true;
}

// ฟังก์ชันหลัก
async function main() {
  // แสดงหัวข้อ
  log('\n====== ตัวช่วย Deploy คาเฟ่ของฉัน POS (รุ่นง่าย) ======', 'magenta');
  log('ระบบนี้จะช่วยให้คุณ deploy ระบบ POS คาเฟ่ได้ง่ายๆ และมีความน่าเชื่อถือ', 'cyan');
  
  // ตรวจสอบว่าอยู่ในโฟลเดอร์โปรเจคหรือไม่
  if (!fs.existsSync('package.json')) {
    log('ไม่พบไฟล์ package.json', 'red');
    log('กรุณาตรวจสอบว่าคุณอยู่ในโฟลเดอร์โปรเจคหรือไม่', 'yellow');
    rl.close();
    return;
  }
  
  // สร้างไฟล์ที่จำเป็น
  log('\n=== กำลังเตรียมไฟล์สำหรับการ deploy ===', 'blue');
  createStartServerFile();
  createProcfile();
  createDockerignore();
  
  // แสดงเมนูตัวเลือกแพลตฟอร์ม
  const platformChoice = await showMenu('เลือกแพลตฟอร์มที่ต้องการ deploy', [
    'Render (ง่ายและฟรี แนะนำสำหรับมือใหม่)',
    'Railway (แนะนำสำหรับแอปที่ต้องใช้ฐานข้อมูล)',
    'Vercel (เหมาะสำหรับเว็บแอปพลิเคชัน)',
    'Netlify (ทางเลือกอื่นสำหรับเว็บแอป)',
    'ออกจากโปรแกรม'
  ]);
  
  let success = false;
  
  // ดำเนินการตามตัวเลือก
  switch (platformChoice) {
    case 1: // Render
      success = await deployToRender();
      break;
    case 2: // Railway
      success = await deployToRailway();
      break;
    case 3: // Vercel
      success = await deployToVercel();
      break;
    case 4: // Netlify
      success = await deployToNetlify();
      break;
    case 5: // ออกจากโปรแกรม
      log('\nกำลังออกจากโปรแกรม...', 'cyan');
      rl.close();
      return;
  }
  
  // แสดงข้อความสรุป
  if (success) {
    log('\n=== การเตรียมการเสร็จสิ้น ===', 'green');
    log('คุณได้ดำเนินการตามขั้นตอนเรียบร้อยแล้ว! 🎉', 'green');
  } else {
    log('\n=== พบปัญหาระหว่างการดำเนินการ ===', 'yellow');
    log('คุณสามารถลองใหม่อีกครั้งหรือเลือกแพลตฟอร์มอื่น', 'yellow');
  }
  
  rl.close();
}

// เริ่มโปรแกรม
main().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, 'red');
  rl.close();
});