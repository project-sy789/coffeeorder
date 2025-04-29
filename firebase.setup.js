/**
 * สคริปต์ตั้งค่า Firebase แบบอัตโนมัติ
 * ใช้สำหรับติดตั้งระบบ POS คาเฟ่บน Firebase
 * เหมือนการติดตั้ง WordPress แบบคลิกเดียว
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// สีสำหรับข้อความ
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * แสดงข้อความในคอนโซล
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * รันคำสั่ง shell และแสดงผลลัพธ์
 */
function runCommand(command, errorMessage) {
  try {
    log(`รันคำสั่ง: ${command}`, 'yellow');
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    log(`${errorMessage}: ${error.message}`, 'red');
    return { success: false, error };
  }
}

/**
 * ถามคำถามและรอคำตอบ
 */
async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * ฟังก์ชันหลักในการติดตั้ง
 */
async function setup() {
  log('\n🔥 เริ่มการติดตั้งระบบ POS คาเฟ่บน Firebase', 'bright');
  log('===============================================', 'bright');

  // ตรวจสอบว่ามี Node.js และ npm ติดตั้งแล้ว
  try {
    const nodeVersion = execSync('node -v', { encoding: 'utf8' });
    const npmVersion = execSync('npm -v', { encoding: 'utf8' });
    log(`✅ พบ Node.js ${nodeVersion.trim()} และ npm ${npmVersion.trim()}`, 'green');
  } catch (error) {
    log('❌ ไม่พบ Node.js หรือ npm โปรดติดตั้งก่อนดำเนินการต่อ', 'red');
    log('ดาวน์โหลดได้ที่: https://nodejs.org/', 'bright');
    return cleanup(1);
  }

  // ติดตั้ง Firebase Tools หากยังไม่มี
  try {
    execSync('firebase --version', { encoding: 'utf8' });
    log('✅ Firebase Tools ติดตั้งแล้ว', 'green');
  } catch (error) {
    log('📦 กำลังติดตั้ง Firebase Tools...', 'yellow');
    const result = runCommand('npm install -g firebase-tools', 'การติดตั้ง Firebase Tools ล้มเหลว');
    if (!result.success) return cleanup(1);
    log('✅ ติดตั้ง Firebase Tools สำเร็จ', 'green');
  }

  // ล็อกอินเข้า Firebase
  log('🔑 กรุณาล็อกอินเข้า Firebase:', 'bright');
  const loginResult = runCommand('firebase login', 'การล็อกอินล้มเหลว');
  if (!loginResult.success) return cleanup(1);
  log('✅ ล็อกอินสำเร็จ', 'green');

  // สร้างไฟล์ build
  log('🏗️ กำลังสร้างไฟล์สำหรับ deploy...', 'yellow');
  const buildResult = runCommand('npm run build', 'การสร้างไฟล์ล้มเหลว');
  if (!buildResult.success) return cleanup(1);
  log('✅ สร้างไฟล์สำเร็จ', 'green');

  // แสดงรายการโปรเจค Firebase
  log('🔍 รายการโปรเจค Firebase ของคุณ:', 'bright');
  const listResult = runCommand('firebase projects:list', 'ไม่สามารถดึงรายการโปรเจคได้');
  if (!listResult.success) return cleanup(1);

  // ให้ผู้ใช้เลือกโปรเจค Firebase
  const projectId = await askQuestion('📝 พิมพ์ชื่อโปรเจค Firebase ของคุณ: ');
  if (!projectId) {
    log('❌ ไม่ได้ระบุชื่อโปรเจค', 'red');
    return cleanup(1);
  }

  // ตั้งค่าโปรเจค Firebase
  log('⚙️ กำลังตั้งค่าโปรเจค Firebase...', 'yellow');
  const useResult = runCommand(`firebase use --add ${projectId}`, 'การตั้งค่าโปรเจคล้มเหลว');
  if (!useResult.success) return cleanup(1);
  log('✅ ตั้งค่าโปรเจคสำเร็จ', 'green');

  // Deploy แอปพลิเคชัน
  log('🚀 กำลัง Deploy แอปพลิเคชัน...', 'yellow');
  const deployResult = runCommand('firebase deploy', 'การ Deploy ล้มเหลว');
  if (!deployResult.success) return cleanup(1);

  // แสดงข้อความเมื่อติดตั้งสำเร็จ
  log('\n🎉 การติดตั้งเสร็จสมบูรณ์!', 'bright');
  log('===============================================', 'bright');
  log(`URL ของระบบ: https://${projectId}.web.app`, 'green');
  log(`📱 หน้าลูกค้า: https://${projectId}.web.app/customer`, 'cyan');
  log(`💼 หน้า POS: https://${projectId}.web.app/pos`, 'cyan');
  log(`🔐 หน้าผู้ดูแล: https://${projectId}.web.app/admin`, 'cyan');
  log('', 'reset');
  log('👤 ล็อกอินเริ่มต้น:', 'bright');
  log('Username: admin', 'yellow');
  log('Password: admin123', 'yellow');
  log('===============================================', 'bright');
  log('หากมีปัญหาในการใช้งาน กรุณาดูคู่มือเพิ่มเติมที่ไฟล์ FIREBASE_EASY_INSTALL.md', 'magenta');

  return cleanup(0);
}

/**
 * ปิดทรัพยากรและจบโปรแกรม
 */
function cleanup(exitCode = 0) {
  rl.close();
  process.exit(exitCode);
}

// เริ่มต้นการทำงาน
setup().catch((error) => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, 'red');
  cleanup(1);
});