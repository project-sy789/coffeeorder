import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add CSS Variables for coffee theme colors
document.documentElement.style.setProperty('--coffee-primary', '#6F4E37');
document.documentElement.style.setProperty('--coffee-secondary', '#A67C52');
document.documentElement.style.setProperty('--coffee-accent', '#D4A76A');
document.documentElement.style.setProperty('--coffee-light', '#F9F3EE');
document.documentElement.style.setProperty('--coffee-dark', '#3C2A1E');

// ฟังก์ชันสำหรับดึงชื่อร้านจากฐานข้อมูลและอัปเดต title
async function setTitleFromSettings() {
  try {
    // ใช้ API endpoint store_name แทน value/store_name เพื่อหลีกเลี่ยงปัญหา HTML
    const response = await fetch('/api/settings/store_name');
    
    if (!response.ok) {
      console.log('Failed to fetch store name, status:', response.status);
      return;
    }
    
    const data = await response.json();
    let storeName = null;
    
    // ตรวจสอบรูปแบบของข้อมูลที่ได้รับกลับมา
    if (data && typeof data === 'object') {
      // อาจจะได้รูปแบบต่างๆ ขึ้นอยู่กับ API endpoint
      if (data.value) {
        // รูปแบบ { value: "ชื่อร้าน" }
        storeName = data.value;
      } else if (data.key === 'store_name' && data.value) {
        // รูปแบบ { key: "store_name", value: "ชื่อร้าน" }
        storeName = data.value;
      } else if (typeof data === 'string') {
        // รูปแบบ "ชื่อร้าน"
        storeName = data;
      }
      
      console.log('Store data received:', data);
    }
    
    if (storeName) {
      document.title = `${storeName} POS`;
      console.log('Updated page title to:', `${storeName} POS`);
    } else {
      // ถ้าไม่สามารถดึงชื่อร้านได้ ให้ใช้ชื่อเริ่มต้น
      document.title = 'ระบบ POS ร้านกาแฟ';
      console.log('Using default title');
    }
  } catch (error) {
    console.error('Error fetching store name:', error);
    // กรณีเกิดข้อผิดพลาด ให้ใช้ชื่อเริ่มต้น
    document.title = 'ระบบ POS ร้านกาแฟ';
  }
}

// ดึงชื่อร้านเมื่อเริ่มต้นแอปพลิเคชัน
setTitleFromSettings();

// ลองดึงชื่อร้านอีกครั้งหลังจาก 2 วินาที ในกรณีที่เซิร์ฟเวอร์ยังไม่พร้อม
setTimeout(() => {
  if (document.title === 'กำลังโหลด...') {
    console.log('Retrying to set title after initial timeout...');
    setTitleFromSettings();
  }
}, 2000);

// ลองอีกครั้งหลังจาก 5 วินาที หากจำเป็น
setTimeout(() => {
  if (document.title === 'กำลังโหลด...' || document.title === 'ระบบ POS ร้านกาแฟ') {
    console.log('Final attempt to set title...');
    setTitleFromSettings();
  }
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
