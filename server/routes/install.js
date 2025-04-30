/**
 * ระบบติดตั้งผ่านเว็บสำหรับแอปพลิเคชัน POS คาเฟ่
 */
const express = require('express');
const router = express.Router();
const { pool, createDbConnection } = require('../db');
const { storage } = require('../storage');
const fs = require('fs');
const path = require('path');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

// หน้าติดตั้งหลัก
router.get('/', (req, res) => {
  // ส่งไฟล์ HTML หน้าติดตั้ง
  res.sendFile(path.join(__dirname, '../../public/install/index.html'));
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
router.post('/check-database', async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;
    
    // สร้าง connection string
    const connectionString = `postgres://${username}:${password}@${host}:${port}/${database}`;
    
    // ทดสอบการเชื่อมต่อ
    const testConnection = await createDbConnection(connectionString, true);
    
    if (testConnection.success) {
      res.json({ success: true, message: 'เชื่อมต่อฐานข้อมูลสำเร็จ' });
    } else {
      res.status(400).json({ success: false, message: testConnection.error || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' });
    }
  } catch (error) {
    console.error('Database connection test error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// บันทึกการตั้งค่าฐานข้อมูล
router.post('/save-database-config', async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;
    
    // สร้าง connection string
    const connectionString = `postgres://${username}:${password}@${host}:${port}/${database}`;
    
    // ทดสอบการเชื่อมต่อก่อนบันทึก
    const testConnection = await createDbConnection(connectionString, true);
    
    if (!testConnection.success) {
      return res.status(400).json({ 
        success: false, 
        message: testConnection.error || 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' 
      });
    }
    
    // อ่านไฟล์ .env.example
    let envContent = fs.readFileSync(path.join(__dirname, '../../.env.example'), 'utf8');
    
    // แทนที่ค่า DATABASE_URL
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${connectionString}`);
    
    // บันทึกไฟล์ .env.local
    fs.writeFileSync(path.join(__dirname, '../../.env.local'), envContent);
    
    // ตั้งค่า environment variable ในรันไทม์
    process.env.DATABASE_URL = connectionString;
    
    res.json({ success: true, message: 'บันทึกการตั้งค่าฐานข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Save database config error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// สร้างโครงสร้างฐานข้อมูล
router.post('/setup-database', async (req, res) => {
  try {
    // ตรวจสอบว่ามีการตั้งค่าฐานข้อมูลหรือไม่
    if (!process.env.DATABASE_URL) {
      return res.status(400).json({ 
        success: false, 
        message: 'ยังไม่ได้ตั้งค่าฐานข้อมูล กรุณาตั้งค่าฐานข้อมูลก่อน' 
      });
    }
    
    // สร้างตาราง (จะทำโดยอัตโนมัติเมื่อเรียกใช้ storage)
    const dbCheck = await storage.checkDatabaseConnection();
    
    if (!dbCheck.success) {
      return res.status(500).json({ 
        success: false, 
        message: `ไม่สามารถเชื่อมต่อฐานข้อมูล: ${dbCheck.error}` 
      });
    }
    
    res.json({ success: true, message: 'สร้างโครงสร้างฐานข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Setup database error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// บันทึกข้อมูลร้านและสร้างผู้ดูแลระบบ
router.post('/setup-store', async (req, res) => {
  try {
    const { storeName, adminUsername, adminPassword, adminName } = req.body;
    
    // บันทึกข้อมูลร้าน
    await storage.createOrUpdateSetting('store_name', storeName, 'ชื่อร้าน');
    await storage.createOrUpdateSetting('store_status', 'open', 'สถานะร้าน (open/closed)');
    
    // ตรวจสอบว่ามีผู้ดูแลระบบอยู่แล้วหรือไม่
    const existingAdmin = await storage.getUserByUsername(adminUsername);
    
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่อผู้ใช้อื่น' 
      });
    }
    
    // สร้างรหัสผ่านแบบเข้ารหัส
    const salt = randomBytes(16).toString('hex');
    const passwordBuffer = await scryptAsync(adminPassword, salt, 64);
    const hashedPassword = `${passwordBuffer.toString('hex')}.${salt}`;
    
    // สร้างผู้ดูแลระบบ
    const admin = await storage.createUser({
      username: adminUsername,
      password: hashedPassword,
      name: adminName,
      role: 'admin',
      active: true
    });
    
    res.json({ 
      success: true, 
      message: 'ตั้งค่าร้านและสร้างผู้ดูแลระบบสำเร็จ',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Setup store error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// ตรวจสอบสถานะการติดตั้ง
router.get('/status', async (req, res) => {
  try {
    // ตรวจสอบว่ามี .env.local หรือไม่
    const envLocalExists = fs.existsSync(path.join(__dirname, '../../.env.local'));
    
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    let databaseConnected = false;
    try {
      const dbCheck = await storage.checkDatabaseConnection();
      databaseConnected = dbCheck.success;
    } catch (error) {
      console.error('Database check error:', error);
    }
    
    // ตรวจสอบว่ามีผู้ดูแลระบบหรือไม่
    let adminExists = false;
    let storeName = null;
    
    if (databaseConnected) {
      try {
        const admins = await storage.getUsersByRole('admin');
        adminExists = admins && admins.length > 0;
        
        // ดึงชื่อร้าน
        const storeNameSetting = await storage.getSetting('store_name');
        storeName = storeNameSetting ? storeNameSetting.value : null;
      } catch (error) {
        console.error('Admin check error:', error);
      }
    }
    
    res.json({
      success: true,
      status: {
        configExists: envLocalExists,
        databaseConnected,
        adminExists,
        storeName,
        installationComplete: envLocalExists && databaseConnected && adminExists
      }
    });
  } catch (error) {
    console.error('Installation status check error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// ตรวจสอบข้อกำหนดของระบบ
router.get('/requirements', (req, res) => {
  try {
    // ตรวจสอบเวอร์ชัน Node.js
    const nodeVersion = process.version;
    const nodeVersionNumber = parseFloat(nodeVersion.replace('v', ''));
    const nodeVersionOk = nodeVersionNumber >= 16.0;
    
    // ตรวจสอบการเข้าถึงไฟล์
    let filePermissionsOk = true;
    try {
      // ทดสอบการเขียนไฟล์ชั่วคราว
      const testFile = path.join(__dirname, '../../.test-write-permission');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      filePermissionsOk = false;
    }
    
    res.json({
      success: true,
      requirements: {
        node: {
          version: nodeVersion,
          required: '>= v16.0.0',
          satisfied: nodeVersionOk
        },
        filePermissions: {
          description: 'สามารถเขียนไฟล์ได้',
          satisfied: filePermissionsOk
        },
        allSatisfied: nodeVersionOk && filePermissionsOk
      }
    });
  } catch (error) {
    console.error('Requirements check error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// สร้างตัวอย่างสินค้า (optional)
router.post('/create-sample-data', async (req, res) => {
  try {
    // สร้างหมวดหมู่
    await storage.addCategory('กาแฟ');
    await storage.addCategory('ชา');
    await storage.addCategory('เบเกอรี่');
    
    // สร้างตัวเลือกการปรับแต่ง
    await storage.createCustomizationOption({
      name: 'หวานน้อย',
      type: 'ความหวาน',
      price: 0
    });
    
    await storage.createCustomizationOption({
      name: 'หวานปกติ',
      type: 'ความหวาน',
      price: 0
    });
    
    await storage.createCustomizationOption({
      name: 'หวานมาก',
      type: 'ความหวาน',
      price: 0
    });
    
    await storage.createCustomizationOption({
      name: 'ไม่ใส่นม',
      type: 'นม',
      price: 0
    });
    
    await storage.createCustomizationOption({
      name: 'นมสด',
      type: 'นม',
      price: 0
    });
    
    await storage.createCustomizationOption({
      name: 'นมข้น',
      type: 'นม',
      price: 5
    });
    
    // สร้างสินค้าตัวอย่าง
    await storage.createProduct({
      name: 'เอสเพรสโซ่',
      price: 45,
      category: 'กาแฟ',
      available: true,
      image: null
    });
    
    await storage.createProduct({
      name: 'ลาเต้',
      price: 55,
      category: 'กาแฟ',
      available: true,
      image: null
    });
    
    await storage.createProduct({
      name: 'ชาเขียว',
      price: 50,
      category: 'ชา',
      available: true,
      image: null
    });
    
    await storage.createProduct({
      name: 'ครัวซองค์',
      price: 65,
      category: 'เบเกอรี่',
      available: true,
      image: null
    });
    
    res.json({ success: true, message: 'สร้างข้อมูลตัวอย่างสำเร็จ' });
  } catch (error) {
    console.error('Create sample data error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

// แก้ไขปัญหาการเข้าสู่ระบบ (RangeError: Input buffers must have the same byte length)
router.post('/fix-login-error', async (req, res) => {
  try {
    // ดึงข้อมูลผู้ใช้ทั้งหมด
    const users = await storage.getUsers();
    let fixedCount = 0;
    
    for (const user of users) {
      // ตรวจสอบรูปแบบรหัสผ่าน
      const passwordParts = user.password.split('.');
      
      // หากรหัสผ่านไม่ได้อยู่ในรูปแบบ hash.salt
      if (passwordParts.length !== 2) {
        // สร้างรหัสผ่านใหม่ด้วยค่าเริ่มต้น (admin123)
        const salt = randomBytes(16).toString('hex');
        const passwordBuffer = await scryptAsync('admin123', salt, 64);
        const hashedPassword = `${passwordBuffer.toString('hex')}.${salt}`;
        
        // อัพเดตรหัสผ่าน
        await storage.updateUser(user.id, { password: hashedPassword });
        fixedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `แก้ไขปัญหาการเข้าสู่ระบบสำเร็จ ${fixedCount} บัญชี`,
      fixedCount
    });
  } catch (error) {
    console.error('Fix login error:', error);
    res.status(500).json({ success: false, message: `เกิดข้อผิดพลาด: ${error.message}` });
  }
});

module.exports = router;