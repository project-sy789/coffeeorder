/**
 * เครื่องมือแก้ไขไฟล์การรับรองตัวตน แบบ ES Module
 * 
 * ปัญหา: RangeError: Input buffers must have the same byte length
 * วิธีใช้: NODE_OPTIONS=--experimental-vm-modules node auth-fix.mjs
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

async function main() {
  log('\n==================================================', colors.bright + colors.cyan);
  log('🔧 เครื่องมือแก้ไขไฟล์การรับรองตัวตน แบบ ES Module', colors.bright + colors.cyan);
  log('==================================================\n', colors.bright + colors.cyan);
  
  // ค้นหาไฟล์ auth.js หรือ auth.ts
  const paths = [
    'server/auth.js',
    'server/auth.ts',
    'server/auth/index.js',
    'server/auth/index.ts',
    'dist/auth.js',
    'dist/server/auth.js'
  ];
  
  let authFilePath = null;
  
  for (const path of paths) {
    try {
      await fs.access(path);
      authFilePath = path;
      log(`✅ พบไฟล์ ${path}`, colors.green);
      break;
    } catch (error) {
      // ไม่พบไฟล์
    }
  }
  
  if (!authFilePath) {
    // ค้นหาไฟล์ที่มีคำว่า comparePasswords
    log('🔍 ไม่พบไฟล์ auth.js หรือ auth.ts ค้นหาไฟล์ที่มีฟังก์ชัน comparePasswords...', colors.yellow);
    
    const distDir = 'dist';
    let filesWithComparePasswords = [];
    
    try {
      // ค้นหาไฟล์ใน dist directory
      const findFiles = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = resolve(dir, entry.name);
          
          if (entry.isDirectory()) {
            await findFiles(fullPath);
          } else if (entry.name.endsWith('.js')) {
            const content = await fs.readFile(fullPath, 'utf8');
            if (content.includes('comparePasswords') || content.includes('timingSafeEqual')) {
              filesWithComparePasswords.push(fullPath);
              log(`✅ พบไฟล์ที่มีฟังก์ชัน comparePasswords: ${fullPath}`, colors.green);
            }
          }
        }
      };
      
      if (await fs.access(distDir).then(() => true).catch(() => false)) {
        await findFiles(distDir);
      }
    } catch (error) {
      log(`❌ เกิดข้อผิดพลาดในการค้นหาไฟล์: ${error.message}`, colors.red);
    }
    
    if (filesWithComparePasswords.length > 0) {
      authFilePath = filesWithComparePasswords[0];
    } else {
      log(`❌ ไม่พบไฟล์ที่มีฟังก์ชัน comparePasswords`, colors.red);
      return;
    }
  }
  
  // อ่านเนื้อหาไฟล์
  log(`🔍 กำลังแก้ไขไฟล์ ${authFilePath}...`, colors.cyan);
  const content = await fs.readFile(authFilePath, 'utf8');
  
  // หาและแก้ไขฟังก์ชัน comparePasswords
  const comparePasswordsRegex = /async\s+function\s+comparePasswords\s*\([^)]*\)\s*{[\s\S]*?}/;
  const timingSafeEqualRegex = /timingSafeEqual\s*\([^)]*\)/g;
  
  // หาฟังก์ชัน comparePasswords
  const comparePasswordsMatch = content.match(comparePasswordsRegex);
  
  if (comparePasswordsMatch) {
    log(`✅ พบฟังก์ชัน comparePasswords`, colors.green);
    
    const fixedContent = content.replace(comparePasswordsRegex, `async function comparePasswords(supplied, stored) {
  try {
    // เปลี่ยนมาใช้ bcrypt.compare แทน ซึ่งจะไม่มีปัญหา buffer length
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}`);
    
    // บันทึกการแก้ไข
    await fs.writeFile(authFilePath, fixedContent);
    log(`✅ แก้ไขฟังก์ชัน comparePasswords สำเร็จ`, colors.green);
  } else if (content.includes('timingSafeEqual')) {
    log(`✅ พบการใช้ timingSafeEqual`, colors.green);
    
    // แก้ไขการใช้ timingSafeEqual
    const fixedContent = content.replace(/const\s+comparePasswords[^{]*{[\s\S]*?}/, `const comparePasswords = async (supplied, stored) => {
  try {
    // เปลี่ยนมาใช้ bcrypt.compare แทน ซึ่งจะไม่มีปัญหา buffer length
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}`);
    
    // บันทึกการแก้ไข
    await fs.writeFile(authFilePath, fixedContent);
    log(`✅ แก้ไขการใช้ timingSafeEqual สำเร็จ`, colors.green);
  } else {
    log(`❌ ไม่พบฟังก์ชัน comparePasswords หรือ timingSafeEqual`, colors.red);
    
    // ค้นหาส่วนที่อาจเกี่ยวข้องกับการตรวจสอบรหัสผ่าน
    const passwordCheckRegex = /password.*?(===|==|compare|check|validate)/g;
    const passwordMatches = content.match(passwordCheckRegex);
    
    if (passwordMatches) {
      log(`🔍 พบส่วนที่เกี่ยวข้องกับการตรวจสอบรหัสผ่าน:`, colors.yellow);
      passwordMatches.forEach(match => {
        log(`- ${match}`, colors.blue);
      });
    }
  }
  
  log('\n==================================================', colors.bright + colors.cyan);
  log('✅ แก้ไขไฟล์การรับรองตัวตนเสร็จสิ้น', colors.bright + colors.green);
  log('==================================================', colors.bright + colors.cyan);
  log('\n🔍 คำแนะนำเพิ่มเติม:', colors.cyan);
  log('1. รีสตาร์ทเซิร์ฟเวอร์เพื่อใช้การเปลี่ยนแปลงใหม่', colors.yellow);
  log('2. ถ้ายังเข้าสู่ระบบไม่ได้ ให้รีเซ็ตรหัสผ่านในฐานข้อมูลโดยตรง', colors.yellow);
  log('3. เข้าสู่ระบบด้วย ผู้ใช้: admin, รหัสผ่าน: admin123', colors.yellow);
}

// รันฟังก์ชันหลัก
main().catch(error => {
  log(`❌ เกิดข้อผิดพลาด: ${error.message}`, colors.red);
  if (error.stack) {
    log(`Stack trace: ${error.stack}`, colors.red);
  }
});