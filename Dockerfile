FROM node:18-alpine

WORKDIR /app

# ติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# คัดลอกโค้ดโปรเจค
COPY . .

# สำหรับการ build
RUN npm run build

# ตั้งค่าสภาพแวดล้อม
ENV NODE_ENV=production
ENV PORT=5000

# เปิดพอร์ต
EXPOSE 5000

# รันแอปพลิเคชัน
CMD ["node", "start-server.js"]