import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Icons
import { 
  Plus, 
  PenLine, 
  Trash2, 
  Loader2,
  Layers
} from "lucide-react";

// Define schemas for forms
const addCategorySchema = z.object({
  category: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
});

const editCategorySchema = z.object({
  oldCategory: z.string(),
  newCategory: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่ใหม่"),
});

export default function CategoryManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<string | null>(null);

  // Forms
  const addCategoryForm = useForm<z.infer<typeof addCategorySchema>>({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      category: "",
    },
  });

  const editCategoryForm = useForm<z.infer<typeof editCategorySchema>>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      oldCategory: "",
      newCategory: "",
    },
  });

  // Fetch all categories
  const { data: categories = [], isLoading } = useQuery<string[]>({
    queryKey: ['/api/categories'],
  });

  // Add Category Mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      return apiRequest('POST', '/api/categories', { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsAddDialogOpen(false);
      addCategoryForm.reset();
      toast({
        title: "เพิ่มหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ใหม่ถูกเพิ่มเรียบร้อยแล้ว",
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

  // Update Category Mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { oldCategory: string; newCategory: string }) => {
      return apiRequest('PATCH', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsEditDialogOpen(false);
      editCategoryForm.reset();
      toast({
        title: "แก้ไขหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ถูกแก้ไขเรียบร้อยแล้ว",
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

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      return apiRequest('DELETE', `/api/categories/${encodeURIComponent(category)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setDeletingCategory(null);
      toast({
        title: "ลบหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ถูกลบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบหมวดหมู่ได้ กรุณาตรวจสอบว่าไม่มีสินค้าในหมวดหมู่นี้",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onAddCategorySubmit = (data: z.infer<typeof addCategorySchema>) => {
    addCategoryMutation.mutate(data.category);
  };

  const onEditCategorySubmit = (data: z.infer<typeof editCategorySchema>) => {
    updateCategoryMutation.mutate({
      oldCategory: data.oldCategory,
      newCategory: data.newCategory
    });
  };

  const handleEditClick = (category: string) => {
    setCategoryToEdit(category);
    editCategoryForm.reset({
      oldCategory: category,
      newCategory: category
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--coffee-dark)]">จัดการหมวดหมู่สินค้า</h1>
          <p className="text-gray-500">เพิ่ม แก้ไข หรือลบหมวดหมู่สินค้าสำหรับร้านของคุณ</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Category List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">หมวดหมู่ทั้งหมด</CardTitle>
          <CardDescription>
            จัดการหมวดหมู่ที่จะแสดงในเมนูและหน้าสั่งซื้อ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--coffee-primary)]" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>ยังไม่มีหมวดหมู่ เพิ่มหมวดหมู่แรกเลย</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category} className="flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardFooter className="pt-2 flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(category)}>
                      <PenLine className="w-4 h-4 mr-1" />
                      แก้ไข
                    </Button>
                    <AlertDialog open={deletingCategory === category} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingCategory(category)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          ลบ
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
                          <AlertDialogDescription>
                            คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "{category}"? 
                            หากมีสินค้าอยู่ในหมวดหมู่นี้ คุณจะไม่สามารถลบได้
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e) => {
                              e.preventDefault();
                              deleteCategoryMutation.mutate(category);
                            }}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {deleteCategoryMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "ลบหมวดหมู่"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
            <DialogDescription>
              สร้างหมวดหมู่ใหม่สำหรับจัดหมวดหมู่สินค้าและอาหาร
            </DialogDescription>
          </DialogHeader>
          <Form {...addCategoryForm}>
            <form onSubmit={addCategoryForm.handleSubmit(onAddCategorySubmit)} className="space-y-6">
              <FormField
                control={addCategoryForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อหมวดหมู่</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกชื่อหมวดหมู่" {...field} />
                    </FormControl>
                    <FormDescription>
                      ตัวอย่าง: เครื่องดื่มร้อน, เครื่องดื่มเย็น, ของหวาน, อาหารจานหลัก
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={addCategoryMutation.isPending}>
                  {addCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "เพิ่มหมวดหมู่"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขหมวดหมู่</DialogTitle>
            <DialogDescription>
              แก้ไขชื่อหมวดหมู่เดิม ระบบจะอัพเดตสินค้าทั้งหมดในหมวดหมู่นี้ให้อัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <Form {...editCategoryForm}>
            <form onSubmit={editCategoryForm.handleSubmit(onEditCategorySubmit)} className="space-y-6">
              <FormField
                control={editCategoryForm.control}
                name="oldCategory"
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
                control={editCategoryForm.control}
                name="newCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อหมวดหมู่ใหม่</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกชื่อหมวดหมู่ใหม่" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึกการเปลี่ยนแปลง"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}