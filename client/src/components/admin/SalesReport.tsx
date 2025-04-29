import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function SalesReport() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">(
    "today"
  );

  // Calculate proper date ranges
  const calculateDateRange = () => {
    const today = new Date();
    
    switch (dateRange) {
      case "today":
        return {
          start: today,
          end: today
        };
      case "week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          start: weekStart,
          end: today
        };
      }
      case "month": {
        const monthStart = new Date(today);
        monthStart.setMonth(today.getMonth() - 1);
        return {
          start: monthStart,
          end: today
        };
      }
      case "custom":
        return {
          start: startDate || today,
          end: endDate || today
        };
      default:
        return {
          start: today,
          end: today
        };
    }
  };

  const { start, end } = calculateDateRange();

  // Fetch orders within date range
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders/date-range', start.toISOString().split('T')[0], end.toISOString().split('T')[0]],
    queryFn: async () => {
      // Format dates as YYYY-MM-DD for API compatibility
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      console.log(`Fetching orders from ${startDate} to ${endDate}`);
      const { data: allOrders } = await apiRequest('GET', `/api/orders/date-range?startDate=${startDate}&endDate=${endDate}`);
      
      // กรองเฉพาะออเดอร์ที่มีสถานะเป็น "completed" เท่านั้น
      const completedOrders = allOrders.filter((order: Order) => order.status === "completed");
      
      console.log(`Filtered ${completedOrders.length} completed orders from ${allOrders.length} total orders`);
      return completedOrders;
    }
  });

  // Fetch popular products
  const { data: popularProducts = [] } = useQuery<{productId: number, productName: string, count: number}[]>({
    queryKey: ["/api/analytics/popular-products"],
    queryFn: async () => {
      const { data } = await apiRequest('GET', '/api/analytics/popular-products?limit=5');
      return data;
    }
  });

  // Calculate total sales for the period
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Prepare data for charts
  const dailySalesData = orders.reduce((acc: any[], order) => {
    const date = new Date(order.createdAt);
    const dateStr = format(date, "yyyy-MM-dd");
    
    const existingDay = acc.find(day => day.date === dateStr);
    if (existingDay) {
      existingDay.sales += order.total;
      existingDay.orders += 1;
    } else {
      acc.push({
        date: dateStr,
        dateFormatted: format(date, "d MMM", { locale: th }),
        sales: order.total,
        orders: 1
      });
    }
    
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Popular products chart data
  const productChartData = popularProducts.map(product => ({
    name: product.productName,
    value: product.count
  }));

  const handleDateRangeSelect = (range: "today" | "week" | "month" | "custom") => {
    setDateRange(range);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">รายงานการขาย</h1>
          <p className="text-muted-foreground">
            วิเคราะห์ยอดขาย ออเดอร์ และสินค้าขายดีตามช่วงเวลา
          </p>
        </div>
      </div>

      {/* Date Range Selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Tabs 
            value={dateRange} 
            onValueChange={(value) => handleDateRangeSelect(value as any)}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="today">วันนี้</TabsTrigger>
              <TabsTrigger value="week">7 วันที่ผ่านมา</TabsTrigger>
              <TabsTrigger value="month">30 วันที่ผ่านมา</TabsTrigger>
              <TabsTrigger value="custom">กำหนดเอง</TabsTrigger>
            </TabsList>
            
            <TabsContent value="custom" className="flex space-x-4">
              <div className="space-y-2">
                <div className="text-sm">วันเริ่มต้น</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: th }) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">วันสิ้นสุด</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: th }) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ยอดขายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ระหว่างวันที่ {format(start, "d MMM yyyy", { locale: th })} - {format(end, "d MMM yyyy", { locale: th })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              จำนวนออเดอร์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders} ออเดอร์</div>
            <p className="text-xs text-muted-foreground mt-1">
              เฉลี่ย {(totalOrders / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)} ออเดอร์ต่อวัน
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              มูลค่าออเดอร์เฉลี่ย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ต่อออเดอร์
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>ยอดขายตามวัน</CardTitle>
          <CardDescription>แนวโน้มยอดขายรายวัน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {dailySalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateFormatted" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${formatCurrency(value)}`, 'ยอดขาย']}
                    labelFormatter={(label) => `วันที่ ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" fill="#3B82F6" name="ยอดขาย (บาท)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">ไม่มีข้อมูลการขายในช่วงเวลาที่เลือก</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popular Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>สินค้าขายดี</CardTitle>
            <CardDescription>สินค้า 5 อันดับที่ขายดีที่สุด</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              {productChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {productChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} รายการ`, 'จำนวนที่ขาย']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">ไม่มีข้อมูลสินค้าขายดี</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายการออเดอร์ล่าสุด</CardTitle>
            <CardDescription>ออเดอร์ล่าสุดภายในช่วงเวลาที่เลือก</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>มูลค่า</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      ไม่มีรายการออเดอร์
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.id}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : order.status === "pending" 
                              ? "bg-yellow-100 text-yellow-800" 
                              : "bg-red-100 text-red-800"
                        }`}>
                          {order.status === "completed" 
                            ? "สำเร็จ" 
                            : order.status === "pending" 
                              ? "รอดำเนินการ" 
                              : "ยกเลิก"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}