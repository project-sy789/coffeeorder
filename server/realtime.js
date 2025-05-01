/**
 * ระบบ real-time สำหรับ POS คาเฟ่
 * ใช้ socket.io เพื่อการสื่อสารแบบ real-time ระหว่าง client และ server
 */

import { Server } from 'socket.io';
import ws from 'ws';
import { storage } from './storage';

// แก้ไขปัญหา WebSocket ให้เข้ากันได้กับ Replit environment
// @ts-ignore
if (!global.WebSocket) {
  // @ts-ignore
  global.WebSocket = ws;
}

/**
 * ตั้งค่า Socket.IO Server และเพิ่มความสามารถ real-time
 * @param {import('http').Server} httpServer HTTP Server ที่ใช้กับ Express
 * @returns {Server} Socket.IO Server
 */
export function setupSocketIO(httpServer) {
  // สร้าง Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // อนุญาตทุก origin เพื่อความสะดวกในการทดสอบ
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true, // อนุญาตให้ใช้ Engine.IO เวอร์ชั่น 3 ได้ด้วย (เพิ่มความเข้ากันได้)
    path: '/socket.io/', // ระบุ path ที่ตรงกับ client
    transports: ['polling', 'websocket'], // ใช้ทั้ง polling และ websocket (ให้ตรงกับฝั่ง client)
    serveClient: true,
    connectTimeout: 45000, // เพิ่มเวลา timeout เป็น 45 วินาที (มากกว่าค่าเริ่มต้น)
    pingTimeout: 30000, // เพิ่มเวลา ping timeout เป็น 30 วินาที
    pingInterval: 25000, // ลดความถี่ในการ ping
    maxHttpBufferSize: 1e8, // เพิ่มขนาดบัฟเฟอร์สูงสุด (ป้องกันปัญหา payload ขนาดใหญ่)
  });

  // Store users by role
  const usersByRole = {
    admin: new Set(),
    staff: new Set(),
    customer: new Set()
  };

  // เมื่อมีการเชื่อมต่อใหม่
  io.on('connection', (socket) => {
    console.log('Socket.IO client connected with ID:', socket.id);
    let userRole = null;

    /**
     * ระบบจัดการเหตุการณ์ ฝั่ง Server
     */

    // จัดการเมื่อ client ลงทะเบียนบทบาท (register role)
    socket.on('register', (data) => {
      try {
        const { role } = data;
        
        if (!role || !usersByRole[role]) {
          console.warn(`Invalid role registered: ${role}`);
          return;
        }
        
        userRole = role;
        usersByRole[role].add(socket.id);
        
        console.log(`User registered as ${role}, socket ID: ${socket.id}`);
        console.log(`Current ${role} users: ${usersByRole[role].size}`);
        
        // แจ้งยืนยันการลงทะเบียนกลับไปยัง client
        socket.emit('registered', { 
          success: true, 
          role,
          message: `ลงทะเบียนเป็น ${role} สำเร็จ`
        });
      } catch (error) {
        console.error('Error in register event:', error);
        socket.emit('error', { message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
      }
    });

    // จัดการเมื่อมีการอัพเดตสถานะออร์เดอร์
    socket.on('updateOrderStatus', (data) => {
      try {
        const { orderId, status } = data;
        console.log(`Order ${orderId} status updated to ${status} by ${socket.id}`);
        
        // ส่งการแจ้งเตือนไปยังทุกคนยกเว้นผู้ส่ง
        socket.broadcast.emit('orderStatusUpdated', { 
          orderId,
          status,
          updatedAt: new Date().toISOString() 
        });
      } catch (error) {
        console.error('Error in updateOrderStatus event:', error);
      }
    });

    // จัดการเมื่อมีการสร้างรายการสั่งซื้อใหม่
    socket.on('newOrder', (data) => {
      try {
        console.log(`New order created: ${data.order.id || 'Unknown ID'}`);
        
        // ส่งการแจ้งเตือนไปยังทุก staff และ admin
        notifyRole('admin', 'newOrderNotification', data);
        notifyRole('staff', 'newOrderNotification', data);
      } catch (error) {
        console.error('Error in newOrder event:', error);
      }
    });

    // จัดการเมื่อมีการอัพเดตข้อมูลแบบเรียลไทม์อื่นๆ
    socket.on('dataUpdated', (data) => {
      try {
        const { type, payload } = data;
        console.log(`Data updated: ${type}`);
        
        // ส่งการแจ้งเตือนไปยังทุกคนยกเว้นผู้ส่ง
        socket.broadcast.emit('dataUpdated', { type, payload });
      } catch (error) {
        console.error('Error in dataUpdated event:', error);
      }
    });
    
    // จัดการเมื่อมีการเข้าสู่ระบบผ่าน Socket.IO
    socket.on('loginUser', async (data, callback) => {
      try {
        console.log('Socket request: loginUser', { username: data.username });
        const { username, password } = data;
        
        // ตรวจสอบว่ามี callback หรือไม่
        if (typeof callback !== 'function') {
          console.error('No callback function provided for loginUser event');
          return;
        }
        
        // ตรวจสอบว่ามีการส่งข้อมูลที่จำเป็นมาหรือไม่
        if (!username || !password) {
          callback({ success: false, error: 'กรุณาระบุชื่อผู้ใช้และรหัสผ่าน' });
          return;
        }
        
        // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
        const user = await storage.getUserByUsername(username);
        
        // ตรวจสอบว่าพบผู้ใช้หรือไม่
        if (!user) {
          console.log('User not found', username);
          callback({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
          return;
        }
        
        // เปรียบเทียบรหัสผ่าน (ใช้ฟังก์ชันเปรียบเทียบรหัสผ่านที่มีอยู่แล้ว)
        // ใช้ bcrypt หรือวิธีการเปรียบเทียบที่ปลอดภัย
        const scrypt = await import('crypto');
        const util = await import('util');
        const scryptAsync = util.promisify(scrypt.scrypt);
        
        // ฟังก์ชั่นเปรียบเทียบรหัสผ่าน
        async function comparePasswords(supplied, stored) {
          const [hashed, salt] = stored.split(".");
          const hashedBuf = Buffer.from(hashed, "hex");
          const suppliedBuf = await scryptAsync(supplied, salt, 64);
          
          // เปรียบเทียบแบบ timing-safe
          return scrypt.timingSafeEqual(hashedBuf, suppliedBuf);
        }
        
        // ตรวจสอบรหัสผ่าน
        const passwordMatch = await comparePasswords(password, user.password);
        
        if (!passwordMatch) {
          console.log('Password does not match for user:', username);
          callback({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
          return;
        }
        
        // รหัสผ่านถูกต้อง
        // สร้างข้อมูลสำหรับส่งกลับให้ client (ไม่รวมรหัสผ่าน)
        const userData = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          active: user.active
        };
        
        // ลงทะเบียนบทบาทผู้ใช้ (ถ้ายังไม่ได้ลงทะเบียน)
        if (user.role && usersByRole[user.role]) {
          userRole = user.role;
          usersByRole[user.role].add(socket.id);
          console.log(`User authenticated and registered as ${user.role}, socket ID: ${socket.id}`);
        }
        
        // ส่งข้อมูลกลับไปให้ client
        console.log('Login successful, sending user data back:', userData);
        callback({ success: true, user: userData });
      } catch (error) {
        console.error('Error in loginUser event:', error);
        callback({ success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
      }
    });

    /**
     * เพิ่มเหตุการณ์สำหรับการดึงข้อมูลแบบเรียลไทม์
     */

    // ดึงข้อมูลสินค้า
    socket.on('getProducts', async (data, callback) => {
      try {
        console.log('Socket request: getProducts');
        const products = await storage.getProducts();
        if (typeof callback === 'function') {
          callback({ success: true, data: products });
        } else {
          console.warn('Warning: getProducts called without a callback function');
        }
      } catch (error) {
        console.error('Error fetching products via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลหมวดหมู่
    socket.on('getCategories', async (data, callback) => {
      try {
        console.log('Socket request: getCategories');
        const categories = await storage.getAllCategories();
        if (typeof callback === 'function') {
          callback({ success: true, data: categories });
        } else {
          console.warn('Warning: getCategories called without a callback function');
        }
      } catch (error) {
        console.error('Error fetching categories via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลออร์เดอร์
    socket.on('getOrders', async (data, callback) => {
      try {
        console.log('Socket request: getOrders');
        
        // กรณีที่มีการส่ง data แบบฟังก์ชัน ให้สลับตำแหน่ง
        if (typeof data === 'function' && typeof callback === 'undefined') {
          callback = data;
          data = {};
        }
        
        const orders = await storage.getOrders();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: orders });
        } else {
          console.warn('No valid callback provided for getOrders');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('orders', { success: true, data: orders });
        }
      } catch (error) {
        console.error('Error fetching orders via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('orders', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลออร์เดอร์ตามช่วงวัน
    socket.on('getOrdersByDateRange', async (data, callback) => {
      try {
        console.log('Socket request: getOrdersByDateRange', data);
        const { startDate, endDate } = data;
        const orders = await storage.getOrdersByDateRange(
          new Date(startDate),
          new Date(endDate)
        );
        callback({ success: true, data: orders });
      } catch (error) {
        console.error('Error fetching orders by date range via socket:', error);
        callback({ success: false, error: error.message });
      }
    });

    // ดึงข้อมูลรายละเอียดออร์เดอร์
    socket.on('getOrderDetails', async (data, callback) => {
      try {
        console.log('Socket request: getOrderDetails', data);
        const { orderId } = data;
        const orderDetails = await storage.getOrderWithItems(orderId);
        callback({ success: true, data: orderDetails });
      } catch (error) {
        console.error('Error fetching order details via socket:', error);
        callback({ success: false, error: error.message });
      }
    });

    // ดึงข้อมูลผู้ใช้
    socket.on('getUsers', async (data, callback) => {
      try {
        console.log('Socket request: getUsers');
        const users = await storage.getUsers();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: users });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: users });
        } else {
          console.warn('No valid callback provided for getUsers');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('users', { success: true, data: users });
        }
      } catch (error) {
        console.error('Error fetching users via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('users', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลสมาชิก
    socket.on('getMembers', async (data, callback) => {
      try {
        console.log('Socket request: getMembers');
        const members = await storage.getMembers();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: members });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: members });
        } else {
          console.warn('No valid callback provided for getMembers');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('members', { success: true, data: members });
        }
      } catch (error) {
        console.error('Error fetching members via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('members', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลตัวเลือกการปรับแต่ง
    socket.on('getCustomizationOptions', async (data, callback) => {
      try {
        console.log('Socket request: getCustomizationOptions');
        const options = await storage.getCustomizationOptions();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: options });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: options });
        } else {
          console.warn('No valid callback provided for getCustomizationOptions');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('customizationOptions', { success: true, data: options });
        }
      } catch (error) {
        console.error('Error fetching customization options via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('customizationOptions', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลประเภทการปรับแต่ง
    socket.on('getCustomizationTypes', async (data, callback) => {
      try {
        console.log('Socket request: getCustomizationTypes');
        const types = await storage.getAllCustomizationTypes();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: types });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: types });
        } else {
          console.warn('No valid callback provided for getCustomizationTypes');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('customizationTypes', { success: true, data: types });
        }
      } catch (error) {
        console.error('Error fetching customization types via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('customizationTypes', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลการตั้งค่าประเภทการปรับแต่ง
    socket.on('getCustomizationTypeSettings', async (data, callback) => {
      try {
        console.log('Socket request: getCustomizationTypeSettings');
        const settings = await storage.getAllCustomizationTypeSettings();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: settings });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: settings });
        } else {
          console.warn('No valid callback provided for getCustomizationTypeSettings');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('customizationTypeSettings', { success: true, data: settings });
        }
      } catch (error) {
        console.error('Error fetching customization type settings via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('customizationTypeSettings', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลวัตถุดิบในคลัง
    socket.on('getInventory', async (data, callback) => {
      try {
        console.log('Socket request: getInventory');
        const inventory = await storage.getInventoryItems();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: inventory });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: inventory });
        } else {
          console.warn('No valid callback provided for getInventory');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('inventory', { success: true, data: inventory });
        }
      } catch (error) {
        console.error('Error fetching inventory via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('inventory', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลโปรโมชั่น
    socket.on('getPromotions', async (data, callback) => {
      try {
        console.log('Socket request: getPromotions');
        const promotions = await storage.getPromotions();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: promotions });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: promotions });
        } else {
          console.warn('No valid callback provided for getPromotions');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('promotions', { success: true, data: promotions });
        }
      } catch (error) {
        console.error('Error fetching promotions via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('promotions', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลสำหรับหน้า Analytics
    socket.on('getAnalytics', async (data, callback) => {
      try {
        console.log('Socket request: getAnalytics', data);
        
        // กรณีที่มีการส่ง data แบบฟังก์ชัน ให้สลับตำแหน่ง
        if (typeof data === 'function' && typeof callback === 'undefined') {
          callback = data;
          data = {};
        }
        
        // ถ้ายังไม่ได้รับข้อมูล ให้กำหนดค่าเริ่มต้น
        if (typeof data !== 'object' || data === null) {
          data = {};
        }
        
        const { type } = data;
        let result;
        
        switch (type) {
          case 'low-stock':
            result = await storage.getLowStockItems();
            break;
          case 'popular-products':
            result = await storage.getPopularProducts(data.limit || 5);
            break;
          case 'product-usage':
            result = await storage.getProductUsageReport();
            break;
          case 'daily-sales':
            result = await storage.getDailySales(new Date());
            break;
          default:
            throw new Error('ประเภทข้อมูลวิเคราะห์ไม่ถูกต้อง');
        }
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: result });
        } else {
          console.warn('No valid callback provided for getAnalytics');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('analytics', { success: true, data: result, type });
        }
      } catch (error) {
        console.error(`Error fetching analytics (${data?.type}) via socket:`, error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('analytics', { success: false, error: error.message, type: data?.type });
        }
      }
    });

    // ดึงข้อมูลการตั้งค่าทั้งหมด
    socket.on('getSettings', async (data, callback) => {
      try {
        console.log('Socket request: getSettings');
        const settings = await storage.getSettings();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: settings });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: settings });
        } else {
          console.warn('No valid callback provided for getSettings');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('settings', { success: true, data: settings });
        }
      } catch (error) {
        console.error('Error fetching settings via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('settings', { success: false, error: error.message });
        }
      }
    });
    
    // ดึงข้อมูลการตั้งค่าตาม key
    socket.on('getSetting', async (data, callback) => {
      try {
        console.log('Socket request: getSetting', data);
        
        // กรณีที่มีการส่ง data แบบฟังก์ชัน ให้สลับตำแหน่ง
        if (typeof data === 'function' && typeof callback === 'undefined') {
          callback = data;
          data = {};
        }
        
        // ตรวจสอบ key ที่ต้องการดึงข้อมูล
        if (!data || !data.key) {
          throw new Error('Missing required parameter: key');
        }
        
        const { key } = data;
        const setting = await storage.getSetting(key);
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: setting });
        } else {
          console.warn('No valid callback provided for getSetting');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('setting', { success: true, data: setting });
        }
      } catch (error) {
        console.error('Error fetching setting via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('setting', { success: false, error: error.message });
        }
      }
    });
    
    // ดึงข้อมูลค่าของการตั้งค่าตาม key
    socket.on('getSettingValue', async (data, callback) => {
      try {
        console.log('Socket request: getSettingValue', data);
        
        // กรณีที่มีการส่ง data แบบฟังก์ชัน ให้สลับตำแหน่ง
        if (typeof data === 'function' && typeof callback === 'undefined') {
          callback = data;
          data = {};
        }
        
        // ตรวจสอบ key ที่ต้องการดึงข้อมูล
        if (!data || !data.key) {
          throw new Error('Missing required parameter: key');
        }
        
        const { key } = data;
        const setting = await storage.getSetting(key);
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: setting ? setting.value : null });
        } else {
          console.warn('No valid callback provided for getSettingValue');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('settingValue', { success: true, data: setting ? setting.value : null });
        }
      } catch (error) {
        console.error('Error fetching setting value via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else {
          socket.emit('settingValue', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลการตั้งค่าแต้มสะสม
    socket.on('getPointSettings', async (data, callback) => {
      try {
        console.log('Socket request: getPointSettings');
        const pointSettings = await storage.getPointSettings();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: pointSettings });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: pointSettings });
        } else {
          console.warn('No valid callback provided for getPointSettings');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('pointSettings', { success: true, data: pointSettings });
        }
      } catch (error) {
        console.error('Error fetching point settings via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('pointSettings', { success: false, error: error.message });
        }
      }
    });
    
    // ดึงข้อมูลธีม
    socket.on('getTheme', async (data, callback) => {
      try {
        console.log('Socket request: getTheme');
        // ลองหาข้อมูลธีมจาก storage
        const theme = await storage.getSetting('theme');
        
        console.log('Theme data from storage:', theme);
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          console.log('Using callback function for getTheme response');
          callback({ success: true, data: theme?.value ? JSON.parse(theme.value) : null });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          console.log('Using data as callback function for getTheme response');
          data({ success: true, data: theme?.value ? JSON.parse(theme.value) : null });
        } else {
          console.warn('No valid callback provided for getTheme, using socket.emit instead');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('theme', { success: true, data: theme?.value ? JSON.parse(theme.value) : null });
        }
      } catch (error) {
        console.error('Error fetching theme via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('theme', { success: false, error: error.message });
        }
      }
    });

    // ดึงข้อมูลกฎการแลกแต้ม
    socket.on('getPointRedemptionRules', async (data, callback) => {
      try {
        console.log('Socket request: getPointRedemptionRules');
        const rules = await storage.getPointRedemptionRules();
        
        // ตรวจสอบว่า callback เป็นฟังก์ชันหรือไม่
        if (typeof callback === 'function') {
          callback({ success: true, data: rules });
        } else if (typeof data === 'function') {
          // กรณีที่ callback ถูกส่งเป็น argument แรก
          data({ success: true, data: rules });
        } else {
          console.warn('No valid callback provided for getPointRedemptionRules');
          // ส่งข้อมูลกลับด้วย socket.emit แทน
          socket.emit('pointRedemptionRules', { success: true, data: rules });
        }
      } catch (error) {
        console.error('Error fetching point redemption rules via socket:', error);
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        } else if (typeof data === 'function') {
          data({ success: false, error: error.message });
        } else {
          socket.emit('pointRedemptionRules', { success: false, error: error.message });
        }
      }
    });

    /**
     * เพิ่มเหตุการณ์สำหรับการสร้างและอัพเดตข้อมูลแบบเรียลไทม์
     */

    // สร้างคำสั่งซื้อลูกค้า (ทดแทน /api/customer/orders)
    socket.on('createCustomerOrder', async (orderData, callback) => {
      try {
        console.log('Socket request: createCustomerOrder', orderData);
        
        // ตรวจสอบข้อมูล
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          throw new Error('ข้อมูลรายการสินค้าไม่ถูกต้อง');
        }
        
        // สร้างข้อมูลออเดอร์
        const orderPayload = {
          status: "pending",
          orderDate: new Date(),
          total: orderData.total || 0,
          discount: orderData.discount || 0,
          finalTotal: (orderData.total || 0) - (orderData.discount || 0),
          paymentMethod: orderData.paymentMethod || "cash",
          paymentStatus: "pending",
          referenceId: orderData.referenceId || null,
          memberId: orderData.memberId || null,
          pointsEarned: 0, // จะคำนวณและอัปเดตภายหลัง
          usePoints: orderData.usePoints || false,
          pointsUsed: orderData.pointsUsed || 0,
          pointsPromotionId: orderData.pointsPromotion || null,
          staffId: null, // ออเดอร์จากลูกค้าไม่มี staffId
          type: "online" // ระบุประเภทเป็นออนไลน์
        };
        
        // สร้างข้อมูลรายการสินค้า
        const orderItems = orderData.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations || {},
          subtotal: item.price * item.quantity
        }));
        
        // บันทึกข้อมูลลงในฐานข้อมูล
        console.log("กำลังสร้างออเดอร์ลูกค้าผ่าน Socket.IO:", orderPayload);
        const newOrder = await storage.createOrder(orderPayload, orderItems);
        console.log("สร้างออเดอร์ลูกค้าสำเร็จ:", newOrder.id);
        
        // ถ้ามีการใช้แต้มสะสม ลดแต้มของสมาชิก
        if (orderPayload.usePoints && orderPayload.memberId && orderPayload.pointsUsed > 0) {
          try {
            await storage.addMemberPoints(orderPayload.memberId, -orderPayload.pointsUsed);
            console.log(`หักแต้มสะสม ${orderPayload.pointsUsed} แต้ม จากสมาชิก ID ${orderPayload.memberId}`);
          } catch (pointsError) {
            console.error("ไม่สามารถหักแต้มสะสมได้:", pointsError);
            // ไม่ต้องยกเลิกออเดอร์ แต่บันทึกข้อผิดพลาดไว้
          }
        }
        
        // แจ้งเตือนแบบเรียลไทม์ไปยังทุก staff และ admin
        io.notifyRole('admin', 'newOrderNotification', { order: newOrder });
        io.notifyRole('staff', 'newOrderNotification', { order: newOrder });
        
        // ส่งผลลัพธ์กลับ
        callback({ success: true, data: newOrder });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้างออเดอร์ลูกค้าผ่าน Socket.IO:", error);
        callback({ success: false, error: error.message });
      }
    });

    // อัพเดตสถานะออร์เดอร์
    socket.on('updateOrderStatus', async (data, callback) => {
      try {
        console.log('Socket request: updateOrderStatus', data);
        const { orderId, status, cancelReason } = data;
        
        // ตรวจสอบข้อมูล
        if (!orderId || !status) {
          throw new Error('ข้อมูลไม่ครบถ้วน');
        }
        
        // อัพเดตสถานะออร์เดอร์
        const updatedOrder = await storage.updateOrderStatus(orderId, status, cancelReason);
        
        // แจ้งเตือนการอัพเดตไปยังทุก socket ยกเว้นผู้ส่ง
        socket.broadcast.emit('orderStatusUpdated', { 
          orderId,
          status,
          updatedAt: new Date().toISOString() 
        });
        
        // ส่งผลลัพธ์กลับ
        callback({ success: true, data: updatedOrder });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอัพเดตสถานะออร์เดอร์ผ่าน Socket.IO:", error);
        callback({ success: false, error: error.message });
      }
    });

    // สร้างสินค้าใหม่
    socket.on('createProduct', async (productData, callback) => {
      try {
        console.log('Socket request: createProduct', productData);
        
        // ตรวจสอบข้อมูล
        if (!productData.name || !productData.price || !productData.category) {
          throw new Error('ข้อมูลสินค้าไม่ครบถ้วน');
        }
        
        // สร้างสินค้าใหม่
        const newProduct = await storage.createProduct(productData);
        
        // แจ้งเตือนการเพิ่มสินค้าใหม่
        socket.broadcast.emit('productsUpdated');
        
        // ส่งผลลัพธ์กลับ
        callback({ success: true, data: newProduct });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้างสินค้าผ่าน Socket.IO:", error);
        callback({ success: false, error: error.message });
      }
    });

    // อัพเดตสินค้า
    socket.on('updateProduct', async (data, callback) => {
      try {
        console.log('Socket request: updateProduct', data);
        const { productId, ...productData } = data;
        
        // ตรวจสอบข้อมูล
        if (!productId) {
          throw new Error('ไม่ระบุรหัสสินค้า');
        }
        
        // อัพเดตสินค้า
        const updatedProduct = await storage.updateProduct(productId, productData);
        
        // แจ้งเตือนการอัพเดตสินค้า
        socket.broadcast.emit('productsUpdated');
        
        // ส่งผลลัพธ์กลับ
        callback({ success: true, data: updatedProduct });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอัพเดตสินค้าผ่าน Socket.IO:", error);
        callback({ success: false, error: error.message });
      }
    });

    // ลบสินค้า
    socket.on('deleteProduct', async (data, callback) => {
      try {
        console.log('Socket request: deleteProduct', data);
        const { productId } = data;
        
        // ตรวจสอบข้อมูล
        if (!productId) {
          throw new Error('ไม่ระบุรหัสสินค้า');
        }
        
        // ลบสินค้า
        const result = await storage.deleteProduct(productId);
        
        // แจ้งเตือนการลบสินค้า
        socket.broadcast.emit('productsUpdated');
        
        // ส่งผลลัพธ์กลับ
        callback({ success: true, data: { deleted: result } });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการลบสินค้าผ่าน Socket.IO:", error);
        callback({ success: false, error: error.message });
      }
    });

    // จัดการเมื่อ client ตัดการเชื่อมต่อ
    socket.on('disconnect', () => {
      console.log(`Socket.IO client disconnected: ${socket.id}`);
      
      // ลบผู้ใช้ออกจากบทบาทที่ลงทะเบียนไว้
      if (userRole && usersByRole[userRole]) {
        usersByRole[userRole].delete(socket.id);
        console.log(`User removed from ${userRole}, remaining: ${usersByRole[userRole].size}`);
      }
    });
  });

  // ฟังก์ชันสำหรับแจ้งเตือนทุกคนในบทบาทเฉพาะ
  function notifyRole(role, event, data) {
    if (!usersByRole[role]) return;
    
    const socketIds = Array.from(usersByRole[role]);
    console.log(`Notifying ${socketIds.length} ${role}(s) about ${event}`);
    
    socketIds.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }

  // ฟังก์ชันสำหรับแจ้งเตือนทุกการเชื่อมต่อ
  function notifyAll(event, data) {
    io.emit(event, data);
  }

  // เพิ่มฟังก์ชัน notifyRole และ notifyAll เป็นเมธอดของ io เพื่อให้เข้าถึงได้จากที่อื่น
  io.notifyRole = notifyRole;
  io.notifyAll = notifyAll;

  // ตั้งเวลาส่งข้อมูลวิเคราะห์อัตโนมัติทุก 5 นาที
  setInterval(async () => {
    try {
      // ไม่ต้องส่งข้อมูลถ้าไม่มีผู้ใช้ admin หรือ staff เชื่อมต่ออยู่
      if (usersByRole.admin.size === 0 && usersByRole.staff.size === 0) {
        return;
      }

      console.log('Sending automatic analytics updates...');
      
      // ข้อมูลสินค้าที่ใกล้หมด
      const lowStockItems = await storage.getLowStockItems();
      notifyRole('admin', 'analyticsUpdated', { 
        type: 'low-stock', 
        data: lowStockItems 
      });
      
      // ข้อมูลสินค้ายอดนิยม
      const popularProducts = await storage.getPopularProducts(5);
      notifyRole('admin', 'analyticsUpdated', { 
        type: 'popular-products', 
        data: popularProducts 
      });
      
      // ข้อมูลการใช้วัตถุดิบ
      const productUsage = await storage.getProductUsageReport();
      notifyRole('admin', 'analyticsUpdated', { 
        type: 'product-usage', 
        data: productUsage 
      });
      
      // ยอดขายวันนี้
      const dailySales = await storage.getDailySales(new Date());
      notifyRole('admin', 'analyticsUpdated', { 
        type: 'daily-sales', 
        data: dailySales 
      });
      
    } catch (error) {
      console.error('Error in automatic analytics update:', error);
    }
  }, 5 * 60 * 1000); // ทุก 5 นาที

  console.log('Socket.IO server initialized with real-time data capabilities');
  return io;
}