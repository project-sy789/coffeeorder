import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// โหลดไฟล์ .env.local ด้วยตนเอง
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
  console.log('Loaded environment variables from .env.local');
  console.log('ADMIN_RESET_SECRET:', process.env.ADMIN_RESET_SECRET ? '[SET]' : 'undefined');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import path and url for ES modules
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Middleware ที่จะบันทึก API responses
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// กำหนด content type และ headers สำหรับ API requests
app.use('/api', (req, res, next) => {
  // กำหนดให้ทุก API response เป็น JSON
  res.setHeader('Content-Type', 'application/json');
  // อนุญาต CORS เฉพาะสำหรับการพัฒนา
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// สำหรับการอัปโหลดไฟล์
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// หน้ารีเซ็ตระบบ
app.get('/reset', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset.html'));
});

(async () => {
  // ลงทะเบียนเส้นทาง API ก่อนการตั้งค่า Vite
  const server = await registerRoutes(app);

  // จัดการข้อผิดพลาด API
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // ตรวจเช็คว่าการร้องขอ API ได้รับการจัดการไปแล้วหรือไม่
  app.use('/api/*', (req, res) => {
    // หากไม่มี route handler ใดๆ รองรับ API นี้ ให้ส่งข้อความแจ้งเตือน
    res.status(404).json({ error: `API endpoint not found: ${req.originalUrl}` });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
