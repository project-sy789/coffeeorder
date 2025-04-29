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
import { WebSocketServer } from 'ws';
import promptpay from 'promptpay-qr';
import QRCode from 'qrcode';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
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
  // Add a simple health check route
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
      
      // สร้าง favicon.ico จาก logo.png ด้วย (ทำเป็น favicon.png แทนเพราะไม่มี library แปลง ico)
      fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.png'), imageBuffer);
      
      res.status(200).json({ message: "อัปโหลดโลโก้สำเร็จ" });
    } catch (error) {
      console.error('Error uploading logo:', error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปโหลดโลโก้" });
    }
  });

  // API สำหรับสร้างผู้ใช้แอดมินโดยเฉพาะ
  app.get('/api/setup-admin', async (req, res) => {
    try {
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

  // Add Global Error Handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("Global error handler:", err);
    res.status(500).json({
      error: err.message || "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์",
    });
  });

  // Create HTTP Server (for WebSockets)
  const httpServer = createServer(app);

  // Initialize WebSocket Server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    activeConnections.push(ws as any);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      activeConnections = activeConnections.filter(conn => conn !== (ws as any));
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