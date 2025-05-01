import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useSocketPointSettings, 
  useSocketMutation, 
  useSocketPointRedemptionRules 
} from '@/hooks/useSocketQuery';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

// กำหนดประเภทข้อมูล PointSetting แบบ inline
interface PointSetting {
  id: number;
  pointCalculationType: string;
  pointRatio: number;
  minimumAmount: number | null;
  applicableProducts: any[] | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// กำหนดประเภทข้อมูล PointRedemptionRule แบบ inline
interface PointRedemptionRule {
  id: number;
  name: string;
  pointCost: number;
  discountValue: number;
  discountType: string;
  minimumOrder: number | null;
  maximumDiscount: number | null;
  applicableProducts: any[] | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  Calculator,
  Check,
  CreditCard,
  Edit,
  Plus,
  PercentIcon,
  Trash2,
  ShoppingCart,
  Coins,
  Package,
  Banknote
} from 'lucide-react';

// Define the validation schema for Point Settings
const pointSettingFormSchema = z.object({
  pointCalculationType: z.string({
    required_error: 'กรุณาเลือกวิธีการคำนวณแต้ม',
  }),
  pointRatio: z.number({
    required_error: 'กรุณากรอกอัตราส่วนแต้ม',
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).positive('อัตราส่วนแต้มต้องเป็นตัวเลขมากกว่า 0'),
  minimumAmount: z.number({
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).optional(),
  applicableProducts: z.any().optional(),
  active: z.boolean().default(true)
});

// Define the validation schema for Point Redemption Rules
const pointRedemptionRuleFormSchema = z.object({
  name: z.string({
    required_error: 'กรุณากรอกชื่อกฎการแลกแต้ม',
  }).min(2, {
    message: 'ชื่อกฎการแลกแต้มต้องมีอย่างน้อย 2 ตัวอักษร',
  }),
  pointCost: z.number({
    required_error: 'กรุณากรอกจำนวนแต้มที่ใช้',
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).positive('จำนวนแต้มต้องเป็นตัวเลขมากกว่า 0'),
  discountType: z.string({
    required_error: 'กรุณาเลือกประเภทส่วนลด',
  }),
  discountValue: z.number({
    required_error: 'กรุณากรอกมูลค่าส่วนลด',
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).positive('มูลค่าส่วนลดต้องเป็นตัวเลขมากกว่า 0'),
  minimumOrder: z.number({
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).optional(),
  maximumDiscount: z.number({
    invalid_type_error: 'กรุณากรอกเป็นตัวเลข',
  }).optional(),
  applicableProducts: z.any().optional(),
  active: z.boolean().default(true)
});

// Infer the type from the schema
type PointSettingFormValues = z.infer<typeof pointSettingFormSchema>;
type PointRedemptionRuleFormValues = z.infer<typeof pointRedemptionRuleFormSchema>;

export default function AdminPointSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ตัวแปรสำหรับการตั้งค่าแต้มสะสม
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pointSettingToDelete, setPointSettingToDelete] = useState<any>(null);
  
  // ตัวแปรสำหรับกฎการแลกแต้ม
  const [activeTab, setActiveTab] = useState<string>("point-earning");
  const [editingRedemptionRuleId, setEditingRedemptionRuleId] = useState<number | null>(null);
  const [isDeleteRedemptionRuleDialogOpen, setIsDeleteRedemptionRuleDialogOpen] = useState(false);
  const [redemptionRuleToDelete, setRedemptionRuleToDelete] = useState<any>(null);

  // ใช้ Socket.IO ในการดึงข้อมูลตั้งค่าแต้มสะสม
  const { 
    data: pointSettings = [], 
    isLoading, 
    error 
  } = useSocketPointSettings<PointSetting[]>();

  // Define form
  const form = useForm<PointSettingFormValues>({
    resolver: zodResolver(pointSettingFormSchema),
    defaultValues: {
      pointCalculationType: 'amount',
      pointRatio: 100,
      minimumAmount: 0,
      applicableProducts: [],
      active: true,
    }
  });

  // ใช้ Socket.IO สำหรับการเพิ่มการตั้งค่าแต้มสะสม
  const createMutation = useSocketMutation<PointSetting, PointSettingFormValues>(
    'createPointSetting',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'บันทึกการตั้งค่าแต้มสะสมเรียบร้อยแล้ว',
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถบันทึกการตั้งค่าแต้มสะสมได้: ${error}`,
        });
      }
    }
  );

  // ใช้ Socket.IO สำหรับการอัปเดตการตั้งค่าแต้มสะสม
  const updateMutation = useSocketMutation<PointSetting, { id: number; data: PointSettingFormValues }>(
    'updatePointSetting',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'อัปเดตการตั้งค่าแต้มสะสมเรียบร้อยแล้ว',
        });
        setEditingId(null);
        form.reset();
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถอัปเดตการตั้งค่าแต้มสะสมได้: ${error}`,
        });
      }
    }
  );

  // ใช้ Socket.IO สำหรับการลบการตั้งค่าแต้มสะสม
  const deleteMutation = useSocketMutation<void, number>(
    'deletePointSetting',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'ลบการตั้งค่าแต้มสะสมเรียบร้อยแล้ว',
        });
        setPointSettingToDelete(null);
        setIsDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถลบการตั้งค่าแต้มสะสมได้: ${error}`,
        });
      }
    }
  );

  // Form submission handler
  function onSubmit(values: PointSettingFormValues) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  // Helper function for editing a point setting
  function handleEdit(pointSetting: PointSetting) {
    setEditingId(pointSetting.id);
    form.reset({
      pointCalculationType: pointSetting.pointCalculationType,
      pointRatio: pointSetting.pointRatio,
      minimumAmount: pointSetting.minimumAmount || 0,
      applicableProducts: pointSetting.applicableProducts || [],
      active: pointSetting.active,
    });
  }

  // Helper function to cancel editing
  function handleCancelEdit() {
    setEditingId(null);
    form.reset({
      pointCalculationType: 'amount',
      pointRatio: 100,
      minimumAmount: 0,
      applicableProducts: [],
      active: true,
    });
  }

  // Helper function to confirm deletion
  function handleDeleteConfirm(pointSetting: PointSetting) {
    setPointSettingToDelete(pointSetting);
    setIsDeleteDialogOpen(true);
  }

  // Helper function to execute deletion
  function confirmDelete() {
    if (pointSettingToDelete) {
      deleteMutation.mutate(pointSettingToDelete.id);
    }
  }

  // Helper function to get the description of the calculation method
  function getCalculationMethodDescription(type: string): string {
    switch (type) {
      case 'amount':
        return 'คำนวณแต้มตามยอดซื้อ';
      case 'order':
        return 'คำนวณแต้มต่อคำสั่งซื้อ';
      case 'item':
        return 'คำนวณแต้มต่อรายการสินค้า';
      default:
        return 'ไม่ระบุ';
    }
  }

  // Helper function to get example calculation based on the point setting
  function getPointCalculationExample(pointSetting: PointSetting): string {
    if (!pointSetting) return '';

    switch (pointSetting.pointCalculationType) {
      case 'amount':
        return `ทุก ฿${pointSetting.pointRatio} = 1 แต้ม` + 
          (pointSetting.minimumAmount ? ` (ยอดซื้อขั้นต่ำ ฿${pointSetting.minimumAmount})` : '');
      case 'order':
        return `${pointSetting.pointRatio} แต้มต่อการสั่งซื้อ 1 ครั้ง`;
      case 'item':
        return `${pointSetting.pointRatio} แต้มต่อรายการสินค้า 1 รายการ`;
      default:
        return 'ไม่ระบุ';
    }
  }

  // Helper function to get the icon for the calculation method
  function getCalculationIcon(type: string) {
    switch (type) {
      case 'amount':
        return <Banknote className="h-5 w-5 text-blue-500" />;
      case 'order':
        return <ShoppingCart className="h-5 w-5 text-green-500" />;
      case 'item':
        return <Package className="h-5 w-5 text-purple-500" />;
      default:
        return <Calculator className="h-5 w-5 text-gray-500" />;
    }
  }
  
  // ฟังก์ชันสำหรับการจัดการกฎการแลกแต้ม

  // ใช้ Socket.IO ในการดึงข้อมูลกฎการแลกแต้ม
  const { 
    data: pointRedemptionRules = [], 
    isLoading: isLoadingRules 
  } = useSocketPointRedemptionRules<PointRedemptionRule[]>();
  
  // สร้างฟอร์มสำหรับกฎการแลกแต้ม
  const redemptionRuleForm = useForm<PointRedemptionRuleFormValues>({
    resolver: zodResolver(pointRedemptionRuleFormSchema),
    defaultValues: {
      name: '',
      pointCost: 100,
      discountType: 'fixed',
      discountValue: 50,
      minimumOrder: 0,
      maximumDiscount: 0,
      applicableProducts: [],
      active: true,
    }
  });
  
  // ใช้ Socket.IO สำหรับการสร้างกฎการแลกแต้มใหม่
  const createRedemptionRuleMutation = useSocketMutation<PointRedemptionRule, PointRedemptionRuleFormValues>(
    'createPointRedemptionRule',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'บันทึกกฎการแลกแต้มเรียบร้อยแล้ว',
        });
        redemptionRuleForm.reset();
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถบันทึกกฎการแลกแต้มได้: ${error}`,
        });
      }
    }
  );
  
  // ใช้ Socket.IO สำหรับการอัปเดตกฎการแลกแต้ม
  const updateRedemptionRuleMutation = useSocketMutation<PointRedemptionRule, { id: number; data: PointRedemptionRuleFormValues }>(
    'updatePointRedemptionRule',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'อัปเดตกฎการแลกแต้มเรียบร้อยแล้ว',
        });
        setEditingRedemptionRuleId(null);
        redemptionRuleForm.reset();
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถอัปเดตกฎการแลกแต้มได้: ${error}`,
        });
      }
    }
  );
  
  // ใช้ Socket.IO สำหรับการลบกฎการแลกแต้ม
  const deleteRedemptionRuleMutation = useSocketMutation<void, number>(
    'deletePointRedemptionRule',
    {
      onSuccess: () => {
        toast({
          title: 'สำเร็จ',
          description: 'ลบกฎการแลกแต้มเรียบร้อยแล้ว',
        });
        setRedemptionRuleToDelete(null);
        setIsDeleteRedemptionRuleDialogOpen(false);
      },
      onError: (error: Error) => {
        toast({
          variant: 'destructive',
          title: 'เกิดข้อผิดพลาด',
          description: `ไม่สามารถลบกฎการแลกแต้มได้: ${error}`,
        });
      }
    }
  );
  
  // ฟังก์ชันสำหรับการส่งฟอร์มกฎการแลกแต้ม
  function onSubmitRedemptionRule(values: PointRedemptionRuleFormValues) {
    if (editingRedemptionRuleId) {
      updateRedemptionRuleMutation.mutate({ id: editingRedemptionRuleId, data: values });
    } else {
      createRedemptionRuleMutation.mutate(values);
    }
  }
  
  // ฟังก์ชันสำหรับการแก้ไขกฎการแลกแต้ม
  function handleEditRedemptionRule(rule: PointRedemptionRule) {
    setEditingRedemptionRuleId(rule.id);
    redemptionRuleForm.reset({
      name: rule.name,
      pointCost: rule.pointCost,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      minimumOrder: rule.minimumOrder || 0,
      maximumDiscount: rule.maximumDiscount || 0,
      applicableProducts: rule.applicableProducts || [],
      active: rule.active,
    });
  }
  
  // ฟังก์ชันสำหรับการยกเลิกการแก้ไขกฎการแลกแต้ม
  function handleCancelRedemptionRuleEdit() {
    setEditingRedemptionRuleId(null);
    redemptionRuleForm.reset({
      name: '',
      pointCost: 100,
      discountType: 'fixed',
      discountValue: 50,
      minimumOrder: 0,
      maximumDiscount: 0,
      applicableProducts: [],
      active: true,
    });
  }
  
  // ฟังก์ชันสำหรับยืนยันการลบกฎการแลกแต้ม
  function handleDeleteRedemptionRuleConfirm(rule: PointRedemptionRule) {
    setRedemptionRuleToDelete(rule);
    setIsDeleteRedemptionRuleDialogOpen(true);
  }
  
  // ฟังก์ชันสำหรับดำเนินการลบกฎการแลกแต้ม
  function confirmDeleteRedemptionRule() {
    if (redemptionRuleToDelete) {
      deleteRedemptionRuleMutation.mutate(redemptionRuleToDelete.id);
    }
  }
  
  // ฟังก์ชันสำหรับการแสดงรายละเอียดประเภทส่วนลด
  function getDiscountTypeLabel(type: string): string {
    switch (type) {
      case 'fixed':
        return 'ส่วนลดแบบบาท';
      case 'percentage':
        return 'ส่วนลดแบบเปอร์เซ็นต์';
      default:
        return 'ไม่ระบุ';
    }
  }
  
  // ฟังก์ชันสำหรับการแสดงรายละเอียดส่วนลด
  function getDiscountDescription(rule: PointRedemptionRule): string {
    if (!rule) return '';
    
    if (rule.discountType === 'fixed') {
      return `ส่วนลด ${rule.discountValue} บาท` + 
             (rule.minimumOrder ? ` (ยอดซื้อขั้นต่ำ ${rule.minimumOrder} บาท)` : '');
    } else {
      return `ส่วนลด ${rule.discountValue}%` + 
             (rule.maximumDiscount ? ` (สูงสุดไม่เกิน ${rule.maximumDiscount} บาท)` : '') +
             (rule.minimumOrder ? ` (ยอดซื้อขั้นต่ำ ${rule.minimumOrder} บาท)` : '');
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-3xl font-bold">จัดการการตั้งค่าแต้มสะสม</h1>
      <Separator />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="point-earning">
            <Coins className="mr-2 h-4 w-4" />
            การได้รับแต้ม
          </TabsTrigger>
          <TabsTrigger value="point-redemption">
            <PercentIcon className="mr-2 h-4 w-4" />
            การแลกแต้ม
          </TabsTrigger>
        </TabsList>
        
        {/* ส่วนของการจัดการการได้รับแต้ม */}
        <TabsContent value="point-earning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'แก้ไขการตั้งค่าแต้มสะสม' : 'เพิ่มการตั้งค่าแต้มสะสมใหม่'}</CardTitle>
                <CardDescription>
                  {editingId 
                    ? 'แก้ไขวิธีการคำนวณแต้มสะสมที่มีอยู่' 
                    : 'สร้างการตั้งค่าใหม่สำหรับการคำนวณแต้มสะสม'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pointCalculationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>วิธีการคำนวณแต้ม</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกวิธีการคำนวณแต้ม" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="amount">คำนวณตามยอดซื้อ (บาท)</SelectItem>
                              <SelectItem value="order">คำนวณต่อคำสั่งซื้อ</SelectItem>
                              <SelectItem value="item">คำนวณต่อรายการสินค้า</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'amount' && 'สมาชิกจะได้รับแต้มตามยอดซื้อ เช่น ทุกๆ 100 บาท = 1 แต้ม'}
                            {field.value === 'order' && 'สมาชิกจะได้รับแต้มต่อการสั่งซื้อ 1 ครั้ง เช่น ทุกคำสั่งซื้อ = 10 แต้ม'}
                            {field.value === 'item' && 'สมาชิกจะได้รับแต้มต่อรายการสินค้า เช่น ทุกรายการ = 1 แต้ม'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pointRatio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>อัตราส่วนแต้ม</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            {form.watch('pointCalculationType') === 'amount' && 'จำนวนเงิน (บาท) ต่อ 1 แต้ม เช่น ทุกๆ 100 บาท = 1 แต้ม'}
                            {form.watch('pointCalculationType') === 'order' && 'จำนวนแต้มที่จะได้รับต่อ 1 คำสั่งซื้อ'}
                            {form.watch('pointCalculationType') === 'item' && 'จำนวนแต้มที่จะได้รับต่อ 1 รายการสินค้า'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('pointCalculationType') === 'amount' && (
                      <FormField
                        control={form.control}
                        name="minimumAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ยอดซื้อขั้นต่ำ (บาท)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                value={field.value || 0}
                              />
                            </FormControl>
                            <FormDescription>
                              ยอดซื้อขั้นต่ำที่จะได้รับแต้ม (0 = ไม่มีขั้นต่ำ)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              สถานะการใช้งาน
                            </FormLabel>
                            <FormDescription>
                              เปิดใช้งานการตั้งค่านี้ (จะปิดการใช้งานการตั้งค่าอื่นโดยอัตโนมัติ)
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      {editingId ? (
                        <>
                          <Button type="submit">บันทึกการแก้ไข</Button>
                          <Button type="button" variant="outline" onClick={handleCancelEdit}>
                            ยกเลิก
                          </Button>
                        </>
                      ) : (
                        <Button type="submit" className="w-full">
                          บันทึกการตั้งค่า
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>การตั้งค่าแต้มสะสมทั้งหมด</CardTitle>
                <CardDescription>
                  รายการการตั้งค่าแต้มสะสมที่มีอยู่ในระบบ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-6">กำลังโหลดข้อมูล...</div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
                    <AlertDescription>
                      ไม่สามารถโหลดข้อมูลการตั้งค่าแต้มสะสมได้
                    </AlertDescription>
                  </Alert>
                ) : pointSettings && pointSettings.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    ยังไม่มีการตั้งค่าแต้มสะสม
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pointSettings && pointSettings.map((setting: PointSetting) => (
                      <Card key={setting.id} className={setting.active ? 'border-primary' : ''}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {getCalculationIcon(setting.pointCalculationType)}
                              <CardTitle className="text-base">
                                {getCalculationMethodDescription(setting.pointCalculationType)}
                              </CardTitle>
                            </div>
                            {setting.active && (
                              <Badge className="ml-2" variant="default">กำลังใช้งาน</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="text-sm text-muted-foreground">
                            {getPointCalculationExample(setting)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            สร้างเมื่อ: {new Date(setting.createdAt).toLocaleString('th-TH')}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(setting)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            แก้ไข
                          </Button>
                          {!setting.active && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteConfirm(setting)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              ลบ
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* ส่วนของการจัดการการแลกแต้ม */}
        <TabsContent value="point-redemption" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingRedemptionRuleId ? 'แก้ไขกฎการแลกแต้ม' : 'เพิ่มกฎการแลกแต้มใหม่'}</CardTitle>
                <CardDescription>
                  {editingRedemptionRuleId 
                    ? 'แก้ไขกฎการแลกแต้มที่มีอยู่' 
                    : 'สร้างกฎการแลกแต้มใหม่สำหรับการให้ส่วนลด'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...redemptionRuleForm}>
                  <form onSubmit={redemptionRuleForm.handleSubmit(onSubmitRedemptionRule)} className="space-y-4">
                    <FormField
                      control={redemptionRuleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อกฎการแลกแต้ม</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="เช่น ส่วนลด 50 บาท - 100 แต้ม" />
                          </FormControl>
                          <FormDescription>
                            ชื่อที่จะแสดงให้ลูกค้าเห็นในตัวเลือกการแลกแต้ม
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={redemptionRuleForm.control}
                      name="pointCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>จำนวนแต้มที่ใช้</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            จำนวนแต้มที่ลูกค้าต้องใช้เพื่อรับส่วนลด
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={redemptionRuleForm.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ประเภทส่วนลด</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภทส่วนลด" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fixed">ส่วนลดเป็นบาท</SelectItem>
                              <SelectItem value="percentage">ส่วนลดเป็นเปอร์เซ็นต์</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'fixed' && 'ส่วนลดเป็นจำนวนเงินบาท เช่น ลด 50 บาท'}
                            {field.value === 'percentage' && 'ส่วนลดเป็นเปอร์เซ็นต์ของยอดซื้อ เช่น ลด 10%'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={redemptionRuleForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>มูลค่าส่วนลด</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            {redemptionRuleForm.watch('discountType') === 'fixed' 
                              ? 'จำนวนส่วนลดเป็นบาท' 
                              : 'จำนวนส่วนลดเป็นเปอร์เซ็นต์ (%)'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={redemptionRuleForm.control}
                      name="minimumOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ยอดซื้อขั้นต่ำ (บาท)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormDescription>
                            ยอดซื้อขั้นต่ำที่สามารถใช้ส่วนลดนี้ได้ (0 = ไม่มีขั้นต่ำ)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {redemptionRuleForm.watch('discountType') === 'percentage' && (
                      <FormField
                        control={redemptionRuleForm.control}
                        name="maximumDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ส่วนลดสูงสุด (บาท)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                value={field.value || 0}
                              />
                            </FormControl>
                            <FormDescription>
                              จำนวนเงินส่วนลดสูงสุดที่จะได้รับจากการแลกแต้ม (0 = ไม่จำกัด)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={redemptionRuleForm.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              สถานะการใช้งาน
                            </FormLabel>
                            <FormDescription>
                              เปิดใช้งานกฎการแลกแต้มนี้ (กฎการแลกแต้มที่ไม่ได้เปิดใช้งานจะไม่แสดงให้ลูกค้าเห็น)
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-4">
                      {editingRedemptionRuleId ? (
                        <>
                          <Button type="submit">บันทึกการแก้ไข</Button>
                          <Button type="button" variant="outline" onClick={handleCancelRedemptionRuleEdit}>
                            ยกเลิก
                          </Button>
                        </>
                      ) : (
                        <Button type="submit" className="w-full">
                          บันทึกกฎการแลกแต้ม
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>กฎการแลกแต้มทั้งหมด</CardTitle>
                <CardDescription>
                  รายการกฎการแลกแต้มที่มีอยู่ในระบบ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRules ? (
                  <div className="text-center py-6">กำลังโหลดข้อมูล...</div>
                ) : pointRedemptionRules && pointRedemptionRules.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    ยังไม่มีกฎการแลกแต้ม
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pointRedemptionRules && pointRedemptionRules.map((rule: PointRedemptionRule) => (
                      <Card key={rule.id} className={rule.active ? 'border-primary' : ''}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <PercentIcon className="h-5 w-5 text-amber-500" />
                              <CardTitle className="text-base">
                                {rule.name}
                              </CardTitle>
                            </div>
                            {rule.active ? (
                              <Badge className="ml-2" variant="default">กำลังใช้งาน</Badge>
                            ) : (
                              <Badge className="ml-2" variant="outline">ไม่ได้ใช้งาน</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="text-sm font-medium">
                            {rule.pointCost} แต้ม = {getDiscountDescription(rule)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            สร้างเมื่อ: {new Date(rule.createdAt).toLocaleString('th-TH')}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditRedemptionRule(rule)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            แก้ไข
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteRedemptionRuleConfirm(rule)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            ลบ
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Delete Point Setting Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณต้องการลบการตั้งค่าแต้มสะสมนี้หรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การกระทำนี้ไม่สามารถย้อนกลับได้ การตั้งค่าแต้มสะสมนี้จะถูกลบออกจากระบบถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              ลบการตั้งค่า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Redemption Rule Confirmation Dialog */}
      <AlertDialog open={isDeleteRedemptionRuleDialogOpen} onOpenChange={setIsDeleteRedemptionRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณต้องการลบกฎการแลกแต้มนี้หรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การกระทำนี้ไม่สามารถย้อนกลับได้ กฎการแลกแต้มนี้จะถูกลบออกจากระบบถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRedemptionRule} className="bg-red-500 hover:bg-red-600">
              ลบกฎการแลกแต้ม
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}