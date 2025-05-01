import { useState, useEffect, useRef } from 'react';
import { fetchDataViaSocket } from '@/lib/socket';

/**
 * Custom hook สำหรับดึงข้อมูลผ่าน Socket.IO แทน REST API
 * ทำงานคล้ายกับ useQuery จาก TanStack Query แต่ใช้ Socket.IO แทน
 * 
 * @param eventName ชื่อ event ที่จะส่งไปยัง Socket.IO server
 * @param payload ข้อมูลเพิ่มเติมที่จะส่งไปพร้อมกับ event (ถ้ามี)
 * @param options ตัวเลือกเพิ่มเติม เช่น refetchInterval, enabled
 * @returns ข้อมูลและสถานะของการ query
 */
export function useSocketQuery<TData = any>(
  eventName: string,
  payload?: any,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchData = async () => {
    if (options?.enabled === false) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // แสดงข้อมูลการเรียกใช้งานเพื่อการ debug
      console.log(`Fetching data via socket for ${eventName}...`);
      
      // จำนวนครั้งในการลองใหม่
      const MAX_RETRIES = 3;
      let retries = 0;
      let lastError: any = null;
      
      // ลองดึงข้อมูลหลายครั้งถ้าล้มเหลว
      while (retries < MAX_RETRIES) {
        try {
          const result = await fetchDataViaSocket<TData>(eventName, payload);
          setData(result);
          setIsSuccess(true);
          if (options?.onSuccess) {
            options.onSuccess(result);
          }
          return; // ออกจากฟังก์ชันถ้าดึงข้อมูลสำเร็จ
        } catch (error) {
          lastError = error;
          console.warn(`Retry ${retries + 1}/${MAX_RETRIES} failed for ${eventName}:`, error);
          retries++;
          
          // หากยังไม่ถึงจำนวนครั้งสูงสุด ให้รอ 1 วินาทีก่อนลองใหม่
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // ถ้าลองทุกครั้งแล้วยังไม่สำเร็จ
      throw lastError;
    } catch (err) {
      console.error(`Error in useSocketQuery(${eventName}) after retries:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      if (options?.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // ฟังก์ชันสำหรับ refetch ข้อมูลด้วยตัวเอง
  const refetch = () => {
    fetchData();
  };
  
  useEffect(() => {
    // ดึงข้อมูลครั้งแรกเมื่อ component ถูกโหลด
    fetchData();
    
    // ตั้งค่า interval refetch ถ้ากำหนด
    if (options?.refetchInterval) {
      intervalRef.current = setInterval(fetchData, options.refetchInterval);
    }
    
    // ทำความสะอาดเมื่อ component ถูก unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [eventName, JSON.stringify(payload), options?.enabled, options?.refetchInterval]);
  
  return {
    data,
    isLoading,
    error,
    isSuccess,
    refetch
  };
}

/**
 * ใช้สำหรับดึงข้อมูลจาก Socket.IO server แบบ lazy (เมื่อ function ถูกเรียกใช้งานเท่านั้น)
 * ทำงานคล้ายกับ useMutation จาก TanStack Query แต่ใช้ Socket.IO แทน
 * 
 * @param eventName ชื่อ event ที่จะส่งไปยัง Socket.IO server
 * @param options ตัวเลือกเพิ่มเติม เช่น onSuccess, onError
 * @returns ฟังก์ชันสำหรับส่งข้อมูลและสถานะของการ mutation
 */
export function useSocketMutation<TData = any, TVariables = any>(
  eventName: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  }
) {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  
  const mutate = async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      // แสดงข้อมูลการเรียกใช้งานเพื่อการ debug
      console.log(`Running socket mutation for ${eventName}...`);
      
      // จำนวนครั้งในการลองใหม่
      const MAX_RETRIES = 3;
      let retries = 0;
      let lastError: any = null;
      
      // ลองดำเนินการหลายครั้งถ้าล้มเหลว
      while (retries < MAX_RETRIES) {
        try {
          const result = await fetchDataViaSocket<TData>(eventName, variables);
          setData(result);
          setIsSuccess(true);
          if (options?.onSuccess) {
            options.onSuccess(result);
          }
          return result; // ออกจากฟังก์ชันถ้าดำเนินการสำเร็จ
        } catch (error) {
          lastError = error;
          console.warn(`Retry ${retries + 1}/${MAX_RETRIES} failed for mutation ${eventName}:`, error);
          retries++;
          
          // หากยังไม่ถึงจำนวนครั้งสูงสุด ให้รอ 1 วินาทีก่อนลองใหม่
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // ถ้าลองทุกครั้งแล้วยังไม่สำเร็จ
      throw lastError;
    } catch (err) {
      console.error(`Error in useSocketMutation(${eventName}) after retries:`, err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      if (options?.onError) {
        options.onError(errorObj);
      }
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };
  
  const reset = () => {
    setData(undefined);
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
  };
  
  return {
    mutate,
    reset,
    data,
    isLoading,
    error,
    isSuccess
  };
}

/**
 * สำหรับสร้าง hooks ที่เตรียมไว้ใช้งานเฉพาะกับข้อมูลแต่ละประเภท
 */

export function useSocketProducts<TData = any>() {
  return useSocketQuery<TData>('getProducts');
}

export function useSocketCategories<TData = any>() {
  return useSocketQuery<TData>('getCategories');
}

export function useSocketOrders<TData = any>() {
  return useSocketQuery<TData>('getOrders');
}

export function useSocketOrdersByDateRange<TData = any>(startDate: Date, endDate: Date) {
  return useSocketQuery<TData>('getOrdersByDateRange', { startDate, endDate });
}

export function useSocketOrderDetails<TData = any>(orderId: number, enabled: boolean = true) {
  console.log('useSocketOrderDetails called with orderId:', orderId, 'enabled:', enabled);
  // ถ้า orderId = 0 หรือ undefined หรือ null ให้ return ค่าว่าง
  if (!orderId) {
    return {
      data: undefined as TData | undefined,
      isLoading: false,
      error: null,
      isSuccess: false,
      refetch: () => Promise.resolve(undefined as TData | undefined)
    };
  }
  return useSocketQuery<TData>('getOrderDetails', { orderId }, { enabled });
}

export function useSocketUsers<TData = any>() {
  return useSocketQuery<TData>('getUsers');
}

export function useSocketMembers<TData = any>() {
  return useSocketQuery<TData>('getMembers');
}

export function useSocketCustomizationOptions<TData = any>() {
  return useSocketQuery<TData>('getCustomizationOptions');
}

export function useSocketCustomizationTypes<TData = any>() {
  return useSocketQuery<TData>('getCustomizationTypes');
}

export function useSocketCustomizationTypeSettings<TData = any>() {
  return useSocketQuery<TData>('getCustomizationTypeSettings');
}

export function useSocketInventory<TData = any>() {
  return useSocketQuery<TData>('getInventory');
}

export function useSocketPromotions<TData = any>() {
  return useSocketQuery<TData>('getPromotions');
}

export function useSocketPointSettings<TData = any>() {
  return useSocketQuery<TData>('getPointSettings');
}

export function useSocketPointRedemptionRules<TData = any>() {
  return useSocketQuery<TData>('getPointRedemptionRules');
}

export function useSocketSettings<TData = any>() {
  return useSocketQuery<TData>('getSettings');
}

export function useSocketSettingValue<TData = any>(key: string) {
  return useSocketQuery<TData>('getSettingValue', { key });
}

export function useSocketSetting<TData = any>(key: string) {
  return useSocketQuery<TData>('getSetting', { key });
}

export function useSocketAnalytics<TData = any>(
  type: 'low-stock' | 'popular-products' | 'product-usage' | 'daily-sales',
  extra?: any
) {
  return useSocketQuery<TData>('getAnalytics', { type, ...extra });
}

export function useSocketTheme<TData = any>() {
  return useSocketQuery<TData>('getTheme', {}, { refetchInterval: 5000 });
}