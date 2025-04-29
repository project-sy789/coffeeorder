import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Member, type InsertMember, insertMemberSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatDateTime } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Icons
import { 
  Loader2,
  Search,
  FilterX,
  Users,
  UserPlus,
  Edit,
  BadgePercent
} from "lucide-react";

// Phone number validation for Thai numbers
const phoneRegex = /^0[1-9][0-9]{8}$/;

const extendedMemberSchema = insertMemberSchema.extend({
  phone: z.string().regex(phoneRegex, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง"),
});

type FormValues = z.infer<typeof extendedMemberSchema>;

export default function MemberManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddPointsDialogOpen, setIsAddPointsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);
  
  const { toast } = useToast();

  // Fetch members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['/api/members'],
    select: (data: Member[]) => data.sort((a, b) => 
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    ),
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const { response, data: responseData } = await apiRequest("POST", "/api/members", data);
      if (!response.ok) {
        throw new Error(response.statusText || "ไม่สามารถเพิ่มสมาชิกได้");
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      setIsAddDialogOpen(false);
      toast({
        title: "เพิ่มสมาชิกสำเร็จ",
        description: "สมาชิกถูกเพิ่มเข้าระบบเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มสมาชิกได้",
        variant: "destructive",
      });
    }
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Member> }) => {
      const { response, data: responseData } = await apiRequest("PATCH", `/api/members/${id}`, data);
      if (!response.ok) {
        throw new Error(response.statusText || "ไม่สามารถอัปเดตข้อมูลสมาชิกได้");
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      setIsEditDialogOpen(false);
      toast({
        title: "อัปเดตข้อมูลสมาชิกสำเร็จ",
        description: "ข้อมูลสมาชิกถูกอัปเดตเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถอัปเดตข้อมูลสมาชิกได้",
        variant: "destructive",
      });
    }
  });

  // Add points mutation
  const addPointsMutation = useMutation({
    mutationFn: async ({ id, points }: { id: number, points: number }) => {
      const { response, data } = await apiRequest("POST", `/api/members/${id}/add-points`, { points });
      if (!response.ok) {
        throw new Error(response.statusText || "ไม่สามารถเพิ่มคะแนนสะสมได้");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      setIsAddPointsDialogOpen(false);
      toast({
        title: "เพิ่มคะแนนสะสมสำเร็จ",
        description: data.message || `คะแนนสะสมจำนวน ${pointsToAdd} คะแนนถูกเพิ่มเรียบร้อยแล้ว`,
      });
      setPointsToAdd(0);
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มคะแนนสะสมได้",
        variant: "destructive",
      });
    }
  });

  // Forms setup
  const addForm = useForm<FormValues>({
    resolver: zodResolver(extendedMemberSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(extendedMemberSchema),
    defaultValues: {
      name: selectedMember?.name || "",
      phone: selectedMember?.phone || "",
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

  const handleAddPointsDialogOpenChange = (open: boolean) => {
    setIsAddPointsDialogOpen(open);
    if (!open) {
      setPointsToAdd(0);
    }
  };

  // Filter members by search query
  const filteredMembers = members.filter(member => {
    const matchesSearch = searchQuery === "" || 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    
    return matchesSearch;
  });

  // Handle member selection for edit/add points
  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    editForm.reset({
      name: member.name,
      phone: member.phone,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddPoints = (member: Member) => {
    setSelectedMember(member);
    setIsAddPointsDialogOpen(true);
  };

  // Form submissions
  const onAddSubmit = (data: FormValues) => {
    addMemberMutation.mutate(data);
  };

  const onEditSubmit = (data: FormValues) => {
    if (selectedMember) {
      updateMemberMutation.mutate({ id: selectedMember.id, data });
    }
  };

  const onAddPointsSubmit = () => {
    if (selectedMember && pointsToAdd > 0) {
      addPointsMutation.mutate({ id: selectedMember.id, points: pointsToAdd });
    } else {
      toast({
        title: "กรุณากรอกจำนวนคะแนน",
        description: "จำนวนคะแนนต้องมากกว่า 0",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={24} />
          <span>จัดการสมาชิก</span>
        </h1>
        
        <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus size={16} />
              <span>เพิ่มสมาชิกใหม่</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>เพิ่มสมาชิกใหม่</DialogTitle>
              <DialogDescription>
                กรอกข้อมูลสมาชิกที่ต้องการเพิ่มในระบบ
              </DialogDescription>
            </DialogHeader>
            
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อสมาชิก</FormLabel>
                      <FormControl>
                        <Input placeholder="เช่น มานี มีนา" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เบอร์โทรศัพท์</FormLabel>
                      <FormControl>
                        <Input placeholder="0812345678" {...field} />
                      </FormControl>
                      <FormDescription>
                        เบอร์โทรศัพท์ 10 หลักที่ขึ้นต้นด้วย 0
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending ? (
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
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="ค้นหาตามชื่อหรือเบอร์โทรศัพท์..."
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
      </div>
      
      {/* Members Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-coffee-primary" />
          <span className="ml-2 text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">ไม่พบข้อมูลสมาชิก</h3>
          <p className="text-gray-500">ยังไม่มีสมาชิกในระบบหรือไม่พบข้อมูลสมาชิกตามเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>เบอร์โทรศัพท์</TableHead>
                <TableHead>คะแนนสะสม</TableHead>
                <TableHead>วันที่สมัคร</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">#{member.id}</TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{member.points}</span>
                      <span className="text-xs text-gray-500">แต้ม</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(member.registeredAt)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditMember(member)}
                      title="แก้ไขข้อมูล"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleAddPoints(member)}
                      title="เพิ่มคะแนนสะสม"
                      className="text-emerald-600"
                    >
                      <BadgePercent size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลสมาชิก</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลสมาชิกตามต้องการ
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อสมาชิก</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น มานี มีนา" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="0812345678" {...field} />
                    </FormControl>
                    <FormDescription>
                      เบอร์โทรศัพท์ 10 หลักที่ขึ้นต้นด้วย 0
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">คะแนนสะสมปัจจุบัน:</div>
                  <div className="font-medium">{selectedMember?.points} คะแนน</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground">สมัครเมื่อ:</div>
                  <div>{selectedMember && formatDateTime(selectedMember.registeredAt)}</div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={updateMemberMutation.isPending}
                >
                  {updateMemberMutation.isPending ? (
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
      
      {/* Add Points Dialog */}
      <Dialog open={isAddPointsDialogOpen} onOpenChange={handleAddPointsDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มคะแนนสะสม</DialogTitle>
            <DialogDescription>
              เพิ่มคะแนนสะสมให้กับสมาชิก {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ข้อมูลสมาชิก</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">ชื่อ:</span> {selectedMember?.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">เบอร์โทร:</span> {selectedMember?.phone}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">คะแนนสะสม</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                  <div className="text-2xl font-bold">{selectedMember?.points}</div>
                  <div className="text-xs text-muted-foreground ml-1">คะแนน</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="points" className="text-sm font-medium">เพิ่มคะแนน</label>
              <Input
                id="points"
                type="number"
                min="1"
                value={pointsToAdd || ""}
                onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                placeholder="จำนวนคะแนนที่ต้องการเพิ่ม"
              />
              <p className="text-xs text-muted-foreground">คะแนนที่เพิ่มต้องเป็นจำนวนเต็มมากกว่า 0</p>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsAddPointsDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={onAddPointsSubmit}
              disabled={addPointsMutation.isPending || pointsToAdd <= 0}
            >
              {addPointsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'เพิ่มคะแนน'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}