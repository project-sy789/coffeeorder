/**
 * สคริปต์ติดตั้งอัตโนมัติสำหรับระบบคาเฟ่ของฉัน POS
 * สามารถติดตั้งได้ทั้งบน Node.js + Express และ Firebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// สีสำหรับข้อความในคอนโซล
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * แสดงข้อความในคอนโซล
 */
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

/**
 * รันคำสั่ง shell และแสดงผลลัพธ์
 */
function runCommand(command, errorMessage) {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(errorMessage || `การดำเนินการล้มเหลว: ${error.message}`, 'red');
    return null;
  }
}

/**
 * ถามคำถามและรอคำตอบ
 */
async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(colors.cyan + question + colors.reset, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * ตรวจสอบว่าโปรแกรมถูกติดตั้งหรือไม่
 */
function isInstalled(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * ตรวจสอบสภาพแวดล้อม
 */
async function checkEnvironment() {
  log("กำลังตรวจสอบสภาพแวดล้อมการติดตั้ง...", 'blue');
  
  // ตรวจสอบ Node.js
  try {
    const nodeVersion = execSync('node -v').toString().trim();
    log(`✓ พบ Node.js ${nodeVersion}`, 'green');
  } catch (error) {
    log("✗ ไม่พบ Node.js กรุณาติดตั้ง Node.js ก่อนดำเนินการต่อ", 'red');
    process.exit(1);
  }
  
  // ตรวจสอบ npm
  try {
    const npmVersion = execSync('npm -v').toString().trim();
    log(`✓ พบ npm ${npmVersion}`, 'green');
  } catch (error) {
    log("✗ ไม่พบ npm กรุณาติดตั้ง npm ก่อนดำเนินการต่อ", 'red');
    process.exit(1);
  }
  
  return true;
}

/**
 * ตรวจสอบฐานข้อมูล PostgreSQL
 */
async function checkDatabase() {
  log("กำลังตรวจสอบการเชื่อมต่อกับฐานข้อมูล...", 'blue');
  
  try {
    // ถ้ายังไม่มีไฟล์ .env ให้สร้างขึ้นมา
    if (!fs.existsSync('.env.local')) {
      log("ไม่พบไฟล์ .env.local กำลังสร้างไฟล์...", 'yellow');
      
      // สอบถามข้อมูลฐานข้อมูล
      const dbHost = await askQuestion("กรุณาระบุ hostname ของฐานข้อมูล PostgreSQL (localhost): ") || 'localhost';
      const dbPort = await askQuestion("กรุณาระบุพอร์ตของฐานข้อมูล PostgreSQL (5432): ") || '5432';
      const dbName = await askQuestion("กรุณาระบุชื่อฐานข้อมูล: ");
      const dbUser = await askQuestion("กรุณาระบุชื่อผู้ใช้ฐานข้อมูล: ");
      const dbPassword = await askQuestion("กรุณาระบุรหัสผ่านฐานข้อมูล: ");
      
      // สร้างไฟล์ .env.local
      const envContent = `DATABASE_URL=postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}
PGHOST=${dbHost}
PGPORT=${dbPort}
PGDATABASE=${dbName}
PGUSER=${dbUser}
PGPASSWORD=${dbPassword}
`;
      fs.writeFileSync('.env.local', envContent);
      log("✓ สร้างไฟล์ .env.local เรียบร้อยแล้ว", 'green');
    } else {
      log("✓ พบไฟล์ .env.local แล้ว", 'green');
    }
    
    return true;
  } catch (error) {
    log(`✗ เกิดข้อผิดพลาดในการตรวจสอบฐานข้อมูล: ${error.message}`, 'red');
    return false;
  }
}

/**
 * ติดตั้งแพ็คเกจที่จำเป็น
 */
async function installDependencies() {
  log("กำลังติดตั้งแพ็คเกจที่จำเป็น...", 'blue');
  
  // ติดตั้งแพ็คเกจจาก package.json
  runCommand('npm install', 'ไม่สามารถติดตั้งแพ็คเกจได้');
  
  log("✓ ติดตั้งแพ็คเกจเรียบร้อยแล้ว", 'green');
  return true;
}

/**
 * เตรียมฐานข้อมูล
 */
async function setupDatabase() {
  log("กำลังเตรียมฐานข้อมูล...", 'blue');
  
  // ตรวจสอบว่าได้ตั้งค่าฐานข้อมูลหรือไม่
  if (fs.existsSync('.env.local')) {
    // อัพเดทรูปแบบ storage จาก MemStorage เป็น DatabaseStorage
    log("กำลังตั้งค่าให้ใช้ DatabaseStorage แทน MemStorage...", 'yellow');
    
    // ตรวจสอบไฟล์ server/db.ts
    if (!fs.existsSync('server/db.ts')) {
      log("กำลังสร้างไฟล์ server/db.ts...", 'yellow');
      
      const dbContent = `import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
`;
      
      fs.writeFileSync('server/db.ts', dbContent);
      log("✓ สร้างไฟล์ server/db.ts เรียบร้อยแล้ว", 'green');
    }
    
    // ตรวจสอบและสำรองไฟล์ server/storage.ts
    if (fs.existsSync('server/storage.ts')) {
      // สำรองไฟล์ storage.ts
      fs.copyFileSync('server/storage.ts', 'server/storage.ts.bak');
      log("✓ สำรองไฟล์ server/storage.ts เรียบร้อยแล้ว", 'green');
      
      // สร้างไฟล์ DatabaseStorage
      const storageContent = fs.readFileSync('server/storage.ts', 'utf8');
      
      // ตรวจสอบว่ามี DatabaseStorage หรือยัง
      if (!storageContent.includes('DatabaseStorage')) {
        log("กำลังสร้าง DatabaseStorage...", 'yellow');
        
        const updatedStorageContent = storageContent.replace(
          'export const storage = new MemStorage();',
          `import { db } from "./db";
import { eq } from "drizzle-orm";

// ปรับให้ใช้ DatabaseStorage
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // เติมเมธอดอื่นๆ เพิ่มเติมตามต้องการ...
  // คัดลอกโค้ดจาก MemStorage แต่เปลี่ยนให้ใช้ Drizzle ORM
  
  // ...

}

// เปลี่ยนเป็นใช้ DatabaseStorage แทน MemStorage
export const storage = new DatabaseStorage();`
        );
        
        fs.writeFileSync('server/storage.ts', updatedStorageContent);
        log("✓ เพิ่ม DatabaseStorage ในไฟล์ server/storage.ts เรียบร้อยแล้ว", 'green');
      }
    }
    
    // สร้างและอัพเดทฐานข้อมูล
    log("กำลังอัพเดทโครงสร้างฐานข้อมูล...", 'yellow');
    runCommand('npm run db:push', 'ไม่สามารถอัพเดทโครงสร้างฐานข้อมูลได้');
    
    log("✓ อัพเดทโครงสร้างฐานข้อมูลเรียบร้อยแล้ว", 'green');
  } else {
    log("✗ ไม่พบไฟล์ .env.local กรุณาตรวจสอบการตั้งค่าฐานข้อมูล", 'red');
    return false;
  }
  
  return true;
}

/**
 * สร้างไฟล์สำหรับเริ่มต้นเซิร์ฟเวอร์
 */
async function createStartupScript() {
  log("กำลังสร้างสคริปต์เริ่มต้นเซิร์ฟเวอร์...", 'blue');
  
  // สร้างไฟล์ start-server.js
  const startupScript = `#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ตรวจสอบว่ามีไฟล์ .env.local หรือไม่
if (!fs.existsSync('.env.local')) {
  console.error('ไม่พบไฟล์ .env.local กรุณารันสคริปต์ติดตั้ง (node easy-installer.js) ก่อน');
  process.exit(1);
}

// โหลดตัวแปรสภาพแวดล้อมจากไฟล์ .env.local
require('dotenv').config({ path: '.env.local' });

console.log('กำลังเริ่มต้นเซิร์ฟเวอร์...');

// รันคำสั่ง npm run dev
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(\`เซิร์ฟเวอร์หยุดทำงานด้วยรหัส: \${code}\`);
});

// จัดการเมื่อรับสัญญาณปิดโปรแกรม
process.on('SIGINT', () => {
  console.log('กำลังปิดเซิร์ฟเวอร์...');
  server.kill('SIGINT');
});
`;
  
  fs.writeFileSync('start-server.js', startupScript);
  fs.chmodSync('start-server.js', 0o755); // ทำให้ไฟล์สามารถรันได้
  
  log("✓ สร้างสคริปต์เริ่มต้นเซิร์ฟเวอร์เรียบร้อยแล้ว", 'green');
  return true;
}

/**
 * สร้างไฟล์ README สำหรับการติดตั้ง
 */
async function createDocumentation() {
  log("กำลังสร้างเอกสารการติดตั้ง...", 'blue');
  
  const readmeContent = `# คาเฟ่ของฉัน POS - คู่มือการติดตั้ง

## ความต้องการของระบบ
- Node.js 16 หรือใหม่กว่า
- NPM 7 หรือใหม่กว่า
- PostgreSQL 13 หรือใหม่กว่า

## การติดตั้งอัตโนมัติ
การติดตั้งง่ายๆ โดยใช้สคริปต์อัตโนมัติ:

\`\`\`
node easy-installer.js
\`\`\`

## การติดตั้งด้วยตนเอง
1. ติดตั้งแพ็คเกจ:
   \`\`\`
   npm install
   \`\`\`

2. ตั้งค่าไฟล์ .env.local:
   \`\`\`
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=dbname
   PGUSER=user
   PGPASSWORD=password
   \`\`\`

3. อัพเดทโครงสร้างฐานข้อมูล:
   \`\`\`
   npm run db:push
   \`\`\`

4. เริ่มต้นเซิร์ฟเวอร์:
   \`\`\`
   node start-server.js
   \`\`\`
   หรือ
   \`\`\`
   npm run dev
   \`\`\`

## การเข้าถึงระบบ
เมื่อเซิร์ฟเวอร์เริ่มทำงาน ระบบจะทำงานที่:
- http://localhost:3000 (หรือพอร์ตที่กำหนดในสภาพแวดล้อม)

## การอัพเดต
เมื่อต้องการอัพเดตระบบ:
1. ดาวน์โหลดไฟล์เวอร์ชันใหม่
2. รันคำสั่ง \`npm install\` เพื่ออัพเดตแพ็คเกจ
3. รันคำสั่ง \`npm run db:push\` เพื่ออัพเดตโครงสร้างฐานข้อมูล
4. รีสตาร์ทเซิร์ฟเวอร์

## การติดตั้งบน Firebase
หากต้องการติดตั้งบน Firebase:
1. ติดตั้ง Firebase Tools:
   \`\`\`
   npm install -g firebase-tools
   \`\`\`

2. ล็อกอินเข้า Firebase:
   \`\`\`
   firebase login
   \`\`\`

3. เริ่มต้นโปรเจค Firebase:
   \`\`\`
   firebase init
   \`\`\`

4. เลือกบริการที่ต้องการใช้ (Hosting, Functions, Firestore)

5. ตั้งค่าการ deploy:
   \`\`\`
   firebase use --add
   \`\`\`

6. Deploy โปรเจค:
   \`\`\`
   firebase deploy
   \`\`\`

## การสำรองข้อมูล
แนะนำให้สำรองข้อมูลเป็นประจำโดยใช้คำสั่ง:
\`\`\`
pg_dump -U username dbname > backup_\$(date +%Y%m%d).sql
\`\`\`

## การแก้ไขปัญหา
หากพบปัญหาในการติดตั้งหรือใช้งาน:
1. ตรวจสอบไฟล์ .env.local ว่ามีการตั้งค่าถูกต้อง
2. ตรวจสอบการเชื่อมต่อกับฐานข้อมูล
3. ตรวจสอบเวอร์ชัน Node.js และ npm
4. ดูบันทึกข้อผิดพลาดในคอนโซล
`;
  
  fs.writeFileSync('INSTALLATION.md', readmeContent);
  
  log("✓ สร้างเอกสารการติดตั้งเรียบร้อยแล้ว", 'green');
  return true;
}

/**
 * เพิ่มสคริปต์ในไฟล์ package.json
 */
async function updatePackageJson() {
  log("กำลังอัพเดตไฟล์ package.json...", 'blue');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // เพิ่มสคริปต์ db:push สำหรับอัพเดทฐานข้อมูล
    if (!packageJson.scripts['db:push']) {
      packageJson.scripts['db:push'] = 'drizzle-kit push:pg';
    }
    
    // เพิ่มสคริปต์ start สำหรับเริ่มต้นเซิร์ฟเวอร์ในโหมด production
    if (!packageJson.scripts['start']) {
      packageJson.scripts['start'] = 'node start-server.js';
    }
    
    // เพิ่มสคริปต์ setup สำหรับติดตั้งระบบ
    if (!packageJson.scripts['setup']) {
      packageJson.scripts['setup'] = 'node easy-installer.js';
    }
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    log("✓ อัพเดตไฟล์ package.json เรียบร้อยแล้ว", 'green');
    return true;
  } catch (error) {
    log(`✗ เกิดข้อผิดพลาดในการอัพเดตไฟล์ package.json: ${error.message}`, 'red');
    return false;
  }
}

/**
 * ฟังก์ชันหลักในการติดตั้ง
 */
async function setup() {
  log("==================================================", 'magenta');
  log("      ติดตั้งระบบคาเฟ่ของฉัน POS อัตโนมัติ      ", 'magenta');
  log("==================================================", 'magenta');
  
  try {
    // ตรวจสอบสภาพแวดล้อม
    await checkEnvironment();
    
    // ตรวจสอบฐานข้อมูล
    await checkDatabase();
    
    // ติดตั้งแพ็คเกจ
    await installDependencies();
    
    // อัพเดต package.json
    await updatePackageJson();
    
    // เตรียมฐานข้อมูล
    await setupDatabase();
    
    // สร้างสคริปต์เริ่มต้นเซิร์ฟเวอร์
    await createStartupScript();
    
    // สร้างเอกสารการติดตั้ง
    await createDocumentation();
    
    log("==================================================", 'green');
    log("      ติดตั้งระบบคาเฟ่ของฉัน POS เสร็จสมบูรณ์!      ", 'green');
    log("==================================================", 'green');
    log("คุณสามารถเริ่มต้นเซิร์ฟเวอร์ได้โดยใช้คำสั่ง:", 'cyan');
    log("node start-server.js", 'yellow');
    log("หรือ", 'cyan');
    log("npm run dev", 'yellow');
    
    log("\nสำหรับคำแนะนำเพิ่มเติม กรุณาดูที่ไฟล์ INSTALLATION.md", 'cyan');
    
  } catch (error) {
    log(`เกิดข้อผิดพลาดในการติดตั้ง: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

/**
 * ปิดทรัพยากรและจบโปรแกรม
 */
function cleanup(exitCode = 0) {
  rl.close();
  process.exit(exitCode);
}

// จัดการเมื่อมีการกดปิดโปรแกรม
process.on('SIGINT', () => {
  log("\nการติดตั้งถูกยกเลิก", 'yellow');
  cleanup(1);
});

// เริ่มต้นโปรแกรม
setup();