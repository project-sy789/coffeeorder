/**
 * ระบบ real-time สำหรับ POS คาเฟ่
 * ใช้ socket.io เพื่อการสื่อสารแบบ real-time ระหว่าง client และ server
 */
import { Server } from 'socket.io';

// เก็บออเดอร์ที่รอดำเนินการในหน่วยความจำ (แบบชั่วคราว)
// ในระบบจริงควรจะเก็บในฐานข้อมูล
const pendingOrders = new Map();

/**
 * ตั้งค่า Socket.IO Server และเพิ่มความสามารถ real-time
 * @param {Server} httpServer HTTP Server ที่ใช้กับ Express
 * @returns {Server} Socket.IO Server
 */
export function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // อนุญาต cross-origin ทั้งหมด (ปรับตามความเหมาะสม)
      methods: ["GET", "POST"]
    }
  });

  // จำนวนการเชื่อมต่อที่ใช้งานอยู่
  const connections = {
    staff: 0, // พนักงาน
    kitchen: 0, // ส่วนครัว/ผลิต
    customers: 0, // ลูกค้า
    admin: 0 // ผู้ดูแลระบบ
  };

  // เก็บ client sockets ตาม role
  const clients = {
    staff: new Set(),
    kitchen: new Set(),
    customers: new Set(),
    admin: new Set()
  };

  // เมื่อมีการเชื่อมต่อใหม่
  io.on('connection', (socket) => {
    let userRole = 'guest'; // กำหนดค่าเริ่มต้นเป็น guest

    // ลงทะเบียน client และกำหนด role
    socket.on('register', ({ role, userId }) => {
      userRole = role || 'guest';
      
      if (clients[userRole]) {
        clients[userRole].add(socket.id);
        connections[userRole] = (connections[userRole] || 0) + 1;
      }

      // ส่งข้อมูลสถานะปัจจุบันให้ client
      socket.emit('connectionStatus', { connections });

      // ส่งรายการออเดอร์ที่รอดำเนินการให้กับพนักงานและส่วนครัว
      if (userRole === 'staff' || userRole === 'kitchen' || userRole === 'admin') {
        const orders = Array.from(pendingOrders.values());
        socket.emit('pendingOrders', { orders });
      }

      console.log(`Socket ${socket.id} registered as ${userRole}, userId: ${userId || 'anonymous'}`);
    });

    // จัดการเมื่อมีออเดอร์ใหม่ (จากลูกค้าหรือพนักงาน)
    socket.on('newOrder', (order) => {
      console.log('New order received:', order.id);

      // เพิ่มข้อมูลเวลาและสถานะ
      order.timestamp = new Date().toISOString();
      order.status = 'pending'; // pending, processing, completed, cancelled
      
      // บันทึกออเดอร์
      pendingOrders.set(order.id, order);

      // แจ้งเตือนไปยังพนักงานและส่วนครัว
      notifyRole('staff', 'newOrder', { order });
      notifyRole('kitchen', 'newOrder', { order });
      notifyRole('admin', 'newOrderNotification', { order });
      
      // ตอบกลับยืนยันการรับออเดอร์
      socket.emit('orderConfirmed', { 
        orderId: order.id,
        status: 'pending',
        message: 'ออเดอร์ของคุณถูกส่งไปยังร้านแล้ว'
      });
    });

    // อัปเดตสถานะออเดอร์ (จากพนักงานหรือครัว)
    socket.on('updateOrderStatus', ({ orderId, status, note }) => {
      if (pendingOrders.has(orderId)) {
        const order = pendingOrders.get(orderId);
        const previousStatus = order.status;
        
        // อัปเดตสถานะ
        order.status = status;
        if (note) order.note = note;
        
        // บันทึกเวลาที่อัปเดต
        order.updatedAt = new Date().toISOString();
        
        // ถ้าเสร็จสิ้นแล้ว ให้ลบออกจากรายการที่รอดำเนินการ
        if (status === 'completed' || status === 'cancelled') {
          // ในระบบจริงควรจะย้ายไปเก็บในประวัติแทนที่จะลบทิ้ง
          setTimeout(() => {
            pendingOrders.delete(orderId);
            // แจ้งให้ทุกคนทราบว่ามีการลบออเดอร์
            notifyAll('orderRemoved', { orderId });
          }, 60000); // ลบหลังจาก 1 นาที
        }
        
        // แจ้งเตือนการอัปเดตสถานะไปยังทุกคนที่เกี่ยวข้อง
        notifyAll('orderStatusUpdated', { 
          orderId, 
          status,
          previousStatus,
          note,
          updatedAt: order.updatedAt
        });
        
        console.log(`Order ${orderId} status updated to ${status}`);
      } else {
        socket.emit('error', { message: `ไม่พบออเดอร์ ${orderId}` });
      }
    });

    // ลูกค้าขอดูสถานะออเดอร์
    socket.on('checkOrderStatus', ({ orderId }) => {
      if (pendingOrders.has(orderId)) {
        socket.emit('orderStatus', { 
          order: pendingOrders.get(orderId)
        });
      } else {
        socket.emit('orderStatus', { 
          error: true,
          message: 'ไม่พบออเดอร์นี้ หรือออเดอร์อาจถูกดำเนินการเสร็จสิ้นแล้ว'
        });
      }
    });

    // การเชื่อมต่อสิ้นสุด
    socket.on('disconnect', () => {
      if (clients[userRole]) {
        clients[userRole].delete(socket.id);
        connections[userRole] = Math.max(0, (connections[userRole] || 0) - 1);
      }
      
      // แจ้งให้ทุกคนทราบถึงการเปลี่ยนแปลงของการเชื่อมต่อ
      notifyAll('connectionStatus', { connections });
      
      console.log(`Socket ${socket.id} (${userRole}) disconnected`);
    });

    // ให้ทุกคนทราบว่ามีการเชื่อมต่อใหม่
    notifyAll('connectionStatus', { connections });
  });

  // ฟังก์ชันสำหรับแจ้งเตือนไปยัง clients ตาม role
  function notifyRole(role, event, data) {
    if (clients[role]) {
      for (const socketId of clients[role]) {
        io.to(socketId).emit(event, data);
      }
    }
  }

  // ฟังก์ชันสำหรับแจ้งเตือนไปยังทุก clients
  function notifyAll(event, data) {
    io.emit(event, data);
  }

  // ส่งคืน socket.io server
  return io;
}

export default setupSocketIO;