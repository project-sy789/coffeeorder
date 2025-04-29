import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// ตั้งค่าเพื่อใช้กับ Neon Database (PostgreSQL บนคลาวด์)
neonConfig.webSocketConstructor = ws;

// ตรวจสอบการตั้งค่าฐานข้อมูล
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Check your .env.local file or environment variables.",
  );
}

// สร้างการเชื่อมต่อกับฐานข้อมูล
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ตั้งค่า Drizzle ORM
export const db = drizzle({ client: pool, schema });