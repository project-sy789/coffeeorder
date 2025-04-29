/**
 * เครื่องมือเพิ่มข้อมูลการตั้งค่าแบบ ES Module
 * โดยใช้วิธี HTTP API แทนการเชื่อมต่อฐานข้อมูลโดยตรง
 * 
 * รันด้วยคำสั่ง: node server/add-settings.mjs
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

/**
 * ส่ง HTTP request
 */
async function sendRequest(method, url, data = null) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  
  return {
    status: response.status,
    statusText: response.statusText,
    data: await response.json().catch(() => null)
  };
}

// ข้อมูลการตั้งค่าเริ่มต้น
const initialSettings = [
  { key: 'store_name', value: 'คาเฟ่ของฉัน', description: 'ชื่อร้าน' },
  { key: 'store_status', value: 'open', description: 'สถานะร้าน (open/closed)' },
  { key: 'store_address', value: '123 ถนนสุขุมวิท กรุงเทพ 10110', description: 'ที่อยู่ร้าน' },
  { key: 'store_phone', value: '02-123-4567', description: 'เบอร์โทรร้าน' },
  { key: 'store_open_time', value: '08:00', description: 'เวลาเปิดร้าน' },
  { key: 'store_close_time', value: '20:00', description: 'เวลาปิดร้าน' },
];

// ฟังก์ชันหลัก
async function main() {
  log('\n==================================================', colors.bright + colors.cyan);
  log('🚀 เครื่องมือเพิ่มข้อมูลการตั้งค่าผ่าน API', colors.bright + colors.cyan);
  log('==================================================\n', colors.bright + colors.cyan);
  
  // สร้าง URL ฐาน จากตัวแปรแวดล้อม HOST หรือใช้ localhost
  const baseUrl = process.env.HOST || 'http://localhost:5000';
  log(`🌐 ใช้ API ที่: ${baseUrl}`, colors.blue);
  
  // เรียกใช้ API setup-admin ก่อนเพื่อสร้างผู้ใช้ admin
  log('\n🔄 กำลังเรียกใช้ API setup-admin...', colors.cyan);
  const setupResult = await sendRequest('GET', `${baseUrl}/api/setup-admin`);
  if (setupResult.status === 200) {
    log('✅ เรียกใช้ API setup-admin สำเร็จ', colors.green);
    if (setupResult.data) {
      log(`📄 ผลลัพธ์: ${JSON.stringify(setupResult.data)}`, colors.blue);
    }
  } else {
    log(`❌ เรียกใช้ API setup-admin ไม่สำเร็จ: ${setupResult.statusText}`, colors.red);
    if (setupResult.data) {
      log(`📄 ผลลัพธ์: ${JSON.stringify(setupResult.data)}`, colors.red);
    }
  }
  
  // เพิ่มข้อมูลการตั้งค่า
  log('\n🔄 กำลังเพิ่มข้อมูลการตั้งค่า...', colors.cyan);
  for (const setting of initialSettings) {
    log(`📝 กำลังเพิ่มการตั้งค่า: ${setting.key}`, colors.blue);
    
    // ตรวจสอบว่ามีการตั้งค่านี้แล้วหรือไม่
    const checkResult = await sendRequest('GET', `${baseUrl}/api/settings/${setting.key}`);
    
    if (checkResult.status === 200) {
      log(`ℹ️ การตั้งค่า ${setting.key} มีอยู่แล้ว`, colors.yellow);
      continue;
    }
    
    // เพิ่มการตั้งค่าใหม่
    const addResult = await sendRequest('POST', `${baseUrl}/api/settings`, setting);
    
    if (addResult.status === 200 || addResult.status === 201) {
      log(`✅ เพิ่มการตั้งค่า ${setting.key} สำเร็จ`, colors.green);
    } else {
      log(`❌ เพิ่มการตั้งค่า ${setting.key} ไม่สำเร็จ: ${addResult.statusText}`, colors.red);
      if (addResult.data) {
        log(`📄 ผลลัพธ์: ${JSON.stringify(addResult.data)}`, colors.red);
      }
    }
  }
  
  // ตรวจสอบการตั้งค่าทั้งหมด
  log('\n🔄 กำลังตรวจสอบการตั้งค่าทั้งหมด...', colors.cyan);
  const allSettings = await sendRequest('GET', `${baseUrl}/api/settings`);
  
  if (allSettings.status === 200 && allSettings.data) {
    log(`✅ พบการตั้งค่าทั้งหมด ${allSettings.data.length} รายการ`, colors.green);
    allSettings.data.forEach(setting => {
      log(`- ${setting.key}: ${setting.value}`, colors.blue);
    });
  } else {
    log(`⚠️ ไม่สามารถดึงการตั้งค่าทั้งหมดได้: ${allSettings.statusText}`, colors.yellow);
  }
  
  log('\n==================================================', colors.bright + colors.cyan);
  log('✅ เพิ่มข้อมูลการตั้งค่าเสร็จสิ้น', colors.bright + colors.green);
  log('==================================================', colors.bright + colors.cyan);
  log('\nคุณสามารถเข้าสู่ระบบด้วยข้อมูลต่อไปนี้:', colors.bright);
  log('- ชื่อผู้ใช้: admin', colors.bright);
  log('- รหัสผ่าน: admin123', colors.bright);
}

// รันฟังก์ชันหลัก
main().catch(error => {
  log(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}`, colors.red);
  if (error.stack) {
    log(`Stack trace: ${error.stack}`, colors.red);
  }
  process.exit(1);
});