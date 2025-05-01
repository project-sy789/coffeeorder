/**
 * ไฟล์นี้สำหรับเพิ่มข้อมูลตัวอย่างสำหรับระบบ POS คาเฟ่
 * รันด้วยคำสั่ง: npx tsx add-sample-data.js
 * 
 * คำสั่งนี้จะใช้ tsx เพื่อรันไฟล์ TypeScript โดยตรง
 * ซึ่งจะช่วยแก้ปัญหาการนำเข้าไฟล์ .ts ใน JavaScript
 */

// ใช้ dynamic import เพื่อแก้ปัญหาการนำเข้าไฟล์ .ts

console.log('เริ่มต้นการเพิ่มข้อมูลตัวอย่าง...');

async function main() {
  try {
    // ใช้ dynamic import เพื่อนำเข้าโมดูล setup-demo-data
    console.log('กำลังโหลดโมดูล setup-demo-data...');
    const demoDataModule = await import('./server/setup-demo-data.js');
    const { setupDemoData } = demoDataModule;
    
    if (!setupDemoData) {
      throw new Error('ไม่พบฟังก์ชัน setupDemoData ในโมดูล');
    }
    
    // บังคับให้เพิ่มข้อมูลใหม่ทั้งหมด แม้จะมีข้อมูลอยู่แล้ว
    console.log('กำลังเรียกใช้ฟังก์ชัน setupDemoData...');
    await setupDemoData(true);
    console.log('เพิ่มข้อมูลตัวอย่างเรียบร้อยแล้ว');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูลตัวอย่าง:', error);
  }
}

main().catch(err => {
  console.error('ข้อผิดพลาดที่ไม่ได้จัดการ:', err);
  process.exit(1);
});