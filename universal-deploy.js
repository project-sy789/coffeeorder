#!/usr/bin/env node

/**
 * ตัวติดตั้ง Universal สำหรับระบบคาเฟ่ของฉัน POS
 * สามารถ deploy ได้บนทุกแพลตฟอร์ม ไม่ว่าจะเป็น 
 * Railway, Render, Koyeb, Vercel หรืออื่นๆ
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

// สร้างไฟล์ universal-start-server.js
function createUniversalStartServerFile() {
  const content = `/**
 * สคริปต์เริ่มต้นเซิร์ฟเวอร์แบบ Universal สำหรับระบบคาเฟ่ของฉัน POS
 * รองรับทุกแพลตฟอร์ม (Railway, Render, Koyeb, Vercel)
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

// ตรวจจับแพลตฟอร์มที่ใช้อยู่
function detectPlatform() {
  if (process.env.KOYEB) return 'koyeb';
  if (process.env.RAILWAY_STATIC_URL) return 'railway';
  if (process.env.RENDER) return 'render';
  if (process.env.VERCEL) return 'vercel';
  
  // ตรวจสอบไฟล์ที่บ่งบอกถึงแพลตฟอร์ม
  try {
    if (fs.existsSync('/.koyeb')) return 'koyeb';
    if (fs.existsSync('/etc/railway')) return 'railway';
    if (fs.existsSync('/etc/render')) return 'render';
  } catch (e) {}
  
  return 'generic';
}

// เริ่มกระบวนการหลัก
const platform = detectPlatform();
log('กำลังเริ่มต้นเซิร์ฟเวอร์ POS คาเฟ่...', 'cyan');
log(\`ตรวจพบแพลตฟอร์ม: \${platform}\`, 'blue');

// ตั้งค่าพอร์ตตามแพลตฟอร์ม
let PORT = process.env.PORT;
if (!PORT) {
  switch (platform) {
    case 'koyeb':
      PORT = '8000';
      break;
    case 'railway':
    case 'render':
    case 'vercel':
    default:
      PORT = '5000';
      break;
  }
  process.env.PORT = PORT;
}

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
  log(\`กำลังโหลดแอปพลิเคชันและเริ่มต้นบนพอร์ต \${PORT}...\`, 'blue');
  
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

  fs.writeFileSync('universal-start-server.js', content);
  logStep('สร้างไฟล์ universal-start-server.js เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ health-api.js สำหรับตรวจสอบสถานะ
function createHealthApiFile() {
  const content = `/**
 * API ตรวจสอบสถานะ (Health API) สำหรับระบบคาเฟ่ของฉัน POS
 * ใช้สำหรับ health check บนแพลตฟอร์มต่างๆ
 */

import express from 'express';

export function setupHealthApi(app) {
  // API สำหรับตรวจสอบสถานะระบบ (health check)
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'ระบบกำลังทำงานปกติ'
    });
  });

  // API สำหรับหน้าหลัก (เพื่อ health check ที่ root path)
  app.get('/', (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      // กรณีร้องขอเป็น JSON
      res.status(200).json({
        status: 'ok',
        message: 'ระบบ POS คาเฟ่กำลังทำงาน',
        api_version: '1.0'
      });
    } else {
      // กรณีร้องขอเป็น HTML
      res.status(200).send(\`
        <!DOCTYPE html>
        <html>
        <head>
          <title>POS คาเฟ่ API</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { color: #4CAF50; font-weight: bold; }
            .info { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ระบบ POS คาเฟ่</h1>
            <p>สถานะ: <span class="status">กำลังทำงาน</span></p>
            <div class="info">
              <p>ระบบ API กำลังทำงานปกติ แอปพลิเคชันสามารถใช้งานได้ที่:</p>
              <ul>
                <li>เว็บแอปพลิเคชัน: <code>/app</code></li>
                <li>API สำหรับพนักงาน: <code>/api/staff</code></li>
                <li>API สำหรับลูกค้า: <code>/api/customers</code></li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      \`);
    }
  });

  return app;
}`;

  // สร้างโฟลเดอร์ server/health ถ้ายังไม่มี
  if (!fs.existsSync('server/health')) {
    fs.mkdirSync('server/health', { recursive: true });
  }

  fs.writeFileSync('server/health/health-api.js', content);
  logStep('สร้างไฟล์ health-api.js เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ platform-config.js
function createPlatformConfigFile() {
  const content = `/**
 * ไฟล์กำหนดค่าสำหรับแพลตฟอร์มต่างๆ ของระบบคาเฟ่ของฉัน POS
 * ใช้สำหรับปรับแต่งค่าให้เข้ากับแต่ละแพลตฟอร์มโดยอัตโนมัติ
 */

// ตรวจจับแพลตฟอร์มที่ใช้อยู่
export function detectPlatform() {
  if (process.env.KOYEB) return 'koyeb';
  if (process.env.RAILWAY_STATIC_URL) return 'railway';
  if (process.env.RENDER) return 'render';
  if (process.env.VERCEL) return 'vercel';
  
  // ตรวจสอบไฟล์ที่บ่งบอกถึงแพลตฟอร์ม
  try {
    const fs = require('fs');
    if (fs.existsSync('/.koyeb')) return 'koyeb';
    if (fs.existsSync('/etc/railway')) return 'railway';
    if (fs.existsSync('/etc/render')) return 'render';
  } catch (e) {}
  
  return 'generic';
}

// กำหนดค่าตามแพลตฟอร์ม
export function getPlatformConfig() {
  const platform = detectPlatform();
  
  const configs = {
    koyeb: {
      defaultPort: 8000,
      healthCheckPath: '/api/health',
      healthCheckInterval: '10s',
      healthCheckTimeout: '5s'
    },
    railway: {
      defaultPort: 5000,
      healthCheckPath: '/',
      healthCheckInterval: '30s',
      healthCheckTimeout: '180s'
    },
    render: {
      defaultPort: 5000,
      healthCheckPath: '/api/health',
      healthCheckInterval: '10s',
      healthCheckTimeout: '5s'
    },
    vercel: {
      defaultPort: 5000,
      healthCheckPath: '/api/health',
      healthCheckInterval: '5s',
      healthCheckTimeout: '10s'
    },
    generic: {
      defaultPort: 5000,
      healthCheckPath: '/api/health',
      healthCheckInterval: '10s',
      healthCheckTimeout: '5s'
    }
  };
  
  return configs[platform] || configs.generic;
}

// ตั้งค่าสภาพแวดล้อมตามแพลตฟอร์ม
export function setupPlatformEnvironment() {
  const platform = detectPlatform();
  const config = getPlatformConfig();
  
  // ตั้งค่าพอร์ตถ้ายังไม่ได้กำหนด
  if (!process.env.PORT) {
    process.env.PORT = config.defaultPort.toString();
  }
  
  // ตั้งค่าเพิ่มเติมตามแพลตฟอร์ม
  switch (platform) {
    case 'koyeb':
      process.env.KOYEB_PLATFORM = 'true';
      break;
    case 'railway':
      process.env.RAILWAY_PLATFORM = 'true';
      break;
    case 'render':
      process.env.RENDER_PLATFORM = 'true';
      break;
    case 'vercel':
      process.env.VERCEL_PLATFORM = 'true';
      break;
  }
  
  return { platform, config };
}`;

  // สร้างโฟลเดอร์ server/config ถ้ายังไม่มี
  if (!fs.existsSync('server/config')) {
    fs.mkdirSync('server/config', { recursive: true });
  }

  fs.writeFileSync('server/config/platform-config.js', content);
  logStep('สร้างไฟล์ platform-config.js เรียบร้อยแล้ว', '✅', 'green');
}

// สร้าง patch สำหรับ server/index.ts
function createServerIndexPatch() {
  log('\n=== วิธีปรับแก้ไฟล์ server/index.ts ===', 'cyan');
  log('เพิ่มโค้ดต่อไปนี้ที่ด้านบนของไฟล์:', 'white');
  log(`
import { setupHealthApi } from './health/health-api.js';
import { setupPlatformEnvironment } from './config/platform-config.js';

// ตั้งค่าสภาพแวดล้อมตามแพลตฟอร์ม
const { platform, config } = setupPlatformEnvironment();
console.log(\`กำลังเริ่มต้นแอปพลิเคชันบนแพลตฟอร์ม: \${platform}\`);
  `, 'yellow');

  log('และเพิ่มโค้ดต่อไปนี้หลังจากสร้าง Express app:', 'white');
  log(`
// เพิ่ม health API
setupHealthApi(app);
  `, 'yellow');

  log('และแก้ไขส่วนที่เริ่มต้นเซิร์ฟเวอร์ให้ใช้พอร์ตที่กำหนดในตัวแปรสภาพแวดล้อม:', 'white');
  log(`
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(\`[express] serving on port \${PORT}\`);
});
  `, 'yellow');
}

// สร้างไฟล์ Dockerfile
function createDockerfile() {
  const content = `FROM node:18-slim

WORKDIR /app

# ติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# คัดลอกไฟล์ทั้งหมด
COPY . .

# สร้าง build
RUN npm run build

# เปิดพอร์ต
EXPOSE 5000
EXPOSE 8000

# กำหนดตัวแปรสภาพแวดล้อม
ENV NODE_ENV=production

# เริ่มต้นแอปพลิเคชัน
CMD ["node", "universal-start-server.js"]`;

  fs.writeFileSync('Dockerfile', content);
  logStep('สร้างไฟล์ Dockerfile เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์การตั้งค่า koyeb.yaml
function createKoyebYaml() {
  const content = `name: cafe-pos
service:
  app:
    instance_type: free
    regions: ["fra"]
    ports:
      - port: 8000
        protocol: http
    health:
      path: /api/health
      port: 8000
      initial_delay: 30s
      timeout: 10s
    env:
      - key: PORT
        value: "8000"
      - key: NODE_ENV
        value: "production"
    build:
      builder: nixpacks`;

  fs.writeFileSync('koyeb.yaml', content);
  logStep('สร้างไฟล์ koyeb.yaml เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ railway.toml
function createRailwayToml() {
  const content = `[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "node universal-start-server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 180
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10`;

  fs.writeFileSync('railway.toml', content);
  logStep('สร้างไฟล์ railway.toml เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ render.yaml
function createRenderYaml() {
  const content = `services:
  - type: web
    name: cafe-pos
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: node universal-start-server.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production`;

  fs.writeFileSync('render.yaml', content);
  logStep('สร้างไฟล์ render.yaml เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ vercel.json
function createVercelJson() {
  const content = {
    "version": 2,
    "builds": [
      {
        "src": "universal-start-server.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "universal-start-server.js"
      }
    ]
  };

  fs.writeFileSync('vercel.json', JSON.stringify(content, null, 2));
  logStep('สร้างไฟล์ vercel.json เรียบร้อยแล้ว', '✅', 'green');
}

// สร้างไฟล์ package.json สำหรับเพิ่มสคริปต์
function updatePackageJson() {
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (error) {
    log('ไม่พบไฟล์ package.json หรือมีรูปแบบไม่ถูกต้อง', 'red');
    return false;
  }

  // เพิ่มหรือแก้ไขสคริปต์ start
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.start = "NODE_ENV=production node universal-start-server.js";
  
  // เพิ่มสคริปต์สำหรับ deploy ไปยังแพลตฟอร์มต่างๆ
  packageJson.scripts["deploy:railway"] = "railway up";
  packageJson.scripts["deploy:render"] = "echo 'เข้าไปที่ dashboard.render.com และเชื่อมต่อกับ GitHub repository ของคุณ'";
  packageJson.scripts["deploy:koyeb"] = "koyeb app init --name cafe-pos";

  // เขียนไฟล์กลับ
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  logStep('อัปเดตไฟล์ package.json เรียบร้อยแล้ว', '✅', 'green');
  return true;
}

// สร้างไฟล์คู่มือแบบง่าย
function createSimpleGuide() {
  const content = `# คู่มือการ Deploy ระบบ POS คาเฟ่แบบง่าย

## วิธีการ Deploy แบบรวดเร็ว (สำหรับมือใหม่)

1. **เลือกแพลตฟอร์มที่ต้องการ** (แนะนำ Render สำหรับมือใหม่)

2. **รันสคริปต์ติดตั้ง Universal**
   \`\`\`
   node universal-deploy.js
   \`\`\`

3. **ทำตามขั้นตอนที่ปรากฏบนหน้าจอ**
   - เลือกแพลตฟอร์มที่ต้องการ
   - ระบบจะสร้างไฟล์ที่จำเป็นให้อัตโนมัติ

4. **หลังจาก Deploy สำเร็จ**
   - เข้าไปที่ URL ของแอปพลิเคชัน + "/api/setup-admin"
   - ตัวอย่าง: https://your-app-name.onrender.com/api/setup-admin
   - ระบบจะสร้างบัญชีผู้ดูแลระบบเริ่มต้นให้

5. **เข้าสู่ระบบด้วย**
   - Username: admin
   - Password: admin123
   - **ควรเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ**

## วิธีการ Deploy บนแต่ละแพลตฟอร์ม

### Render (แนะนำสำหรับมือใหม่)

1. สร้างบัญชีที่ [render.com](https://render.com)
2. กดปุ่ม "New" และเลือก "Web Service"
3. เชื่อมต่อกับ GitHub repository ของคุณ
4. ตั้งค่าดังนี้:
   - Name: ชื่อที่คุณต้องการ
   - Build Command: \`npm install && npm run build\`
   - Start Command: \`node universal-start-server.js\`
   - เลือก Free plan
5. กด "Create Web Service"

### Railway

1. ติดตั้ง Railway CLI: \`npm install -g @railway/cli\`
2. ล็อกอิน: \`railway login\`
3. เริ่มต้นโปรเจค: \`railway init\`
4. Deploy: \`railway up\`

### Koyeb

1. สร้างบัญชีที่ [koyeb.com](https://koyeb.com)
2. ติดตั้ง Koyeb CLI
3. ล็อกอิน: \`koyeb login\`
4. Deploy: \`koyeb app init --name cafe-pos\`

## การเชื่อมต่อฐานข้อมูล

### ใช้ฐานข้อมูลภายในแพลตฟอร์ม

1. Railway และ Render มีฐานข้อมูล PostgreSQL ให้ใช้งาน
2. เลือก "Add Database" หรือสร้างบริการฐานข้อมูล
3. ระบบจะตั้งค่า DATABASE_URL ให้อัตโนมัติ

### ใช้ฐานข้อมูลภายนอก (แนะนำ)

1. สร้างฐานข้อมูลที่ [Neon](https://neon.tech) (มีแผนฟรี)
2. คัดลอก Connection String
3. ตั้งค่า Environment Variable "DATABASE_URL" ในแพลตฟอร์มที่คุณเลือก

## การแก้ไขปัญหา

### แอปพลิเคชันไม่ทำงาน

1. ตรวจสอบ Logs ในแพลตฟอร์มที่ใช้
2. ตรวจสอบว่า PORT ถูกตั้งค่าถูกต้อง
3. ตรวจสอบว่าฐานข้อมูลเชื่อมต่อได้

### ปัญหา Health Check ไม่ผ่าน

1. Koyeb: ตรวจสอบว่าใช้พอร์ต 8000 และ path /api/health
2. Railway: ตรวจสอบว่าตั้งค่า timeout เป็น 180 วินาที
3. Render: ตรวจสอบว่าใช้ path /api/health

## การอัปเดตแอปพลิเคชัน

1. แก้ไขโค้ดและ push ไปยัง GitHub repository
2. Render และ Koyeb จะ deploy อัตโนมัติ
3. Railway: รัน \`railway up\` อีกครั้ง

## การสำรองข้อมูล

ทุกแพลตฟอร์มมีการสำรองข้อมูลอัตโนมัติ แต่คุณควร:

1. ตรวจสอบการตั้งค่าการสำรองข้อมูลในแต่ละแพลตฟอร์ม
2. ส่งออกข้อมูลสำคัญเป็นประจำ

## ต้องการความช่วยเหลือเพิ่มเติม?

ติดต่อทีมสนับสนุนของเราที่อีเมล support@example.com`;

  fs.writeFileSync('คู่มือการ Deploy ฉบับง่าย.md', content);
  logStep('สร้างคู่มือการ Deploy ฉบับง่ายเรียบร้อยแล้ว', '✅', 'green');
}

// ฟังก์ชันหลัก
async function main() {
  // แสดงหัวข้อ
  log('\n====== ตัวติดตั้ง Universal สำหรับระบบคาเฟ่ของฉัน POS ======', 'magenta');
  log('ระบบนี้จะช่วยให้คุณ deploy ระบบ POS คาเฟ่ได้บนทุกแพลตฟอร์ม', 'cyan');
  
  // ตรวจสอบว่าอยู่ในโฟลเดอร์โปรเจคหรือไม่
  if (!fs.existsSync('package.json')) {
    log('ไม่พบไฟล์ package.json', 'red');
    log('กรุณาตรวจสอบว่าคุณอยู่ในโฟลเดอร์โปรเจคหรือไม่', 'yellow');
    rl.close();
    return;
  }
  
  // ขั้นตอนที่ 1: สร้างไฟล์พื้นฐาน
  log('\n=== ขั้นตอนที่ 1: กำลังสร้างไฟล์พื้นฐาน ===', 'blue');
  createUniversalStartServerFile();
  createHealthApiFile();
  createPlatformConfigFile();
  createServerIndexPatch();
  
  // ขั้นตอนที่ 2: สร้างไฟล์คอนฟิกของแต่ละแพลตฟอร์ม
  log('\n=== ขั้นตอนที่ 2: กำลังสร้างไฟล์คอนฟิกของแต่ละแพลตฟอร์ม ===', 'blue');
  createDockerfile();
  createKoyebYaml();
  createRailwayToml();
  createRenderYaml();
  createVercelJson();
  
  // ขั้นตอนที่ 3: อัปเดต package.json
  log('\n=== ขั้นตอนที่ 3: กำลังอัปเดต package.json ===', 'blue');
  updatePackageJson();
  
  // ขั้นตอนที่ 4: สร้างคู่มือแบบง่าย
  log('\n=== ขั้นตอนที่ 4: กำลังสร้างคู่มือการใช้งาน ===', 'blue');
  createSimpleGuide();
  
  // ขั้นตอนที่ 5: เลือกแพลตฟอร์มที่ต้องการ deploy
  log('\n=== ขั้นตอนที่ 5: เลือกแพลตฟอร์มที่ต้องการ deploy ===', 'blue');
  const platformChoice = await showMenu('เลือกแพลตฟอร์มที่ต้องการ deploy', [
    'Render (ง่ายและฟรี แนะนำสำหรับมือใหม่)',
    'Railway (แนะนำสำหรับแอปที่ต้องใช้ฐานข้อมูล)',
    'Koyeb (แพลตฟอร์มใหม่ที่มาแรง)',
    'เก็บไฟล์ไว้สำหรับ deploy เอง',
    'ออกจากโปรแกรม'
  ]);
  
  // แสดงคำแนะนำตามแพลตฟอร์มที่เลือก
  switch (platformChoice) {
    case 1: // Render
      log('\n=== คำแนะนำสำหรับการ Deploy บน Render ===', 'cyan');
      log('1. สร้างบัญชีที่ render.com (ถ้ายังไม่มี)', 'white');
      log('2. กดปุ่ม "New" และเลือก "Web Service"', 'white');
      log('3. เชื่อมต่อกับ GitHub repository ของคุณ', 'white');
      log('4. ตั้งค่าดังนี้:', 'white');
      log('   - Name: ชื่อที่คุณต้องการ', 'white');
      log('   - Build Command: npm install && npm run build', 'white');
      log('   - Start Command: node universal-start-server.js', 'white');
      log('   - เลือก Free plan', 'white');
      log('5. กด "Create Web Service"', 'white');
      log('6. เข้าไปที่แท็บ Environment เพื่อเพิ่มตัวแปร DATABASE_URL หากต้องการใช้ฐานข้อมูล', 'white');
      break;
      
    case 2: // Railway
      log('\n=== คำแนะนำสำหรับการ Deploy บน Railway ===', 'cyan');
      log('1. ติดตั้ง Railway CLI ด้วยคำสั่ง: npm install -g @railway/cli', 'white');
      log('2. ล็อกอินด้วยคำสั่ง: railway login', 'white');
      log('3. เริ่มต้นโปรเจคด้วยคำสั่ง: railway init', 'white');
      log('4. Deploy ด้วยคำสั่ง: railway up', 'white');
      log('5. เพิ่มฐานข้อมูล PostgreSQL ผ่าน dashboard ของ Railway', 'white');
      break;
      
    case 3: // Koyeb
      log('\n=== คำแนะนำสำหรับการ Deploy บน Koyeb ===', 'cyan');
      log('1. สร้างบัญชีที่ koyeb.com (ถ้ายังไม่มี)', 'white');
      log('2. เชื่อมต่อกับ GitHub repository ของคุณ', 'white');
      log('3. สร้าง Service ใหม่ด้วยค่าต่อไปนี้:', 'white');
      log('   - Runtime: Docker', 'white');
      log('   - Port: 8000', 'white');
      log('   - Health Check Path: /api/health', 'white');
      log('4. ตั้งค่า Environment Variable:', 'white');
      log('   - PORT: 8000', 'white');
      log('   - NODE_ENV: production', 'white');
      log('   - DATABASE_URL: (หากต้องการใช้ฐานข้อมูล)', 'white');
      break;
      
    case 4: // เก็บไฟล์ไว้สำหรับ deploy เอง
      log('\n=== คำแนะนำสำหรับการ Deploy ด้วยตนเอง ===', 'cyan');
      log('1. ไฟล์ทั้งหมดที่จำเป็นถูกสร้างเรียบร้อยแล้ว', 'white');
      log('2. คุณสามารถใช้ไฟล์เหล่านี้เพื่อ deploy บนแพลตฟอร์มที่คุณต้องการ', 'white');
      log('3. อ่านคู่มือการ Deploy ฉบับง่ายสำหรับคำแนะนำเพิ่มเติม', 'white');
      break;
      
    case 5: // ออกจากโปรแกรม
      log('\nกำลังออกจากโปรแกรม...', 'cyan');
      rl.close();
      return;
  }
  
  // ขั้นตอนที่ 6: แสดงขั้นตอนต่อไป
  log('\n=== ขั้นตอนต่อไปหลังจาก Deploy สำเร็จ ===', 'green');
  log('1. เข้าถึงแอปพลิเคชันของคุณผ่าน URL ที่ได้รับ', 'white');
  log('2. สร้างบัญชีผู้ดูแลระบบ (Admin) โดยเข้าที่ URL: [URL ของคุณ]/api/setup-admin', 'white');
  log('3. เข้าสู่ระบบด้วย Username: admin และ Password: admin123', 'white');
  log('4. เปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ', 'white');
  log('5. ตั้งค่าร้านค้าและเพิ่มสินค้าของคุณ', 'white');
  
  log('\nการเตรียมการเสร็จสิ้น! 🎉', 'green');
  log('คุณสามารถศึกษาเพิ่มเติมได้จากไฟล์ "คู่มือการ Deploy ฉบับง่าย.md"', 'cyan');
  
  rl.close();
}

// เริ่มโปรแกรม
main().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, 'red');
  rl.close();
});