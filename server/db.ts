import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// ตั้งค่าเพื่อใช้กับ Neon Database (PostgreSQL บนคลาวด์)
neonConfig.webSocketConstructor = ws;

// ตรวจสอบการตั้งค่าฐานข้อมูล
if (!process.env.DATABASE_URL) {
  console.error("WARNING: DATABASE_URL is not set. Please check your environment variables or .env files");
  console.error("Will attempt to connect without DATABASE_URL which may cause errors");
}

// สร้างการเชื่อมต่อกับฐานข้อมูล
// กำหนด timeout ที่นานขึ้นเพื่อให้การเชื่อมต่อมีโอกาสสำเร็จมากขึ้น
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // เพิ่ม timeout เป็น 10 วินาที
  query_timeout: 10000,
  statement_timeout: 10000
};

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  console.log("Attempting to connect to database...");
  pool = new Pool(connectionConfig);
  
  // ตั้งค่า error handler เพื่อแสดงข้อผิดพลาดโดยละเอียด
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.error('Database connection details:', {
          host: url.hostname,
          database: url.pathname.substring(1)
        });
      } catch (e) {
        console.error('Invalid DATABASE_URL format');
      }
    } else {
      console.error('No DATABASE_URL provided');
    }
  });

  // ตั้งค่า Drizzle ORM
  db = drizzle({ client: pool, schema });
  console.log("Database connection initialized successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  console.error("Connection string:", process.env.DATABASE_URL ? "Provided (not shown for security)" : "Missing");
  
  // สร้าง dummy pool และ db เพื่อไม่ให้เกิด error ในส่วนอื่น
  pool = new Pool({ connectionString: 'postgresql://user:pass@localhost:5432/dummy' });
  db = drizzle({ client: pool, schema });
  
  console.error("Using dummy database connection - application will not work correctly");
}

export { pool, db };