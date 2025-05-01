import { QueryClient, QueryFunction } from "@tanstack/react-query";

// กำหนดพอร์ตเซิร์ฟเวอร์ที่ถูกต้อง - สำหรับทั้ง Development และ Production
// รองรับการ Deploy บน Render.com และ Railway
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : window.location.origin; // ใช้ origin เดียวกับ URL ที่เปิดใช้งานแอพ

// หมายเหตุ: การทำงานแบบนี้รองรับทั้ง Render.com และ Railway
// ระบบจะส่ง request ไปที่โดเมนเดียวกันกับที่เซิร์ฟไฟล์ Frontend
console.log('API Base URL:', API_BASE_URL);

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText: string;
    try {
      // ใช้ .text() แทน .json() เพื่อหลีกเลี่ยง JSON parsing errors
      const responseText = await res.clone().text();
      let errorJson;
      try {
        // ลองแปลงเป็น JSON ถ้าเป็นไปได้
        errorJson = JSON.parse(responseText);
        errorText = errorJson.error || errorJson.message || res.statusText;
      } catch (jsonError) {
        // ถ้าไม่ใช่ JSON ให้ใช้ response text ตามปกติ
        errorText = responseText || res.statusText;
      }
    } catch {
      errorText = res.statusText;
    }
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<{ data?: T, response: Response }> {
  // เพิ่ม base URL ถ้าเป็น API path
  const fullUrl = url.startsWith('/api') 
    ? `${API_BASE_URL}${url}`
    : url;
  
  console.log(`API Request: ${method} ${fullUrl}`);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data 
        ? { "Content-Type": "application/json", "Accept": "application/json" } 
        : { "Accept": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Log response status
    console.log(`API Response: ${method} ${fullUrl} - Status: ${res.status}`);

    await throwIfResNotOk(res);
    
    // Try to parse the response as JSON if the content type is application/json
    let responseData: T | undefined = undefined;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await res.clone().json();
        console.log(`API Data from ${method} ${url}:`, responseData);
      } catch (e) {
        console.error(`JSON parsing error for ${method} ${url}:`, e);
      }
    }
    
    return { data: responseData, response: res };
  } catch (error) {
    console.error(`API Request Error for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // ตรวจสอบว่าเป็น API ที่ควรใช้ Socket.IO หรือไม่
    if (url === '/api/theme') {
      console.log(`Query fetch: ${url} - Using Socket.IO instead of REST API`);
      
      try {
        // ใช้ Socket.IO แทน REST API โดย dynamic import
        const { fetchTheme } = await import('./socket');
        return await fetchTheme<T>();
      } catch (socketError) {
        console.error(`Socket.IO Error for ${url}:`, socketError);
        // กรณีที่ Socket.IO ไม่สามารถใช้งานได้ ส่งค่าเริ่มต้นกลับไป
        return null as unknown as T;
      }
    }
    
    // เพิ่ม base URL ถ้าเป็น API path
    const fullUrl = url.startsWith('/api') 
      ? `${API_BASE_URL}${url}`
      : url;
    
    console.log(`Query fetch: ${url}`);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      
      console.log(`Query result for ${url}: status ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${url}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      
      // รูปแบบที่ปลอดภัยในการอ่านข้อมูล response ซึ่งอาจมีปัญหากับ JSON parsing
      const text = await res.text();
      
      // ทำความสะอาดข้อมูลที่ได้รับมาก่อนแปลงเป็น JSON
      const cleanupText = (rawText: string) => {
        if (!rawText || !rawText.trim()) return '';
        
        return rawText
          .replace(/\\n/g, '\\n')
          .replace(/\\'/g, "\\'")
          .replace(/\\"/g, '\\"')
          .replace(/\\&/g, '\\&')
          .replace(/\\r/g, '\\r')
          .replace(/\\t/g, '\\t')
          .replace(/\\b/g, '\\b')
          .replace(/\\f/g, '\\f')
          .replace(/[\u0000-\u0019]+/g, ''); // ลบอักขระควบคุมที่อาจทำให้เกิดปัญหา
      };
      
      // ลองแปลงเป็น JSON หากข้อมูลมีรูปแบบที่ถูกต้อง
      try {
        // ตรวจสอบว่าข้อมูลที่ได้รับมามีรูปแบบ JSON ที่ถูกต้องหรือไม่
        if (text.trim()) {
          try {
            // ลองใช้ JSON.parse ตามปกติก่อน
            const data = JSON.parse(text);
            console.log(`Data fetched from ${url}:`, data);
            return data;
          } catch (initialError) {
            // ถ้าการ parse แบบปกติไม่สำเร็จ ลองทำความสะอาดข้อมูลก่อน
            console.warn(`Initial JSON parsing failed for ${url}, trying with cleaned text`);
            const cleanedText = cleanupText(text);
            
            if (cleanedText) {
              try {
                const data = JSON.parse(cleanedText);
                console.log(`Data fetched from ${url} after cleanup:`, data);
                return data;
              } catch (secondError) {
                throw secondError; // โยนข้อผิดพลาดออกไปเพื่อจัดการในส่วน catch ด้านล่าง
              }
            } else {
              throw new Error('Empty text after cleanup');
            }
          }
        } else {
          console.warn(`Empty response from ${url}`);
          // สำหรับ endpoints ที่คาดว่าจะมีการส่งคืนเป็น array
          if (url.includes('/api/customization-options') || 
              url.includes('/api/products') || 
              url.includes('/api/categories') || 
              url.includes('/api/promotions') ||
              url.includes('/api/inventory') ||
              url.includes('/api/users') ||
              url.includes('/api/members') ||
              url.includes('/api/customization-types') ||
              url.includes('/api/customization-type-settings') ||
              url.includes('/api/customization-types/display-names') ||
              url.includes('/api/orders') ||
              url.includes('/api/point-settings') ||
              url.includes('/api/point-redemption-rules')) {
            return [];
          }
          return null;
        }
      } catch (jsonError) {
        console.error(`Error parsing JSON from ${url}:`, jsonError);
        // สำหรับ endpoints ที่คาดว่าจะมีการส่งคืนเป็น array
        if (url.includes('/api/customization-options') || 
            url.includes('/api/products') || 
            url.includes('/api/categories') || 
            url.includes('/api/promotions') ||
            url.includes('/api/inventory') ||
            url.includes('/api/users') ||
            url.includes('/api/members') ||
            url.includes('/api/customization-types') ||
            url.includes('/api/customization-type-settings') ||
            url.includes('/api/customization-types/display-names') ||
            url.includes('/api/orders') ||
            url.includes('/api/point-settings') ||
            url.includes('/api/point-redemption-rules')) {
          console.warn(`Returning empty array for ${url} due to JSON parsing error`);
          return [];
        }
        return null;
      }
    } catch (error) {
      console.error(`Error in query fetch from ${url}:`, error);
      
      // เพิ่มการจัดการกับ DOMException โดยเฉพาะ
      if (error instanceof DOMException) {
        console.warn(`DOMException occurred when fetching ${url}: ${error.name} - ${error.message}`);
        
        // สำหรับ endpoints ที่คาดว่าจะมีการส่งคืนเป็น array
        if (url.includes('/api/users') || 
            url.includes('/api/members') || 
            url.includes('/api/products') || 
            url.includes('/api/categories') ||
            url.includes('/api/promotions') ||
            url.includes('/api/inventory') ||
            url.includes('/api/customization-options') ||
            url.includes('/api/customization-types') ||
            url.includes('/api/orders') ||
            url.includes('/api/point-settings') ||
            url.includes('/api/point-redemption-rules')) {
          return []; // ส่งอาร์เรย์ว่างเพื่อให้การแสดงผลยังทำงานได้
        }
        
        // กรณีอื่นๆ
        return null;
      }
      
      throw error;
    }
  };

// เพิ่มฟังก์ชันสำหรับแก้ไขปัญหา JSON parsing บน client
function ensureValidResponse(url: string, data: unknown): unknown {
  // สำหรับ endpoints ที่คาดว่าจะส่งคืนเป็น array แต่เกิด error
  if (data === null || data === undefined) {
    if (url.includes('/api/users') || 
        url.includes('/api/members') || 
        url.includes('/api/products') || 
        url.includes('/api/categories') ||
        url.includes('/api/promotions') ||
        url.includes('/api/inventory') ||
        url.includes('/api/customization-options') ||
        url.includes('/api/customization-types') ||
        url.includes('/api/customization-type-settings') ||
        url.includes('/api/customization-types/display-names') ||
        url.includes('/api/orders') ||
        url.includes('/api/point-settings') ||
        url.includes('/api/point-redemption-rules')) {
      console.warn(`Replacing null/undefined response with empty array for ${url}`);
      return [];
    }
    
    // ในกรณีที่เป็น settings
    if (url.includes('/api/settings/')) {
      console.warn(`Replacing null/undefined settings with empty object for ${url}`);
      return {};
    }
  }
  
  return data;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // ปิด auto refetch ทุก ๆ ช่วงเวลา
      refetchOnWindowFocus: true, // เปิดการ refetch เมื่อกลับมาที่แท็บ
      staleTime: 60000, // ลดเวลาที่ข้อมูลยังคงที่ลงเหลือ 1 นาที (จากเดิม Infinity)
      retry: 3, // เพิ่มการพยายามอีกครั้งเป็น 3 ครั้งเพื่อรองรับการทำงานของ socket.io
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // เพิ่ม transformResponse เพื่อตรวจสอบข้อมูลก่อนส่งต่อไปยัง components
      select: (data: unknown, query) => ensureValidResponse(query.queryKey[0] as string, data),
      // เพิ่มการตรวจสอบ cache และรองรับ socket.io
      refetchOnMount: true, // บังคับให้ดึงข้อมูลใหม่เมื่อ component ถูกโหลด
    },
    mutations: {
      retry: 2, // เพิ่มการพยายามอีกครั้งสำหรับ mutation เป็น 2 ครั้ง
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    },
  },
});
