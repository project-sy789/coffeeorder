import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./firestoreStorage";
import * as QRCode from 'qrcode';
import * as promptpay from 'promptpay-qr';
import { z } from "zod";

// Utility function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(amount);
}

export function registerRoutes(app: Express): void {
  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Theme routes
  app.get('/api/theme', async (req, res) => {
    try {
      const themeSetting = await storage.getSetting('theme');
      if (themeSetting) {
        res.json(JSON.parse(themeSetting.value));
      } else {
        res.json({ variant: 'professional', primary: 'hsl(30, 35%, 33%)', appearance: 'light', radius: 0.5 });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get theme' });
    }
  });

  app.post('/api/theme', async (req, res) => {
    try {
      const themeSetting = await storage.getSetting('theme');
      if (themeSetting) {
        await storage.updateSetting(themeSetting.id, { value: JSON.stringify(req.body) });
      } else {
        await storage.createSetting({ key: 'theme', value: JSON.stringify(req.body) });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update theme' });
    }
  });

  // Settings routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (setting) {
        res.json(setting);
      } else {
        res.status(404).json({ error: 'Setting not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get setting' });
    }
  });

  app.get('/api/settings/value/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (setting) {
        res.json({ value: setting.value });
      } else {
        res.status(404).json({ error: 'Setting not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get setting value' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value } = req.body;
      const setting = await storage.createSetting({ key, value });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create setting' });
    }
  });

  app.put('/api/settings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { key, value } = req.body;
      const setting = await storage.updateSetting(id, { key, value });
      if (setting) {
        res.json(setting);
      } else {
        res.status(404).json({ error: 'Setting not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // ... เพิ่ม routes อื่นๆ จาก server/routes.ts ทั้งหมด ...

  // QR Code generation for PromptPay
  app.post('/api/generate-promptpay-qr', async (req, res) => {
    try {
      const { phoneNumber, amount } = req.body;
      
      if (!phoneNumber || phoneNumber.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }
      
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      
      // Generate PromptPay payload
      const payload = promptpay(phoneNumber, { amount });
      
      // Generate QR Code as base64
      const qrCode = await QRCode.toDataURL(payload);
      
      res.json({ qrCode });
    } catch (error) {
      console.error('Error generating PromptPay QR:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  // 404 handler - should be last
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}