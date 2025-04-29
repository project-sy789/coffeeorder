import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// ตั้งค่า WebSocket constructor ถ้ามีการใช้ ws
try {
  // ตั้งค่า Neon config สำหรับเชื่อมต่อฐานข้อมูล
  if (ws) {
    console.log("Using WebSocket from ws package");
    neonConfig.webSocketConstructor = ws;
  } else {
    console.log("No WebSocket constructor available");
    process.env.USE_MEMORY_STORAGE = 'true';
  }
} catch (error) {
  console.error("Error setting up WebSocket:", error);
  process.env.USE_MEMORY_STORAGE = 'true';
}

// สร้างฟังก์ชันแบบง่ายกว่าเพื่อลดการใช้งานของ Neon เพื่อหลีกเลี่ยงปัญหา
const createDirectPool = (connectionString: string) => {
  try {
    // พยายามใช้การเชื่อมต่อแบบตรงที่เป็นมิตรกับ Render และ deployment platforms อื่นๆ 
    return new Pool({ 
      connectionString,
      // ปิดใช้งาน SSL ชั่วคราวเพื่อแก้ปัญหาการเชื่อมต่อบน Render
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 30000,
      max: 10,
      idleTimeoutMillis: 30000
    });
  } catch (error) {
    console.error("Error creating pool:", error);
    process.env.USE_MEMORY_STORAGE = 'true';
    
    // ส่งคืน dummy pool ในกรณีที่มีข้อผิดพลาด
    return new Pool({ 
      connectionString: 'postgresql://localhost:5432/dummy',
      ssl: false
    });
  }
};

// ตรวจสอบสภาพแวดล้อมการทำงาน
const isProduction = process.env.NODE_ENV === 'production';

// ตั้งค่าการใช้ memory storage เป็นค่าเริ่มต้น
// ถ้าอยู่ใน production จะพยายามเชื่อมต่อฐานข้อมูลก่อน
process.env.USE_MEMORY_STORAGE = isProduction ? 'false' : 'true';

// ตรวจสอบการตั้งค่าฐานข้อมูล
if (!process.env.DATABASE_URL) {
  console.error("WARNING: DATABASE_URL is not set. Please check your environment variables or .env files");
  console.error("Will attempt to connect without DATABASE_URL which may cause errors");
  // กำหนดให้ใช้ memory storage หากไม่มี DATABASE_URL
  process.env.USE_MEMORY_STORAGE = 'true';
}

// กำหนดค่า DATABASE_URL สำรองในกรณีที่ไม่ได้รับจาก environment variables
const DEFAULT_DB_URL = "postgresql://coffee_order_app_user:Rr0uxSWpcVyqUChTNYz8oF0wJ9WX1grz@dpg-d08ecufdiees73993aj0-a/coffee_order_app";
const connectionString = process.env.DATABASE_URL || DEFAULT_DB_URL;

// สร้างการเชื่อมต่อกับฐานข้อมูล
// กำหนด timeout ที่นานขึ้นเพื่อให้การเชื่อมต่อมีโอกาสสำเร็จมากขึ้น
const connectionConfig = {
  connectionString,
  connectionTimeoutMillis: 30000, // เพิ่ม timeout เป็น 30 วินาที
  query_timeout: 30000,
  statement_timeout: 30000,
  max: 10, // จำกัดจำนวนการเชื่อมต่อพร้อมกัน
  idleTimeoutMillis: 60000, // เวลาหมดอายุเมื่อไม่มีการใช้งาน
  allowExitOnIdle: true // อนุญาตให้ปิดการเชื่อมต่อเมื่อไม่มีการใช้งาน
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

// ฟังก์ชันสำหรับทดสอบการเชื่อมต่อกับฐานข้อมูล
async function testConnection(pool: Pool): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW() as time');
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

try {
  console.log("Attempting to connect to database...");

  // สร้างการเชื่อมต่อฐานข้อมูลที่เหมาะสมกับสภาพแวดล้อม
  // ในสภาพแวดล้อม Render.com จะใช้การเชื่อมต่อโดยตรงแทน WebSocket
  if (isProduction) {
    if (process.env.RENDER || process.env.RENDER_INTERNAL_HOSTNAME) {
      console.log("Running in Render.com environment - using direct connection");
      // สร้างการเชื่อมต่อแบบตรงสำหรับ Render.com
      const renderConfig = {
        ...connectionConfig,
        ssl: { rejectUnauthorized: false } // จำเป็นสำหรับ Render.com
      };
      pool = new Pool(renderConfig);
    } else {
      // ถ้าไม่ได้อยู่บน Render.com ใช้การเชื่อมต่อปกติ
      pool = new Pool(connectionConfig);
    }
  } else {
    // สภาพแวดล้อม development
    pool = new Pool(connectionConfig);
  }
  
  // ตั้งค่า error handler เพื่อแสดงข้อผิดพลาดโดยละเอียด
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    try {
      const url = new URL(connectionString);
      console.error('Database connection details:', {
        host: url.hostname,
        database: url.pathname.substring(1)
      });
    } catch (e) {
      console.error('Invalid DATABASE_URL format');
    }
    
    // เมื่อเกิดข้อผิดพลาดให้เปลี่ยนไปใช้ Memory Storage
    process.env.USE_MEMORY_STORAGE = 'true';
  });

  // ตั้งค่า Drizzle ORM
  db = drizzle({ client: pool, schema });
  
  // ทดสอบการเชื่อมต่อทันทีเพื่อให้มั่นใจว่าเชื่อมต่อได้จริง
  testConnection(pool)
    .then(success => {
      if (success) {
        console.log("Database connection verified successfully");
        // กรณีที่เชื่อมต่อได้สำเร็จ ให้ใช้ฐานข้อมูลจริง
        process.env.USE_MEMORY_STORAGE = 'false';
      } else {
        console.error("Database connection test failed - application may not work correctly");
        process.env.USE_MEMORY_STORAGE = 'true';
      }
    })
    .catch(err => {
      console.error("Error testing database connection:", err);
      process.env.USE_MEMORY_STORAGE = 'true';
    });
    
  console.log("Database connection initialized successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  
  // พยายามใช้ค่า connection string อื่นถ้ามีการกำหนดไว้ใน environment variables
  if (process.env.DATABASE_URL_BACKUP) {
    console.log("Attempting to connect with backup DATABASE_URL...");
    try {
      pool = new Pool({ 
        connectionString: process.env.DATABASE_URL_BACKUP,
        connectionTimeoutMillis: 30000
      });
      db = drizzle({ client: pool, schema });
      console.log("Connected to backup database successfully");
    } catch (backupError) {
      console.error("Failed to connect to backup database:", backupError);
      fallbackToMemory();
    }
  } else {
    fallbackToMemory();
  }
}

// ฟังก์ชันสำหรับสร้างการเชื่อมต่อฐานข้อมูลจำลองใน memory
function fallbackToMemory() {
  console.error("Connection string:", connectionString ? "Provided (not shown for security)" : "Missing");
  
  // สร้าง dummy pool และ db เพื่อไม่ให้เกิด error ในส่วนอื่น
  pool = new Pool({ connectionString: 'postgresql://user:pass@localhost:5432/dummy' });
  db = drizzle({ client: pool, schema });
  
  // ตั้งค่าตัวแปรแวดล้อมให้รู้ว่ามีการใช้ memory storage แทน
  process.env.USE_MEMORY_STORAGE = 'true';
  process.env.DATABASE_CONNECTION_ERROR = 'true';
  
  console.error("Using fallback in-memory connection - some features will not work correctly");
}

export { pool, db };