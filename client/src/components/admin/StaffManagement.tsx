import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Staff form schema for validation
const staffSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  role: z.string().min(1, "กรุณาเลือกตำแหน่ง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  confirmPassword: z.string().optional(),
});

// Schema for updating staff with password validation
const updateStaffSchema = z.object({
  username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  role: z.string().min(1, "กรุณาเลือกตำแหน่ง"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // ถ้าไม่ได้กรอกรหัสผ่าน ไม่ต้องตรวจสอบ
  if (!data.password && !data.confirmPassword) return true;
  // ถ้ากรอกรหัสผ่าน ต้องตรวจสอบว่าตรงกัน
  return data.password === data.confirmPassword;
}, {
  message: "รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง",
  path: ["confirmPassword"],
});

export default function StaffManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    role: "staff",
    password: "",
    confirmPassword: "",
  });
  
  // Fetch staff from the API
  const { data: staffList = [], refetch } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const resetForm = () => {
    setFormData({ username: "", name: "", role: "staff", password: "", confirmPassword: "" });
  };

  const handleAddStaff = async () => {
    try {
      // Validate form data
      staffSchema.parse(formData);
      
      await apiRequest("POST", "/api/users", formData);
      
      toast({
        title: "เพิ่มพนักงานสำเร็จ",
        description: `เพิ่มพนักงาน ${formData.name} แล้ว`,
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง";
        toast({
          title: "ข้อมูลไม่ถูกต้อง",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเพิ่มพนักงานได้",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditStaff = (staff: User) => {
    setSelectedStaff(staff);
    setFormData({
      username: staff.username,
      name: staff.name || "",
      role: staff.role,
      password: "", // Don't prefill password
      confirmPassword: "", // Don't prefill confirm password
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return;
    
    try {
      // Validate form data with the update schema that checks matching passwords
      updateStaffSchema.parse(formData);
      
      // Create a clean data object to submit
      const dataToSubmit: Record<string, any> = {
        username: formData.username,
        name: formData.name,
        role: formData.role
      };
      
      // Only include password if it's not empty
      if (formData.password) {
        dataToSubmit.password = formData.password;
      }
      
      await apiRequest("PATCH", `/api/users/${selectedStaff.id}`, dataToSubmit);
      
      toast({
        title: "อัปเดตข้อมูลสำเร็จ",
        description: `อัปเดตข้อมูลของ ${formData.name} แล้ว`,
      });
      
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง";
        toast({
          title: "ข้อมูลไม่ถูกต้อง",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัปเดตข้อมูลพนักงานได้",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">จัดการพนักงาน</h1>
          <p className="text-muted-foreground">เพิ่ม แก้ไข หรือจัดการข้อมูลพนักงาน</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>เพิ่มพนักงาน</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อพนักงาน</CardTitle>
          <CardDescription>พนักงานทั้งหมดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อผู้ใช้</TableHead>
                <TableHead>ชื่อพนักงาน</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    ไม่พบข้อมูลพนักงาน
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.username}</TableCell>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>
                      {staff.role === "admin" ? "ผู้จัดการ" : "พนักงาน"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${staff.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {staff.active ? "ทำงานอยู่" : "ไม่ได้ทำงาน"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStaff(staff)}
                      >
                        แก้ไข
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มพนักงาน</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลเพื่อเพิ่มพนักงานใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                name="username"
                placeholder="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อพนักงาน</Label>
              <Input
                id="name"
                name="name"
                placeholder="ชื่อที่แสดงในระบบ"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">ตำแหน่ง</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                  <SelectItem value="admin">ผู้จัดการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="รหัสผ่าน"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="ยืนยันรหัสผ่าน"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddStaff}>เพิ่มพนักงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของพนักงาน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-username">ชื่อผู้ใช้</Label>
              <Input
                id="edit-username"
                name="username"
                placeholder="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ"
                value={formData.username}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อพนักงาน</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="ชื่อที่แสดงในระบบ"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">ตำแหน่ง</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                  <SelectItem value="admin">ผู้จัดการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="edit-password">รหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                placeholder="รหัสผ่านใหม่"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-confirm-password">ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="edit-confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateStaff}>บันทึกการเปลี่ยนแปลง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}