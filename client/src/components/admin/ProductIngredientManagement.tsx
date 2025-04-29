import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Product, Inventory } from '@shared/schema';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, AlertTriangle, Package, RefreshCw, Layers } from 'lucide-react';

const ingredientSchema = z.object({
  productId: z.number().min(1, "กรุณาเลือกสินค้า"),
  inventoryId: z.number().min(1, "กรุณาเลือกวัตถุดิบ"),
  quantityUsed: z.number().min(0.01, "ปริมาณการใช้ต้องมากกว่า 0")
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

export default function ProductIngredientManagement() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Products query
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    select: (data: Product[]) => data
  });

  // Inventory query
  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/inventory'],
    select: (data: Inventory[]) => data
  });
  
  // Product ingredients query - depends on selected product
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['/api/products', selectedProductId, 'ingredients'],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data } = await apiRequest<any[]>('GET', `/api/products/${selectedProductId}/ingredients`);
      return data || [];
    },
    enabled: !!selectedProductId
  });
  
  // Form for adding ingredients
  const addForm = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      productId: selectedProductId || 0,
      inventoryId: 0,
      quantityUsed: 0
    }
  });
  
  // Form for editing ingredients
  const editForm = useForm<IngredientFormValues & { id: number }>({
    resolver: zodResolver(ingredientSchema.extend({ id: z.number() })),
    defaultValues: {
      id: 0,
      productId: selectedProductId || 0,
      inventoryId: 0,
      quantityUsed: 0
    }
  });
  
  // Update form default values when selected product changes
  useEffect(() => {
    if (selectedProductId) {
      addForm.setValue('productId', selectedProductId);
    }
  }, [selectedProductId, addForm]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: IngredientFormValues) => {
      const { data: response } = await apiRequest('POST', '/api/products/ingredients', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', selectedProductId, 'ingredients'] });
      toast({
        title: "เพิ่มวัตถุดิบสำเร็จ",
        description: "ได้เพิ่มวัตถุดิบเข้าสู่สินค้าเรียบร้อยแล้ว"
      });
      setIsAddOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: IngredientFormValues & { id: number }) => {
      const { id, ...rest } = data;
      const { data: response } = await apiRequest('PUT', `/api/products/ingredients/${id}`, rest);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', selectedProductId, 'ingredients'] });
      toast({
        title: "แก้ไขวัตถุดิบสำเร็จ",
        description: "ได้แก้ไขข้อมูลวัตถุดิบเรียบร้อยแล้ว"
      });
      setIsEditOpen(false);
      setSelectedIngredient(null);
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiRequest('DELETE', `/api/products/ingredients/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', selectedProductId, 'ingredients'] });
      toast({
        title: "ลบวัตถุดิบสำเร็จ",
        description: "ได้ลบวัตถุดิบออกจากสินค้าเรียบร้อยแล้ว"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleAddSubmit = (data: IngredientFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleEditSubmit = (data: IngredientFormValues & { id: number }) => {
    updateMutation.mutate(data);
  };
  
  const handleEditIngredient = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    editForm.reset({
      id: ingredient.id,
      productId: ingredient.productId,
      inventoryId: ingredient.inventoryId,
      quantityUsed: ingredient.quantityUsed
    });
    setIsEditOpen(true);
  };
  
  const handleDeleteIngredient = (ingredient: any) => {
    if (confirm(`ยืนยันการลบวัตถุดิบ ${ingredient.inventory?.name || ''} ออกจากสินค้า?`)) {
      deleteMutation.mutate(ingredient.id);
    }
  };
  
  const getProductName = (id: number) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : 'ไม่พบสินค้า';
  };
  
  const getInventoryName = (id: number) => {
    const item = inventory.find(i => i.id === id);
    return item ? item.name : 'ไม่พบวัตถุดิบ';
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-dark)] flex items-center gap-2">
            <Layers size={28} />
            <span>จัดการการใช้วัตถุดิบ</span>
          </h1>
          <p className="text-gray-500">กำหนดวัตถุดิบที่ใช้ในการผลิตสินค้าแต่ละชนิด</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} disabled={!selectedProductId} className="shadow-sm hover:shadow transition-all">
          <Plus className="w-4 h-4 mr-2" /> เพิ่มวัตถุดิบ
        </Button>
      </div>
      
      {/* Product selection */}
      <Card className="shadow-md mb-6">
        <CardHeader className="pb-3">
          <CardTitle>เลือกสินค้า</CardTitle>
          <CardDescription>เลือกสินค้าเพื่อจัดการวัตถุดิบที่ใช้</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProductId?.toString() || ""}
            onValueChange={(value) => setSelectedProductId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสินค้า..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Ingredients List */}
      {selectedProductId && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              วัตถุดิบของ {getProductName(selectedProductId)}
            </CardTitle>
            <CardDescription>
              รายการวัตถุดิบทั้งหมดที่ใช้ในการผลิตสินค้านี้
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : ingredients.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>ไม่พบข้อมูล</AlertTitle>
                <AlertDescription>
                  ยังไม่มีการเพิ่มวัตถุดิบให้กับสินค้านี้ กรุณาเพิ่มวัตถุดิบโดยกดปุ่ม "เพิ่มวัตถุดิบ"
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableCaption>รายการวัตถุดิบทั้งหมดของสินค้า</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>วัตถุดิบ</TableHead>
                    <TableHead>ปริมาณที่ใช้</TableHead>
                    <TableHead>หน่วย</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell>{ingredient.inventory?.name || 'ไม่ทราบ'}</TableCell>
                      <TableCell>{ingredient.quantityUsed}</TableCell>
                      <TableCell>{ingredient.inventory?.unit || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditIngredient(ingredient)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteIngredient(ingredient)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      )}
      
      {/* Add Ingredient Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มวัตถุดิบ</DialogTitle>
            <DialogDescription>
              เพิ่มวัตถุดิบที่ใช้ในการผลิตสินค้า {getProductName(selectedProductId || 0)}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="inventoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วัตถุดิบ</FormLabel>
                    <Select 
                      value={field.value.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกวัตถุดิบ..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} ({item.unit})
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
                name="quantityUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ปริมาณที่ใช้</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="ใส่ปริมาณที่ใช้ต่อหน่วยสินค้า" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Ingredient Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขวัตถุดิบ</DialogTitle>
            <DialogDescription>
              แก้ไขปริมาณวัตถุดิบที่ใช้ในการผลิตสินค้า
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="inventoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วัตถุดิบ</FormLabel>
                    <Select 
                      value={field.value.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกวัตถุดิบ..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} ({item.unit})
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
                name="quantityUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ปริมาณที่ใช้</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="ใส่ปริมาณที่ใช้ต่อหน่วยสินค้า" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}