# คาเฟ่ของฉัน - ระบบบริหารจัดการร้านกาแฟ

ระบบบริหารจัดการร้านกาแฟครบวงจร พร้อมระบบจัดการสินค้า การสั่งซื้อ และระบบสมาชิก

## คุณสมบัติ

- ระบบจัดการสินค้าและตัวเลือกเพิ่มเติม (customization options)
- ระบบสั่งซื้อแบบ real-time ด้วย Socket.IO
- ระบบจัดการสมาชิกและสะสมแต้ม
- หน้าจอสำหรับลูกค้าและผู้ดูแลระบบ
- รองรับการชำระเงินหลายรูปแบบ

## การติดตั้ง

1. โคลนโปรเจค:
```
git clone https://github.com/yourusername/coffee-shop-management.git
cd coffee-shop-management
```

2. ติดตั้ง dependencies:
```
npm install
```

3. สร้างไฟล์ .env ตามตัวอย่างในไฟล์ .env.example:
```
DATABASE_URL=postgresql://username:password@host:port/database
```

4. รันโปรเจค:
```
npm run dev
```

## การ Deploy

โปรเจคนี้สามารถ deploy ได้หลายวิธี:

### Deploy บน Railway

```
npm run build
railway up
```

### Deploy บน Firebase

```
npm run build
firebase deploy
```

## เทคโนโลยีที่ใช้

- React.js + TypeScript
- Express.js
- Socket.IO
- PostgreSQL + Drizzle ORM
- Tailwind CSS