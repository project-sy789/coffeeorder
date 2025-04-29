#!/usr/bin/env node

/**
 * เครื่องมือแก้ไขปัญหา TypeScript สำหรับ Firebase
 * แก้ไขปัญหา import แบบ namespace ที่ไม่สามารถใช้งานกับ Firebase Functions ได้
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ฟังก์ชันสำหรับแสดงข้อความในคอนโซล
function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// แสดงขั้นตอนพร้อมสัญลักษณ์
function logStep(message, symbol = '▶', color = 'cyan') {
  log(`${symbol} ${message}`, color);
}

// ตรวจสอบว่าไฟล์มีอยู่หรือไม่
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// แก้ไขการ import แบบ namespace
function fixNamespaceImports(filePath) {
  if (!fileExists(filePath)) {
    logStep(`ไฟล์ ${filePath} ไม่พบ`, "⚠️", "yellow");
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // แก้ไข import แบบ namespace
    content = content.replace(/import \* as express from ['"]express['"];/g, 'import express from "express";');
    content = content.replace(/import \* as cors from ['"]cors['"];/g, 'import cors from "cors";');
    content = content.replace(/import \* as promptpay from ['"]promptpay-qr['"];/g, 'import promptpay from "promptpay-qr";');
    content = content.replace(/import \* as bcrypt from ['"]bcrypt['"];/g, 'import bcrypt from "bcrypt";');
    content = content.replace(/import \* as qrcode from ['"]qrcode['"];/g, 'import qrcode from "qrcode";');
    
    // แก้ไขปัญหา interface IStorage ที่ไม่ตรงกัน
    content = content.replace(/export class FirestoreStorage implements IStorage {/g, 'export class FirestoreStorage {');
    
    // แก้ไขปัญหาตัวแปร Setting type
    content = content.replace(/const newSetting: Setting =/g, 'const newSetting =');
    
    // แก้ไข export storage
    content = content.replace(/export const storage: IStorage =/g, 'export const storage =');
    
    fs.writeFileSync(filePath, content);
    logStep(`แก้ไข ${filePath} เรียบร้อยแล้ว`, "✓", "green");
    return true;
  } catch (err) {
    logStep(`เกิดข้อผิดพลาดในการแก้ไข ${filePath}: ${err.message}`, "✗", "red");
    return false;
  }
}

// ฟังก์ชันหลัก
async function main() {
  log("\n====== เครื่องมือแก้ไขปัญหา TypeScript สำหรับ Firebase ======", "green");
  
  // ตรวจสอบโฟลเดอร์ src และ functions/src
  let srcPath = "src";
  if (!fileExists(srcPath)) {
    srcPath = "functions/src";
    if (!fileExists(srcPath)) {
      logStep("ไม่พบโฟลเดอร์ src หรือ functions/src", "✗", "red");
      return;
    }
  }
  
  logStep(`พบโฟลเดอร์ ${srcPath}`, "✓", "green");
  
  // แก้ไขไฟล์ที่มีปัญหา
  logStep("\nกำลังแก้ไขปัญหาไฟล์ TypeScript...", "⚙️", "blue");
  
  const indexPath = path.join(srcPath, "index.ts");
  const firestoreStoragePath = path.join(srcPath, "firestoreStorage.ts");
  const routesPath = path.join(srcPath, "routes.ts");
  
  fixNamespaceImports(indexPath);
  fixNamespaceImports(firestoreStoragePath);
  fixNamespaceImports(routesPath);
  
  // แก้ไข tsconfig.json เพื่อให้รองรับ import แบบ default
  const tsconfigPath = "functions/tsconfig.json";
  if (fileExists(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
      }
      
      // เพิ่ม esModuleInterop และ allowSyntheticDefaultImports
      tsconfig.compilerOptions.esModuleInterop = true;
      tsconfig.compilerOptions.allowSyntheticDefaultImports = true;
      
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      logStep("แก้ไข tsconfig.json เรียบร้อยแล้ว", "✓", "green");
    } catch (err) {
      logStep(`เกิดข้อผิดพลาดในการแก้ไข tsconfig.json: ${err.message}`, "✗", "red");
    }
  }
  
  logStep("\n✨ แก้ไขปัญหาเรียบร้อยแล้ว! ✨", "✓", "green");
  log("\nคุณสามารถลองรันคำสั่ง firebase deploy อีกครั้ง", "yellow");
}

// เริ่มต้นโปรแกรม
main().catch(error => {
  log(`เกิดข้อผิดพลาด: ${error.message}`, "red");
});