/**
 * เครื่องมือแก้ไขปัญหาการเข้าสู่ระบบ
 * แก้ไขปัญหา RangeError: Input buffers must have the same byte length
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

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

// ตรวจสอบการตั้งค่า DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  log('❌ ไม่พบ DATABASE_URL ในตัวแปรแวดล้อม กรุณาตั้งค่าก่อนใช้งาน', colors.red);
  process.exit(1);
}

// ตรวจสอบว่าเป็น Render internal database URL หรือไม่
const isInternalDb = DATABASE_URL.includes("internal") || 
                    DATABASE_URL.includes("postgresql.render.com") || 
                    DATABASE_URL.includes("postgres.render.com");

// ตั้งค่าการเชื่อมต่อตามประเภทของฐานข้อมูล
const poolConfig = isInternalDb
  ? {
      connectionString: DATABASE_URL,
      ssl: false,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    }
  : {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    };

// สร้างการเชื่อมต่อ
const pool = new Pool(poolConfig);

// ผู้ใช้เริ่มต้น (admin)
const adminUser = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  name: 'ผู้ดูแลระบบ'
};

// ฟังก์ชันเพื่อแฮชรหัสผ่าน
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// ฟังก์ชันเพื่อตรวจสอบรหัสผ่าน
async function comparePasswords(plainTextPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  } catch (error) {
    log(`⚠️ เกิดข้อผิดพลาดในการเปรียบเทียบรหัสผ่าน: ${error.message}`, colors.yellow);
    return false;
  }
}

// ฟังก์ชันเพื่อแก้ไขรหัสผ่านผู้ใช้
async function resetUserPassword(username, plainTextPassword) {
  try {
    // แฮชรหัสผ่านใหม่
    const hashedPassword = await hashPassword(plainTextPassword);
    
    // อัปเดตรหัสผ่านในฐานข้อมูล
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING *',
      [hashedPassword, username]
    );
    
    if (result.rowCount > 0) {
      log(`✅ อัปเดตรหัสผ่านสำหรับผู้ใช้ '${username}' สำเร็จ`, colors.green);
      return true;
    } else {
      log(`⚠️ ไม่พบผู้ใช้ '${username}'`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน: ${error.message}`, colors.red);
    return false;
  }
}

// ฟังก์ชันเพื่อสร้างผู้ใช้ใหม่
async function createNewUser(username, plainTextPassword, role, name) {
  try {
    // แฮชรหัสผ่าน
    const hashedPassword = await hashPassword(plainTextPassword);
    
    // เพิ่มผู้ใช้ใหม่
    const result = await pool.query(
      'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, hashedPassword, role, name]
    );
    
    if (result.rowCount > 0) {
      log(`✅ สร้างผู้ใช้ '${username}' สำเร็จ`, colors.green);
      return true;
    } else {
      log(`⚠️ ไม่สามารถสร้างผู้ใช้ '${username}'`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการสร้างผู้ใช้: ${error.message}`, colors.red);
    return false;
  }
}

// ฟังก์ชันหลัก
async function main() {
  log('\n==================================================', colors.bright + colors.cyan);
  log('🔧 เครื่องมือแก้ไขปัญหาการเข้าสู่ระบบ', colors.bright + colors.cyan);
  log('==================================================\n', colors.bright + colors.cyan);
  
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    const client = await pool.connect();
    log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ', colors.green);
    
    try {
      // ตรวจสอบผู้ใช้ admin
      const userResult = await client.query('SELECT * FROM users WHERE username = $1', [adminUser.username]);
      
      if (userResult.rowCount > 0) {
        const user = userResult.rows[0];
        log(`✅ พบผู้ใช้ '${adminUser.username}' แล้ว`, colors.green);
        
        // ทดสอบรหัสผ่าน
        try {
          const matches = await comparePasswords(adminUser.password, user.password);
          log(`📊 ผลการทดสอบรหัสผ่าน: ${matches ? '✅ ถูกต้อง' : '❌ ไม่ถูกต้อง'}`, matches ? colors.green : colors.red);
          
          if (!matches) {
            log(`🔄 กำลังรีเซ็ตรหัสผ่าน '${adminUser.username}'...`, colors.cyan);
            const resetResult = await resetUserPassword(adminUser.username, adminUser.password);
            if (resetResult) {
              log(`✅ รีเซ็ตรหัสผ่านสำเร็จ`, colors.green);
            }
          }
        } catch (error) {
          log(`❌ เกิดข้อผิดพลาดในการทดสอบรหัสผ่าน: ${error.message}`, colors.red);
          log(`🔄 กำลังรีเซ็ตรหัสผ่าน '${adminUser.username}'...`, colors.cyan);
          const resetResult = await resetUserPassword(adminUser.username, adminUser.password);
          if (resetResult) {
            log(`✅ รีเซ็ตรหัสผ่านสำเร็จ`, colors.green);
          }
        }
      } else {
        log(`⚠️ ไม่พบผู้ใช้ '${adminUser.username}'`, colors.yellow);
        log(`🔄 กำลังสร้างผู้ใช้ '${adminUser.username}'...`, colors.cyan);
        
        const createResult = await createNewUser(
          adminUser.username,
          adminUser.password,
          adminUser.role,
          adminUser.name
        );
        
        if (createResult) {
          log(`✅ สร้างผู้ใช้สำเร็จ`, colors.green);
        }
      }
      
      // แสดงข้อมูลผู้ใช้ทั้งหมด
      const allUsersResult = await client.query('SELECT id, username, role, name FROM users');
      
      log('\n📋 ผู้ใช้ทั้งหมดในระบบ:', colors.cyan);
      allUsersResult.rows.forEach(user => {
        log(`- ID: ${user.id}, ชื่อผู้ใช้: ${user.username}, บทบาท: ${user.role}, ชื่อ: ${user.name}`, colors.blue);
      });
      
      log('\n==================================================', colors.bright + colors.cyan);
      log('✅ แก้ไขปัญหาการเข้าสู่ระบบเสร็จสิ้น', colors.bright + colors.green);
      log('==================================================', colors.bright + colors.cyan);
      log('\nข้อมูลการเข้าสู่ระบบ:', colors.bright);
      log('- ชื่อผู้ใช้: admin', colors.bright);
      log('- รหัสผ่าน: admin123', colors.bright);
      log('\nคุณสามารถเข้าสู่ระบบด้วยข้อมูลนี้ได้ทันที', colors.bright);
    } finally {
      client.release();
    }
  } catch (error) {
    log(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ${error.message}`, colors.red);
  } finally {
    // ปิดการเชื่อมต่อ pool
    await pool.end();
  }
}

// รันฟังก์ชันหลัก
main()
  .catch(error => {
    log(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}`, colors.red);
    log(`Stack trace: ${error.stack}`, colors.red);
    process.exit(1);
  });