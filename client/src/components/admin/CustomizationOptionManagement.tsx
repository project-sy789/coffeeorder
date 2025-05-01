import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CustomizationOption } from '@shared/schema';
import { 
  useSocketQuery, 
  useSocketMutation 
} from '@/hooks/useSocketQuery';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, PenLine, Trash2, Loader2, Layers, Settings, CirclePlus } from "lucide-react";

// schemas
const customizationSchema = z.object({
  name: z.string().min(1, "ชื่อตัวเลือกต้องไม่ว่างเปล่า"),
  type: z.string().min(1, "กรุณาเลือกประเภท"),
  price: z.number().nullable(),
  isDefault: z.boolean().default(false),
});

const typeSchema = z.object({
  type: z.string()
    .min(2, "รหัสหมวดหมู่ต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(30, "รหัสหมวดหมู่ต้องไม่เกิน 30 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "รหัสหมวดหมู่ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น ไม่มีช่องว่าง ใช้ _ แทนช่องว่างได้"),
  label: z.string()
    .min(1, "ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง")
    .max(50, "ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร"),
});

const editTypeSchema = z.object({
  oldType: z.string(),
  newType: z.string()
    .min(2, "รหัสภายในต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(30, "รหัสภายในต้องไม่เกิน 30 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "รหัสภายในต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น ไม่มีช่องว่าง ใช้ _ แทนช่องว่างได้"),
  newLabel: z.string()
    .min(1, "ชื่อหมวดหมู่ต้องไม่เป็นค่าว่าง")
    .max(50, "ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร"),
});

type FormValues = z.infer<typeof customizationSchema>;
type TypeFormValues = z.infer<typeof typeSchema>;
type EditTypeFormValues = z.infer<typeof editTypeSchema>;
type CustomizationType = {
  value: string;
  label: string;
};

export default function CustomizationOptionManagement() {
  const [activeTab, setActiveTab] = useState('sugar_level');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [isEditTypeDialogOpen, setIsEditTypeDialogOpen] = useState(false);
  const [isDeleteTypeDialogOpen, setIsDeleteTypeDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CustomizationOption | null>(null);
  const [typeToEdit, setTypeToEdit] = useState<string | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [typeSettings, setTypeSettings] = useState<Record<string, { multipleSelection: boolean }>>({});
  const [customTypes, setCustomTypes] = useState<CustomizationType[]>([
    { value: 'sugar_level', label: 'ระดับความหวาน' },
    { value: 'milk_type', label: 'ชนิดนม' },
    { value: 'temperature', label: 'อุณหภูมิ' },
    { value: 'toppings', label: 'ท็อปปิ้ง' },
    { value: 'extras', label: 'รายการเสริม' },
  ]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for all customization options ด้วย Socket.IO
  const { data: options = [], isLoading } = useSocketQuery<CustomizationOption[]>(
    'getCustomizationOptions',
    {},
    {
      select: (data: CustomizationOption[]) => data,
    }
  );
  
  // Query for customization types ด้วย Socket.IO
  const { data: types = [] } = useSocketQuery<string[]>(
    'getCustomizationTypes',
    {},
    {
      select: (data) => {
        if (Array.isArray(data)) {
          return data.map(type => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
          }));
        }
        return [];
      }
    }
  );
  
  // Query for customization type settings ด้วย Socket.IO
  const { data: typeSettingsData = {} as Record<string, { multipleSelection: boolean }> } = useSocketQuery<Record<string, { multipleSelection: boolean }>>(
    'getCustomizationTypeSettings',
    {}
  );
  
  // Query for customization type labels ด้วย Socket.IO
  const { data: typeLabelsData = {} as Record<string, string> } = useSocketQuery<Record<string, string>>(
    'getCustomizationTypeLabels',
    {}
  );
  
  // State สำหรับเก็บ type display names
  const [typeDisplayNames, setTypeDisplayNames] = useState<Record<string, string>>({});
  
  // Update typeSettings when data changes
  useEffect(() => {
    if (typeSettingsData && Object.keys(typeSettingsData).length > 0) {
      setTypeSettings(typeSettingsData as Record<string, { multipleSelection: boolean }>);
    }
  }, [typeSettingsData]);
  
  // Update typeDisplayNames when typeLabelsData changes
  useEffect(() => {
    if (typeLabelsData && Object.keys(typeLabelsData).length > 0) {
      setTypeDisplayNames(typeLabelsData);
    }
  }, [typeLabelsData]);
  
  // ใช้ useEffect เพื่อจัดการกับ types ที่เปลี่ยนแปลง
  useEffect(() => {
    if (types.length > 0) {
      setCustomTypes(types);
    }
  }, [types]);
  
  // Forms
  const addForm = useForm<FormValues>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      name: '',
      type: activeTab,
      price: null,
      isDefault: false,
    },
  });
  
  const editForm = useForm<FormValues>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      name: '',
      type: '',
      price: null,
      isDefault: false,
    },
  });
  
  // Type management forms
  const addTypeForm = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      type: '',
      label: '',
    },
  });
  
  const editTypeForm = useForm<EditTypeFormValues>({
    resolver: zodResolver(editTypeSchema),
    defaultValues: {
      oldType: '',
      newType: '',
      newLabel: '',
    },
  });
  
  // Mutations ด้วย Socket.IO
  const addMutation = useSocketMutation<FormValues, any>('createCustomizationOption', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      toast({
        title: "เพิ่มตัวเลือกเรียบร้อย",
        description: "ตัวเลือกใหม่ถูกเพิ่มเข้าสู่ระบบแล้ว",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
  });
  
  const editMutation = useSocketMutation<FormValues & { id: number }, any>('updateCustomizationOption', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      toast({
        title: "แก้ไขตัวเลือกเรียบร้อย",
        description: "ตัวเลือกถูกแก้ไขเรียบร้อยแล้ว",
      });
      setIsEditDialogOpen(false);
    },
  });
  
  const deleteMutation = useSocketMutation<number, any>('deleteCustomizationOption', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      toast({
        title: "ลบตัวเลือกเรียบร้อย",
        description: "ตัวเลือกถูกลบออกจากระบบเรียบร้อยแล้ว",
      });
      setIsDeleteDialogOpen(false);
    },
  });
  
  // Type management mutations ด้วย Socket.IO
  const addTypeMutation = useSocketMutation<{ type: string, label: string }, any>('createCustomizationType', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationTypes'] });
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      setIsAddTypeDialogOpen(false);
      addTypeForm.reset();
      toast({
        title: "เพิ่มหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ตัวเลือกใหม่ถูกเพิ่มเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มหมวดหมู่ได้",
        variant: "destructive",
      });
    },
  });

  const updateTypeMutation = useSocketMutation<{ oldType: string, newType: string, newLabel: string }, any>('updateCustomizationType', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationTypes'] });
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      setIsEditTypeDialogOpen(false);
      editTypeForm.reset();
      toast({
        title: "แก้ไขหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ตัวเลือกถูกแก้ไขเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขหมวดหมู่ได้",
        variant: "destructive",
      });
    },
  });

  const deleteTypeMutation = useSocketMutation<string, any>('deleteCustomizationType', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationTypes'] });
      queryClient.invalidateQueries({ queryKey: ['getCustomizationOptions'] });
      queryClient.invalidateQueries({ queryKey: ['getCustomizationTypeSettings'] });
      setIsDeleteTypeDialogOpen(false);
      setTypeToDelete(null);
      toast({
        title: "ลบหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ตัวเลือกถูกลบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบหมวดหมู่ได้ กรุณาตรวจสอบว่าไม่มีตัวเลือกในหมวดหมู่นี้",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating type settings ด้วย Socket.IO
  const updateTypeSettingsMutation = useSocketMutation<{ type: string, settings: { multipleSelection: boolean } }, any>('updateCustomizationTypeSettings', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getCustomizationTypeSettings'] });
      toast({
        title: "อัปเดตการตั้งค่าเรียบร้อย",
        description: "การตั้งค่าหมวดหมู่ถูกอัปเดตเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตการตั้งค่าหมวดหมู่ได้",
        variant: "destructive",
      });
    },
  });
  
  // ใช้ useEffect เพื่อกำหนดค่าเริ่มต้นสำหรับฟอร์มเพิ่มประเภท
  useEffect(() => {
    // กำหนดค่าเริ่มต้นเพื่อป้องกันไม่ให้ Dialog เด้งขึ้นมาเอง
    addTypeForm.reset({ 
      type: 'dummy',
      label: 'dummy'
    });
  }, [addTypeForm]);
  
  // Helper to get options by type
  const getOptionsByType = (type: string) => {
    if (!options || !Array.isArray(options)) {
      return [];
    }
    return options.filter(option => option.type === type);
  };
  
  // Form submission handlers
  const onAddSubmit = (data: FormValues) => {
    // เพิ่มการแจ้งเตือนเมื่อเพิ่มตัวเลือกที่เป็นค่าเริ่มต้น
    if (data.isDefault === true) {
      toast({
        title: "การตั้งค่าเริ่มต้น",
        description: `ตัวเลือก "${data.name}" จะถูกตั้งเป็นค่าเริ่มต้นสำหรับหมวดหมู่ "${data.type}" (ตัวเลือกอื่นๆ จะถูกยกเลิกค่าเริ่มต้นโดยอัตโนมัติ)`,
      });
    }
    
    addMutation.mutate(data);
  };
  
  const onEditSubmit = (data: FormValues) => {
    if (selectedOption) {
      // เพิ่มการแจ้งเตือนเมื่อมีการตั้งค่าเริ่มต้น
      if (data.isDefault === true) {
        toast({
          title: "การตั้งค่าเริ่มต้น",
          description: `ตัวเลือก "${data.name}" จะถูกตั้งเป็นค่าเริ่มต้นสำหรับหมวดหมู่ "${data.type}" (ตัวเลือกอื่นๆ จะถูกยกเลิกค่าเริ่มต้นโดยอัตโนมัติ)`,
        });
      }
      
      console.log("Submitting edit form with data:", data);
      
      // ตรวจสอบให้แน่ใจว่า isDefault มีค่าที่ถูกต้อง
      const formData = {
        ...data,
        id: selectedOption.id,
        isDefault: data.isDefault === true ? true : false  // แปลงให้เป็น boolean อย่างชัดเจน
      };
      
      console.log("Submitting to API with data:", formData);
      editMutation.mutate(formData);
    }
  };
  
  const handleEditOption = (option: CustomizationOption) => {
    setSelectedOption(option);
    editForm.reset({
      name: option.name,
      type: option.type,
      price: option.price,
      isDefault: option.isDefault || false,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteOption = (option: CustomizationOption) => {
    setSelectedOption(option);
    setIsDeleteDialogOpen(true);
  };
  
  // Type management handlers
  const onAddTypeSubmit = (data: TypeFormValues) => {
    addTypeMutation.mutate({
      type: data.type,
      label: data.label
    });
  };
  
  const onEditTypeSubmit = (data: EditTypeFormValues) => {
    updateTypeMutation.mutate({
      oldType: data.oldType,
      newType: data.newType,
      newLabel: data.newLabel
    });
  };
  
  const handleEditType = (type: string) => {
    setTypeToEdit(type);
    // หาชื่อหมวดหมู่ (label) ที่แสดงของ type
    const typeLabel = customTypes.find(t => t.value === type)?.label || '';
    editTypeForm.reset({
      oldType: type,
      newType: type,
      newLabel: typeLabel
    });
    setIsEditTypeDialogOpen(true);
  };
  
  const handleDeleteType = (type: string) => {
    setTypeToDelete(type);
    setIsDeleteTypeDialogOpen(true);
  };
  
  // Handler for toggling multiple selection
  const handleToggleMultipleSelection = (type: string) => {
    const currentSetting = typeSettings[type]?.multipleSelection || false;
    updateTypeSettingsMutation.mutate({
      type,
      settings: { multipleSelection: !currentSetting }
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-dark)] flex items-center gap-2">
            <CirclePlus size={28} />
            <span>จัดการตัวเลือกเพิ่มเติม</span>
          </h1>
          <p className="text-gray-500">จัดการตัวเลือกปรับแต่งของเครื่องดื่มที่ลูกค้าสามารถเลือกได้</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setIsAddTypeDialogOpen(true);
            }}
            variant="outline"
            className="gap-1 shadow-sm hover:shadow transition-all"
          >
            <Settings className="w-4 h-4 mr-1" />
            จัดการหมวดหมู่
          </Button>
          <Button 
            onClick={() => {
              addForm.reset({ name: '', type: activeTab, price: null, isDefault: false });
              setIsAddDialogOpen(true);
            }}
            className="gap-1 shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            เพิ่มตัวเลือกใหม่
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle>หมวดหมู่ตัวเลือกเพิ่มเติม</CardTitle>
          <CardDescription>เลือกหมวดหมู่เพื่อจัดการตัวเลือกสำหรับหมวดนั้นๆ</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="sugar_level" value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Select 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="sm:hidden"
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {customTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ScrollArea className="w-full hidden sm:block" type="always">
                  <div className="whitespace-nowrap pb-3">
                    {customTypes.map(type => (
                      <Button
                        key={type.value}
                        variant={activeTab === type.value ? "default" : "outline"}
                        className="mr-2 last:mr-0 py-1 h-9"
                        onClick={() => setActiveTab(type.value)}
                      >
                        {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="h-2.5" />
                </ScrollArea>
              </div>
            </div>

            {customTypes.map((type) => (
              <TabsContent key={type.value} value={type.value}>
                {getOptionsByType(type.value).length > 0 ? (
                  <div>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                      <div className="flex items-center mb-3 sm:mb-0">
                        <h3 className="text-lg font-medium mr-3">
                          ตัวเลือกสำหรับ {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}
                        </h3>
                        <Badge variant="outline" className="mr-3">
                          {getOptionsByType(type.value).length} รายการ
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-muted/10">
                          <Switch
                            id={`multi-select-${type.value}`}
                            checked={typeSettings[type.value]?.multipleSelection || false}
                            onCheckedChange={() => handleToggleMultipleSelection(type.value)}
                          />
                          <Label htmlFor={`multi-select-${type.value}`} className="cursor-pointer">
                            เลือกได้หลายรายการ {typeSettings[type.value]?.multipleSelection ? 
                              <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">เปิดใช้งาน</Badge> : 
                              <Badge variant="outline" className="ml-2">ปิดใช้งาน</Badge>}
                          </Label>
                        </div>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ชื่อตัวเลือก</TableHead>
                          <TableHead>ราคา (บาท)</TableHead>
                          <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getOptionsByType(type.value).map((option) => (
                          <TableRow key={option.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {option.name}
                                {option.isDefault && (
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                    ค่าเริ่มต้น
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{option.price !== null ? option.price : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditOption(option)}
                                  className="h-8 px-2 text-xs"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  แก้ไข
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteOption(option)}
                                  className="h-8 px-2 text-xs"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  ลบ
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Card className="bg-muted/40 border-dashed">
                    <CardContent className="pt-6 flex flex-col items-center justify-center p-10 text-muted-foreground text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      <h3 className="mt-4 text-lg font-medium">ไม่พบตัวเลือกในหมวดนี้</h3>
                      <p className="mt-2 mb-6 text-sm">คุณยังไม่ได้เพิ่มตัวเลือกสำหรับ {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label} กรุณาเพิ่มตัวเลือกใหม่</p>
                      <Button
                        onClick={() => {
                          addForm.reset({ name: '', type: type.value, price: null, isDefault: false });
                          setIsAddDialogOpen(true);
                        }}
                      >
                        เพิ่มตัวเลือกใหม่
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* เพิ่มตัวเลือกใหม่ Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มตัวเลือกใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลตัวเลือกที่ต้องการเพิ่ม
            </DialogDescription>
          </DialogHeader>

          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อตัวเลือก</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ประเภท</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคา (บาท)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : Number(e.target.value);
                          field.onChange(value);
                        }}
                        value={field.value === null ? '' : field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {addForm.watch('type') === 'type' && 'ราคาเพิ่มเติมสำหรับเครื่องดื่มประเภทนี้ (ปกติ: ร้อน = 0, เย็น = 10)'}
                      {addForm.watch('type') === 'sugar_level' && 'ราคาเพิ่มเติมสำหรับระดับความหวานนี้ (ปกติเป็น 0)'}
                      {addForm.watch('type') === 'milk_type' && 'ราคาเพิ่มเติมสำหรับนมประเภทนี้ (ปกติ: นมสด/นมข้น = 0, นมอัลมอนด์ = 15)'}
                      {addForm.watch('type') === 'topping' && 'ราคาเพิ่มเติมสำหรับท็อปปิ้ง (เช่น วิปครีม = 10)'}
                      {addForm.watch('type') === 'extra' && 'ราคาเพิ่มเติมสำหรับรายการเสริม (เช่น เพิ่ม shot กาแฟ = 15)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>ตั้งเป็นค่าเริ่มต้น</FormLabel>
                      <FormDescription>
                        ตัวเลือกนี้จะถูกเลือกเป็นค่าเริ่มต้นเมื่อเพิ่มสินค้าใหม่ (สำหรับแต่ละหมวดหมู่จะมีค่าเริ่มต้นได้เพียง 1 รายการ)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* แก้ไขตัวเลือก Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขตัวเลือก</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลตัวเลือก
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อตัวเลือก</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ประเภท</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคา (บาท)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : Number(e.target.value);
                          field.onChange(value);
                        }}
                        value={field.value === null ? '' : field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {editForm.watch('type') === 'temperature' && 'ราคาเพิ่มเติมสำหรับเครื่องดื่มประเภทนี้ (ปกติ: ร้อน = 0, เย็น = 10)'}
                      {editForm.watch('type') === 'sugar_level' && 'ราคาเพิ่มเติมสำหรับระดับความหวานนี้ (ปกติเป็น 0)'}
                      {editForm.watch('type') === 'milk_type' && 'ราคาเพิ่มเติมสำหรับนมประเภทนี้ (ปกติ: นมสด/นมข้น = 0, นมอัลมอนด์ = 15)'}
                      {editForm.watch('type') === 'toppings' && 'ราคาเพิ่มเติมสำหรับท็อปปิ้ง (เช่น วิปครีม = 10)'}
                      {editForm.watch('type') === 'extras' && 'ราคาเพิ่มเติมสำหรับรายการเสริม (เช่น เพิ่ม shot กาแฟ = 15)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>ตั้งเป็นค่าเริ่มต้น</FormLabel>
                      <FormDescription>
                        ตัวเลือกนี้จะถูกเลือกเป็นค่าเริ่มต้นเมื่อเพิ่มสินค้าใหม่ (สำหรับแต่ละหมวดหมู่จะมีค่าเริ่มต้นได้เพียง 1 รายการ)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ลบตัวเลือก Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบตัวเลือก "{selectedOption?.name}" ใช่หรือไม่?
              <br />
              การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedOption) {
                  deleteMutation.mutate(selectedOption.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                'ลบตัวเลือก'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* จัดการหมวดหมู่ Dialog */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5" />
              จัดการหมวดหมู่ตัวเลือก
            </DialogTitle>
            <DialogDescription>
              จัดการหมวดหมู่ตัวเลือกทั้งหมดในระบบ และเพิ่มหมวดหมู่ใหม่
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-6 my-2">
            {/* รายการหมวดหมู่ที่มีอยู่แล้ว */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                หมวดหมู่ที่มีอยู่ในระบบ
              </h3>
              <div className="rounded-md border shadow-sm">
                <div className="max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 font-semibold">#</TableHead>
                        <TableHead className="font-semibold">ชื่อหมวดหมู่ (ภาษาไทย)</TableHead>
                        <TableHead className="font-semibold">รหัสภายใน (ภาษาอังกฤษ)</TableHead>
                        <TableHead className="font-semibold">สถานะ</TableHead>
                        <TableHead className="text-right font-semibold">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customTypes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            ไม่พบข้อมูลหมวดหมู่ในระบบ
                          </TableCell>
                        </TableRow>
                      ) : (
                        customTypes.map((type, index) => {
                          const isDefaultType = ['sugar_level', 'milk_type', 'temperature', 'toppings', 'extras'].includes(type.value);
                          return (
                            <TableRow key={type.value} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>{typeDisplayNames && typeDisplayNames[type.value] ? typeDisplayNames[type.value] : type.label}</TableCell>
                              <TableCell>
                                <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">{type.value}</code>
                              </TableCell>
                              <TableCell>
                                {isDefaultType ? (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">หมวดหมู่พื้นฐาน</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-50 text-green-800 hover:bg-green-50">หมวดหมู่เพิ่มเติม</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant={isDefaultType ? "secondary" : "outline"} 
                                    size="sm"
                                    onClick={() => handleEditType(type.value)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    <PenLine className="w-3.5 h-3.5 mr-1" />
                                    แก้ไข
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteType(type.value)}
                                    className="h-8 px-2 text-xs"
                                    disabled={isDefaultType}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    ลบ
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* ฟอร์มเพิ่มหมวดหมู่ใหม่ */}
            <div className="rounded-md border p-5 mt-4 bg-card shadow-sm">
              <h3 className="mb-4 text-lg font-medium flex items-center gap-2">
                <CirclePlus className="h-5 w-5 text-primary/80" />
                เพิ่มหมวดหมู่ใหม่
              </h3>
              <Form {...addTypeForm}>
                <form onSubmit={addTypeForm.handleSubmit(onAddTypeSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={addTypeForm.control}
                        name="label"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ชื่อหมวดหมู่ (แสดงในระบบ)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="เช่น ขนาด, อุณหภูมิ, เพิ่มเติม" />
                            </FormControl>
                            <FormDescription>
                              ชื่อที่จะแสดงให้ผู้ใช้งานเห็นในระบบ
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addTypeForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>รหัสภายใน (ภาษาอังกฤษ)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="เช่น size, temperature, extra" />
                            </FormControl>
                            <FormDescription>
                              ใช้เฉพาะตัวอักษรภาษาอังกฤษและเครื่องหมาย _ เท่านั้น
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={addTypeMutation.isPending} 
                        className="w-full sm:w-auto"
                        size="lg"
                      >
                        {addTypeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังบันทึก...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มหมวดหมู่
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <h4 className="font-medium flex items-center gap-2 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                ข้อควรระวัง
              </h4>
              <p className="text-sm">
                หมวดหมู่พื้นฐาน (ระดับความหวาน, ชนิดนม, อุณหภูมิ, ท็อปปิ้ง, รายการเสริม) ไม่สามารถลบออกจากระบบได้ แต่สามารถแก้ไขชื่อที่แสดงได้
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* แก้ไขหมวดหมู่ Dialog */}
      <Dialog open={isEditTypeDialogOpen} onOpenChange={setIsEditTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขหมวดหมู่ตัวเลือก</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลหมวดหมู่ตัวเลือก
            </DialogDescription>
          </DialogHeader>

          <Form {...editTypeForm}>
            <form onSubmit={editTypeForm.handleSubmit(onEditTypeSubmit)} className="space-y-6">
              <FormField
                control={editTypeForm.control}
                name="oldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมวดหมู่เดิม</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editTypeForm.control}
                name="newType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสภายใน (ภาษาอังกฤษ)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      รหัสภายในต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น ไม่มีช่องว่าง ใช้ _ แทนช่องว่างได้
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editTypeForm.control}
                name="newLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อหมวดหมู่ (ชื่อที่แสดง)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      ชื่อหมวดหมู่ที่จะแสดงในหน้าเลือกตัวเลือก สามารถใช้ภาษาไทยได้
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateTypeMutation.isPending}>
                  {updateTypeMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ลบหมวดหมู่ Alert */}
      <AlertDialog open={isDeleteTypeDialogOpen} onOpenChange={setIsDeleteTypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ "{typeToDelete && typeDisplayNames && typeDisplayNames[typeToDelete] ? typeDisplayNames[typeToDelete] : typeToDelete}" ใช่หรือไม่?
              <br />
              <strong className="text-destructive">หมายเหตุ: </strong>การลบหมวดหมู่จะลบตัวเลือกทั้งหมดในหมวดหมู่นี้ด้วย
              <br />
              การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (typeToDelete) {
                  deleteTypeMutation.mutate(typeToDelete);
                }
              }}
              disabled={deleteTypeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTypeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                'ลบหมวดหมู่'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}