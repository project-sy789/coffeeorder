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
    activeConnections.push(ws as unknown as WebSocket);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      activeConnections = activeConnections.filter(conn => conn !== ws);
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