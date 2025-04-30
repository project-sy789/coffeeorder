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
import { WebSocketServer, WebSocket } from 'ws';
import promptpay from 'promptpay-qr';
import QRCode from 'qrcode';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
// เรียกใช้ Express Router สำหรับระบบติดตั้ง
import express from 'express';
import fs from 'fs';
import path from 'path';

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
  // สร้าง Router สำหรับระบบติดตั้งและแก้ไขปัญหา
  const installRouter = express.Router();
  
  // หน้าติดตั้งหลัก
  app.get('/install', (req, res) => {
    // ส่งไฟล์ HTML หน้าติดตั้ง
    res.sendFile(path.join(process.cwd(), 'public/install/index.html'));
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
        // ตรวจสอบรูปแบบรหัสผ่าน
        const passwordParts = user.password.split('.');
        
        // หากรหัสผ่านไม่ได้อยู่ในรูปแบบ hash.salt
        if (passwordParts.length !== 2) {
          // สร้างรหัสผ่านใหม่ด้วยค่าเริ่มต้น (admin123)
          const salt = randomBytes(16).toString("hex");
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
    } catch (error: any) {
      console.error('Fix login error:', error);
      res.status(500).json({ 
        success: false, 
        message: `เกิดข้อผิดพลาด: ${error.message}` 
      });
    }
  });
  
  // API สำหรับตรวจสอบสถานะเซิร์ฟเวอร์
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
  
  // API สำหรับดึงข้อมูลการตั้งค่าตาม key
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
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
      
      const setting = await storage.getSetting(req.params.key);
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
  
  // Add Global Error Handler
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

  // Create HTTP Server (for WebSockets)
  const httpServer = createServer(app);

  // Initialize WebSocket Server with a specific path (/ws)
  // This prevents conflicts with Vite's WebSocket on development
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