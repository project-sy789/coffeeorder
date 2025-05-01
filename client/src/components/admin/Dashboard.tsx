import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useSocketQuery } from "@/hooks/useSocketQuery";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { 
  LayoutDashboard, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  CircleDollarSign, 
  ShoppingBag,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'year'>('7days');
  
  // Get today's date for analytics queries
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // ไม่จำเป็นต้องใช้ safelyFetchData อีกต่อไปเนื่องจากใช้ Socket.IO แทน
  
  // Get date range for sales chart
  const getStartDate = () => {
    const date = new Date();
    if (dateRange === '7days') {
      date.setDate(date.getDate() - 6);
    } else if (dateRange === '30days') {
      date.setDate(date.getDate() - 29);
    } else {
      date.setMonth(0);
      date.setDate(1);
    }
    return date.toISOString().split('T')[0];
  };
  
  // ใช้ Socket.IO ในการดึงข้อมูลยอดขายวันนี้
  const { data: ordersToday = [], isLoading: loadingOrdersToday } = useSocketQuery<any[]>(
    'getOrdersByDateRange',
    {
      startDate: todayStr,
      endDate: todayStr
    }
  );
  
  // คำนวณยอดขายวันนี้จากข้อมูลที่ได้
  const dailySales = {
    date: todayStr,
    sales: ordersToday
      .filter((order: any) => order.status === "completed")
      .reduce((sum: number, order: any) => sum + order.total, 0)
  };
  
  const loadingDailySales = loadingOrdersToday;
  
  // ใช้ Socket.IO ในการดึงข้อมูลสินค้ายอดนิยม
  const { data: popularProducts = [], isLoading: loadingPopularProducts } = useSocketQuery<{productId: number, productName: string, count: number}[]>(
    'getPopularProducts',
    { limit: 5 }
  );
  
  // ใช้ Socket.IO ในการดึงข้อมูลออเดอร์
  const { data: orders = [], isLoading: loadingOrders } = useSocketQuery<any[]>(
    'getOrders',
    {},
    {
      select: (data) => {
        try {
          if (!Array.isArray(data)) {
            console.error('Orders data is not an array:', data);
            return [];
          }
          
          // กรองเฉพาะออเดอร์ที่สถานะเป็น "completed" เท่านั้น
          const completedOrders = data.filter((order: any) => order.status === "completed");
          console.log('Completed orders:', completedOrders.length);
          
          // เรียงตามวันที่สร้างจากใหม่ไปเก่า และเลือกแค่ 5 รายการแรก
          const sortedOrders = [...completedOrders].sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }).slice(0, 5);
          
          console.log('Sorted and sliced orders:', sortedOrders.length);
          return sortedOrders;
        } catch (error) {
          console.error('Error processing orders data:', error);
          return [];
        }
      },
    }
  );
  
  // ใช้ Socket.IO ในการดึงข้อมูลออเดอร์ตามช่วงวันที่สำหรับกราฟยอดขาย
  const { data: ordersByDateRange = [], isLoading: loadingOrdersByDateRange } = useSocketQuery<any[]>(
    'getOrdersByDateRange',
    {
      startDate: getStartDate(),
      endDate: todayStr
    }
  );
  
  // คำนวณข้อมูลสำหรับกราฟยอดขาย
  const salesData = useMemo(() => {
    try {
      // กรองเฉพาะออเดอร์ที่สถานะเป็น "completed" เท่านั้น
      const completedOrders = ordersByDateRange.filter((order: any) => order.status === "completed");
      console.log('Completed orders for chart:', completedOrders.length);
      
      // จัดกลุ่มข้อมูลตามวันที่และคำนวณยอดขายในแต่ละวัน
      const salesByDate: {[key: string]: number} = {};
      
      completedOrders.forEach((order: any) => {
        if (!order.createdAt) {
          console.warn('Order missing createdAt:', order);
          return;
        }
        
        const orderDate = order.createdAt.split('T')[0]; // รูปแบบ YYYY-MM-DD
        salesByDate[orderDate] = (salesByDate[orderDate] || 0) + order.total;
      });
      
      // แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสมสำหรับการแสดงกราฟ
      const chartData = Object.keys(salesByDate).map(date => ({
        date,
        sales: salesByDate[date]
      }));
      
      // เรียงข้อมูลตามวันที่
      chartData.sort((a, b) => a.date.localeCompare(b.date));
      
      return chartData;
    } catch (error) {
      console.error('Error processing sales data by date range:', error);
      return [];
    }
  }, [ordersByDateRange]);
  
  const loadingSalesData = loadingOrdersByDateRange;
  
  // Get status display and color class
  const getOrderStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'รอดำเนินการ', colorClass: 'bg-yellow-500' };
      case 'preparing':
        return { text: 'กำลังเตรียม', colorClass: 'bg-blue-500' };
      case 'ready':
        return { text: 'พร้อมเสิร์ฟ', colorClass: 'bg-green-500' };
      case 'completed':
        return { text: 'เสร็จสิ้น', colorClass: 'bg-gray-500' };
      default:
        return { text: 'ไม่ทราบสถานะ', colorClass: 'bg-gray-300' };
    }
  };
  
  // Format date to display time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-medium mb-6 flex items-center gap-2">
        <LayoutDashboard size={28} />
        <span>แดชบอร์ด</span>
      </h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {/* Today's Sales */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600">ยอดขายวันนี้</p>
                {loadingDailySales ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <h3 className="text-2xl font-medium mt-1">฿{dailySales?.sales || 0}</h3>
                )}
              </div>
              <div className="bg-green-100 text-green-800 p-2 rounded">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
            <div className="text-green-600 text-sm mt-2">
              เทียบกับเมื่อวาน
            </div>
          </CardContent>
        </Card>
        
        {/* Order Count */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600">จำนวนออเดอร์</p>
                {loadingOrders ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <h3 className="text-2xl font-medium mt-1">{orders?.length || 0}</h3>
                )}
              </div>
              <div className="bg-blue-100 text-blue-800 p-2 rounded">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
            <div className="text-blue-600 text-sm mt-2">
              ออเดอร์วันนี้
            </div>
          </CardContent>
        </Card>
        
        {/* New Customers */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600">ลูกค้าใหม่</p>
                <h3 className="text-2xl font-medium mt-1">0</h3>
              </div>
              <div className="bg-purple-100 text-purple-800 p-2 rounded">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                </svg>
              </div>
            </div>
            <div className="text-purple-600 text-sm mt-2">
              ลูกค้าใหม่วันนี้
            </div>
          </CardContent>
        </Card>
        
        {/* Popular Product */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600">สินค้าขายดี</p>
                {loadingPopularProducts ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <h3 className="text-2xl font-medium mt-1">
                    {popularProducts && popularProducts.length > 0
                      ? popularProducts[0].productName
                      : "ไม่มีข้อมูล"}
                  </h3>
                )}
              </div>
              <div className="bg-yellow-100 text-yellow-800 p-2 rounded">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
            <div className="text-yellow-600 text-sm mt-2">
              {loadingPopularProducts ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                popularProducts && popularProducts.length > 0
                  ? `${popularProducts[0].count} แก้ววันนี้`
                  : "ไม่มีข้อมูล"
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sales Chart */}
      <Card className="bg-white shadow mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <TrendingUp size={20} className="mr-2" />
              ยอดขายรายวัน
            </h3>
            <div className="flex space-x-2">
              <Button
                variant={dateRange === '7days' ? 'default' : 'outline'}
                className={dateRange === '7days' ? 'bg-[var(--coffee-primary)] text-white' : 'text-gray-600 border'}
                onClick={() => setDateRange('7days')}
                size="sm"
              >
                7 วัน
              </Button>
              <Button
                variant={dateRange === '30days' ? 'default' : 'outline'}
                className={dateRange === '30days' ? 'bg-[var(--coffee-primary)] text-white' : 'text-gray-600 border'}
                onClick={() => setDateRange('30days')}
                size="sm"
              >
                30 วัน
              </Button>
              <Button
                variant={dateRange === 'year' ? 'default' : 'outline'}
                className={dateRange === 'year' ? 'bg-[var(--coffee-primary)] text-white' : 'text-gray-600 border'}
                onClick={() => setDateRange('year')}
                size="sm"
              >
                ปีนี้
              </Button>
            </div>
          </div>
          <div className="h-64 w-full">
            {loadingSalesData ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded border">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesData || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`฿${value}`, 'ยอดขาย']} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#6F4E37" 
                    activeDot={{ r: 8 }} 
                    name="ยอดขาย" 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Popular Products */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <BarChart3 size={20} className="mr-2" />
              สินค้ายอดนิยม
            </h3>
            <div className="space-y-3">
              {loadingPopularProducts ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-10 h-10 bg-[var(--coffee-light)] rounded-full flex items-center justify-center">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full mt-1" />
                    </div>
                  </div>
                ))
              ) : (
                popularProducts?.map((product, index) => (
                  <div key={product.productId} className="flex items-center">
                    <div className="w-10 h-10 bg-[var(--coffee-light)] rounded-full flex items-center justify-center text-[var(--coffee-primary)] font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{product.productName}</h4>
                        <span>฿55</span> {/* ราคาผลิตภัณฑ์ */}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-[var(--coffee-primary)] h-2 rounded-full" 
                          style={{ 
                            width: `${popularProducts[0].count > 0 
                              ? (product.count / popularProducts[0].count) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {popularProducts?.length === 0 && !loadingPopularProducts && (
                <div className="text-center py-8 text-gray-500">
                  ไม่มีข้อมูลสินค้ายอดนิยม
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Orders */}
        <Card className="bg-white shadow">
          <CardContent className="p-4">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Clock size={20} className="mr-2" />
              ออเดอร์ล่าสุด
            </h3>
            <div className="space-y-3">
              {loadingOrders ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-48 mt-1" />
                    <div className="flex justify-between items-center mt-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                ))
              ) : (
                orders?.map((order: any, index: number) => (
                  <div key={order.id} className={index < orders.length - 1 ? "border-b pb-3" : ""}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[var(--coffee-primary)] font-medium">#{order.orderCode || order.id}</span>
                        <span className="text-gray-600 text-sm ml-2">
                          {formatTime(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span 
                          className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            getOrderStatusInfo(order.status).colorClass
                          }`}
                        ></span>
                        <span className="text-sm">{getOrderStatusInfo(order.status).text}</span>
                      </div>
                    </div>
                    <div className="text-sm mt-1">รายการสินค้า</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">
                        ลูกค้า: {order.customerId ? 'สมาชิก' : 'ทั่วไป'}
                      </span>
                      <span className="font-medium">฿{order.total}</span>
                    </div>
                  </div>
                ))
              )}
              {orders?.length === 0 && !loadingOrders && (
                <div className="text-center py-8 text-gray-500">
                  ไม่มีออเดอร์ล่าสุด
                </div>
              )}
            </div>
            {/* ปุ่มดูทั้งหมด - ใช้ a tag ที่มีการปรับแต่งเป็นปุ่มด้วย CSS */}
            <a 
              href="/admin?page=orders"
              className="block w-full mt-4 text-center font-medium text-[var(--coffee-primary)] border border-[var(--coffee-primary)] rounded py-2 hover:bg-[var(--coffee-light)] transition-colors no-underline"
            >
              ดูทั้งหมด
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
