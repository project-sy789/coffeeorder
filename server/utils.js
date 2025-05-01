/**
 * ไฟล์รวมฟังก์ชันอรรถประโยชน์ (Utility functions) สำหรับใช้งานในส่วนต่างๆ ของ server
 */

import crypto from 'crypto';
import util from 'util';

// สร้าง promisified version ของ crypto functions
const scryptAsync = util.promisify(crypto.scrypt);
const randomBytesAsync = util.promisify(crypto.randomBytes);

/**
 * แฮชรหัสผ่านด้วย scrypt (ความปลอดภัยสูงกว่า bcrypt)
 * @param {string} password - รหัสผ่านที่ต้องการแฮช
 * @returns {Promise<string>} - รหัสผ่านที่ถูกแฮชแล้ว
 */
export async function hash(password) {
  const salt = (await randomBytesAsync(16)).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * เปรียบเทียบรหัสผ่านที่ผู้ใช้กรอกกับรหัสผ่านที่ถูกแฮชและจัดเก็บในฐานข้อมูล
 * @param {string} supplied - รหัสผ่านที่ผู้ใช้กรอก
 * @param {string} stored - รหัสผ่านที่ถูกแฮชและจัดเก็บไว้
 * @returns {Promise<boolean>} - ผลการเปรียบเทียบ (true หากตรงกัน)
 */
export async function compare(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * สร้างรหัสสุ่มด้วย crypto
 * @param {number} length - จำนวนตัวอักษรของรหัส (เริ่มต้น 6 ตัว)
 * @returns {Promise<string>} - รหัสสุ่ม
 */
export async function generateRandomCode(length = 6) {
  const bytes = await randomBytesAsync(Math.ceil(length / 2));
  return bytes.toString('hex').slice(0, length).toUpperCase();
}

/**
 * แปลง object เป็น camelCase เพื่อใช้งานใน JavaScript
 * @param {Object} obj - Object ที่ต้องการแปลง (รูปแบบ snake_case จาก database)
 * @returns {Object} - Object ที่ถูกแปลงเป็น camelCase
 */
export function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * แปลง object เป็น snake_case เพื่อใช้งานกับ database
 * @param {Object} obj - Object ที่ต้องการแปลง (รูปแบบ camelCase ใน JavaScript) 
 * @returns {Object} - Object ที่ถูกแปลงเป็น snake_case
 */
export function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * จัดการข้อความเป็นรูปแบบเงิน (เลขทศนิยม 2 ตำแหน่ง)
 * @param {number} amount - จำนวนเงิน
 * @returns {string} - ข้อความในรูปแบบเงิน
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * แปลงข้อมูล date เป็นรูปแบบที่อ่านได้
 * @param {Date|string} date - วันที่ที่ต้องการแปลง
 * @returns {string} - วันที่ในรูปแบบที่อ่านได้
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * แปลงข้อมูล date เป็นรูปแบบที่อ่านได้ พร้อมเวลา
 * @param {Date|string} date - วันที่และเวลาที่ต้องการแปลง
 * @returns {string} - วันที่และเวลาในรูปแบบที่อ่านได้
 */
export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * แปลงวันที่ให้เป็นรูปแบบที่เหมาะสำหรับฐานข้อมูล
 * @param {Date|string} date - วันที่ที่ต้องการแปลง
 * @returns {string} - วันที่ในรูปแบบ YYYY-MM-DD
 */
export function formatDateForDB(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * ตรวจสอบว่าข้อมูลเป็นค่าว่างหรือไม่
 * @param {any} value - ค่าที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าเป็นค่าว่าง (null, undefined, '', [])
 */
export function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  );
}

/**
 * เปรียบเทียบ 2 objects ว่าเท่ากันหรือไม่
 * @param {Object} obj1 - Object ตัวแรก
 * @param {Object} obj2 - Object ตัวที่สอง
 * @returns {boolean} - true ถ้าเท่ากัน
 */
export function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// ส่งออกฟังก์ชัน
export default {
  hash,
  compare,
  generateRandomCode,
  toCamelCase,
  toSnakeCase,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateForDB,
  isEmpty,
  isEqual
};