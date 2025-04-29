import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Product, type InsertProduct, insertProductSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Icons
import { 
  Coffee, 
  Plus, 
  PenLine, 
  Trash2, 
  Loader2,
  Search,
  Image,
  FilterX,
  Tag,
  Edit
} from "lucide-react";

import { formatCurrency } from "@/lib/utils";

const extendedProductSchema = insertProductSchema.extend({
  price: z.coerce.number().min(1, "ราคาต้องมากกว่า 0"),
  active: z.boolean().optional().default(true),
});

type FormValues = z.infer<typeof extendedProductSchema>;

export default function MenuManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [updatedCategory, setUpdatedCategory] = useState("");
  
  const { toast } = useToast();

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (data: Product[]) => data.sort((a, b) => a.category.localeCompare(b.category)),
  });
  
  // Fetch categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const { response } = await apiRequest("POST", "/api/products", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถเพิ่มเมนูได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsAddDialogOpen(false);
      toast({
        title: "เพิ่มเมนูสำเร็จ",
        description: "เมนูถูกเพิ่มเข้าระบบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มเมนูได้",
        variant: "destructive",
      });
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Product> }) => {
      const { response } = await apiRequest("PATCH", `/api/products/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถอัปเดตเมนูได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditDialogOpen(false);
      toast({
        title: "อัปเดตเมนูสำเร็จ",
        description: "เมนูถูกอัปเดตเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถอัปเดตเมนูได้",
        variant: "destructive",
      });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const { response } = await apiRequest("DELETE", `/api/products/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถลบเมนูได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "ลบเมนูสำเร็จ",
        description: "เมนูถูกลบออกจากระบบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถลบเมนูได้",
        variant: "destructive",
      });
    }
  });
  
  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      const { response } = await apiRequest("POST", "/api/categories", { category });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถเพิ่มหมวดหมู่ได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setNewCategory("");
      toast({
        title: "เพิ่มหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ถูกเพิ่มเข้าระบบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มหมวดหมู่ได้",
        variant: "destructive",
      });
    }
  });
  
  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldCategory, newCategory }: { oldCategory: string, newCategory: string }) => {
      const { response } = await apiRequest("PUT", `/api/categories/${encodeURIComponent(oldCategory)}`, { newCategory });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถแก้ไขหมวดหมู่ได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditCategoryDialogOpen(false);
      setSelectedCategory("");
      setUpdatedCategory("");
      toast({
        title: "แก้ไขหมวดหมู่สำเร็จ",
        description: "หมวดหมู่ถูกแก้ไขเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถแก้ไขหมวดหมู่ได้",
        variant: "destructive",
      });
    }
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      const { response } = await apiRequest("DELETE", `/api/categories/${encodeURIComponent(category)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ไม่สามารถลบหมวดหมู่ได้");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsDeleteCategoryDialogOpen(false);
      setSelectedCategory("");
      toast({
        title: "ลบหมวดหมู่สำเร็จ",
        description: "หมวดหมู่และสินค้าที่เกี่ยวข้องถูกลบออกจากระบบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถลบหมวดหมู่ได้",
        variant: "destructive",
      });
    }
  });

  // Forms setup
  const addForm = useForm<FormValues>({
    resolver: zodResolver(extendedProductSchema),
    defaultValues: {
      name: "",
      category: categories?.[0] ?? "กาแฟร้อน",
      price: 0,
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
      description: "",
      active: true,
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(extendedProductSchema),
    defaultValues: {
      name: selectedProduct?.name || "",
      category: selectedProduct?.category || categories?.[0] || "กาแฟร้อน",
      price: selectedProduct?.price || 0,
      image: selectedProduct?.image || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
      description: selectedProduct?.description || "",
      active: selectedProduct?.active || true,
    },
  });

  // Reset forms when dialogs close
  const handleAddDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      addForm.reset();
    }
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      editForm.reset();
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Handle product selection for edit/delete
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
      description: product.description || "",
      active: product.active,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Form submissions
  const onAddSubmit = (data: FormValues) => {
    addProductMutation.mutate(data);
  };

  const onEditSubmit = (data: FormValues) => {
    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data });
    }
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };
  
  // Category management functions
  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategoryMutation.mutate(newCategory.trim());
    }
  };
  
  const handleEditCategoryInit = (category: string) => {
    setSelectedCategory(category);
    setUpdatedCategory(category);
    setIsEditCategoryDialogOpen(true);
  };
  
  const handleEditCategory = () => {
    if (selectedCategory && updatedCategory.trim()) {
      updateCategoryMutation.mutate({
        oldCategory: selectedCategory,
        newCategory: updatedCategory.trim()
      });
    }
  };
  
  const handleDeleteCategoryInit = (category: string) => {
    setSelectedCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };
  
  const handleDeleteCategory = () => {
    if (selectedCategory) {
      deleteCategoryMutation.mutate(selectedCategory);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Coffee size={24} />
          <span>จัดการเมนู</span>
        </h1>
        
        <div className="flex gap-2">
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Tag size={16} />
                <span>จัดการหมวดหมู่</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>จัดการหมวดหมู่เมนู</DialogTitle>
                <DialogDescription>
                  เพิ่ม แก้ไข หรือลบหมวดหมู่เมนูในร้านของคุณ
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex mb-4">
                <Input
                  placeholder="ชื่อหมวดหมู่ใหม่..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 mr-2"
                />
                <Button 
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim() || addCategoryMutation.isPending}
                >
                  {addCategoryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span className="ml-1">เพิ่ม</span>
                </Button>
              </div>
              
              <div className="border rounded-md">
                {isCategoriesLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>กำลังโหลดข้อมูล...</span>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    ไม่พบหมวดหมู่เมนู
                  </div>
                ) : (
                  <div className="divide-y">
                    {categories.map((category: string) => (
                      <div key={category} className="flex items-center justify-between p-3">
                        <span>{category}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCategoryInit(category)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCategoryInit(category)}
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                <span>เพิ่มเมนูใหม่</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>เพิ่มเมนูใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลเมนูที่ต้องการเพิ่มในระบบ
                </DialogDescription>
              </DialogHeader>
              
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อเมนู</FormLabel>
                          <FormControl>
                            <Input placeholder="เช่น ลาเต้" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>หมวดหมู่</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกหมวดหมู่" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category: string) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ราคา (บาท)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>รูปภาพ (URL)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            ลิงก์ไปยังรูปภาพของเมนู
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รายละเอียด</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="รายละเอียดเกี่ยวกับเมนูนี้" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex flex-row items-center gap-2 space-y-0">
                    <input
                      type="checkbox"
                      id="active-checkbox"
                      checked={true}
                      disabled
                      className="h-4 w-4 text-coffee-primary"
                    />
                    <label htmlFor="active-checkbox" className="m-0 text-sm">แสดงในเมนู (เปิดใช้งานโดยอัตโนมัติ)</label>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addProductMutation.isPending}
                    >
                      {addProductMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        'บันทึก'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative md:w-80 lg:w-96 xl:w-[450px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="ค้นหาเมนู..."
            className="pl-10 w-full"
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
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <div className="border-b mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Select 
                value={activeCategory} 
                onValueChange={setActiveCategory}
                className="sm:hidden"
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {categories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ScrollArea className="w-full hidden sm:block" type="always">
                <div className="whitespace-nowrap pb-3">
                  <Button
                    variant={activeCategory === "all" ? "default" : "outline"}
                    className="mr-2 py-1 h-9"
                    onClick={() => setActiveCategory("all")}
                  >
                    ทั้งหมด
                  </Button>
                  {categories.map((category: string) => (
                    <Button
                      key={category}
                      variant={activeCategory === category ? "default" : "outline"}
                      className="mr-2 last:mr-0 py-1 h-9"
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="h-2.5" />
              </ScrollArea>
            </div>
          </div>
        </Tabs>
      </div>
      
      {/* Product List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-coffee-primary" />
          <span className="ml-2 text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Image className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่พบเมนูที่ค้นหา</h3>
          <p className="text-gray-500">ลองค้นหาด้วยคำอื่น หรือเพิ่มเมนูใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={!product.active ? "opacity-60" : ""}>
              <CardHeader className="p-0 h-40 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {product.description || "ไม่มีคำอธิบาย"}
                    </CardDescription>
                  </div>
                  <div className="text-lg font-medium">
                    {formatCurrency(product.price)}
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="bg-gray-100 px-2 py-1 rounded">{product.category}</span>
                  {!product.active && (
                    <span className="bg-red-100 text-red-600 ml-2 px-2 py-1 rounded">
                      ซ่อนอยู่
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-0">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleDeleteProduct(product)}
                >
                  <Trash2 size={16} className="text-red-500" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleEditProduct(product)}
                >
                  <PenLine size={16} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>แก้ไขเมนู</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลเมนูตามต้องการ
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อเมนู</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น ลาเต้" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมวดหมู่</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกหมวดหมู่" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: string) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ราคา (บาท)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รูปภาพ (URL)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        ลิงก์ไปยังรูปภาพของเมนู
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รายละเอียด</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="รายละเอียดเกี่ยวกับเมนูนี้" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-coffee-primary"
                      />
                    </FormControl>
                    <FormLabel className="m-0">แสดงในเมนู</FormLabel>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    'บันทึก'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเมนู</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบเมนู "{selectedProduct?.name}"?
              การกระทำนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                'ลบเมนู'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>แก้ไขหมวดหมู่</DialogTitle>
            <DialogDescription>
              เปลี่ยนชื่อหมวดหมู่ "{selectedCategory}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={updatedCategory}
              onChange={(e) => setUpdatedCategory(e.target.value)}
              placeholder="ชื่อหมวดหมู่ใหม่"
              className="mb-4"
            />
            <DialogFooter>
              <Button 
                onClick={handleEditCategory} 
                disabled={!updatedCategory.trim() || updateCategoryMutation.isPending}
              >
                {updateCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหมวดหมู่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "{selectedCategory}"? 
              การกระทำนี้จะลบเมนูทั้งหมดในหมวดหมู่นี้ และไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory} 
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteCategoryMutation.isPending ? (
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