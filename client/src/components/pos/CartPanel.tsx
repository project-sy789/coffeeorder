import { useState } from "react";
import { CartItem } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Member } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";

interface CartPanelProps {
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  selectedMember?: Member | null;
  onSelectMember?: (member: Member | null) => void;
  storeStatus?: string;
}

export default function CartPanel({
  cart,
  onRemoveItem,
  onEditItem,
  onClearCart,
  onCheckout,
  selectedMember = null,
  onSelectMember = () => {},
  storeStatus = "open"
}: CartPanelProps) {
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [memberPhone, setMemberPhone] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  const subtotal = cart.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  
  // Format options as a readable string
  const formatOptions = (item: CartItem) => {
    const options = [];
    
    if (item.customizations.temperature) {
      options.push(item.customizations.temperature);
    }
    
    if (item.customizations.sugar_level) {
      options.push(item.customizations.sugar_level);
    }
    
    if (item.customizations.milk_type) {
      options.push(item.customizations.milk_type);
    }
    
    // แสดงตัวเลือกแบบไดนามิกจากหลังบ้านด้วย
    Object.keys(item.customizations).forEach(key => {
      // ข้ามตัวเลือกพื้นฐานที่จัดการแล้ว และข้ามสิ่งที่ไม่ใช่อาร์เรย์
      if (
        !['type', 'temperature', 'sugar_level', 'milk_type', 'topping', 'extra', 'toppings', 'extras', 'specialInstructions'].includes(key) && 
        Array.isArray(item.customizations[key])
      ) {
        const values = item.customizations[key].map((opt: any) => opt.name).join(', ');
        if (values) {
          options.push(values);
        }
      }
    });
    
    return options.join(' | ');
  };
  
  // Search for a member by phone number
  const handleSearchMember = async () => {
    if (!memberPhone.trim()) {
      toast({
        title: "กรุณากรอกเบอร์โทรศัพท์",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    try {
      // ใช้ fetch API โดยตรงแทนการใช้ apiRequest
      const response = await fetch(`/api/members/phone/${memberPhone}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        onSelectMember(data);
        setIsMemberDialogOpen(false);
        // ไม่ต้องแสดง toast ที่นี่ แต่จะไปแสดงหลังจากที่โมดัลถูกปิด
      } else if (response.status === 404) {
        // ไม่พบสมาชิก
        toast({
          title: "ไม่พบสมาชิก",
          description: "ไม่พบสมาชิกที่มีเบอร์โทรนี้",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถค้นหาสมาชิกได้",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Add new member
  const handleAddMember = async () => {
    if (!memberPhone.trim() || !newMemberName.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "ต้องระบุทั้งชื่อและเบอร์โทรศัพท์",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { response, data } = await apiRequest('POST', '/api/members', {
        name: newMemberName,
        phone: memberPhone,
        points: 0
      });
      
      if (response.ok && data) {
        onSelectMember(data);
        setIsMemberDialogOpen(false);
        setIsAddingMember(false);
        toast({
          title: "เพิ่มสมาชิกสำเร็จ",
          description: `สมาชิกใหม่: ${newMemberName}`,
        });
        
        // Refresh member list
        queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มสมาชิกได้",
        variant: "destructive",
      });
    }
  };
  
  // Reset form when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    setIsMemberDialogOpen(open);
    if (!open) {
      setMemberPhone("");
      setNewMemberName("");
      setIsAddingMember(false);
      
      // แสดง toast แจ้งเตือนเมื่อเลือกสมาชิกแล้วและมีการปิดโมดัล
      if (selectedMember) {
        setTimeout(() => {
          toast({
            title: "พบข้อมูลสมาชิก",
            description: `ยินดีต้อนรับคุณ ${selectedMember.name}`,
          });
        }, 200); // delay เล็กน้อยเพื่อให้โมดัลปิดก่อน
      }
    }
  };
  
  return (
    <div className="w-1/3 bg-white border-l flex flex-col h-full">
      {/* Cart Header */}
      <div className="bg-[var(--coffee-primary)] text-white p-4">
        <h2 className="text-xl font-medium">รายการสั่งซื้อ</h2>
      </div>
      
      {/* Customer Info */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-600">ลูกค้า:</span>
            <span>{selectedMember ? selectedMember.name : "ทั่วไป"}</span>
            {selectedMember && (
              <div className="text-xs text-green-600">
                แต้มสะสม: {selectedMember.points} แต้ม
              </div>
            )}
          </div>
          <button 
            className="text-[var(--coffee-primary)] underline text-sm"
            onClick={() => setIsMemberDialogOpen(true)}
          >
            {selectedMember ? "เปลี่ยนสมาชิก" : "+ สมาชิก"}
          </button>
        </div>
      </div>
      
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ไม่มีรายการในตะกร้า
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="border rounded-lg p-3">
              <div className="flex justify-between">
                <h3 className="font-medium">{item.name}</h3>
                <div className="text-[var(--coffee-primary)] font-medium">฿{item.totalPrice}</div>
              </div>
              <div className="flex text-sm text-gray-600 mt-1">
                <span>{item.quantity}x</span>
                <span className="mx-1">|</span>
                <span>
                  {formatOptions(item)}
                  {/* We'll use the actual price from the item's customizations */}
                  {item.customizations.temperaturePrice !== undefined && item.customizations.temperaturePrice < 0 && 
                    ` (-${Math.abs(item.customizations.temperaturePrice)} บาท)`}
                </span>
              </div>
              {item.customizations.toppings && item.customizations.toppings.length > 0 && (
                <div className="mt-1 text-sm text-gray-600">
                  {item.customizations.toppings.map((topping, index) => (
                    <span key={index} className="block">+ {topping.name} (฿{topping.price})</span>
                  ))}
                </div>
              )}
              {item.customizations.extras && item.customizations.extras.length > 0 && (
                <div className="mt-1 text-sm text-gray-600">
                  {item.customizations.extras.map((extra, index) => (
                    <span key={index} className="block">+ {extra.name} (฿{extra.price})</span>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-2">
                <button
                  className="text-sm text-blue-600"
                  onClick={() => onEditItem(item.id)}
                >
                  แก้ไข
                </button>
                <button
                  className="text-sm text-red-600"
                  onClick={() => onRemoveItem(item.id)}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Cart Total */}
      <div className="border-t p-4 space-y-2">
        <div className="flex justify-between">
          <span>ยอดรวม</span>
          <span>฿{subtotal}</span>
        </div>
        <div className="flex justify-between text-[var(--coffee-primary)] font-medium">
          <span>ส่วนลด</span>
          <span>-฿0</span>
        </div>
        <div className="flex justify-between text-lg font-medium">
          <span>ยอดสุทธิ</span>
          <span>฿{subtotal}</span>
        </div>

        {/* Store Closed Warning */}
        {storeStatus === "close" && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2 flex items-start gap-2">
            <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">ร้านปิดให้บริการ</p>
              <p className="text-red-600 text-sm">ไม่สามารถชำระเงินได้ในขณะนี้ กรุณาเปิดร้านจากหน้าตั้งค่าก่อน</p>
            </div>
          </div>
        )}
        
        {/* Payment Buttons */}
        <div className="grid grid-cols-1 gap-3 mt-4">
          <Button
            className="bg-[var(--coffee-primary)] text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
            onClick={onCheckout}
            disabled={cart.length === 0 || storeStatus === "close"}
          >
            ชำระเงิน
          </Button>
          <Button
            variant="outline"
            className="bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={onClearCart}
            disabled={cart.length === 0}
          >
            ล้างรายการ
          </Button>
        </div>
      </div>
      
      {/* Member Search/Add Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isAddingMember ? "เพิ่มสมาชิกใหม่" : "ค้นหาสมาชิก"}
            </DialogTitle>
            <DialogDescription>
              {isAddingMember 
                ? "กรอกข้อมูลเพื่อเพิ่มสมาชิกใหม่" 
                : "ค้นหาสมาชิกด้วยเบอร์โทรศัพท์"}
            </DialogDescription>
          </DialogHeader>
          
          {isAddingMember ? (
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">ชื่อสมาชิก</label>
                  <Input 
                    placeholder="ระบุชื่อสมาชิก" 
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">เบอร์โทรศัพท์</label>
                  <Input 
                    placeholder="0812345678" 
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddingMember(false)} className="flex-1">
                    กลับไปค้นหา
                  </Button>
                  <Button onClick={handleAddMember} className="flex-1">
                    บันทึกสมาชิก
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <div className="flex space-x-2">
                <Input 
                  placeholder="กรอกเบอร์โทรศัพท์" 
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearchMember} disabled={isSearching}>
                  {isSearching ? "กำลังค้นหา..." : "ค้นหา"}
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">ไม่พบสมาชิก?</span>
                <button 
                  className="ml-2 underline text-[var(--coffee-primary)] text-sm"
                  onClick={() => setIsAddingMember(true)}
                >
                  เพิ่มสมาชิกใหม่
                </button>
              </div>
              
              {selectedMember && (
                <div className="mt-4 p-3 border rounded-md bg-green-50">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{selectedMember.name}</p>
                      <p className="text-sm text-gray-600">เบอร์โทรศัพท์: {selectedMember.phone}</p>
                      <p className="text-sm text-green-600">แต้มสะสม: {selectedMember.points} แต้ม</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onSelectMember(null)}>
                      ล้างข้อมูล
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}