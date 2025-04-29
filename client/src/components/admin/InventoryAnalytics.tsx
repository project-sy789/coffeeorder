import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  BarChart2, 
  AlertCircle, 
  Package, 
  Coffee, 
  LayoutGrid,
  PackageCheck, 
  Package2,
  AlertOctagon,
  ListChecks 
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { formatCurrency } from '@/lib/utils';

export default function InventoryAnalytics() {
  // Low stock items query
  const { data: lowStockItems = [], isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['/api/analytics/low-stock'],
    queryFn: async () => {
      const { data } = await apiRequest<any[]>('GET', '/api/analytics/low-stock');
      return data || [];
    }
  });
  
  // Product usage report query
  const { data: productUsageReport = [], isLoading: isLoadingUsage } = useQuery({
    queryKey: ['/api/analytics/product-usage'],
    queryFn: async () => {
      const { data } = await apiRequest<any[]>('GET', '/api/analytics/product-usage');
      return data || [];
    }
  });
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 size={28} />
            <span>วิเคราะห์วัตถุดิบ</span>
          </h1>
          <p className="text-gray-500">ตรวจสอบวัตถุดิบที่ใกล้หมดและการใช้วัตถุดิบในสินค้า</p>
        </div>
      </div>
      
      <Tabs defaultValue="low-stock">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="low-stock" className="flex items-center gap-1">
            <AlertCircle size={16} />
            <span>สินค้าใกล้หมด</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1">
            <ListChecks size={16} />
            <span>การใช้วัตถุดิบ</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Low stock items tab */}
        <TabsContent value="low-stock" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertOctagon className="w-5 h-5 mr-2 text-yellow-500" />
                วัตถุดิบที่ใกล้หมด
              </CardTitle>
              <CardDescription>
                รายการวัตถุดิบที่มีปริมาณต่ำกว่าระดับที่กำหนดให้สั่งเพิ่ม
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLowStock ? (
                <div className="text-center p-4">กำลังโหลดข้อมูล...</div>
              ) : lowStockItems.length === 0 ? (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertTitle>ไม่พบวัตถุดิบที่ใกล้หมด</AlertTitle>
                  <AlertDescription>
                    ทุกวัตถุดิบมีปริมาณเพียงพอ ไม่จำเป็นต้องสั่งเพิ่มในตอนนี้
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableCaption>รายการวัตถุดิบที่ใกล้หมด</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วัตถุดิบ</TableHead>
                      <TableHead>ปริมาณคงเหลือ</TableHead>
                      <TableHead>ระดับที่ควรสั่งเพิ่ม</TableHead>
                      <TableHead>หน่วย</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.reorderLevel}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                            item.quantity <= item.reorderLevel * 0.5 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.quantity <= item.reorderLevel * 0.5 ? 'วิกฤต' : 'ใกล้หมด'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Product usage tab */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Coffee className="w-5 h-5 mr-2 text-amber-600" />
                รายงานการใช้วัตถุดิบในสินค้า
              </CardTitle>
              <CardDescription>
                แสดงปริมาณวัตถุดิบที่ใช้ในการผลิตสินค้าแต่ละชนิด
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="text-center p-4">กำลังโหลดข้อมูล...</div>
              ) : productUsageReport.length === 0 ? (
                <Alert>
                  <PackageCheck className="h-4 w-4" />
                  <AlertTitle>ไม่พบข้อมูล</AlertTitle>
                  <AlertDescription>
                    ยังไม่มีข้อมูลการใช้วัตถุดิบของสินค้า กรุณาเพิ่มการเชื่อมโยงระหว่างสินค้าและวัตถุดิบในเมนู "การใช้วัตถุดิบ"
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {productUsageReport.map((product) => (
                    <Card key={product.productId} className="overflow-hidden">
                      <CardHeader className="bg-muted/30 p-4">
                        <CardTitle className="text-lg">{product.productName}</CardTitle>
                      </CardHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>วัตถุดิบ</TableHead>
                            <TableHead>ปริมาณที่ใช้</TableHead>
                            <TableHead>หน่วย</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {product.inventoryUsage.map((usage, index) => (
                            <TableRow key={index}>
                              <TableCell>{usage.inventoryName}</TableCell>
                              <TableCell>{usage.quantity}</TableCell>
                              <TableCell>{usage.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}