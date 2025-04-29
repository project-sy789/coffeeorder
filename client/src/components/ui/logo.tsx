import React, { useState, useEffect } from 'react';
import { CoffeeIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// ใช้ฟังก์ชันเพื่อตรวจสอบว่า URL รูปภาพสามารถเข้าถึงได้หรือไม่
const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [logoExists, setLogoExists] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  useEffect(() => {
    const checkLogoFile = async () => {
      setIsLoading(true);
      
      // ตรวจสอบว่ามีไฟล์ logo.png หรือไม่
      const exists = await checkImageExists('/logo.png');
      setLogoExists(exists);
      
      // ถ้าไม่มีไฟล์โลโก้ ไม่ต้องแสดงรูป
      if (!exists) {
        setLogoUrl('');
      }
      
      setIsLoading(false);
    };
    
    checkLogoFile();
  }, []);

  if (isLoading) {
    return <div className={`relative ${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-100 animate-pulse rounded-md`} />;
  }

  if (!logoExists) {
    return (
      <div className={`relative ${sizeClasses[size]} ${className} flex items-center justify-center bg-primary/10 rounded-md`}>
        <CoffeeIcon className="w-2/3 h-2/3 text-primary" />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img 
        src={logoUrl}
        alt="โลโก้ร้าน" 
        className="w-full h-full object-contain"
        onError={() => {
          setLogoExists(false); // ถ้าโหลดรูปไม่สำเร็จ ให้แสดงไอคอนแทน
        }}
      />
    </div>
  );
}

export function LogoWithText({ size = 'md', className = '' }: LogoProps) {
  const [storeName, setStoreName] = useState<string>('คาเฟ่ของฉัน');
  
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
  };
  
  useEffect(() => {
    // ดึงชื่อร้านจาก API
    const fetchStoreName = async () => {
      try {
        const response = await apiRequest('GET', '/api/settings/store_name');
        if (response.data?.value) {
          setStoreName(response.data.value);
        }
      } catch (error) {
        console.log('Error fetching store name, using default');
      }
    };
    
    fetchStoreName();
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <div className={`font-bold ${sizeClasses[size] === 'h-8' ? 'text-lg' : 'text-2xl'} text-primary`}>
        {storeName}
      </div>
    </div>
  );
}