import { useState } from "react";
import { useSocketInventory, useSocketMutation } from "@/hooks/useSocketQuery";
import { Inventory, Product, InventoryTransaction } from "@shared/schema";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  Search, 
  AlertTriangle, 
  Plus, 
  Edit, 
  RefreshCw, 
  PlusCircle, 
  MinusCircle, 
  History, 
  ClipboardList,
  ListChecks,
  Package2,
  PackageCheck
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Define form schema for inventory
const InventoryFormSchema = z.object({
  name: z.string().min(1, "ชื่อสินค้าไม่สามารถเป็นค่าว่างได้"),
  quantity: z.coerce.number().min(0, "จำนวนต้องมากกว่าหรือเท่ากับ 0"),
  unit: z.string().min(1, "หน่วยวัดไม่สามารถเป็นค่าว่างได้"),
  reorderLevel: z.coerce.number().min(0, "ระดับการสั่งซื้อใหม่ต้องมากกว่าหรือเท่ากับ 0"),
});

// Schema for stock adjustment (receive/use stock)
const StockAdjustmentSchema = z.object({
  itemId: z.number(),
  quantity: z.coerce.number().min(0.01, "จำนวนต้องมากกว่า 0"),
  type: z.enum(["receive", "use"]),
  note: z.string().optional(),
});

export default function InventoryReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<Inventory | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"receive" | "use">("receive");
  
  const { toast } = useToast();

  // Form for adding new inventory
  const addForm = useForm<z.infer<typeof InventoryFormSchema>>({
    resolver: zodResolver(InventoryFormSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "g",
      reorderLevel: 100,
    },
  });

  // Form for editing inventory
  const editForm = useForm<z.infer<typeof InventoryFormSchema>>({
    resolver: zodResolver(InventoryFormSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "",
      reorderLevel: 0,
    },
  });
  
  // Form for stock adjustment (receive/use)
  const adjustForm = useForm<z.infer<typeof StockAdjustmentSchema>>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      itemId: 0,
      quantity: 1,
      type: "receive",
      note: "",
    },
  });

  // ใช้ Socket.IO สำหรับดึงข้อมูลสินค้าคงคลัง
  const { 
    data: inventoryItems = [], 
    isLoading: isLoadingInventory,
    refetch: refetchInventory
  } = useSocketInventory<Inventory[]>({});
  
  // ใช้ Socket.IO สำหรับดึงข้อมูลธุรกรรมของสินค้าคงคลัง
  const { 
    data: inventoryTransactions = [], 
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions
  } = useSocketInventory<InventoryTransaction[]>({
    queryKey: 'inventoryTransactions',
    event: 'getInventoryTransactions',
    payload: { inventoryId: currentItem?.id },
    options: {
      enabled: !!currentItem && showHistoryDialog,
    }
  });

  // ใช้ Socket.IO สำหรับการเพิ่มสินค้าคงคลัง
  const addInventoryMutation = useSocketMutation<any, z.infer<typeof InventoryFormSchema>>('createInventory', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getInventory'] });
      toast({
        title: "เพิ่มสินค้าสำเร็จ",
        description: "เพิ่มรายการสินค้าคงคลังเรียบร้อยแล้ว",
      });
      setShowAddDialog(false);
      addForm.reset();
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเพิ่มสินค้าได้: ${error}`,
        variant: "destructive",
      });
    },
  });

  // ใช้ Socket.IO สำหรับการอัปเดตสินค้าคงคลัง
  const updateInventoryMutation = useSocketMutation<any, z.infer<typeof InventoryFormSchema> & { id: number }>('updateInventory', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getInventory'] });
      toast({
        title: "อัปเดตสินค้าสำเร็จ",
        description: "อัปเดตรายการสินค้าคงคลังเรียบร้อยแล้ว",
      });
      setShowEditDialog(false);
      setCurrentItem(null);
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถอัปเดตสินค้าได้: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // ใช้ Socket.IO สำหรับการปรับสต็อกสินค้าคงคลัง (รับเข้า/เบิกจ่าย)
  const stockAdjustMutation = useSocketMutation<any, z.infer<typeof StockAdjustmentSchema>>('adjustInventory', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getInventory'] });
      // อัปเดตแคชของรายการธุรกรรมด้วย
      if (currentItem) {
        queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
      }
      toast({
        title: adjustmentType === "receive" ? "รับสินค้าเข้าสำเร็จ" : "เบิกจ่ายสินค้าสำเร็จ",
        description: adjustmentType === "receive" 
          ? "เพิ่มจำนวนสินค้าคงคลังเรียบร้อยแล้ว" 
          : "ลดจำนวนสินค้าคงคลังเรียบร้อยแล้ว",
      });
      setShowAdjustDialog(false);
      setCurrentItem(null);
      adjustForm.reset();
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถปรับปรุงสินค้าคงคลังได้: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Handle add inventory form submission
  const onAddSubmit = (data: z.infer<typeof InventoryFormSchema>) => {
    addInventoryMutation.mutate(data);
  };

  // Handle edit inventory form submission
  const onEditSubmit = (data: z.infer<typeof InventoryFormSchema>) => {
    if (currentItem) {
      updateInventoryMutation.mutate({ ...data, id: currentItem.id });
    }
  };

  // Open edit dialog with current item data
  const handleEditItem = (item: Inventory) => {
    setCurrentItem(item);
    editForm.reset({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
    });
    setShowEditDialog(true);
  };
  
  // Open stock adjustment dialog
  const handleAdjustStock = (item: Inventory, type: "receive" | "use") => {
    setCurrentItem(item);
    setAdjustmentType(type);
    adjustForm.reset({
      itemId: item.id,
      quantity: 1,
      type: type,
      note: "",
    });
    setShowAdjustDialog(true);
  };
  
  // Handle stock adjustment form submission
  const onAdjustSubmit = (data: z.infer<typeof StockAdjustmentSchema>) => {
    stockAdjustMutation.mutate(data);
  };

  // Apply filters
  const filteredInventory = inventoryItems && Array.isArray(inventoryItems) ? inventoryItems.filter(item => {
    // Search filter
    const matchesSearch = 
      !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Stock level filter
    const matchesStock = 
      stockFilter === "all" || 
      (stockFilter === "low" && item.quantity <= item.reorderLevel) ||
      (stockFilter === "normal" && item.quantity > item.reorderLevel);
    
    return matchesSearch && matchesStock;
  }) : [];

  // Count low stock items
  const lowStockCount = inventoryItems && Array.isArray(inventoryItems) ? 
    inventoryItems.filter(item => item.quantity <= item.reorderLevel).length 
    : 0;

  // Prepare data for stock level chart
  const stockLevelData = filteredInventory.map(item => {
    return {
      name: item.name,
      current: item.quantity,
      minimum: item.reorderLevel,
    };
  }).slice(0, 10); // Show only top 10 for better visualization

  const unitOptions = [
    { value: "g", label: "กรัม (g)" },
    { value: "kg", label: "กิโลกรัม (kg)" },
    { value: "ml", label: "มิลลิลิตร (ml)" },
    { value: "l", label: "ลิตร (l)" },
    { value: "pcs", label: "ชิ้น (pcs)" },
    { value: "box", label: "กล่อง (box)" },
    { value: "bag", label: "ถุง (bag)" },
    { value: "set", label: "ชุด (set)" },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-dark)] flex items-center gap-2">
            <Package2 size={28} />
            <span>รายงานสินค้าคงคลัง</span>
          </h1>
          <p className="text-gray-500">
            ตรวจสอบระดับสินค้าคงคลังและจัดการวัตถุดิบ
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center shadow-sm hover:shadow transition-all"
            onClick={() => refetchInventory()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          
          <Button 
            variant="default" 
            className="flex items-center shadow-sm hover:shadow transition-all"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มสินค้าใหม่
          </Button>
        </div>
      </div>
      
      {/* Filter and search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-4 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="ค้นหาสินค้า..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="md:col-span-3">
          <Select
            value={stockFilter}
            onValueChange={setStockFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="สถานะสินค้า" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="low">สินค้าใกล้หมด</SelectItem>
              <SelectItem value="normal">สินค้าปกติ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="md:col-span-5">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                <span>สินค้าใกล้หมด: {lowStockCount} รายการ</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="text-amber-700 bg-white hover:bg-amber-100"
                onClick={() => setStockFilter("low")}
              >
                แสดง
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Inventory table */}
      <Card className="shadow-md mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center">
            <ListChecks className="mr-2 h-5 w-5" /> รายการสินค้าคงคลัง
          </CardTitle>
          <CardDescription>
            รายการวัตถุดิบทั้งหมดและสถานะปัจจุบัน
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInventory ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredInventory || filteredInventory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {!inventoryItems || !Array.isArray(inventoryItems) || inventoryItems.length === 0 ? 
                "ไม่พบข้อมูลสินค้าคงคลัง กรุณาเพิ่มรายการสินค้า" : 
                "ไม่พบรายการสินค้าที่ตรงกับการค้นหา"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อวัตถุดิบ</TableHead>
                  <TableHead>จำนวนคงเหลือ</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      {item.quantity <= item.reorderLevel ? (
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-amber-500 mr-2"></div>
                          <span className="text-amber-600">ใกล้หมด</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-green-600">ปกติ</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex space-x-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustStock(item, "receive")}
                          title="รับสินค้าเข้า"
                        >
                          <ArrowDownIcon className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustStock(item, "use")}
                          title="เบิกสินค้าออก"
                        >
                          <ArrowUpIcon className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentItem(item);
                            setShowHistoryDialog(true);
                          }}
                          title="ดูประวัติรายการเคลื่อนไหว"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          title="แก้ไขข้อมูล"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Stock level chart */}
      {filteredInventory.length > 0 && (
        <Card className="shadow-md mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <PackageCheck className="mr-2 h-5 w-5" /> ระดับสินค้าคงคลัง
            </CardTitle>
            <CardDescription>
              แสดงระดับสินค้าคงคลังปัจจุบันเทียบกับระดับต่ำสุดที่กำหนด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stockLevelData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill="#059669" name="ปริมาณปัจจุบัน" />
                  <Bar dataKey="minimum" fill="#d97706" name="ระดับต่ำสุด" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Add Inventory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มสินค้าคงคลังใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลสินค้าคงคลังที่ต้องการเพิ่ม
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อวัตถุดิบ</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น เมล็ดกาแฟ, นม, น้ำตาล" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>จำนวนเริ่มต้น</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หน่วย</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหน่วย" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unitOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addForm.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ระดับการสั่งซื้อใหม่</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        ระบุจำนวนขั้นต่ำที่จะแจ้งเตือนเมื่อสินค้าใกล้หมด
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={addInventoryMutation.isPending}>
                  {addInventoryMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Inventory Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสินค้าคงคลัง</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลสินค้าคงคลัง {currentItem?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อวัตถุดิบ</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>จำนวนปัจจุบัน</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หน่วย</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหน่วย" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unitOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ระดับการสั่งซื้อใหม่</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        ระบุจำนวนขั้นต่ำที่จะแจ้งเตือนเมื่อสินค้าใกล้หมด
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={updateInventoryMutation.isPending}>
                  {updateInventoryMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "receive" ? "รับสินค้าเข้า" : "เบิกจ่ายสินค้า"}
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === "receive" 
                ? `รับสินค้า ${currentItem?.name} เข้าคลัง` 
                : `เบิกสินค้า ${currentItem?.name} ออกจากคลัง`}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...adjustForm}>
            <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={adjustForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จำนวน</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0.01" 
                          step="0.01" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        จำนวน {currentItem?.unit} ที่ต้องการ{adjustmentType === "receive" ? "รับเข้า" : "เบิกออก"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={adjustForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมายเหตุ</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="ระบุเหตุผลหรือหมายเหตุการปรับสต็อก (ถ้ามี)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAdjustDialog(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  variant={adjustmentType === "receive" ? "default" : "destructive"}
                  disabled={stockAdjustMutation.isPending}
                >
                  {stockAdjustMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Transaction History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-3xl h-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ประวัติรายการเคลื่อนไหว</DialogTitle>
            <DialogDescription>
              ประวัติการเพิ่ม/ลดปริมาณสินค้า {currentItem?.name}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingTransactions ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : inventoryTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              ไม่พบประวัติรายการเคลื่อนไหวสำหรับสินค้านี้
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>คงเหลือ</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {transaction.createdAt ? formatDateTime(transaction.createdAt) : "-"}
                    </TableCell>
                    <TableCell>
                      {transaction.type === "receive" ? (
                        <div className="flex items-center text-green-600">
                          <ArrowDownIcon className="h-4 w-4 mr-1" />
                          <span>รับเข้า</span>
                        </div>
                      ) : transaction.type === "use" ? (
                        <div className="flex items-center text-amber-600">
                          <ArrowUpIcon className="h-4 w-4 mr-1" />
                          <span>เบิกออก</span>
                        </div>
                      ) : transaction.type === "order" ? (
                        <div className="flex items-center text-blue-600">
                          <ClipboardList className="h-4 w-4 mr-1" />
                          <span>จากออเดอร์</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          <span>ปรับแก้</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.quantity} {currentItem?.unit}
                    </TableCell>
                    <TableCell>
                      {transaction.quantityAfter} {currentItem?.unit}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.note || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowHistoryDialog(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}