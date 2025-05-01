import { io, Socket } from "socket.io-client";

// กำหนดพอร์ตเซิร์ฟเวอร์ที่ถูกต้อง - สำหรับทั้ง Development และ Production
// รองรับการ Deploy บน Render.com และ Railway
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin; // ใช้ origin เดียวกับ URL ที่เปิดใช้งานแอพ

console.log('Socket.IO API Base URL:', API_BASE_URL);

// ป้องกันการใช้ WebSocket โดยตรงทำให้เกิด DOMException
// เลือกโหมดการเชื่อมต่อที่เหมาะสมตามสภาพแวดล้อม
const TRANSPORTS = ['polling', 'websocket']; // ต้องตรงกับฝั่ง server

// ตัวแปรสำหรับเก็บ socket instance
let socket: Socket | null = null;
// ตัวแปรเก็บสถานะการเชื่อมต่อ
let socketEnabled = true;
let connectionAttempts = 0;
// เพิ่มจำนวนครั้งในการลองเชื่อมต่อเพื่อความอดทนมากขึ้น
const MAX_CONNECTION_ATTEMPTS = 10; 
// เก็บสถานะว่ากำลังเชื่อมต่ออยู่หรือไม่
let isConnecting = false;

/**
 * ฟังก์ชันสำหรับเรียกใช้ socket.io
 * @returns socket instance หรือ mock socket ถ้าไม่สามารถเชื่อมต่อได้
 */
export function getSocket(): Socket {
  // ถ้าปิด Socket.IO ไว้ ให้คืน mock socket ที่มี method ที่จำเป็นแต่ไม่ทำงานจริง
  if (!socketEnabled && connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    return createMockSocket();
  }
  
  if (!socket) {
    try {
      // สร้าง socket instance โดยใช้ความเข้ากันได้สูงสุด
      // กำหนด transports ตามค่า FORCE_POLLING เพื่อแก้ปัญหา WebSocket ในเบราว์เซอร์
      socket = io(API_BASE_URL, {
        transports: TRANSPORTS, // ใช้ transports ที่กำหนดไว้ข้างต้น
        autoConnect: true,
        reconnectionAttempts: 10, // เพิ่มจำนวนครั้งในการลองเชื่อมต่อ
        reconnectionDelay: 1000, // ลดเวลาระหว่างการลองเชื่อมต่อให้เร็วขึ้น
        reconnectionDelayMax: 5000, // จำกัดเวลาสูงสุดระหว่างการลองเชื่อมต่อ
        timeout: 20000, // เพิ่ม timeout เพื่อรองรับเครือข่ายที่มีความเสถียรต่ำ
        path: '/socket.io/', // ระบุ path ที่ตรงกับ server
        forceNew: true, // สร้างการเชื่อมต่อใหม่ทุกครั้ง ไม่ใช้อันเดิมที่อาจมีปัญหา
        randomizationFactor: 0.5, // เพิ่มค่าการสุ่มในการลองเชื่อมต่อ เพื่อลดการแออัด
      });
      
      // ติดตั้ง event handlers พื้นฐาน
      socket.on('connect', () => {
        console.log('Socket.IO connected, ID:', socket?.id);
        connectionAttempts = 0; // รีเซ็ตจำนวนครั้งที่พยายามเชื่อมต่อเมื่อเชื่อมต่อสำเร็จ
      });
      
      socket.on('connect_error', (error) => {
        console.warn('Socket.IO connection error:', error);
        connectionAttempts++;
        
        // ถ้าพยายามเชื่อมต่อเกินจำนวนครั้งที่กำหนด ให้ปิดการใช้งาน socket
        if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
          console.log(`Disabling real-time features after ${MAX_CONNECTION_ATTEMPTS} failed attempts`);
          socketEnabled = false;
          if (socket) {
            socket.disconnect();
            socket = null;
          }
          return createMockSocket();
        }
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket.IO reconnection attempt #${attemptNumber}`);
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
        connectionAttempts = 0;
      });
      
      socket.on('reconnect_error', (error) => {
        console.warn('Socket.IO reconnection error:', error);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('Socket.IO failed to reconnect after all attempts');
        socketEnabled = false;
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        
        // หากเป็นการตัดการเชื่อมต่อเพราะฝั่ง server ให้ลองเชื่อมต่อใหม่
        if (reason === 'io server disconnect') {
          socket?.connect();
        }
      });
      
      socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
      });
    } catch (error) {
      console.error('Error creating Socket.IO instance:', error);
      socketEnabled = false;
      return createMockSocket();
    }
  }
  
  return socket || createMockSocket();
}

/**
 * สร้าง mock socket ที่มี methods ที่จำเป็นแต่ไม่ทำงานจริง
 * เพื่อให้แอพทำงานได้แม้ไม่มี real-time features
 */
function createMockSocket(): any {
  console.log('Creating mock socket for fallback operation');
  
  return {
    id: 'mock-socket',
    connected: false,
    disconnected: true,
    // ให้ callback ทำงานเพื่อป้องกัน undefined errors
    on: (event: string, callback: Function) => {
      // สำหรับ event 'connect' ให้เรียก callback ทันทีเพื่อให้ app ทำงานต่อได้
      if (event === 'connect') {
        setTimeout(() => callback(), 100);
      } 
      
      // สำหรับ registered event ให้ส่งข้อมูลกลับเสมือนการลงทะเบียนสำเร็จ
      if (event === 'registered') {
        setTimeout(() => callback({ success: true, message: 'ลงทะเบียนแบบ offline mode' }), 100);
      }
    },
    emit: (event: string, data: any, callback?: Function) => {
      console.log(`[Mock Socket] Emitting ${event} (offline mode)`);
      // เรียก callback พร้อมข้อมูลว่างเปล่าเพื่อให้โค้ดทำงานต่อได้
      if (callback) {
        setTimeout(() => callback({ success: false, error: 'Offline mode', data: [] }), 100);
      }
      return false;
    },
    disconnect: () => { console.log('[Mock Socket] Disconnected (offline mode)'); },
    connect: () => { console.log('[Mock Socket] Connect attempted (offline mode)'); },
    io: {
      reconnection: (value: boolean) => {}
    },
    // เพิ่มฟังก์ชัน listeners ที่อาจถูกเรียกใช้
    listeners: () => []
  };
}

/**
 * ฟังก์ชันสำหรับลงทะเบียนบทบาทของผู้ใช้กับ socket.io server
 * @param role บทบาทของผู้ใช้ (admin, staff, customer)
 */
export function registerRole(role: 'admin' | 'staff' | 'customer'): void {
  const socket = getSocket();
  
  socket.emit('register', { role });
  
  socket.on('registered', (response) => {
    console.log('Registered with socket.io server:', response);
  });
}

/**
 * ฟังก์ชันสำหรับปิดการเชื่อมต่อ socket.io
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลผ่าน Socket.IO
 * @param eventName ชื่อเหตุการณ์ที่ต้องการดึงข้อมูล (ตรงกับที่กำหนดในฝั่ง server)
 * @param payload ข้อมูลเพิ่มเติมที่ต้องการส่งไปกับคำขอ (ถ้ามี)
 * @returns Promise ที่มีข้อมูลที่ได้รับจาก server
 */
export function fetchDataViaSocket<T>(eventName: string, payload?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    
    // ตรวจสอบว่า socket เชื่อมต่ออยู่หรือไม่
    if (!socket.connected) {
      console.log(`Socket not connected, attempting to connect before fetching ${eventName}`);
      
      // ลองเชื่อมต่อใหม่ถ้าไม่ได้เชื่อมต่ออยู่
      socket.connect();
      
      // รอให้เชื่อมต่อสำเร็จแล้วค่อยดึงข้อมูล
      socket.once('connect', () => {
        emitWithTimeout<T>(socket, eventName, payload, resolve, reject);
      });
      
      // หากเชื่อมต่อไม่สำเร็จให้ reject
      socket.once('connect_error', (error) => {
        reject(new Error(`Failed to connect to server: ${error.message}`));
      });
    } else {
      // ถ้าเชื่อมต่ออยู่แล้ว ให้ดึงข้อมูลได้เลย
      emitWithTimeout<T>(socket, eventName, payload, resolve, reject);
    }
  });
}

/**
 * ฟังก์ชันช่วยส่งคำขอพร้อม timeout เพื่อป้องกันการค้างรอคำตอบจาก server
 */
function emitWithTimeout<T>(
  socket: Socket, 
  eventName: string, 
  payload: any, 
  resolve: (value: T) => void, 
  reject: (reason: any) => void, 
  timeout = 30000  // เพิ่มเวลา timeout เป็น 30 วินาทีเพื่อรองรับการเชื่อมต่อที่ช้า
) {
  let timeoutId: NodeJS.Timeout;
  
  // สร้าง timeout เพื่อไม่ให้รอคำตอบจาก server นานเกินไป
  timeoutId = setTimeout(() => {
    reject(new Error(`Request timeout for ${eventName} after ${timeout}ms`));
  }, timeout);
  
  // ส่งคำขอไปยัง server
  try {
    // แก้ไขให้จัดการกับกรณีที่ไม่มี callback
    socket.emit(eventName, payload, (response: { success: boolean, data?: T, error?: string } | null) => {
      // ยกเลิก timeout เมื่อได้รับคำตอบ
      clearTimeout(timeoutId);
      
      // ป้องกันกรณี response เป็น null หรือ undefined
      if (!response) {
        console.error(`Null or undefined response from ${eventName}`);
        resolve([] as unknown as T); // คืนค่าเป็น empty array เป็นค่าเริ่มต้น
        return;
      }
      
      if (response.success) {
        console.log(`Data received from ${eventName}:`, response.data);
        resolve(response.data as T);
      } else {
        console.error(`Error fetching data from ${eventName}:`, response.error);
        reject(new Error(response.error || `Failed to fetch data from ${eventName}`));
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Exception in socket.emit for ${eventName}:`, error);
    reject(new Error(`Socket communication error: ${error}`));
  }
}

/**
 * ใช้สำหรับดึงข้อมูลสินค้าจาก server
 * @returns Promise<ข้อมูลสินค้าทั้งหมด>
 */
export function fetchProducts<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getProducts');
}

/**
 * ใช้สำหรับดึงข้อมูลหมวดหมู่จาก server
 * @returns Promise<ข้อมูลหมวดหมู่ทั้งหมด>
 */
export function fetchCategories<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getCategories');
}

/**
 * ใช้สำหรับดึงข้อมูลออเดอร์จาก server
 * @returns Promise<ข้อมูลออเดอร์ทั้งหมด>
 */
export function fetchOrders<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getOrders');
}

/**
 * ใช้สำหรับดึงข้อมูลออเดอร์ตามช่วงวันจาก server
 * @param startDate วันที่เริ่มต้น
 * @param endDate วันที่สิ้นสุด
 * @returns Promise<ข้อมูลออเดอร์ตามช่วงวัน>
 */
export function fetchOrdersByDateRange<T>(startDate: Date, endDate: Date): Promise<T> {
  return fetchDataViaSocket<T>('getOrdersByDateRange', { startDate, endDate });
}

/**
 * ใช้สำหรับดึงรายละเอียดออเดอร์จาก server
 * @param orderId รหัสออเดอร์
 * @returns Promise<รายละเอียดออเดอร์>
 */
export function fetchOrderDetails<T>(orderId: number): Promise<T> {
  return fetchDataViaSocket<T>('getOrderDetails', { orderId });
}

/**
 * ใช้สำหรับดึงข้อมูลผู้ใช้จาก server
 * @returns Promise<ข้อมูลผู้ใช้ทั้งหมด>
 */
export function fetchUsers<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getUsers');
}

/**
 * ใช้สำหรับดึงข้อมูลสมาชิกจาก server
 * @returns Promise<ข้อมูลสมาชิกทั้งหมด>
 */
export function fetchMembers<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getMembers');
}

/**
 * ใช้สำหรับดึงข้อมูลตัวเลือกการปรับแต่งจาก server
 * @returns Promise<ข้อมูลตัวเลือกการปรับแต่งทั้งหมด>
 */
export function fetchCustomizationOptions<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getCustomizationOptions');
}

/**
 * ใช้สำหรับดึงข้อมูลประเภทการปรับแต่งจาก server
 * @returns Promise<ข้อมูลประเภทการปรับแต่งทั้งหมด>
 */
export function fetchCustomizationTypes<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getCustomizationTypes');
}

/**
 * ใช้สำหรับดึงข้อมูลการตั้งค่าประเภทการปรับแต่งจาก server
 * @returns Promise<ข้อมูลการตั้งค่าประเภทการปรับแต่งทั้งหมด>
 */
export function fetchCustomizationTypeSettings<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getCustomizationTypeSettings');
}

/**
 * ใช้สำหรับดึงข้อมูลวัตถุดิบในคลังจาก server
 * @returns Promise<ข้อมูลวัตถุดิบในคลังทั้งหมด>
 */
export function fetchInventory<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getInventory');
}

/**
 * ใช้สำหรับดึงข้อมูลโปรโมชั่นจาก server
 * @returns Promise<ข้อมูลโปรโมชั่นทั้งหมด>
 */
export function fetchPromotions<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getPromotions');
}

/**
 * ใช้สำหรับดึงข้อมูลเชิงวิเคราะห์จาก server
 * @param type ประเภทข้อมูลวิเคราะห์ (low-stock, popular-products, product-usage, daily-sales)
 * @param extra ข้อมูลเพิ่มเติม เช่น limit สำหรับ popular-products
 * @returns Promise<ข้อมูลเชิงวิเคราะห์>
 */
export function fetchAnalytics<T>(
  type: 'low-stock' | 'popular-products' | 'product-usage' | 'daily-sales', 
  extra?: any
): Promise<T> {
  return fetchDataViaSocket<T>('getAnalytics', { type, ...extra });
}

/**
 * ใช้สำหรับดึงข้อมูลการตั้งค่าจาก server
 * @returns Promise<ข้อมูลการตั้งค่าทั้งหมด>
 */
export function fetchSettings<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getSettings');
}

/**
 * ใช้สำหรับดึงข้อมูลการตั้งค่าแต้มสะสมจาก server
 * @returns Promise<ข้อมูลการตั้งค่าแต้มสะสมทั้งหมด>
 */
export function fetchPointSettings<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getPointSettings');
}

/**
 * ใช้สำหรับดึงข้อมูลกฎการแลกแต้มจาก server
 * @returns Promise<ข้อมูลกฎการแลกแต้มทั้งหมด>
 */
export function fetchPointRedemptionRules<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getPointRedemptionRules');
}

/**
 * ใช้สำหรับดึงข้อมูลธีมจาก server
 * @returns Promise<ข้อมูลธีม>
 */
export function fetchTheme<T>(): Promise<T> {
  return fetchDataViaSocket<T>('getTheme');
}

/**
 * ใช้สำหรับเข้าสู่ระบบผ่าน Socket.IO
 * @param username ชื่อผู้ใช้
 * @param password รหัสผ่าน
 * @returns Promise<ข้อมูลผู้ใช้>
 */
export function loginUser<T>(username: string, password: string): Promise<T> {
  // ให้ timeout สำหรับ login เป็น 40 วินาทีเพื่อรองรับกรณีเน็ตช้าหรือเซิร์ฟเวอร์มีการประมวลผลเยอะ
  return new Promise((resolve, reject) => {
    console.log("กำลังเข้าสู่ระบบด้วย Socket.IO...");
    
    // ดึง socket instance
    const socket = getSocket();
    
    // ถ้า socket ไม่ได้เชื่อมต่ออยู่ ให้เชื่อมต่อก่อน
    if (!socket.connected) {
      console.log("Socket ไม่ได้เชื่อมต่ออยู่ กำลังเชื่อมต่อก่อนเข้าสู่ระบบ...");
      socket.connect();
      
      // รอให้เชื่อมต่อสำเร็จแล้วค่อยล็อกอิน
      socket.once('connect', () => {
        console.log("เชื่อมต่อ Socket สำเร็จ กำลังเข้าสู่ระบบ...");
        tryLogin(socket, username, password, resolve, reject);
      });
      
      // ถ้าเชื่อมต่อไม่สำเร็จให้ปฏิเสธการล็อกอิน
      socket.once('connect_error', (error) => {
        console.error("เชื่อมต่อ Socket ไม่สำเร็จ:", error);
        reject(new Error(`ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${error.message}`));
      });
    } else {
      // ถ้าเชื่อมต่ออยู่แล้ว ล็อกอินได้เลย
      console.log("Socket เชื่อมต่ออยู่แล้ว กำลังส่งคำขอเข้าสู่ระบบ...");
      tryLogin(socket, username, password, resolve, reject);
    }
  });
}

/**
 * ฟังก์ชันภายในสำหรับจัดการการล็อกอิน
 */
function tryLogin<T>(
  socket: Socket, 
  username: string, 
  password: string, 
  resolve: (value: T) => void, 
  reject: (reason: any) => void
) {
  let timeoutId: NodeJS.Timeout;
  
  // ตั้ง timeout สำหรับการล็อกอิน (40 วินาที)
  timeoutId = setTimeout(() => {
    console.error("การเข้าสู่ระบบหมดเวลา");
    reject(new Error("การเข้าสู่ระบบหมดเวลา กรุณาลองใหม่อีกครั้ง"));
  }, 40000);
  
  try {
    // ส่งคำขอล็อกอินไปยัง server
    socket.emit('loginUser', { username, password }, (response: any) => {
      // ยกเลิก timeout เมื่อได้รับคำตอบ
      clearTimeout(timeoutId);
      
      if (!response) {
        console.error("ไม่ได้รับการตอบกลับจากการล็อกอิน");
        reject(new Error("ไม่ได้รับการตอบกลับจากการล็อกอิน กรุณาลองใหม่อีกครั้ง"));
        return;
      }
      
      if (response.success) {
        console.log("เข้าสู่ระบบสำเร็จ:", response.user);
        resolve(response as T);
      } else {
        console.error("เข้าสู่ระบบไม่สำเร็จ:", response.error);
        reject(new Error(response.error || "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน"));
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("เกิดข้อผิดพลาดในการส่งคำขอเข้าสู่ระบบ:", error);
    reject(new Error(`เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error}`));
  }
}

/**
 * ใช้สำหรับการส่งคำสั่งซื้อลูกค้าผ่าน Socket.IO
 * @param orderData ข้อมูลคำสั่งซื้อที่ต้องการส่ง
 * @returns Promise<ข้อมูลคำสั่งซื้อที่สร้างในระบบ>
 */
export function createCustomerOrder<T>(orderData: any): Promise<T> {
  return fetchDataViaSocket<T>('createCustomerOrder', orderData);
}

/**
 * ใช้สำหรับอัพเดตสถานะคำสั่งซื้อผ่าน Socket.IO
 * @param orderId รหัสคำสั่งซื้อ
 * @param status สถานะคำสั่งซื้อใหม่
 * @param cancelReason เหตุผลในการยกเลิก (สำหรับสถานะ cancelled เท่านั้น)
 * @returns Promise<ข้อมูลคำสั่งซื้อที่อัพเดตแล้ว>
 */
export function updateOrderStatus<T>(orderId: number, status: string, cancelReason?: string): Promise<T> {
  return fetchDataViaSocket<T>('updateOrderStatus', { orderId, status, cancelReason });
}

/**
 * ใช้สำหรับสร้างข้อมูลสินค้าผ่าน Socket.IO
 * @param productData ข้อมูลสินค้าที่ต้องการสร้าง
 * @returns Promise<ข้อมูลสินค้าที่สร้างในระบบ>
 */
export function createProduct<T>(productData: any): Promise<T> {
  return fetchDataViaSocket<T>('createProduct', productData);
}

/**
 * ใช้สำหรับอัพเดตข้อมูลสินค้าผ่าน Socket.IO
 * @param productId รหัสสินค้า
 * @param productData ข้อมูลสินค้าที่ต้องการอัพเดต
 * @returns Promise<ข้อมูลสินค้าที่อัพเดตแล้ว>
 */
export function updateProduct<T>(productId: number, productData: any): Promise<T> {
  return fetchDataViaSocket<T>('updateProduct', { productId, ...productData });
}

/**
 * ใช้สำหรับลบข้อมูลสินค้าผ่าน Socket.IO
 * @param productId รหัสสินค้า
 * @returns Promise<ผลลัพธ์การลบ>
 */
export function deleteProduct<T>(productId: number): Promise<T> {
  return fetchDataViaSocket<T>('deleteProduct', { productId });
}