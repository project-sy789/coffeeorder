import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Order, type OrderWithItems, type User, type Member } from "@shared/schema";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { 
  useSocketOrderDetails,
  useSocketUsers,
  useSocketMembers,
  useSocketQuery,
  useSocketMutation
} from "@/hooks/useSocketQuery";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Icons
import { 
  Loader2,
  Search,
  FilterX,
  ClipboardList,
  Eye,
  PackageCheck,
  PackageX,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function OrderManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [staffMap, setStaffMap] = useState<Record<number, string>>({});
  const [memberMap, setMemberMap] = useState<Record<number, string>>({});
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  
  const { toast } = useToast();

  // Fetch all orders ด้วย Socket.IO
  const { data: orders = [], isLoading: isLoadingOrders } = useSocketQuery<Order[]>(
    'getOrders',
    {},
    {
      select: (data: Order[]) => {
        if (!Array.isArray(data)) {
          console.error('Orders data is not an array:', data);
          return [];
        }
        return data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }
  );

  // Fetch all users ด้วย Socket.IO
  const { data: users = [] } = useSocketUsers<User[]>();

  // Fetch all members ด้วย Socket.IO
  const { data: members = [] } = useSocketMembers<Member[]>();

  // Fetch order details when viewing a specific order ด้วย Socket.IO
  const { data: orderDetails, isLoading: isLoadingDetails } = useSocketOrderDetails<OrderWithItems>(
    selectedOrder || 0,
    !!selectedOrder
  );
  
  // เชื่อมต่อกับ Socket.IO server
  useEffect(() => {
    // สร้าง socket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = io(`${window.location.protocol}//${host}`);
    socketRef.current = socket;
    
    // ลงทะเบียนเป็น staff หรือ admin
    socket.emit('register', { role: 'admin' });
    
    // รับการแจ้งเตือนเมื่อมีการอัพเดตข้อมูล
    socket.on('orderStatusUpdated', () => {
      // อัพเดตข้อมูลออร์เดอร์อัตโนมัติเมื่อมีการเปลี่ยนแปลง
      // ใช้ socketKey แทนการใช้ API queryKey
      queryClient.invalidateQueries({ queryKey: ['getOrders'] });
    });
    
    socket.on('newOrderNotification', (data) => {
      // แสดงการแจ้งเตือนเมื่อมีออร์เดอร์ใหม่
      toast({
        title: "มีออร์เดอร์ใหม่",
        description: `ออร์เดอร์ #${data.order.id || data.order.orderCode} เข้ามาในระบบ`,
      });
      // อัพเดตข้อมูลออร์เดอร์อัตโนมัติ
      queryClient.invalidateQueries({ queryKey: ['getOrders'] });
    });
    
    // ทำความสะอาดเมื่อ component unmount
    return () => {
      socket.disconnect();
    };
  }, [queryClient, toast]); // เพิ่ม dependencies ที่จำเป็น
  
  // Generate maps of staff and member names when data is loaded
  useEffect(() => {
    if (!users.length || !members.length) return; // ป้องกันการทำงานเมื่อข้อมูลยังไม่พร้อม
    
    // Create staff name map
    const staffNameMap: Record<number, string> = {};
    users.forEach(user => {
      staffNameMap[user.id] = user.name;
    });
    setStaffMap(staffNameMap);
    
    // Create member name map
    const memberNameMap: Record<number, string> = {};
    members.forEach(member => {
      memberNameMap[member.id] = member.name;
    });
    setMemberMap(memberNameMap);
  }, [users, members]);
  
  // แสดงข้อมูลการดึงข้อมูลรายละเอียดออเดอร์และ orderDetails
  useEffect(() => {
    console.log('selectedOrder:', selectedOrder);
    console.log('orderDetails:', orderDetails);
    console.log('isLoadingDetails:', isLoadingDetails);
  }, [selectedOrder, orderDetails, isLoadingDetails]);

  // Filter orders by status and search query
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      order.id.toString().includes(searchQuery) || 
      (order.orderCode && order.orderCode.toString().includes(searchQuery));
    
    return matchesStatus && matchesSearch;
  });

  // Handle viewing order details
  const handleViewOrder = (orderId: number) => {
    console.log('Viewing order details for orderId:', orderId); // เพิ่ม log เพื่อตรวจสอบ
    setSelectedOrder(orderId);
    setIsViewDialogOpen(true);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">รอดำเนินการ</Badge>;
      case "preparing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">กำลังเตรียม</Badge>;
      case "ready":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">พร้อมเสิร์ฟ</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">เสร็จสิ้น</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">ยกเลิก</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "preparing":
        return <PackageCheck className="h-5 w-5 text-blue-500" />;
      case "ready":
        return <ClipboardList className="h-5 w-5 text-purple-500" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <PackageX className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  // ใช้ Socket.IO Mutation สำหรับการอัพเดทสถานะออเดอร์
  const updateOrderStatusMutation = useSocketMutation<
    { orderId: number; status: string; note?: string }, 
    { success: boolean; message: string }
  >('updateOrderStatus');
  
  // Handle updating order status
  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      // ส่งคำสั่งอัพเดทสถานะผ่าน Socket.IO
      const result = await updateOrderStatusMutation.mutateAsync({ 
        orderId, 
        status: newStatus,
        note: newStatus === 'cancelled' ? 'ยกเลิกโดยพนักงาน' : undefined
      });
      
      if (result && result.success) {
        toast({
          title: "อัปเดตสถานะสำเร็จ",
          description: `อัปเดตสถานะคำสั่งซื้อ #${orderId} เรียบร้อยแล้ว`,
        });
      } else {
        throw new Error(result?.message || "ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะคำสั่งซื้อได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={24} />
          <span>รายการสั่งซื้อ</span>
        </h1>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="ค้นหาตามรหัสคำสั่งซื้อ..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FilterX size={16} />
            </button>
          )}
        </div>
        
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="pending">รอดำเนินการ</TabsTrigger>
            <TabsTrigger value="preparing">กำลังเตรียม</TabsTrigger>
            <TabsTrigger value="ready">พร้อมเสิร์ฟ</TabsTrigger>
            <TabsTrigger value="completed">เสร็จสิ้น</TabsTrigger>
            <TabsTrigger value="cancelled">ยกเลิก</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Orders Table */}
      {isLoadingOrders ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-coffee-primary" />
          <span className="ml-2 text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ClipboardList className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่พบรายการสั่งซื้อ</h3>
          <p className="text-gray-500">ยังไม่มีรายการสั่งซื้อในระบบหรือตรงตามเงื่อนไขที่กำหนด</p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg mb-12">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>วันเวลา</TableHead>
                <TableHead>วิธีชำระเงิน</TableHead>
                <TableHead>ยอดรวม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.orderCode ? `#${order.orderCode}` : `#${order.id}`}
                  </TableCell>
                  <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell>
                    {order.paymentMethod === "cash" ? "เงินสด" : 
                      order.paymentMethod === "qr_code" ? "QR Code" : order.paymentMethod}
                  </TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <Eye size={16} />
                    </Button>
                    
                    <Select
                      defaultValue={order.status}
                      onValueChange={(value) => handleUpdateStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="สถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">รอดำเนินการ</SelectItem>
                        <SelectItem value="preparing">กำลังเตรียม</SelectItem>
                        <SelectItem value="ready">พร้อมเสิร์ฟ</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Order Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
          aria-describedby="order-details-description"
        >
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={20} />
              {orderDetails?.orderCode ? 
                `รายละเอียดคำสั่งซื้อ #${orderDetails.orderCode}` : 
                `รายละเอียดคำสั่งซื้อ #${selectedOrder}`}
            </DialogTitle>
            <DialogDescription id="order-details-description">
              ดูข้อมูลและแก้ไขสถานะคำสั่งซื้อ
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-coffee-primary" />
            </div>
          ) : !orderDetails ? (
            <div className="text-center py-8">
              <p>ไม่พบข้อมูลคำสั่งซื้อ</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2">
              {/* Order Meta */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(orderDetails.status)}
                    <span>{getStatusBadge(orderDetails.status)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">วันเวลา</p>
                    <p className="font-medium">{formatDateTime(orderDetails.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">วิธีชำระเงิน</p>
                    <p className="font-medium">
                      {orderDetails.paymentMethod === "cash" ? "เงินสด" : 
                       orderDetails.paymentMethod === "qr_code" ? "QR Code" : orderDetails.paymentMethod}
                    </p>
                  </div>
                  {orderDetails.customerId && (
                    <div>
                      <p className="text-muted-foreground">ลูกค้า</p>
                      <p className="font-medium">
                        {memberMap[orderDetails.customerId] || `สมาชิก #${orderDetails.customerId}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">พนักงาน</p>
                    <p className="font-medium">
                      {staffMap[orderDetails.staffId] || `#${orderDetails.staffId}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Order Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">รายการสินค้า</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderDetails.items?.map((item: any, index: number) => (
                      <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {JSON.stringify(item.customizations) !== '{}' 
                                ? Object.entries(item.customizations)
                                    .filter(([key]) => key !== 'specialInstructions')
                                    .map(([key, value]) => {
                                      if (key === 'toppings' && Array.isArray(value)) {
                                        return `ท็อปปิ้ง: ${value.map((t: any) => t.name).join(', ')}`;
                                      }
                                      return `${key}: ${value}`;
                                    })
                                    .join(' • ')
                                : 'ไม่มีตัวเลือกเพิ่มเติม'
                              }
                            </p>
                            {item.customizations?.specialInstructions && (
                              <p className="text-sm italic text-muted-foreground mt-1">
                                หมายเหตุ: {item.customizations.specialInstructions}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p>{item.quantity} x {formatCurrency(item.price)}</p>
                            <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>ยอดรวม</span>
                      <span>{formatCurrency(orderDetails.total)}</span>
                    </div>
                    {orderDetails.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>
                          ส่วนลด
                          {orderDetails.promotionCode && (
                            <span className="ml-1 text-xs text-gray-500">
                              (รหัส: {orderDetails.promotionCode})
                            </span>
                          )}
                        </span>
                        <span>- {formatCurrency(orderDetails.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>ยอดสุทธิ</span>
                      <span>{formatCurrency(orderDetails.total - (orderDetails.discount || 0))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Status Update */}
              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-muted-foreground">อัปเดตสถานะ</p>
                <Select
                  defaultValue={orderDetails.status}
                  onValueChange={(value) => {
                    handleUpdateStatus(orderDetails.id, value);
                    setIsViewDialogOpen(false);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="preparing">กำลังเตรียม</SelectItem>
                    <SelectItem value="ready">พร้อมเสิร์ฟ</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}