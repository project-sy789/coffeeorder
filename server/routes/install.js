/**
 * Route สำหรับระบบติดตั้งอัตโนมัติ
 */
import { Router } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import * as schema from '../../shared/schema.js';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { dirname } from 'path';

const router = Router();

// ป้องกันการติดตั้งซ้ำ ถ้ามีไฟล์ config.json อยู่แล้ว
const isInstalled = () => {
  const configPath = path.join(process.cwd(), 'config.json');
  return fs.existsSync(configPath);
};

/**
 * ตรวจสอบเงื่อนไขการติดตั้ง
 */
router.get('/check', (req, res) => {
  try {
    const systemInfo = {
      node: process.version,
      npm: process.env.npm_package_version || 'ไม่ทราบ',
      postgres: true, // สมมติว่ามี PostgreSQL
      writePermission: true,
      isInstalled: isInstalled()
    };
    
    res.json({
      success: true,
      systemInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ทดสอบการเชื่อมต่อฐานข้อมูล
 */
router.post('/test-db', async (req, res) => {
  try {
    const { type, host, port, name, user, password, url } = req.body;
    
    let connectionString;
    if (type === 'direct') {
      connectionString = `postgresql://${user}:${password}@${host}:${port}/${name}`;
    } else {
      connectionString = url;
    }
    
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    const Pool = (await import('pg')).Pool;
    const pool = new Pool({ connectionString });
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time');
      client.release();
      await pool.end();
      
      res.json({
        success: true,
        time: result.rows[0].time
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ติดตั้งระบบ
 */
router.post('/', async (req, res) => {
  // ตรวจสอบว่าติดตั้งแล้วหรือยัง
  if (isInstalled()) {
    return res.status(400).json({
      success: false,
      error: 'ระบบถูกติดตั้งแล้ว'
    });
  }
  
  try {
    const { database, store, admin } = req.body;
    
    // 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล
    let connectionString;
    if (database.type === 'direct') {
      connectionString = `postgresql://${database.user}:${database.password}@${database.host}:${database.port}/${database.name}`;
    } else {
      connectionString = database.url;
    }
    
    // 2. บันทึกการตั้งค่าในไฟล์ config.json
    const config = {
      database: {
        url: connectionString,
        type: database.type
      },
      store: {
        name: store.name,
        phone: store.phone,
        address: store.address,
        openTime: store.openTime,
        closeTime: store.closeTime
      },
      installed: true,
      installedAt: new Date().toISOString()
    };
    
    // บันทึกไฟล์ config.json
    const configPath = path.join(process.cwd(), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // 3. สร้างตารางในฐานข้อมูล (ถ้าเลือกสร้างตารางอัตโนมัติ)
    if (database.createTables) {
      // สร้างการเชื่อมต่อและตาราง
      // ในที่นี้สมมติว่าใช้ Drizzle ในการสร้างตาราง
      try {
        // Import โมดูลที่จำเป็น
        const { Pool } = await import('pg');
        const { drizzle } = await import('drizzle-orm/node-postgres');
        
        // สร้างตารางทั้งหมด
        const pool = new Pool({ connectionString });
        const db = drizzle(pool, { schema });
        
        // สร้างตารางทั้งหมดจาก schema
        await db.execute(sql`
          -- สร้างตารางผู้ใช้
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'staff',
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางการตั้งค่า
          CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางหมวดหมู่สินค้า
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางสินค้า
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            image TEXT,
            category_id INTEGER REFERENCES categories(id),
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางตัวเลือกการปรับแต่ง
          CREATE TABLE IF NOT EXISTS customization_options (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            options JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางลูกค้า
          CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            phone VARCHAR(20),
            email VARCHAR(255),
            points INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางออเดอร์
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            total DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            payment_status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- สร้างตารางรายการในออเดอร์
          CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            customizations JSONB,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // เพิ่มข้อมูลเริ่มต้น
        
        // 1. เพิ่มการตั้งค่าร้าน
        await db.execute(sql`
          INSERT INTO settings (key, value, description)
          VALUES 
            ('store_name', ${store.name}, 'ชื่อร้าน'),
            ('store_phone', ${store.phone || ''}, 'หมายเลขโทรศัพท์'),
            ('store_address', ${store.address || ''}, 'ที่อยู่ร้าน'),
            ('store_open_time', ${store.openTime || '08:00'}, 'เวลาเปิด'),
            ('store_close_time', ${store.closeTime || '20:00'}, 'เวลาปิด'),
            ('store_status', 'open', 'สถานะร้าน (open/closed)')
          ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, description = EXCLUDED.description
        `);
        
        // 2. เพิ่มผู้ใช้ admin
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
        
        await db.execute(sql`
          INSERT INTO users (username, password, role, name)
          VALUES (${admin.username}, ${hashedPassword}, 'admin', ${admin.name})
          ON CONFLICT (username) DO UPDATE
          SET password = ${hashedPassword}, name = ${admin.name}
        `);
        
        // ปิดการเชื่อมต่อ
        await pool.end();
        
      } catch (error) {
        console.error('Error creating tables:', error);
        throw new Error(`ไม่สามารถสร้างตารางได้: ${error.message}`);
      }
    }
    
    // 4. อัปเดตไฟล์ .env
    try {
      const envContent = `DATABASE_URL="${connectionString}"\nSTORE_NAME="${store.name}"\n`;
      fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
    } catch (error) {
      console.warn('Warning: Could not update .env.local file', error);
    }
    
    // 5. ส่งผลลัพธ์กลับไป
    res.json({
      success: true,
      message: 'ติดตั้งระบบสำเร็จ',
      config: {
        storeName: store.name,
        adminUsername: admin.username
      }
    });
    
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;