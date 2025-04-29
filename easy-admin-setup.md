# การตั้งค่าผู้ดูแลระบบ (Admin Setup)

หลังจากที่คุณ Deploy ระบบ POS คาเฟ่ไปแล้ว คุณจำเป็นต้องตั้งค่าบัญชีผู้ดูแลระบบ (Admin) เพื่อให้สามารถเข้าสู่ระบบและจัดการร้านได้

## วิธีการสร้างบัญชีแอดมินสำหรับระบบที่เพิ่ง Deploy

1. เปิดเว็บไซต์ที่คุณได้ Deploy ไว้ (URL ที่ได้จาก Render หรือ Railway)
2. เข้าไปที่ URL ต่อไปนี้: `[URL ของคุณ]/api/setup-admin`
   - ตัวอย่าง: ถ้า URL ของคุณคือ `https://coffee-pos.onrender.com` ให้เปิด `https://coffee-pos.onrender.com/api/setup-admin`

## ข้อมูลเข้าสู่ระบบที่จะได้รับ

เมื่อคุณเปิด URL สำหรับตั้งค่าแอดมิน ระบบจะสร้างบัญชีแอดมินให้อัตโนมัติและแสดงข้อมูลสำหรับเข้าสู่ระบบดังนี้:

- **Username**: admin
- **Password**: admin123

## คำแนะนำด้านความปลอดภัย

หลังจากที่คุณสามารถเข้าสู่ระบบด้วยบัญชีแอดมินได้แล้ว ขอแนะนำให้คุณเปลี่ยนรหัสผ่านผ่านหน้าจัดการโปรไฟล์ในระบบ เพื่อความปลอดภัย

## กรณีที่มีบัญชีแอดมินอยู่แล้ว

หากคุณเคยสร้างบัญชีแอดมินไว้แล้ว ระบบจะแจ้งข้อผิดพลาดว่ามีบัญชีแอดมินอยู่แล้ว (Admin already exists) ซึ่งในกรณีนี้คุณสามารถใช้บัญชีแอดมินที่มีอยู่เดิมได้เลย

---

## Admin Setup Guide (English)

After deploying your Café POS system, you need to set up an administrator account to access and manage the system.

## How to Create Admin Account for Newly Deployed System

1. Open your deployed website (URL from Render or Railway)
2. Navigate to this URL: `[Your URL]/api/setup-admin`
   - Example: If your URL is `https://coffee-pos.onrender.com`, open `https://coffee-pos.onrender.com/api/setup-admin`

## Login Credentials You'll Receive

When you open the admin setup URL, the system will automatically create an admin account and display login information:

- **Username**: admin
- **Password**: admin123

## Security Recommendation

After you've successfully logged in with the admin account, we recommend changing the password through the profile management page for security.

## If Admin Account Already Exists

If you've already created an admin account, the system will show an error message stating that an admin account already exists. In this case, you can continue using your existing admin account.