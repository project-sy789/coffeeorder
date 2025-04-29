import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Order } from "@shared/schema";
import { Clock, Coffee, Loader } from "lucide-react";

interface QueueInfo {
  totalToday: number;
  queueCount: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  completedCount: number;
  cancelledCount: number;
}

interface OrderStatusPanelProps {
  customerId?: number | null;
  latestOrderId?: number | null;
}

export default function OrderStatusPanel({ customerId, latestOrderId }: OrderStatusPanelProps) {
  // State for storing the most recent orders (up to 5)
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);
  
  // Query for fetching orders, will auto-refetch every 30 seconds
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    refetchInterval: 30000,
  });
  
  // Query for fetching queue information
  const { data: queueInfo, isLoading: isLoadingQueueInfo } = useQuery<QueueInfo>({
    queryKey: ['/api/orders/queue-info'],
    refetchInterval: 30000,
  });

  // Create ref for scrolling to highlighted order
  const highlightedOrderRef = useRef<HTMLDivElement>(null);

  // Set the latest order ID to highlight when it changes and scroll to it
  useEffect(() => {
    if (latestOrderId) {
      setHighlightedOrderId(latestOrderId);
      
      // Remove highlight after 15 seconds - ให้เวลานานขึ้นสำหรับการแสดงไฮไลท์
      const timer = setTimeout(() => {
        setHighlightedOrderId(null);
      }, 15000);

      // Scroll to the highlighted order after a short delay to ensure it's rendered
      setTimeout(() => {
        if (highlightedOrderRef.current) {
          highlightedOrderRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [latestOrderId]);

  useEffect(() => {
    if (orders) {
      // Get today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter orders by customer ID (if logged in) and only show today's orders
      let filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const isToday = orderDate.getTime() >= today.getTime();
        return isToday && (customerId ? order.customerId === customerId : true);
      });
        
      // Only get the 5 most recent orders and sort by createdAt in descending order
      const recent = filteredOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
        
      setRecentOrders(recent);
    }
  }, [orders, customerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--status-pending)';
      case 'preparing': return 'var(--status-preparing)';
      case 'ready': return 'var(--status-ready)';
      case 'completed': return 'var(--status-completed)';
      case 'cancelled': return 'var(--status-cancelled)';
      default: return 'var(--status-completed)';
    }
  };

  const getStatusBgClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'preparing': return 'กำลังเตรียม';
      case 'ready': return 'พร้อมรับ';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  // Loading state for orders and queue info
  if (isLoading || isLoadingQueueInfo) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">สถานะคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--coffee-primary)] border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Queue information display
  const QueueInfoDisplay = () => {
    if (!queueInfo) return null;
    
    return (
      <div className="bg-white rounded-lg p-3 mb-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            คิววันนี้
          </h3>
          <span className="text-xs text-gray-500">ยอดรวม: {queueInfo.totalToday} รายการ</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-amber-50 p-2 rounded-md">
            <div className="font-semibold text-amber-600">{queueInfo.pendingCount}</div>
            <div className="text-gray-600">รอดำเนินการ</div>
          </div>
          
          <div className="bg-blue-50 p-2 rounded-md">
            <div className="font-semibold text-blue-600">{queueInfo.preparingCount}</div>
            <div className="text-gray-600">กำลังเตรียม</div>
          </div>
          
          <div className="bg-green-50 p-2 rounded-md">
            <div className="font-semibold text-green-600">{queueInfo.readyCount}</div>
            <div className="text-gray-600">พร้อมรับ</div>
          </div>
        </div>
        
        {queueInfo.queueCount > 0 && (
          <div className="mt-2 text-xs text-center text-gray-600">
            ขณะนี้มี <span className="font-medium text-blue-600">{queueInfo.queueCount}</span> คำสั่งซื้อกำลังรอดำเนินการ
          </div>
        )}
      </div>
    );
  };

  // No orders yet
  if (recentOrders.length === 0) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">สถานะคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueInfoDisplay />
          <div className="text-center py-4 text-gray-500">
            {customerId 
              ? "คุณยังไม่มีคำสั่งซื้อในวันนี้" 
              : "ยังไม่มีคำสั่งซื้อ กรุณาล็อกอินเพื่อดูคำสั่งซื้อของคุณ"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main component with orders and queue info
  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">สถานะคำสั่งซื้อล่าสุด</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <QueueInfoDisplay />
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
          {recentOrders.length > 1 && (
            <div className="text-xs text-center text-gray-400 mb-1">
              <span className="inline-block animate-bounce">↓</span> เลื่อนเพื่อดูคำสั่งซื้อเพิ่มเติม <span className="inline-block animate-bounce">↓</span>
            </div>
          )}
          
          {recentOrders.map((order) => {
            // Calculate order queue position for pending/preparing orders
            let queuePosition = null;
            if (order.status === 'pending' || order.status === 'preparing') {
              const pendingOrders = orders?.filter(o => 
                (o.status === 'pending' || o.status === 'preparing') && 
                new Date(o.createdAt).getTime() <= new Date(order.createdAt).getTime()
              ) || [];
              queuePosition = pendingOrders.length;
            }
            
            return (
              <div 
                key={order.id} 
                ref={order.id === highlightedOrderId ? highlightedOrderRef : null}
                className={`status-card bg-[var(--coffee-light)] 
                  ${order.id === highlightedOrderId ? 'animate-pulse border-2 shadow-lg' : ''}
                  ${order.status === 'ready' ? 'border-green-500' : ''}
                `}
                style={{ 
                  borderLeftColor: getStatusColor(order.status),
                  borderColor: order.id === highlightedOrderId ? getStatusColor(order.status) : undefined
                }}
              >
                {order.id === highlightedOrderId && (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 text-xs font-medium rounded-t-sm mb-2 -mt-2 -mx-2 highlight-latest-order">
                    🔔 คำสั่งซื้อล่าสุดของคุณ
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">หมายเลขคำสั่งซื้อ: {order.orderCode || order.id}</div>
                  <Badge className={`${getStatusBgClass(order.status)} text-white status-badge`}>
                    {translateStatus(order.status)}
                  </Badge>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <div>{formatDateTime(order.createdAt)}</div>
                  <div className="font-medium">{formatCurrency(order.total)}</div>
                </div>
                
                {order.status === 'pending' && (
                  <div className="mt-2 text-sm text-amber-600 font-medium flex items-center">
                    <Loader className="h-3 w-3 mr-1 animate-spin" />
                    รอดำเนินการ
                    {queuePosition && <span className="ml-1">({queuePosition})</span>}
                  </div>
                )}
                
                {order.status === 'preparing' && (
                  <div className="mt-2 text-sm text-blue-600 font-medium flex items-center">
                    <Coffee className="h-3 w-3 mr-1" />
                    กำลังเตรียมเครื่องดื่มของคุณ
                    {queuePosition && <span className="ml-1">({queuePosition})</span>}
                  </div>
                )}
                
                {order.status === 'ready' && (
                  <div className="mt-2 text-sm text-green-600 font-medium pulse-animation">
                    ✓ เครื่องดื่มของคุณพร้อมรับแล้ว
                  </div>
                )}
                
                {order.status === 'cancelled' && order.cancelReason && (
                  <div className="mt-1 text-sm text-red-600">
                    เหตุผลที่ยกเลิก: {order.cancelReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}