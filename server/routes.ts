import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertProductSchema,
  insertCustomizationOptionSchema,
  insertMemberSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertInventorySchema,
  insertPromotionSchema,
  insertSettingSchema,
  insertPointSettingSchema,
  insertPointRedemptionRuleSchema,
  insertProductIngredientSchema,
  insertInventoryTransactionSchema,
} from "@shared/schema";

// Import ws โดยตรงถูกย้ายไปที่ realtime.js เพื่อลดความซ้ำซ้อน

import { WebSocketServer, WebSocket } from 'ws';
import promptpay from 'promptpay-qr';
import QRCode from 'qrcode';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
// เรียกใช้ Express Router สำหรับระบบติดตั้ง
import express from 'express';
import fs from 'fs';
import path from 'path';
// เรียกใช้ socket.io แทน ws
import { setupSocketIO } from './realtime.js';
// Import safe JSON serialization utilities
import { safeSendJSON, safeJSONStringify } from './safe-json';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // ตรวจสอบรูปแบบรหัสผ่านที่ถูกต้อง
    if (!stored || !stored.includes('.')) {
      console.error('รูปแบบรหัสผ่านที่จัดเก็บไม่ถูกต้อง');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error('รูปแบบรหัสผ่านไม่ถูกต้อง: ไม่มี hash หรือ salt');
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(`ความยาวบัฟเฟอร์ไม่ตรงกัน: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Store active connections for real-time updates
let activeConnections: WebSocket[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Add middleware for JSON response validation early in the stack
  app.use((req, res, next) => {
    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method
    res.json = function(body) {
      try {
        // Make sure body is serializable
        const serializedBody = JSON.stringify(body);
        // Make sure we can parse it back - this helps catch any hidden circular references
        JSON.parse(serializedBody);
        
        // Set proper content type
        res.set('Content-Type', 'application/json');
        
        // Call the original json method with validated data
        return originalJson.call(this, body);
      } catch (error) {
        console.error("JSON serialization error:", error);
        // If there is an error in serialization, return a safe response
        if (Array.isArray(body)) {
          return originalJson.call(this, []);
        } else if (body === null || body === undefined) {
          return originalJson.call(this, null);
        } else {
          return originalJson.call(this, { error: "Error serializing response" });
        }
      }
    };
    
    next();
  });

  // นำเข้า setup-demo-data สำหรับการตั้งค่าข้อมูลตัวอย่าง
  let setupDemoData: (force?: boolean) => Promise<void>;
  try {
    const demoDataModule = await import('./setup-demo-data.js');
    setupDemoData = demoDataModule.setupDemoData;
  } catch (error) {
    console.warn('ไม่สามารถโหลดโมดูลตัวอย่างข้อมูลได้:', error);
    setupDemoData = async () => { console.log('ฟังก์ชันตัวอย่างข้อมูลไม่พร้อมใช้งาน'); };
  }
  // สร้าง Router สำหรับระบบติดตั้งและแก้ไขปัญหา
  const installRouter = express.Router();
  
  // ปิดการใช้งานหน้าติดตั้ง - เพื่อความปลอดภัย
  app.get('/install', (req, res) => {
    // ส่งข้อความแจ้งว่าระบบติดตั้งถูกปิดใช้งาน
    res.status(403).json({
      success: false,
      message: 'ระบบติดตั้งถูกปิดใช้งานเพื่อความปลอดภัย กรุณาติดต่อผู้ดูแลระบบ'
    });
  });
  
  // API สำหรับการติดตั้งระบบ - ปิดการใช้งานเพื่อความปลอดภัย
  app.post('/api/install', (req, res) => {
    // ส่งข้อความแจ้งว่าระบบติดตั้งถูกปิดใช้งาน
    return res.status(403).json({
      success: false,
      message: 'ระบบติดตั้งถูกปิดใช้งานเพื่อความปลอดภัย กรุณาติดต่อผู้ดูแลระบบ'
    });
  });
  
  // หน้าแก้ไขปัญหาการเข้าสู่ระบบ
  app.get('/auth-fix', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/auth-fix/index.html'));
  });
  
  // API สำหรับแก้ไขปัญหาการเข้าสู่ระบบ
  app.post('/api/fix-login-error', async (req, res) => {
    try {
      // ดึงข้อมูลผู้ใช้ทั้งหมด
      const users = await storage.getUsers();
      let fixedCount = 0;
      
      for (const user of users) {
        if (!user.password) {
          console.log(`ข้ามผู้ใช้ ${user.username} เนื่องจากไม่มีรหัสผ่าน`);
          continue;
        }
        
        // ตรวจสอบรูปแบบรหัสผ่าน
        const passwordParts = user.password.split('.');
        
        // หากรหัสผ่านไม่ได้อยู่ในรูปแบบ hash.salt
        if (passwordParts.length !== 2) {
          console.log(`กำลังแก้ไขรหัสผ่านสำหรับผู้ใช้ ${user.username}`);
          // สร้างรหัสผ่านใหม่ด้วยค่าเริ่มต้น (admin123)
          const salt = randomBytes(16).toString("hex");
          const passwordBuffer = await scryptAsync('admin123', salt, 64) as Buffer;
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
    } catch (error: any) {
      console.error('Fix login error:', error);
      res.status(500).json({ 
        success: false, 
        message: `เกิดข้อผิดพลาด: ${error.message}` 
      });
    }
  });
  
  // API สำหรับทดสอบการเชื่อมต่อฐานข้อมูลแบบกำหนดเอง
  app.post('/api/test-db-connection', async (req, res) => {
    try {
      const { host, port, database, username, password } = req.body;
      
      if (!host || !port || !database || !username) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลการเชื่อมต่อให้ครบถ้วน'
        });
      }
      
      // สร้าง connection string
      const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
      
      // ทดสอบการเชื่อมต่อ (สมมติว่ามีฟังก์ชันนี้)
      const testResult = await storage.testCustomConnection(connectionString);
      
      if (testResult.success) {
        return res.json({
          success: true,
          message: 'เชื่อมต่อกับฐานข้อมูลสำเร็จ'
        });
      } else {
        return res.json({
          success: false,
          message: testResult.error || 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้'
        });
      }
    } catch (error: any) {
      console.error('Error testing DB connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อฐานข้อมูล'
      });
    }
  });
  
  // API สำหรับบันทึกการตั้งค่าฐานข้อมูลแบบกำหนดเอง
  app.post('/api/save-db-connection', async (req, res) => {
    try {
      const { host, port, database, username, password } = req.body;
      
      if (!host || !port || !database || !username) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลการเชื่อมต่อให้ครบถ้วน'
        });
      }
      
      // สร้าง connection string
      const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
      
      // บันทึกการตั้งค่า (สมมติว่าเป็นการบันทึกลงไฟล์ .env.local)
      await storage.createOrUpdateSetting('database_connection_string', connectionString, 'การเชื่อมต่อฐานข้อมูลที่กำหนดเอง');
      
      return res.json({
        success: true,
        message: 'บันทึกการตั้งค่าฐานข้อมูลเรียบร้อยแล้ว'
      });
    } catch (error: any) {
      console.error('Error saving DB connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่าฐานข้อมูล'
      });
    }
  });
  
  // API สำหรับตรวจสอบสถานะเซิร์ฟเวอร์
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // API สำหรับตรวจสอบหรือติดตั้งข้อมูลตัวอย่าง
  app.post('/api/demo-data', async (req, res) => {
    try {
      const { action } = req.body;
      
      if (action === 'install') {
        // ดำเนินการติดตั้งข้อมูลตัวอย่าง
        console.log('กำลังติดตั้งข้อมูลตัวอย่างผ่าน API...');
        await setupDemoData(true);
        return res.status(200).json({ 
          success: true, 
          message: "ติดตั้งข้อมูลตัวอย่างเรียบร้อยแล้ว"
        });
      } else if (action === 'status') {
        // ตรวจสอบสถานะข้อมูลตัวอย่าง
        const products = await storage.getProducts();
        const categories = await storage.getAllCategories();
        const customizationOptions = await storage.getCustomizationOptions();
        
        return res.status(200).json({
          success: true,
          status: {
            hasProducts: products.length > 0,
            hasCategories: categories.length > 0,
            hasCustomizationOptions: customizationOptions.length > 0,
            productsCount: products.length,
            categoriesCount: categories.length,
            customizationOptionsCount: customizationOptions.length
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "ไม่รู้จัก action ที่ระบุ (ใช้ 'install' หรือ 'status')"
        });
      }
    } catch (error) {
      console.error('Demo data API error:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || "เกิดข้อผิดพลาดในการจัดการข้อมูลตัวอย่าง" 
      });
    }
  });
  
  // API สำหรับตรวจสอบสถานะการเชื่อมต่อฐานข้อมูล
  app.get('/api/db-health', async (req, res) => {
    try {
      // ตรวจสอบการเชื่อมต่อฐานข้อมูล
      const dbCheck = await storage.checkDatabaseConnection();
      
      if (dbCheck.success) {
        return res.status(200).json({ status: 'ok', message: 'Database connection successful' });
      } else {
        return res.status(500).json({ 
          status: 'error', 
          message: dbCheck.error || 'Database connection failed' 
        });
      }
    } catch (error: any) {
      console.error('Error checking database health:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Database connection check failed' 
      });
    }
  });
  
  // API สำหรับรีเซ็ตระบบ (ลบตั้งค่าและข้อมูลในฐานข้อมูล)
  app.post('/api/reset-system', async (req, res) => {
    try {
      // ใช้ process.cwd() แทนการใช้ __dirname เพื่อความง่าย
      const envLocalPath = path.join(process.cwd(), '.env.local');
      let resetSuccessful = false;
      
      // 1. ลบไฟล์ .env.local ถ้ามี
      if (fs.existsSync(envLocalPath)) {
        fs.unlinkSync(envLocalPath);
        console.log('ลบไฟล์ .env.local เรียบร้อยแล้ว');
        resetSuccessful = true;
      } else {
        console.log('ไม่พบไฟล์ .env.local');
      }
      
      // 2. รีเซ็ตข้อมูลในฐานข้อมูลแบบจริงจัง (complete hard reset)
      try {
        console.log('กำลังดำเนินการรีเซ็ตระบบอย่างสมบูรณ์...');
        
        // 2.1 รีเซ็ตข้อมูลร้านค้าและตั้งค่า
        try {
          console.log('กำลังรีเซ็ตการตั้งค่าระบบ...');
          // รีเซ็ตชื่อร้าน
          const storeSetting = await storage.getSetting('store_name');
          if (storeSetting) {
            await storage.createOrUpdateSetting('store_name', '', 'ชื่อร้าน (รีเซ็ตแล้ว)');
            console.log('รีเซ็ตชื่อร้านเรียบร้อยแล้ว');
          }
          
          // รีเซ็ตสถานะร้าน
          await storage.createOrUpdateSetting('store_status', 'closed', 'สถานะการเปิดให้บริการ (รีเซ็ตแล้ว)');
          console.log('รีเซ็ตสถานะร้านเรียบร้อยแล้ว');
          
          resetSuccessful = true;
        } catch (settingsError) {
          console.error('เกิดข้อผิดพลาดในการรีเซ็ตการตั้งค่า:', settingsError);
        }
        
        // 2.2 รีเซ็ตข้อมูลผู้ใช้ทั้งหมด
        try {
          console.log('กำลังรีเซ็ตข้อมูลผู้ใช้งาน...');
          const allUsers = await storage.getUsers();
          if (allUsers.length > 0) {
            console.log(`พบผู้ใช้งานทั้งหมด ${allUsers.length} คน กำลังรีเซ็ต...`);
            // ไม่ลบจริงๆ แต่ทำเครื่องหมายว่าไม่ใช้งานทุกคน
            for (const user of allUsers) {
              await storage.updateUser(user.id, { active: false });
              console.log(`รีเซ็ตผู้ใช้ ${user.username} เรียบร้อยแล้ว`);
            }
            resetSuccessful = true;
          } else {
            console.log('ไม่พบผู้ใช้งานในระบบ ไม่จำเป็นต้องรีเซ็ต');
          }
        } catch (usersError) {
          console.error('เกิดข้อผิดพลาดในการรีเซ็ตผู้ใช้งาน:', usersError);
        }
        
        // 2.3 ล้างหรือยกเลิกข้อมูลสินค้า
        try {
          console.log('กำลังยกเลิกการใช้งานสินค้าทั้งหมด...');
          const products = await storage.getProducts();
          for (const product of products) {
            await storage.updateProduct(product.id, { active: false });
          }
          console.log(`ยกเลิกการใช้งานสินค้าทั้งหมด ${products.length} รายการเรียบร้อยแล้ว`);
          resetSuccessful = true;
        } catch (productsError) {
          console.error('เกิดข้อผิดพลาดในการรีเซ็ตสินค้า:', productsError);
        }
      } catch (dbResetError) {
        console.error('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูลในฐานข้อมูล:', dbResetError);
        // ถึงแม้จะเกิดข้อผิดพลาดในส่วนนี้ เราจะไม่หยุดการทำงานของฟังก์ชัน
      }
      
      if (resetSuccessful) {
        return res.status(200).json({ 
          success: true, 
          message: 'รีเซ็ตระบบเรียบร้อยแล้ว กรุณารีสตาร์ทแอปพลิเคชันและเข้าสู่หน้าติดตั้งใหม่' 
        });
      } else {
        // แม้จะไม่มีการเปลี่ยนแปลงใดๆ แต่เราจะตอบกลับว่าสำเร็จเพื่อให้ผู้ใช้สามารถดำเนินการต่อได้
        return res.status(200).json({ 
          success: true, 
          message: 'ไม่พบข้อมูลที่ต้องรีเซ็ต แต่คุณสามารถติดตั้งระบบใหม่ได้เลย' 
        });
      }
    } catch (error: any) {
      console.error('Error resetting system:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตระบบ' 
      });
    }
  });
  
  // API สำหรับดึงข้อมูลธีม
  app.get('/api/theme', async (req, res) => {
    try {
      // ดึงข้อมูลธีมจากฐานข้อมูล
      const themeSetting = await storage.getSetting('theme');
      
      // ถ้าไม่มีข้อมูลธีม ให้ส่ง null กลับไป เพื่อให้ client ใช้ค่าเริ่มต้นที่กำหนดไว้
      if (!themeSetting) {
        console.log('Theme setting not found, returning null');
        return res.status(200).json(null);
      }
      
      // แปลงค่า JSON string เป็น object
      try {
        const theme = JSON.parse(themeSetting.value);
        return res.status(200).json(theme);
      } catch (parseError) {
        console.error('Error parsing theme JSON:', parseError);
        return res.status(200).json(null);
      }
    } catch (error) {
      console.error('Error fetching theme:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลธีม' });
    }
  });
  
  // API สำหรับดึงข้อมูลการตั้งค่าทั้งหมด
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings();
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' });
    }
  });
  
  // API ฉุกเฉินสำหรับรีเซ็ตรหัสผ่านผู้ใช้ (ใช้เฉพาะแก้ปัญหาเท่านั้น)
  app.post('/api/reset-password-direct', async (req, res) => {
    try {
      const { username, newPassword } = req.body;
      
      if (!username || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: 'กรุณาระบุชื่อผู้ใช้และรหัสผ่านใหม่' 
        });
      }
      
      // ค้นหาผู้ใช้
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'ไม่พบผู้ใช้ในระบบ' 
        });
      }
      
      // สร้างรหัสผ่านใหม่แบบง่าย (ไม่ใช้ hash)
      await storage.updateUser(user.id, { 
        password: newPassword, 
        active: true 
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'รีเซ็ตรหัสผ่านสำเร็จ' 
      });
    } catch (error: any) {
      console.error('Error resetting password directly:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' 
      });
    }
  });

  // API สำหรับดึงข้อมูลการตั้งค่าตาม key
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      // สำหรับการตั้งค่าบางอย่างที่มักจะถูกเรียกใช้ แต่อาจยังไม่มีในฐานข้อมูล
      // ให้ส่งค่าเริ่มต้นกลับไปแทนที่จะส่ง 404
      const commonSettings = [
        'store_theme', 'phone_number', 'address', 'custom_logo'
      ];
      
      if (!setting && commonSettings.includes(key)) {
        return res.json({ key, value: null });
      }
      
      if (!setting) {
        return res.status(404).json({ error: 'ไม่พบข้อมูลการตั้งค่านี้' });
      }
      
      return res.status(200).json(setting);
    } catch (error) {
      console.error('Error fetching setting:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' });
    }
  });
  
  // API สำหรับดึงค่าของการตั้งค่าตาม key
  app.get('/api/settings/value/:key', async (req, res) => {
    try {
      // กำหนด Content-Type เป็น application/json เพื่อให้มั่นใจว่าจะได้ JSON กลับมาเสมอ
      res.setHeader('Content-Type', 'application/json');
      
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      // สำหรับการตั้งค่าบางอย่างที่มักจะถูกเรียกใช้ แต่อาจยังไม่มีในฐานข้อมูล
      // ให้ส่งค่าเริ่มต้นกลับไปแทนที่จะส่ง 404
      const commonSettings = [
        'store_theme', 'phone_number', 'address', 'custom_logo'
      ];
      
      if (!setting && commonSettings.includes(key)) {
        return res.json({ value: null });
      }
      
      if (!setting) {
        return res.status(404).json({ error: 'ไม่พบข้อมูลการตั้งค่านี้' });
      }
      
      return res.status(200).json({ value: setting.value });
    } catch (error) {
      console.error('Error fetching setting value:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงค่าการตั้งค่า' });
    }
  });
  
  // API สำหรับสร้างหรืออัปเดตการตั้งค่า
  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value, description } = req.body;
      const setting = await storage.createOrUpdateSetting(key, value, description);
      return res.status(200).json(setting);
    } catch (error) {
      console.error('Error creating/updating setting:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้าง/อัปเดตการตั้งค่า' });
    }
  });
  
  // API สำหรับการเข้าสู่ระบบ
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
      }
      
      // ค้นหาผู้ใช้จากฐานข้อมูล
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }
      
      // ใช้ฟังก์ชัน comparePasswords ที่รองรับการตรวจสอบข้อผิดพลาด
      const passwordsMatch = await comparePasswords(password, user.password);
      
      if (!passwordsMatch) {
        return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }
      
      // ตรวจสอบสถานะของผู้ใช้ (ถ้ามี)
      if (user.active === false) {
        return res.status(401).json({ error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
      }
      
      // สร้างข้อมูลสำหรับส่งกลับ (ไม่รวมรหัสผ่าน)
      const { password: _, ...userData } = user;
      
      // เก็บข้อมูลผู้ใช้ใน session หรือส่งคืน token (ขึ้นอยู่กับวิธีการรักษาความปลอดภัยที่คุณใช้)
      res.status(200).json(userData);
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง" });
    }
  });
  
  // API สำหรับอัปโหลดโลโก้
  app.post('/api/upload-logo', async (req, res) => {
    try {
      const { logo } = req.body;
      
      if (!logo) {
        return res.status(400).json({ message: "ไม่พบข้อมูลโลโก้" });
      }
      
      // ตรวจสอบว่าเป็น base64 หรือไม่
      if (!logo.startsWith('data:image/')) {
        return res.status(400).json({ message: "รูปแบบไฟล์ไม่ถูกต้อง ต้องเป็น base64 เท่านั้น" });
      }
      
      // แยกข้อมูล base64 ออกจากส่วนหัว
      const base64Data = logo.split(';base64,').pop();
      
      // แปลง base64 เป็น buffer
      const imageBuffer = Buffer.from(base64Data || '', 'base64');
      
      // บันทึกไฟล์ในโฟลเดอร์ public
      const fs = require('fs');
      const path = require('path');
      
      // บันทึกในโฟลเดอร์ public ที่รากของโปรเจค
      fs.writeFileSync(path.join(process.cwd(), 'public', 'logo.png'), imageBuffer);
      
      // และบันทึกในโฟลเดอร์ client/public เพื่อให้ใช้ได้ในระหว่างการพัฒนา
      const clientPublicPath = path.join(process.cwd(), 'client', 'public');
      if (fs.existsSync(clientPublicPath)) {
        fs.writeFileSync(path.join(clientPublicPath, 'logo.png'), imageBuffer);
      }
      
      // สร้าง favicon.png จาก logo.png
      fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.png'), imageBuffer);
      
      // สำหรับการพัฒนา บันทึกใน client/public ด้วย
      if (fs.existsSync(clientPublicPath)) {
        fs.writeFileSync(path.join(clientPublicPath, 'favicon.png'), imageBuffer);
      }
      
      // บันทึกข้อมูลโลโก้ในฐานข้อมูล
      await storage.createOrUpdateSetting('custom_logo', logo, 'โลโก้ที่กำหนดเอง');
      
      res.status(200).json({ message: "อัปโหลดโลโก้สำเร็จ" });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปโหลดโลโก้" });
    }
  });

  // API สำหรับสร้างผู้ใช้แอดมินโดยเฉพาะ
  app.get('/api/setup-admin', async (req, res) => {
    try {
      // ตรวจสอบ Secret Key (ถ้ามีการตั้งค่า)
      const secret_key = req.query.secret_key as string;
      
      // ถ้ามีการตั้งค่า ADMIN_RESET_SECRET ในระบบ จะต้องส่ง secret_key มาตรงกัน
      if (process.env.ADMIN_RESET_SECRET) {
        if (!secret_key || secret_key !== process.env.ADMIN_RESET_SECRET) {
          console.log('Secret key validation failed on setup-admin');
          return res.status(403).json({
            error: "ไม่มีสิทธิ์เข้าถึง API นี้",
            requiresSecretKey: true
          });
        }
        console.log('Secret key validated successfully on setup-admin');
      }
    
      // ตรวจสอบว่ามีผู้ใช้แอดมินอยู่แล้วหรือไม่
      const existingAdmins = await storage.getUsersByRole('admin');
      
      if (existingAdmins.length > 0) {
        return res.status(400).json({ 
          message: "มีผู้ใช้แอดมินอยู่แล้ว ไม่สามารถสร้างเพิ่มได้", 
          adminCount: existingAdmins.length 
        });
      }

      // สร้างผู้ใช้แอดมิน
      const hashedPassword = await hashPassword("admin123");
      
      const adminUser = await storage.createUser({
        username: "admin",
        password: hashedPassword,
        name: "ผู้ดูแลระบบ",
        role: "admin"
      });

      // ตัดข้อมูลรหัสผ่านออกเพื่อความปลอดภัย
      const { password, ...adminInfo } = adminUser;
      
      res.status(201).json({ 
        message: "สร้างผู้ใช้แอดมินเรียบร้อยแล้ว", 
        admin: adminInfo,
        loginInfo: {
          username: "admin",
          password: "admin123" // แสดงรหัสผ่านที่ยังไม่ได้เข้ารหัสสำหรับการล็อกอิน
        }
      });
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      res.status(500).json({
        error: error.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้แอดมิน",
      });
    }
  });
  
  // API สำหรับรีเซ็ตผู้ใช้แอดมินในกรณีมีปัญหา (สำหรับใช้แก้ไขปัญหาหลังการ deploy)
  // เพิ่มการป้องกันด้วย Secret Key
  app.all('/api/force-reset-admin', async (req, res) => {
    try {
      // ตรวจสอบ Secret Key จากหลายแหล่ง (body, query, headers)
      const bodySecretKey = req.body?.secret_key;
      const querySecretKey = req.query?.secret_key;
      const secret_key = bodySecretKey || querySecretKey;
      
      console.log('ADMIN_RESET_SECRET:', process.env.ADMIN_RESET_SECRET);
      console.log('Secret key from request:', secret_key);
      
      // ถ้ามีการตั้งค่า ADMIN_RESET_SECRET ในระบบ จะต้องส่ง secret_key มาตรงกัน
      if (process.env.ADMIN_RESET_SECRET) {
        if (!secret_key || secret_key !== process.env.ADMIN_RESET_SECRET) {
          console.log('Secret key validation failed');
          return res.status(403).json({
            error: "ไม่มีสิทธิ์เข้าถึง API นี้",
            requiresSecretKey: true
          });
        }
        console.log('Secret key validated successfully');
      }
      
      // ลบผู้ใช้แอดมินเดิมทั้งหมด (ในกรณีที่อาจมีปัญหากับฐานข้อมูล)
      const admins = await storage.getUsersByRole('admin');
      console.log(`พบผู้ใช้แอดมิน ${admins.length} คน`);
      
      // ตรวจสอบข้อมูลผู้ใช้แอดมินเดิม
      for (const admin of admins) {
        console.log(`ผู้ใช้แอดมิน ID: ${admin.id}, Username: ${admin.username}`);
      }
      
      // สร้างรหัสผ่านใหม่ (ใช้รหัสผ่านที่ส่งมาหากมี หรือใช้ค่าเริ่มต้น)
      const adminPassword = req.body.password || "admin123";
      const hashedPassword = await hashPassword(adminPassword);
      
      // สร้างผู้ใช้แอดมินใหม่ (หรืออัพเดทถ้ามีอยู่แล้ว)
      let adminUser;
      
      // หาผู้ใช้ admin
      const existingAdmin = await storage.getUserByUsername("admin");
      
      if (existingAdmin) {
        // อัพเดทข้อมูล
        adminUser = await storage.updateUser(existingAdmin.id, {
          password: hashedPassword,
          name: "ผู้ดูแลระบบ",
          role: "admin",
          active: true
        });
        console.log("อัพเดทผู้ใช้แอดมินเรียบร้อยแล้ว");
      } else {
        // สร้างใหม่
        adminUser = await storage.createUser({
          username: "admin",
          password: hashedPassword,
          name: "ผู้ดูแลระบบ",
          role: "admin"
        });
        console.log("สร้างผู้ใช้แอดมินใหม่เรียบร้อยแล้ว");
      }

      // ตัดข้อมูลรหัสผ่านออกเพื่อความปลอดภัย
      const { password, ...adminInfo } = adminUser;
      
      res.status(200).json({ 
        message: "รีเซ็ตผู้ใช้แอดมินเรียบร้อยแล้ว", 
        admin: adminInfo,
        loginInfo: {
          username: "admin",
          password: adminPassword // แสดงรหัสผ่านที่ยังไม่ได้เข้ารหัสสำหรับการล็อกอิน
        }
      });
    } catch (error: any) {
      console.error("Error resetting admin user:", error);
      res.status(500).json({
        error: error.message || "เกิดข้อผิดพลาดในการรีเซ็ตผู้ใช้แอดมิน",
      });
    }
  });

  // Add a simple database health check route
  app.get('/api/db-health', async (req, res) => {
    try {
      const result = await storage.checkDatabaseConnection();
      if (result.success) {
        res.status(200).json({ status: 'ok', message: 'Database connection successful' });
      } else {
        res.status(503).json({ 
          status: 'error', 
          message: 'Database connection failed',
          details: result.error
        });
      }
    } catch (error) {
      console.error('Error checking database health:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Error checking database health'
      });
    }
  });
  
  // Add Global Error Handler and JSON Response Middleware
  // Middleware to ensure proper JSON responses
  app.use((req, res, next) => {
    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method
    res.json = function(body) {
      try {
        // Make sure body is serializable
        const serializedBody = JSON.stringify(body);
        // Make sure we can parse it back - this helps catch any hidden circular references
        JSON.parse(serializedBody);
        
        // Set proper content type
        res.set('Content-Type', 'application/json');
        
        // Call the original json method with validated data
        return originalJson.call(this, body);
      } catch (error) {
        console.error("JSON serialization error:", error, body);
        // If there is an error in serialization, return a safe response
        if (Array.isArray(body)) {
          return originalJson.call(this, []);
        } else if (body === null || body === undefined) {
          return originalJson.call(this, null);
        } else {
          return originalJson.call(this, { error: "Error serializing response" });
        }
      }
    };
    
    next();
  });

  // API endpoint สำหรับดึงข้อมูลส่วนผสมของสินค้า
  app.all("/api/products/:id/ingredients", async (req, res) => {
    try {
      console.log("Fetching ingredients for product ID:", req.params.id);
      const id = parseInt(req.params.id);
      
      // ตรวจสอบว่ามีสินค้านี้หรือไม่
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // ดึงข้อมูลส่วนผสม
      const ingredients = await storage.getProductIngredients(id);
      console.log("Retrieved ingredients:", ingredients);
      
      return res.json(ingredients);
    } catch (error: any) {
      console.error("Error fetching product ingredients:", error);
      return res.status(500).json({ message: error.message || "Error fetching product ingredients" });
    }
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("Global error handler:", err);
    
    // ตรวจสอบว่าเป็น error ที่เกี่ยวกับฐานข้อมูลหรือไม่
    const isDatabaseError = err.code && 
      (err.code.startsWith('08') || // Class 08 - Connection Exception
       err.code.startsWith('53') || // Class 53 - Insufficient Resources
       err.code.startsWith('57') || // Class 57 - Operator Intervention
       err.code === 'ECONNREFUSED' || 
       err.code === 'ETIMEDOUT');
    
    if (isDatabaseError) {
      return res.status(503).json({
        error: "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาลองใหม่ภายหลัง",
        code: err.code,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // จัดการ error อื่นๆ
    res.status(500).json({
      error: err.message || "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์",
      details: process.env.NODE_ENV === 'development' ? (err.stack || err.toString()) : undefined
    });
  });

  // Products API Endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: error.message || "Error fetching products" });
    }
  });

  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ message: error.message || "Error fetching products by category" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductWithIngredients(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      console.error("Error fetching product details:", error);
      res.status(500).json({ message: error.message || "Error fetching product details" });
    }
  });
  
  app.get("/api/products/:id/ingredients", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ingredients = await storage.getProductIngredients(id);
      res.json(ingredients);
    } catch (error: any) {
      console.error("Error fetching product ingredients:", error);
      res.status(500).json({ message: error.message || "Error fetching product ingredients" });
    }
  });

  // Users API Endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // ไม่ส่งข้อมูลรหัสผ่านกลับไป
      const safeUsers = users.map(({ password, ...rest }) => rest);
      res.json(safeUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message || "Error fetching users" });
    }
  });

  // Customization Options API Endpoints
  app.get("/api/customization-options", async (req, res) => {
    try {
      const options = await storage.getCustomizationOptions();
      res.json(options);
    } catch (error: any) {
      console.error("Error fetching customization options:", error);
      res.status(500).json({ message: error.message || "Error fetching customization options" });
    }
  });

  app.get("/api/customization-types", async (req, res) => {
    try {
      const types = await storage.getAllCustomizationTypes();
      res.json(types);
    } catch (error: any) {
      console.error("Error fetching customization types:", error);
      res.status(500).json({ message: error.message || "Error fetching customization types" });
    }
  });
  
  // ✓ แก้ไขโดยใช้ app.all แทน เพื่อรองรับทุก HTTP method
  app.all("/api/customization-types/display-names", async (req, res) => {
    try {
      console.log("รับคำขอสำหรับชื่อที่แสดงของประเภทการปรับแต่ง");
      const typeLabels = await storage.getCustomizationTypeLabels();
      console.log("ชื่อที่แสดงของประเภทการปรับแต่ง:", typeLabels);
      return res.json(typeLabels);
    } catch (error: any) {
      console.error("เกิดข้อผิดพลาดในการดึงชื่อที่แสดงของประเภทการปรับแต่ง:", error);
      return res.status(500).json({ message: error.message || "เกิดข้อผิดพลาดในการดึงชื่อที่แสดงของประเภทการปรับแต่ง" });
    }
  });

  app.get("/api/customization-type-settings", async (req, res) => {
    try {
      const settings = await storage.getAllCustomizationTypeSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching customization type settings:", error);
      res.status(500).json({ message: error.message || "Error fetching customization type settings" });
    }
  });

  // Inventory API Endpoints
  app.get("/api/inventory", async (req, res) => {
    try {
      const inventory = await storage.getInventoryItems();
      res.json(inventory);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: error.message || "Error fetching inventory" });
    }
  });

  // Members API Endpoints
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: error.message || "Error fetching members" });
    }
  });

  // Categories API Endpoint
  app.use("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      console.log("Requested categories, returning:", categories);
      return res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ message: error.message || "Error fetching categories" });
    }
  });

  // Promotions API Endpoints
  app.get("/api/promotions", async (req, res) => {
    try {
      const promotions = await storage.getPromotions();
      res.json(promotions);
    } catch (error: any) {
      console.error("Error fetching promotions:", error);
      res.status(500).json({ message: error.message || "Error fetching promotions" });
    }
  });

  // Orders API Endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message || "Error fetching orders" });
    }
  });
  
  // Customer Orders API Endpoint - สำหรับการส่งคำสั่งซื้อจากหน้าลูกค้า
  app.post("/api/customer/orders", async (req, res) => {
    try {
      console.log("รับคำขอสร้างออเดอร์จากลูกค้า:", req.body);
      
      // ตรวจสอบข้อมูล
      if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({ error: "ข้อมูลรายการสินค้าไม่ถูกต้อง" });
      }
      
      // สร้างข้อมูลออเดอร์
      const orderData = {
        status: "pending",
        orderDate: new Date(),
        total: req.body.total || 0,
        discount: req.body.discount || 0,
        finalTotal: (req.body.total || 0) - (req.body.discount || 0),
        paymentMethod: req.body.paymentMethod || "cash",
        paymentStatus: "pending",
        referenceId: req.body.referenceId || null,
        memberId: req.body.memberId || null,
        pointsEarned: 0, // จะคำนวณและอัปเดตภายหลัง
        usePoints: req.body.usePoints || false,
        pointsUsed: req.body.pointsUsed || 0,
        pointsPromotionId: req.body.pointsPromotion || null,
        staffId: null, // ออเดอร์จากลูกค้าไม่มี staffId
        type: "online" // ระบุประเภทเป็นออนไลน์
      };
      
      // สร้างข้อมูลรายการสินค้า
      const orderItems = req.body.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations || {},
        subtotal: item.price * item.quantity
      }));
      
      // บันทึกข้อมูลลงในฐานข้อมูล
      console.log("กำลังสร้างออเดอร์ลูกค้า:", orderData);
      const newOrder = await storage.createOrder(orderData, orderItems);
      console.log("สร้างออเดอร์ลูกค้าสำเร็จ:", newOrder.id);
      
      // ถ้ามีการใช้แต้มสะสม ลดแต้มของสมาชิก
      if (orderData.usePoints && orderData.memberId && orderData.pointsUsed > 0) {
        try {
          await storage.addMemberPoints(orderData.memberId, -orderData.pointsUsed);
          console.log(`หักแต้มสะสม ${orderData.pointsUsed} แต้ม จากสมาชิก ID ${orderData.memberId}`);
        } catch (pointsError) {
          console.error("ไม่สามารถหักแต้มสะสมได้:", pointsError);
          // ไม่ต้องยกเลิกออเดอร์ แต่บันทึกข้อผิดพลาดไว้
        }
      }
      
      // แจ้งเตือนแบบเรียลไทม์ผ่าน Socket.IO
      try {
        // นำเข้าฟังก์ชันจาก realtime.js แบบไดนามิก
        const { emitOrderUpdate } = await import('./realtime.js');
        if (typeof emitOrderUpdate === 'function') {
          emitOrderUpdate(newOrder.id);
        }
      } catch (socketError) {
        console.error("ไม่สามารถส่งการแจ้งเตือนแบบเรียลไทม์ได้:", socketError);
        // ไม่ต้องยกเลิกออเดอร์หากไม่สามารถส่งการแจ้งเตือนได้
      }
      
      // ส่งผลลัพธ์กลับ
      res.status(201).json(newOrder);
    } catch (error: any) {
      console.error("เกิดข้อผิดพลาดในการสร้างออเดอร์ลูกค้า:", error);
      res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดในการสร้างออเดอร์" });
    }
  });

  app.get("/api/orders/date-range", async (req, res) => {
    try {
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      if (!startDateStr || !endDateStr) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      // สร้างวันเริ่มต้นโดยกำหนดเวลาเป็น 00:00:00
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      
      // สร้างวันสิ้นสุดโดยกำหนดเวลาเป็น 23:59:59
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      
      const orders = await storage.getOrdersByDateRange(startDate, endDate);
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders by date range:", error);
      res.status(500).json({ message: error.message || "Error fetching orders by date range" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithItems(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ message: error.message || "Error fetching order details" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/popular-products", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const popularProducts = await storage.getPopularProducts(limit);
      res.json(popularProducts);
    } catch (error: any) {
      console.error("Error fetching popular products:", error);
      res.status(500).json({ message: error.message || "Error fetching popular products" });
    }
  });

  app.get("/api/analytics/daily-sales", async (req, res) => {
    try {
      const dateStr = req.query.date as string;
      const date = dateStr ? new Date(dateStr) : new Date();
      const dailySales = await storage.getDailySales(date);
      res.json({ date: date.toISOString().split('T')[0], sales: dailySales });
    } catch (error: any) {
      console.error("Error fetching daily sales:", error);
      res.status(500).json({ message: error.message || "Error fetching daily sales" });
    }
  });

  app.get("/api/analytics/low-stock", async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error: any) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: error.message || "Error fetching low stock items" });
    }
  });

  app.get("/api/analytics/product-usage", async (req, res) => {
    try {
      const productUsage = await storage.getProductUsageReport();
      res.json(productUsage);
    } catch (error: any) {
      console.error("Error fetching product usage report:", error);
      res.status(500).json({ message: error.message || "Error fetching product usage report" });
    }
  });

  // Member Points System endpoints
  app.get("/api/point-settings", async (req, res) => {
    try {
      const pointSettings = await storage.getPointSettings();
      res.json(pointSettings);
    } catch (error: any) {
      console.error("Error fetching point settings:", error);
      res.status(500).json({ message: error.message || "Error fetching point settings" });
    }
  });

  app.get("/api/point-settings/active", async (req, res) => {
    try {
      const activeSetting = await storage.getActivePointSetting();
      if (!activeSetting) {
        return res.status(404).json({ message: "No active point setting found" });
      }
      res.json(activeSetting);
    } catch (error: any) {
      console.error("Error fetching active point setting:", error);
      res.status(500).json({ message: error.message || "Error fetching active point setting" });
    }
  });

  app.post("/api/point-settings", async (req, res) => {
    try {
      const newSetting = await storage.createPointSetting(req.body);
      res.status(201).json(newSetting);
    } catch (error: any) {
      console.error("Error creating point setting:", error);
      res.status(500).json({ message: error.message || "Error creating point setting" });
    }
  });

  app.patch("/api/point-settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSetting = await storage.updatePointSetting(id, req.body);
      if (!updatedSetting) {
        return res.status(404).json({ message: "Point setting not found" });
      }
      res.json(updatedSetting);
    } catch (error: any) {
      console.error("Error updating point setting:", error);
      res.status(500).json({ message: error.message || "Error updating point setting" });
    }
  });

  app.delete("/api/point-settings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePointSetting(id);
      if (!success) {
        return res.status(404).json({ message: "Point setting not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting point setting:", error);
      res.status(500).json({ message: error.message || "Error deleting point setting" });
    }
  });

  app.get("/api/point-redemption-rules", async (req, res) => {
    try {
      const rules = await storage.getPointRedemptionRules();
      res.json(rules);
    } catch (error: any) {
      console.error("Error fetching point redemption rules:", error);
      res.status(500).json({ message: error.message || "Error fetching point redemption rules" });
    }
  });

  app.get("/api/point-redemption-rules/active", async (req, res) => {
    try {
      const activeRules = await storage.getActivePointRedemptionRules();
      res.json(activeRules);
    } catch (error: any) {
      console.error("Error fetching active point redemption rules:", error);
      res.status(500).json({ message: error.message || "Error fetching active point redemption rules" });
    }
  });

  app.get("/api/point-redemption-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rule = await storage.getPointRedemptionRule(id);
      if (!rule) {
        return res.status(404).json({ message: "Point redemption rule not found" });
      }
      res.json(rule);
    } catch (error: any) {
      console.error("Error fetching point redemption rule:", error);
      res.status(500).json({ message: error.message || "Error fetching point redemption rule" });
    }
  });

  app.post("/api/point-redemption-rules", async (req, res) => {
    try {
      const newRule = await storage.createPointRedemptionRule(req.body);
      res.status(201).json(newRule);
    } catch (error: any) {
      console.error("Error creating point redemption rule:", error);
      res.status(500).json({ message: error.message || "Error creating point redemption rule" });
    }
  });

  app.patch("/api/point-redemption-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedRule = await storage.updatePointRedemptionRule(id, req.body);
      if (!updatedRule) {
        return res.status(404).json({ message: "Point redemption rule not found" });
      }
      res.json(updatedRule);
    } catch (error: any) {
      console.error("Error updating point redemption rule:", error);
      res.status(500).json({ message: error.message || "Error updating point redemption rule" });
    }
  });

  app.delete("/api/point-redemption-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePointRedemptionRule(id);
      if (!success) {
        return res.status(404).json({ message: "Point redemption rule not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting point redemption rule:", error);
      res.status(500).json({ message: error.message || "Error deleting point redemption rule" });
    }
  });

  app.get("/api/point-redemption-options", async (req, res) => {
    try {
      const memberId = parseInt(req.query.memberId as string);
      const orderTotal = parseFloat(req.query.orderTotal as string);

      if (isNaN(memberId) || isNaN(orderTotal)) {
        return res.status(400).json({ message: "Invalid memberId or orderTotal" });
      }

      const options = await storage.getAvailableRedemptionOptions(memberId, orderTotal);
      res.json(options);
    } catch (error: any) {
      console.error("Error fetching redemption options:", error);
      res.status(500).json({ message: error.message || "Error fetching redemption options" });
    }
  });

  // Create HTTP Server (for Socket.IO)
  const httpServer = createServer(app);

  // ตั้งค่า Socket.IO เพื่อการสื่อสารแบบ real-time
  setupSocketIO(httpServer);

  // เก็บ WebSocket เดิมไว้เพื่อความเข้ากันได้กับโค้ดเดิม
  // แต่ควรใช้ Socket.IO แทนสำหรับการพัฒนาเพิ่มเติม
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'  // ระบุ path ที่เฉพาะเจาะจงเพื่อไม่ให้ชนกับ Vite WebSocket
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected to /ws endpoint');
    activeConnections.push(ws);

    // ส่งข้อความทดสอบทันทีที่เชื่อมต่อ
    try {
      ws.send(JSON.stringify({ 
        type: 'welcome', 
        data: { message: 'เชื่อมต่อกับระบบสำเร็จ', timestamp: new Date().toISOString() } 
      }));
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }

    // รับข้อความจาก client
    ws.on('message', (message) => {
      try {
        console.log('Received message from client:', message.toString());
        // สะท้อนข้อความกลับไปยัง client
        ws.send(JSON.stringify({ 
          type: 'echo', 
          data: { original: message.toString(), timestamp: new Date().toISOString() } 
        }));
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected from /ws endpoint');
      activeConnections = activeConnections.filter(conn => conn !== ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Broadcast updates to all connected clients
  const broadcastUpdate = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    activeConnections.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    });
  };

  return httpServer;
}