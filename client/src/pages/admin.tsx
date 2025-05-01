import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/admin/Sidebar";
import { apiRequest } from "@/lib/queryClient";
import Dashboard from "@/components/admin/Dashboard";
import Settings from "@/components/admin/Settings";
import MenuManagement from "@/components/admin/MenuManagement";
import OrderManagement from "@/components/admin/OrderManagement";
import MemberManagement from "@/components/admin/MemberManagement";
import StaffManagement from "@/components/admin/StaffManagement";
import SalesReport from "@/components/admin/SalesReport";
import InventoryReport from "@/components/admin/InventoryReport";
import PromotionManagement from "@/components/admin/PromotionManagement";
import CustomizationOptionManagement from "@/components/admin/CustomizationOptionManagement";
import ProductIngredientManagement from "@/components/admin/ProductIngredientManagement";
import InventoryAnalytics from "@/components/admin/InventoryAnalytics";
import CategoryManagement from "@/components/admin/CategoryManagement";
import AdminPointSettings from "@/pages/admin-point-settings";

interface AdminProps {
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export default function Admin({ user }: AdminProps) {
  const [, setLocation] = useLocation();
  const [activePage, setActivePage] = useState<string>("dashboard");
  
  // ตรวจสอบ URL query parameters และเปลี่ยนหน้าตามที่ระบุ
  useEffect(() => {
    // ดึง URL search parameters
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    
    // ถ้ามีพารามิเตอร์ page ให้เปลี่ยนหน้าตามค่าที่ระบุ
    if (pageParam && ['dashboard', 'settings', 'menu', 'customization-options', 'orders', 
                      'members', 'staff', 'promotions', 'sales-report', 'inventory-report', 
                      'product-ingredients', 'inventory-analytics', 'point-settings'].includes(pageParam)) {
      setActivePage(pageParam);
    }
  }, []);
  
  // ตรวจสอบการล็อกอิน - ถ้าไม่มีข้อมูลผู้ใช้ จะแสดงข้อความและลิงก์ไปหน้าลูกค้า
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-[var(--coffee-primary)]">
            ต้องเข้าสู่ระบบก่อนใช้งานหน้านี้
          </h1>
          <p className="text-gray-600 mb-8">
            หน้านี้สำหรับผู้ดูแลระบบเท่านั้น กรุณาเข้าสู่ระบบเพื่อใช้งาน
          </p>
          <button
            onClick={() => setLocation("/customer")}
            className="bg-[var(--coffee-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--coffee-secondary)] transition-colors"
          >
            ไปที่หน้าลูกค้า
          </button>
        </div>
      </div>
    );
  }
  
  // ตรวจสอบสิทธิ์ - เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าถึงหน้านี้ได้
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-[var(--coffee-primary)]">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-gray-600 mb-8">
            หน้านี้สำหรับผู้ดูแลระบบเท่านั้น คุณไม่มีสิทธิ์เข้าถึงหน้านี้
          </p>
          <button
            onClick={() => setLocation("/")}
            className="bg-[var(--coffee-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--coffee-secondary)] transition-colors"
          >
            กลับไปหน้าพนักงาน
          </button>
        </div>
      </div>
    );
  }
  
  // Get store name from API
  const { data: storeName = "ร้านกาแฟ" } = useQuery<string>({
    queryKey: ['/api/settings/store_name'],
    select: (data: any) => data?.value || "ร้านกาแฟ",
  });
  
  const switchToPOS = () => {
    setLocation("/");
  };
  
  // Define pages here with error handling
  const renderPage = () => {
    try {
      switch (activePage) {
        case "dashboard":
          return <Dashboard />;
        case "settings":
          return <Settings />;
        case "menu":
          return <MenuManagement />;
        case "customization-options":
          return <CustomizationOptionManagement />;
        case "orders":
          return <OrderManagement />;
        case "members":
          return <MemberManagement />;
        case "point-settings":
          return <AdminPointSettings />;
        case "staff":
          return <StaffManagement />;
        case "promotions":
          return <PromotionManagement />;
        case "sales-report":
          return <SalesReport />;
        case "inventory-report":
          return <InventoryReport />;
        case "product-ingredients":
          return <ProductIngredientManagement />;
        case "inventory-analytics":
          return <InventoryAnalytics />;
        default:
          return <Dashboard />;
      }
    } catch (error) {
      console.error(`Error rendering page ${activePage}:`, error);
      return (
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-red-600">เกิดข้อผิดพลาดในการแสดงหน้า {activePage}</h2>
          <p className="mb-4">กรุณาลองรีเฟรชหน้าเว็บหรือติดต่อผู้ดูแลระบบ</p>
          <button 
            onClick={() => setActivePage("dashboard")}
            className="bg-[var(--coffee-primary)] text-white px-4 py-2 rounded"
          >
            กลับไปหน้าแดชบอร์ด
          </button>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Admin Header */}
      <header className="bg-[var(--coffee-primary)] text-white py-3 px-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <h1 className="text-2xl font-display font-bold tracking-wide">{storeName}</h1>
          <span className="ml-4 bg-[var(--coffee-accent)] text-[var(--coffee-dark)] px-3 py-1 rounded-full text-sm font-medium">ระบบหลังบ้าน</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="opacity-75">{user.role === 'admin' ? 'ผู้จัดการ' : 'พนักงาน'}:</span> {user.name}
          </div>
          <button 
            onClick={switchToPOS}
            className="bg-[var(--coffee-dark)] px-3 py-2 rounded text-sm hover:bg-opacity-80 transition-colors"
          >
            หน้าร้าน
          </button>
        </div>
      </header>
      
      {/* Admin Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
        
        {/* Main Content */}
        <div className="w-5/6 bg-[var(--coffee-light)] overflow-y-auto">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
