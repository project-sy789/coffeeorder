import { QueryClient, QueryFunction } from "@tanstack/react-query";

// กำหนดพอร์ตเซิร์ฟเวอร์ที่ถูกต้อง - สำหรับทั้ง Development และ Production
// รองรับการ Deploy บน Render.com และ Railway
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : ''; // ในโหมด Production เราใช้ URL เดียวกัน จึงไม่จำเป็นต้องระบุ Base URL

// หมายเหตุ: การทำงานแบบนี้รองรับทั้ง Render.com และ Railway
// ระบบจะส่ง request ไปที่โดเมนเดียวกันกับที่เซิร์ฟไฟล์ Frontend

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText: string;
    try {
      const errorJson = await res.clone().json();
      errorText = errorJson.error || errorJson.message || res.statusText;
    } catch {
      errorText = (await res.text()) || res.statusText;
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
    
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Try to parse the response as JSON if the content type is application/json
  let responseData: T | undefined = undefined;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await res.clone().json();
    } catch (e) {
      // Ignore JSON parsing errors
    }
  }
  
  return { data: responseData, response: res };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // เพิ่ม base URL ถ้าเป็น API path
    const fullUrl = url.startsWith('/api') 
      ? `${API_BASE_URL}${url}`
      : url;
      
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
