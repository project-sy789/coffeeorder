import { 
  LayoutDashboard, 
  ShoppingCart, 
  Coffee, 
  Package2, 
  Users, 
  User, 
  Tag, 
  BarChart, 
  PackageOpen, 
  Settings, 
  LogOut,
  CirclePlus,
  Gauge,
  Layers,
  LineChart,
  ListChecks,
  ClipboardList,
  BadgePercent,
  Link,
  Award
} from 'lucide-react';
import { useSocketQuery } from "@/hooks/useSocketQuery";

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ activePage, onPageChange }: SidebarProps) {
  // ใช้ Socket.IO ในการดึงข้อมูลชื่อร้านค้า
  const { data: storeSetting } = useSocketQuery<{ key: string, value: string, description: string, id: number }>(
    'getSetting',
    { key: 'store_name' }
  );
  
  // กำหนดค่าชื่อร้านค้าจากข้อมูลที่ได้รับ หรือใช้ค่าเริ่มต้นถ้าไม่มีข้อมูล
  const storeName = storeSetting?.value || "ร้านกาแฟ";
  
  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', group: 'main', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
    { id: 'orders', label: 'รายการสั่งซื้อ', group: 'main', icon: <ClipboardList className="w-4 h-4 mr-2" /> },
    { id: 'menu', label: 'จัดการเมนู', group: 'management', icon: <Coffee className="w-4 h-4 mr-2" /> },
    { id: 'customization-options', label: 'ตัวเลือกเพิ่มเติม', group: 'management', icon: <CirclePlus className="w-4 h-4 mr-2" /> },
    { id: 'product-ingredients', label: 'การใช้วัตถุดิบ', group: 'management', icon: <Layers className="w-4 h-4 mr-2" /> },
    { id: 'members', label: 'สมาชิก', group: 'management', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'point-settings', label: 'ระบบแต้มสะสม', group: 'management', icon: <Award className="w-4 h-4 mr-2" /> },
    { id: 'staff', label: 'พนักงาน', group: 'management', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'promotions', label: 'โปรโมชั่น', group: 'management', icon: <BadgePercent className="w-4 h-4 mr-2" /> },
    { id: 'sales-report', label: 'รายงานการขาย', group: 'reports', icon: <LineChart className="w-4 h-4 mr-2" /> },
    { id: 'inventory-report', label: 'รายงานสินค้า', group: 'reports', icon: <ListChecks className="w-4 h-4 mr-2" /> },
    { id: 'inventory-analytics', label: 'วิเคราะห์วัตถุดิบ', group: 'reports', icon: <Gauge className="w-4 h-4 mr-2" /> },
    { id: 'settings', label: 'ตั้งค่าร้าน', group: 'settings', icon: <Settings className="w-4 h-4 mr-2" /> },
    { id: 'logout', label: 'ออกจากระบบ', group: 'settings', icon: <LogOut className="w-4 h-4 mr-2" /> }
  ];

  return (
    <div className="w-1/6 bg-[var(--coffee-dark)] text-white h-full">
      <div className="sticky top-0 bg-[var(--coffee-dark)] z-10 px-4 py-4 text-center shadow-md">
        <div className="text-lg font-bold mb-1">{storeName}</div>
        <div className="text-xs opacity-70">ระบบจัดการร้าน</div>
      </div>
      
      <nav className="py-4 h-[calc(100vh-80px)] overflow-y-auto">
        <div className="px-4 pb-2 text-xs text-gray-400 uppercase">หน้าหลัก</div>
        {menuItems
          .filter(item => item.group === 'main')
          .map(item => (
            <a
              key={item.id}
              href="#"
              className={`block px-4 py-2 ${
                activePage === item.id
                  ? 'bg-[var(--coffee-primary)]'
                  : 'hover:bg-[var(--coffee-primary)]/30 transition-colors'
              }`}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.id);
              }}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
            </a>
          ))}
        
        <div className="px-4 pb-2 pt-4 text-xs text-gray-400 uppercase">จัดการร้าน</div>
        {menuItems
          .filter(item => item.group === 'management')
          .map(item => (
            <a
              key={item.id}
              href="#"
              className={`block px-4 py-2 ${
                activePage === item.id
                  ? 'bg-[var(--coffee-primary)]'
                  : 'hover:bg-[var(--coffee-primary)]/30 transition-colors'
              }`}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.id);
              }}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
            </a>
          ))}
        
        <div className="px-4 pb-2 pt-4 text-xs text-gray-400 uppercase">รายงาน</div>
        {menuItems
          .filter(item => item.group === 'reports')
          .map(item => (
            <a
              key={item.id}
              href="#"
              className={`block px-4 py-2 ${
                activePage === item.id
                  ? 'bg-[var(--coffee-primary)]'
                  : 'hover:bg-[var(--coffee-primary)]/30 transition-colors'
              }`}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.id);
              }}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
            </a>
          ))}
        
        <div className="px-4 pb-2 pt-4 text-xs text-gray-400 uppercase">ตั้งค่า</div>
        {menuItems
          .filter(item => item.group === 'settings')
          .map(item => (
            <a
              key={item.id}
              href="#"
              className={`block px-4 py-2 ${
                activePage === item.id
                  ? 'bg-[var(--coffee-primary)]'
                  : 'hover:bg-[var(--coffee-primary)]/30 transition-colors'
              }`}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(item.id);
              }}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
            </a>
          ))}
      </nav>
    </div>
  );
}