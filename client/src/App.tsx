import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import POS from "@/pages/pos";
import Admin from "@/pages/admin";
import Customer from "@/pages/customer";
import Login from "@/pages/login";
import Checkout from "@/pages/checkout";
import CustomPayment from "@/pages/custom-payment";
import PaymentSuccess from "@/pages/payment-success";
import AdminPointSettings from "@/pages/admin-point-settings";
import ThemeProvider from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { getSocket, registerRole, disconnectSocket, fetchDataViaSocket } from "./lib/socket";
import { useSocketTheme } from "@/hooks/useSocketQuery";

function Router() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [location, setLocation] = useLocation();
  const [storeName, setStoreName] = useState<string>('คาเฟ่ของฉัน');
  
  // ใช้ Socket.IO เพื่อดึงข้อมูลชื่อร้าน
  useEffect(() => {
    const socket = getSocket();
    
    // ดึงข้อมูลการตั้งค่าร้านผ่าน Socket.IO
    socket.emit('getSetting', { key: 'store_name' }, (response: any) => {
      if (response?.success && response.data?.value) {
        setStoreName(response.data.value);
      }
    });
  }, []);

  // ตรวจสอบว่ามี session หรือไม่ จาก localStorage
  // ในสภาพแวดล้อมจริงควรใช้ cookie หรือ session ที่มีการ validate ที่ server
  // ดึงและกำหนดค่า socket.io สำหรับ real-time updates
  useEffect(() => {
    // เริ่มต้นการเชื่อมต่อ Socket.IO
    const socket = getSocket();

    // ทำความสะอาดเมื่อ component unmount
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // ตรวจสอบจาก localStorage ว่ามีข้อมูลผู้ใช้หรือไม่
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          // ถ้ามีข้อมูลผู้ใช้ใน localStorage ให้ตั้งค่า user state
          const userData = JSON.parse(storedUser);
          setUser(userData);

          // ลงทะเบียนบทบาทกับ Socket.IO server ตามสิทธิ์ของผู้ใช้
          if (userData.role === 'admin') {
            registerRole('admin');
          } else {
            registerRole('staff');
          }
          
          // ถ้าผู้ใช้เข้าหน้าลูกค้า แต่เป็นพนักงานที่ล็อกอินแล้ว แสดงเมนูในหน้าลูกค้า
          // ไม่ต้อง redirect ไปหน้าพนักงาน เพื่อให้พนักงานสามารถใช้ระบบในมุมมองของลูกค้าได้
        } else {
          // ถ้าไม่มีข้อมูลผู้ใช้ ให้ user เป็น null
          setUser(null);
          
          // ลงทะเบียนเป็น customer สำหรับผู้ที่ไม่ได้ล็อกอิน
          registerRole('customer');
          
          // ถ้าอยู่ในหน้าที่ต้องการการล็อกอิน (พนักงาน/แอดมิน) ให้ redirect ไปหน้าลูกค้า
          if (location === '/' || location === '/admin') {
            setLocation('/customer');
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setUser(null);
        
        // กรณีเกิดข้อผิดพลาด redirect ไปหน้าลูกค้า
        if (location === '/' || location === '/admin') {
          setLocation('/customer');
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthentication();
  }, [location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-coffee-light">
        <div className="text-coffee-primary text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  // Helper function to determine active status
  const isActive = (path: string) => location === path;

  // แสดง navigation แตกต่างกันไปตามสถานะการล็อกอิน
  return (
    <>
      <div className="bg-gradient-to-r from-coffee-primary to-coffee-dark text-white py-3 px-4 flex justify-between items-center shadow-md">
        <div className="flex space-x-2">
          {/* ถ้าล็อกอินแล้วแสดงลิงก์หน้าพนักงานและหน้าแอดมิน */}
          {user ? (
            <>
              <Link href="/">
                <span className={`px-4 py-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-opacity-90 flex items-center ${isActive("/") ? "bg-white bg-opacity-20 shadow-inner font-semibold" : "hover:bg-white hover:bg-opacity-10"}`}>
                  หน้าร้าน (พนักงาน)
                </span>
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin">
                  <span className={`px-4 py-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-opacity-90 flex items-center ${isActive("/admin") ? "bg-white bg-opacity-20 shadow-inner font-semibold" : "hover:bg-white hover:bg-opacity-10"}`}>
                    ผู้ดูแลระบบ
                  </span>
                </Link>
              )}
              <Link href="/customer">
                <span className={`px-4 py-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-opacity-90 flex items-center ${isActive("/customer") ? "bg-white bg-opacity-20 shadow-inner font-semibold" : "hover:bg-white hover:bg-opacity-10"}`}>
                  หน้าลูกค้า
                </span>
              </Link>
              <button 
                className="px-4 py-2 rounded-md cursor-pointer ml-2 bg-red-600 hover:bg-red-700 text-white transition-colors duration-200 font-medium shadow"
                onClick={() => {
                  localStorage.removeItem('user');
                  setUser(null);
                  setLocation('/customer');
                }}
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            /* ถ้ายังไม่ล็อกอินแสดงลิงก์หน้าลูกค้าและปุ่มสำหรับพนักงาน */
            <div className="flex items-center space-x-2">
              <Link href="/customer">
                <span className={`px-4 py-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-opacity-90 flex items-center ${isActive("/customer") ? "bg-white bg-opacity-20 shadow-inner font-semibold" : "hover:bg-white hover:bg-opacity-10"}`}>
                  หน้าลูกค้า
                </span>
              </Link>
              <Link href="/login">
                <span className="px-4 py-2 rounded-md cursor-pointer bg-white bg-opacity-20 hover:bg-opacity-30 text-white transition-all duration-200 font-medium shadow">
                  สำหรับพนักงาน
                </span>
              </Link>
            </div>
          )}
        </div>
        <div className="font-bold text-xl tracking-wide">{storeName}</div>
      </div>
      
      <Switch>
        <Route path="/" component={() => <POS user={user} />} />
        <Route path="/admin" component={() => <Admin user={user} />} />
        <Route path="/admin-point-settings" component={() => {
          // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
          if (!user || user.role !== 'admin') {
            setLocation("/");
            return null;
          }
          return <AdminPointSettings />;
        }} />
        <Route path="/customer" component={() => <Customer />} />
        <Route path="/login" component={() => {
          // ถ้ามีการล็อกอินแล้ว ให้ redirect ไปยังหน้า POS
          if (user) {
            setLocation("/");
            return null;
          }
          return <Login />;
        }} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/custom-payment/:orderId" component={CustomPayment} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
