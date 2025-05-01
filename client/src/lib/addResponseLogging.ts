/**
 * เพิ่มการตรวจจับและตรวจสอบ response จาก server
 * ไฟล์นี้ใช้สำหรับบันทึกข้อมูล response ที่ได้รับจาก server
 * เพื่อช่วยในการตรวจสอบและแก้ไขปัญหาที่เกิดขึ้น
 */

// สร้างฟังก์ชันสำหรับแก้ไขปัญหา JSON parsing
function safeParseJSON(text: string) {
  if (!text || !text.trim()) {
    return null;
  }
  
  try {
    // ทำความสะอาดข้อมูลก่อนแปลงเป็น JSON
    // บางครั้ง response อาจมีอักขระที่ไม่ถูกต้องทำให้ parsing ไม่ได้
    const cleanText = text
      .replace(/\\n/g, '\\n')
      .replace(/\\'/g, "\\'")
      .replace(/\\"/g, '\\"')
      .replace(/\\&/g, '\\&')
      .replace(/\\r/g, '\\r')
      .replace(/\\t/g, '\\t')
      .replace(/\\b/g, '\\b')
      .replace(/\\f/g, '\\f')
      .replace(/[\u0000-\u0019]+/g, ''); // ลบอักขระควบคุมที่อาจทำให้เกิดปัญหา
      
    return JSON.parse(cleanText);
  } catch (e) {
    return null;
  }
}

/**
 * สร้าง interceptor สำหรับ fetch API
 * นี่คือวิธีการ monkey patch ฟังก์ชัน fetch เพื่อดักจับ requests และ responses
 */
export function setupFetchInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [resource, config] = args;
    const url = (typeof resource === 'string') ? resource : resource.url;
    
    // รายการของ API endpoints ที่ควรใช้ Socket.IO แทน REST API
    const socketIOEndpoints = [
      { pattern: '/api/theme', event: 'getTheme', payloadFn: () => ({}) },
      { pattern: '/api/products', event: 'getProducts', payloadFn: () => ({}) },
      { pattern: '/api/categories', event: 'getCategories', payloadFn: () => ({}) },
      { pattern: '/api/orders', event: 'getOrders', payloadFn: () => ({}) },
      { pattern: '/api/users', event: 'getUsers', payloadFn: () => ({}) },
      { pattern: '/api/members', event: 'getMembers', payloadFn: () => ({}) },
      { pattern: '/api/customization-options', event: 'getCustomizationOptions', payloadFn: () => ({}) },
      { pattern: '/api/customization-types', event: 'getCustomizationTypes', payloadFn: () => ({}) },
      { pattern: '/api/customization-type-settings', event: 'getCustomizationTypeSettings', payloadFn: () => ({}) },
      { pattern: '/api/inventory', event: 'getInventory', payloadFn: () => ({}) },
      { pattern: '/api/promotions', event: 'getPromotions', payloadFn: () => ({}) },
      { pattern: '/api/point-settings', event: 'getPointSettings', payloadFn: () => ({}) },
      { pattern: '/api/point-redemption-rules', event: 'getPointRedemptionRules', payloadFn: () => ({}) }
    ];

    // ตรวจสอบว่า URL ตรงกับ endpoint ที่ควรใช้ Socket.IO หรือไม่
    const matchedEndpoint = socketIOEndpoints.find(endpoint => url.includes(endpoint.pattern));

    if (matchedEndpoint) {
      console.warn(`[Fetch Interceptor] Deprecated ${matchedEndpoint.pattern} API call detected! This should be using Socket.IO instead`);
      console.warn('[Fetch Interceptor] Stack trace:', new Error().stack);
      
      // สร้าง mock response แทนที่จะเรียก API จริง
      let mockData = null;
      
      // ถ้าเป็น endpoint ที่คาดว่าจะส่งคืนเป็น array ให้ใช้ empty array แทน
      if (matchedEndpoint.pattern.includes('/api/products') || 
          matchedEndpoint.pattern.includes('/api/categories') || 
          matchedEndpoint.pattern.includes('/api/customization-options') || 
          matchedEndpoint.pattern.includes('/api/users') || 
          matchedEndpoint.pattern.includes('/api/members') || 
          matchedEndpoint.pattern.includes('/api/inventory')) {
        mockData = [];
      }
      
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      // ไม่ดำเนินการเรียก API แล้วส่ง mock response กลับไปแทน
      console.log(`[Fetch Interceptor] Returning mock response for ${matchedEndpoint.pattern} instead of calling REST API`);
      
      // ดึงข้อมูลผ่าน Socket.IO แทน
      try {
        // Dynamic import เพื่อหลีกเลี่ยง circular dependency
        import('./socket').then(({ getSocket }) => {
          const socket = getSocket();
          const payload = matchedEndpoint.payloadFn();
          socket.emit(matchedEndpoint.event, payload, (response: any) => {
            console.log(`[Socket.IO] Fetched data from ${matchedEndpoint.event}:`, response?.data);
          });
        });
      } catch (socketError) {
        console.error(`[Socket.IO] Error fetching from ${matchedEndpoint.event}:`, socketError);
      }
      
      return mockResponse;
    }
    
    // ขั้นตอนก่อนส่ง request
    console.log(`[Fetch Interceptor] Request: ${config?.method || 'GET'} ${url}`);
    
    try {
      // ส่ง request ตามปกติ
      const response = await originalFetch.apply(this, args);
      
      // สร้าง clone ของ response เพื่อใช้ในการบันทึกข้อมูล
      const clonedResponse = response.clone();
      
      // บันทึกข้อมูล response
      try {
        console.log(`[Fetch Interceptor] Response: ${config?.method || 'GET'} ${url} - Status: ${response.status}`);
        
        // ตรวจสอบว่า response มี content-type เป็น application/json หรือไม่
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // ลองแปลงข้อมูลเป็น JSON แต่ไม่แสดงข้อมูลทั้งหมดเพื่อป้องกันการแสดงข้อมูลส่วนตัว
          clonedResponse.text().then(text => {
            try {
              const data = safeParseJSON(text);
              if (data !== null) {
                // แสดงโครงสร้างข้อมูลแต่ไม่แสดงข้อมูลที่มีขนาดใหญ่
                const preview = Array.isArray(data) 
                  ? `Array with ${data.length} items` 
                  : (typeof data === 'object' && data !== null)
                    ? Object.keys(data).join(', ')
                    : typeof data;
                console.log(`[Fetch Interceptor] JSON Response Structure: ${preview}`);
              } else {
                console.log(`[Fetch Interceptor] Empty JSON response or invalid format`);
                
                // กรณีเป็น API ที่ควรคืนค่าเป็น array แต่ไม่สามารถแปลงได้
                if (url.includes('/api/products') || 
                    url.includes('/api/categories') ||
                    url.includes('/api/customization-options') ||
                    url.includes('/api/users') ||
                    url.includes('/api/members') ||
                    url.includes('/api/inventory')) {
                  console.warn(`[Fetch Interceptor] Expected array response from ${url}, got invalid JSON`);
                }
              }
            } catch (jsonError) {
              console.warn(`[Fetch Interceptor] JSON parsing error: ${jsonError.message}`, {
                url,
                responseText: text.length > 100 ? text.substring(0, 100) + '...' : text
              });
            }
          }).catch(textError => {
            console.warn(`[Fetch Interceptor] Error reading response text: ${textError.message}`);
          });
        }
      } catch (loggingError) {
        console.warn(`[Fetch Interceptor] Error logging response: ${loggingError.message}`);
      }
      
      return response;
    } catch (error) {
      console.error(`[Fetch Interceptor] Request failed: ${error.message}`, {
        url,
        error
      });
      throw error;
    }
  };
  
  console.log('[Fetch Interceptor] Initialized');
}

/**
 * เพิ่มการตรวจจับและบันทึก DOMExceptions เพื่อให้ง่ายต่อการแก้ไขปัญหา
 */
export function setupDOMExceptionHandler() {
  const originalAddEventListener = window.addEventListener;
  
  window.addEventListener = function(type, listener, options) {
    if (type === 'error' || type === 'unhandledrejection') {
      const wrappedListener = function(event) {
        // บันทึกข้อมูลเพิ่มเติมสำหรับ DOMException
        if (event.reason instanceof DOMException || 
            (event.error && event.error instanceof DOMException)) {
          const error = event.reason || event.error;
          console.error(`[DOM Exception Handler] ${error.name}: ${error.message}`, {
            code: error.code,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
        }
        // เรียกใช้งาน listener ตามปกติ
        return listener.apply(this, arguments);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.apply(this, arguments);
  };
  
  console.log('[DOM Exception Handler] Initialized');
}

/**
 * ตั้งค่าการตรวจจับและบันทึกข้อมูล response
 * เรียกใช้ฟังก์ชันนี้ในไฟล์ main.tsx หรือ index.tsx เพื่อให้ทำงานเมื่อเริ่มต้นแอพพลิเคชัน
 */
export function setupResponseLogging() {
  setupFetchInterceptor();
  setupDOMExceptionHandler();
}