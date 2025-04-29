#!/bin/bash
# ======================================================
# ติดตั้งง่ายๆ ระบบ POS คาเฟ่บน Firebase
# เหมือนการติดตั้ง WordPress แบบคลิกเดียว
# ======================================================

echo "🔥 เริ่มการติดตั้งระบบ POS คาเฟ่บน Firebase"
echo "==============================================="

# ตรวจสอบว่ามี Node.js ติดตั้งแล้ว
if ! command -v node &> /dev/null
then
    echo "❌ ไม่พบ Node.js โปรดติดตั้งก่อนดำเนินการต่อ"
    echo "ดาวน์โหลดได้ที่: https://nodejs.org/"
    exit 1
fi

# ตรวจสอบว่ามี npm ติดตั้งแล้ว
if ! command -v npm &> /dev/null
then
    echo "❌ ไม่พบ npm โปรดติดตั้ง Node.js ใหม่"
    echo "ดาวน์โหลดได้ที่: https://nodejs.org/"
    exit 1
fi

echo "✅ พบ Node.js และ npm แล้ว"

# ติดตั้ง Firebase Tools หากยังไม่มี
if ! command -v firebase &> /dev/null
then
    echo "📦 กำลังติดตั้ง Firebase Tools..."
    npm install -g firebase-tools
else
    echo "✅ Firebase Tools ติดตั้งแล้ว"
fi

# ล็อกอินเข้า Firebase
echo "🔑 กรุณาล็อกอินเข้า Firebase:"
firebase login

# ตรวจสอบสถานะการล็อกอิน
if [ $? -ne 0 ]; then
    echo "❌ การล็อกอินล้มเหลว กรุณาลองใหม่อีกครั้ง"
    exit 1
fi

echo "✅ ล็อกอินสำเร็จ"

# สร้างไฟล์ build
echo "🏗️ กำลังสร้างไฟล์สำหรับ deploy..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ การสร้างไฟล์ล้มเหลว กรุณาตรวจสอบข้อผิดพลาด"
    exit 1
fi

echo "✅ สร้างไฟล์สำเร็จ"

# เลือกโปรเจค Firebase
echo "🔍 กรุณาเลือกโปรเจค Firebase ของคุณ:"
firebase projects:list
echo "📝 พิมพ์ชื่อโปรเจค Firebase ของคุณ:"
read project_id

# ตั้งค่าโปรเจค Firebase
echo "⚙️ กำลังตั้งค่าโปรเจค Firebase..."
firebase use --add $project_id

if [ $? -ne 0 ]; then
    echo "❌ การตั้งค่าโปรเจคล้มเหลว กรุณาตรวจสอบชื่อโปรเจค"
    exit 1
fi

echo "✅ ตั้งค่าโปรเจคสำเร็จ"

# Deploy แอปพลิเคชัน
echo "🚀 กำลัง Deploy แอปพลิเคชัน..."
firebase deploy

if [ $? -ne 0 ]; then
    echo "❌ การ Deploy ล้มเหลว กรุณาตรวจสอบข้อผิดพลาด"
    exit 1
fi

echo "🎉 การติดตั้งเสร็จสมบูรณ์!"
echo "==============================================="
echo "URL ของระบบ: https://$project_id.web.app"
echo "📱 หน้าลูกค้า: https://$project_id.web.app/customer"
echo "💼 หน้า POS: https://$project_id.web.app/pos"
echo "🔐 หน้าผู้ดูแล: https://$project_id.web.app/admin"
echo ""
echo "👤 ล็อกอินเริ่มต้น:"
echo "Username: admin"
echo "Password: admin123"
echo "==============================================="
echo "หากมีปัญหาในการใช้งาน กรุณาดูคู่มือเพิ่มเติมที่ไฟล์ FIREBASE_EASY_INSTALL.md"