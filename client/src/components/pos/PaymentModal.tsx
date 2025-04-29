import { useState, useEffect } from "react";
import { CartItem } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateQRCode, generateMerchantQRCode } from "@/lib/qrcode";
import { queryClient } from "@/lib/queryClient";
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from "@tanstack/react-query";
import { Member, PointRedemptionRule } from "@shared/schema";
import { Loader2, CheckCircle } from "lucide-react";

interface PaymentModalProps {
  cart: CartItem[];
  onClose: () => void;
  onComplete: (orderId: number) => void;  // เปลี่ยนรูปแบบให้รับค่า orderId เหมือนหน้า customer
  staffId: number;
  memberId?: number;
  selectedMember?: Member | null;
}

export default function PaymentModal({
  cart,
  onClose,
  onComplete,
  staffId,
  memberId,
  selectedMember: initialMember
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr_code'>('cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [referenceId] = useState<string>(uuidv4().substring(0, 8));
  const [memberPhone, setMemberPhone] = useState<string>('');
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(initialMember || null);
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [availablePointRedemptions, setAvailablePointRedemptions] = useState<PointRedemptionRule[]>([]);
  const [loadingPointRedemptions, setLoadingPointRedemptions] = useState<boolean>(false);
  const [selectedPointRedemption, setSelectedPointRedemption] = useState<PointRedemptionRule | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const { toast } = useToast();
  
  // Fetch members
  const { data: members = [], refetch: refetchMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
    enabled: false,
  });
  
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal - discountAmount;
  const change = Math.max(0, cashAmount - total);
  
  // Generate QR code when payment method is selected
  useEffect(() => {
    if (paymentMethod === 'qr_code') {
      const generateQR = async () => {
        setIsLoadingQR(true);
        try {
          const qrCode = await generateMerchantQRCode(total, referenceId);
          setQrCodeUrl(qrCode);
        } catch (error) {
          console.error("Failed to generate QR code:", error);
          toast({
            title: "ข้อผิดพลาด",
            description: "ไม่สามารถสร้าง QR code ได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        } finally {
          setIsLoadingQR(false);
        }
      };
      generateQR();
    }
  }, [paymentMethod, total, referenceId, toast]);
  
  const handlePaymentMethodSelect = async (method: 'cash' | 'qr_code') => {
    setPaymentMethod(method);
    
    if (method === 'cash') {
      // Set default cash amount to nearest 100
      setCashAmount(Math.ceil(total / 100) * 100);
    }
    // No need to generate QR here as the useEffect will handle it when payment method changes
  };
  
  const handleCashAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCashAmount(isNaN(value) ? 0 : value);
  };
  
  // Search for member by phone number
  const handleSearchMember = async () => {
    if (!memberPhone.trim()) {
      toast({
        title: "กรุณากรอกเบอร์โทรศัพท์",
        description: "ต้องระบุเบอร์โทรศัพท์เพื่อค้นหาสมาชิก",
        variant: "destructive",
      });
      return;
    }
    
    setSearchPerformed(true);
    
    try {
      // ส่ง API Request โดยตรงแทนการใช้ refetchMembers
      const { data } = await apiRequest('GET', `/api/members/phone/${memberPhone}`);
      
      if (data) {
        setSelectedMember(data);
        toast({
          title: "พบสมาชิก",
          description: `สมาชิก: ${data.name} (${data.phone})`,
        });
      }
    } catch (error) {
      console.error("Error searching for member:", error);
      setSelectedMember(null);
      toast({
        title: "ไม่พบสมาชิก",
        description: "ไม่พบสมาชิกที่มีเบอร์โทรนี้",
        variant: "destructive",
      });
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
      const { data } = await apiRequest('POST', '/api/members', {
        name: newMemberName,
        phone: memberPhone,
        points: 0
      });
      
      if (data) {
        toast({
          title: "เพิ่มสมาชิกสำเร็จ",
          description: `สมาชิกใหม่: ${newMemberName}`,
        });
        
        setSelectedMember(data);
        setIsAddingMember(false);
        
        // Refresh member list
        queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มสมาชิกได้",
        variant: "destructive",
      });
    }
  };
  
  // Reset member search
  const handleResetMemberSearch = () => {
    setSelectedMember(null);
    setMemberPhone('');
    setSearchPerformed(false);
    setIsAddingMember(false);
    setNewMemberName('');
    setAvailablePointRedemptions([]);
    setSelectedPointRedemption(null);
    setDiscountAmount(0);
  };
  
  // ฟังก์ชันในการดึงตัวเลือกการแลกแต้มสำหรับสมาชิก
  const fetchRedemptionOptions = async (memberId: number) => {
    if (memberId) {
      setLoadingPointRedemptions(true);
      try {
        const { data } = await apiRequest('POST', '/api/calculate-redemption-options', {
          memberId,
          total: subtotal
        });
        
        setAvailablePointRedemptions(data || []);
      } catch (error) {
        console.error("Error fetching redemption options:", error);
        toast({
          title: "ไม่สามารถดึงข้อมูลการแลกแต้มได้",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive"
        });
      } finally {
        setLoadingPointRedemptions(false);
      }
    }
  };
  
  // ดึงข้อมูลตัวเลือกการแลกแต้มเมื่อมีการเลือกสมาชิก
  useEffect(() => {
    if (selectedMember) {
      fetchRedemptionOptions(selectedMember.id);
    } else {
      setAvailablePointRedemptions([]);
      setSelectedPointRedemption(null);
      setDiscountAmount(0);
    }
  }, [selectedMember, subtotal]);
  
  // ฟังก์ชันในการเลือกแลกแต้มสมาชิก
  const handleSelectPointRedemption = (redemption: PointRedemptionRule) => {
    // ตรวจสอบว่าสมาชิกมีแต้มเพียงพอหรือไม่
    if (!selectedMember || selectedMember.points < redemption.pointCost) {
      toast({
        title: "แต้มสะสมไม่เพียงพอ",
        description: `สมาชิกมี ${selectedMember?.points || 0} แต้ม แต่ต้องใช้ ${redemption.pointCost} แต้ม`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPointRedemption(redemption);
    setDiscountAmount(redemption.discountValue || 0);
    
    toast({
      title: "เลือกแลกแต้มสำเร็จ",
      description: `ใช้ ${redemption.pointCost} แต้ม เพื่อรับส่วนลด ฿${redemption.discountValue}`,
    });
  };
  
  // ยกเลิกการแลกแต้ม
  const handleCancelPointRedemption = () => {
    setSelectedPointRedemption(null);
    setDiscountAmount(0);
  };

  const handleCompletePayment = async () => {
    try {
      setIsProcessing(true);
      
      if (paymentMethod === 'cash' && cashAmount < total) {
        toast({
          title: "ข้อผิดพลาด",
          description: "จำนวนเงินไม่เพียงพอ",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      // Convert cart items to order items format
      const orderItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.totalPrice,
        customizations: item.customizations
      }));
      
      // Create order
      const orderData: any = {
        order: {
          customerId: selectedMember ? selectedMember.id : memberId || null,
          staffId: staffId,
          total: total,
          discount: discountAmount,
          paymentMethod: paymentMethod,
          referenceId: paymentMethod === 'qr_code' ? referenceId : null
        },
        items: orderItems
      };
      
      // เพิ่มข้อมูลการแลกแต้มสะสม (ถ้ามี)
      if (selectedPointRedemption && selectedMember) {
        orderData.usePoints = true;
        orderData.pointsUsed = selectedPointRedemption.pointCost;
        orderData.pointsPromotion = selectedPointRedemption.id;
      }
      
      console.log("Submitting order data:", orderData);
      
      const { data: createdOrder } = await apiRequest('POST', '/api/orders', orderData);
      
      // คำนวณคะแนนสะสมสำหรับสมาชิก (ถ้ามี)
      const customerId = selectedMember ? selectedMember.id : memberId;
      
      // เก็บ orderId เพื่อส่งกลับให้ parent component
      if (customerId && !selectedPointRedemption) {
        try {
          // ทุก 20 บาท ได้ 1 คะแนน (แบบเรียบง่าย)
          const pointsToAdd = Math.floor(total / 20);
          if (pointsToAdd > 0) {
            await apiRequest("POST", `/api/members/${customerId}/add-points`, { points: pointsToAdd });
            
            toast({
              title: "เพิ่มคะแนนสะสมสำเร็จ",
              description: `สมาชิกได้รับ ${pointsToAdd} คะแนนจากการสั่งซื้อนี้`,
            });
          }
        } catch (error) {
          console.error("Error adding member points:", error);
          // ไม่ต้องแสดง error เนื่องจากไม่ใช่ core function
        }
      } else if (selectedPointRedemption && selectedMember) {
        toast({
          title: "แลกแต้มสะสมสำเร็จ",
          description: `ใช้ ${selectedPointRedemption.pointCost} แต้ม เพื่อรับส่วนลด ฿${selectedPointRedemption.discountValue}`,
        });
      }
      
      // Refresh members data
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Show success message
      toast({
        title: "ชำระเงินสำเร็จ",
        description: `ชำระเงินด้วย${paymentMethod === 'cash' ? 'เงินสด' : 'QR code'} เรียบร้อยแล้ว`,
      });
      
      // Invalidate orders query to refresh any order lists
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // ส่ง orderId กลับไปที่ parent component (ตรวจสอบว่ามี ID หรือไม่)
      if (createdOrder && createdOrder.id) {
        onComplete(createdOrder.id);
      } else {
        // ถ้าไม่มี ID ให้ส่งค่า 0 เป็นค่าเริ่มต้น
        console.log("Warning: Created order has no ID, using 0 as fallback");
        onComplete(0);
      }
      onClose();
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-3/4 max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center bg-[var(--coffee-primary)] text-white">
          <h3 className="text-xl font-medium">เลือกวิธีชำระเงิน</h3>
          <button className="text-2xl font-bold" onClick={onClose}>
            &times;
          </button>
        </div>
        
        {/* Payment Methods */}
        <div className="p-6">
          {/* Member Section */}
          <div className="border rounded-lg p-4 mb-6">
            <h5 className="font-medium mb-2 text-lg flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              ค้นหาสมาชิก
            </h5>
            
            {selectedMember ? (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-sm text-gray-600">เบอร์โทรศัพท์: {selectedMember.phone}</p>
                    <p className="text-sm text-green-600">แต้มสะสม: {selectedMember.points} แต้ม</p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 px-2"
                    onClick={handleResetMemberSearch}
                  >
                    เปลี่ยนสมาชิก
                  </Button>
                </div>
              </div>
            ) : (
              isAddingMember ? (
                <div>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-sm text-gray-600 mb-1 block">ชื่อสมาชิก</label>
                      <Input
                        type="text"
                        placeholder="ชื่อสมาชิก"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-gray-600 mb-1 block">เบอร์โทรศัพท์</label>
                      <Input
                        type="tel"
                        placeholder="0812345678"
                        value={memberPhone}
                        onChange={(e) => setMemberPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={handleAddMember}
                    >
                      บันทึกสมาชิกใหม่
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsAddingMember(false)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-3 mb-3">
                    <Input
                      type="tel"
                      placeholder="ค้นหาด้วยเบอร์โทรศัพท์"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="default"
                      className="px-3"
                      onClick={handleSearchMember}
                    >
                      ค้นหา
                    </Button>
                  </div>
                  
                  {searchPerformed && !selectedMember && (
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">ไม่พบสมาชิกที่มีเบอร์โทรนี้</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingMember(true)}
                      >
                        + เพิ่มสมาชิกใหม่
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
          
          {/* แสดงตัวเลือกแลกแต้มสะสมสำหรับสมาชิก */}
          {selectedMember && (
            <div className="border rounded-lg p-4 mb-5">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium text-base">ใช้แต้มสะสม</h5>
                <span className="text-sm text-green-600 font-medium">{selectedMember.points} แต้ม</span>
              </div>
              
              {selectedPointRedemption ? (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedPointRedemption.name}</p>
                    <p className="text-sm text-gray-600">ใช้ {selectedPointRedemption.pointCost} แต้ม</p>
                    <p className="text-sm text-green-600">ได้รับส่วนลด: ฿{selectedPointRedemption.discountValue}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelPointRedemption}
                  >
                    ยกเลิก
                  </Button>
                </div>
              ) : loadingPointRedemptions ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : availablePointRedemptions.length > 0 ? (
                <div className="space-y-2 mt-1">
                  {availablePointRedemptions.map((redemption) => (
                    <Button
                      key={redemption.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      disabled={selectedMember.points < redemption.pointCost}
                      onClick={() => handleSelectPointRedemption(redemption)}
                    >
                      <span>ใช้ {redemption.pointCost} แต้ม</span>
                      <span>รับส่วนลด ฿{redemption.discountValue}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-center text-muted-foreground py-2">
                  ไม่มีตัวเลือกการแลกแต้มที่สามารถใช้ได้
                </div>
              )}
            </div>
          )}
          
          {/* เพิ่มส่วนทบทวนรายการออร์เดอร์ */}
          <div className="border rounded-lg p-4 mb-5">
            <h5 className="font-medium mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              ทบทวนรายการออร์เดอร์
            </h5>
            
            <div className="max-h-40 overflow-y-auto mb-2">
              {cart.map((item) => (
                <div key={item.id} className="py-1 border-b last:border-b-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.name} x{item.quantity}</span>
                    <span>฿{(item.totalPrice).toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500 pl-2">
                    {/* รวมรายละเอียดทั้งหมดแสดงในบรรทัดเดียว */}
                    <div>
                      {[
                        item.customizations?.temperature ? `${item.customizations.temperature}${
                          item.customizations.temperaturePrice !== 0 ? 
                            (item.customizations.temperaturePrice > 0 ? 
                              ` (+฿${item.customizations.temperaturePrice})` : 
                              ` (-฿${Math.abs(item.customizations.temperaturePrice)})`) : 
                            ''
                        }` : '',
                        item.customizations?.sugar_level || '',
                        item.customizations?.milk_type || ''
                      ].filter(Boolean).join(' | ')}
                    </div>
                    
                    {/* แสดงท็อปปิ้งและเพิ่มพิเศษเป็นบรรทัดแยก */}
                    {item.customizations?.toppings && item.customizations.toppings.length > 0 && (
                      <div>ท็อปปิ้ง: {item.customizations.toppings.map((t: any) => t.name).join(', ')}</div>
                    )}
                    
                    {item.customizations?.extras && item.customizations.extras.length > 0 && (
                      <div>เพิ่มพิเศษ: {item.customizations.extras.map((e: any) => e.name).join(', ')}</div>
                    )}
                    
                    {item.customizations?.specialInstructions && (
                      <div className="text-xs italic mt-1">* {item.customizations.specialInstructions}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-base mb-1 pt-2">
              <span>ยอดรวม:</span>
              <span>฿{subtotal.toFixed(2)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-base mb-1">
                <span>ส่วนลด:</span>
                <span className="text-green-600">-฿{discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-medium text-lg pt-1 border-t mt-1">
              <span>ยอดสุทธิ:</span>
              <span className="text-[var(--coffee-primary)]">฿{total.toFixed(2)}</span>
            </div>
          </div>
          
          <h4 className="text-xl font-medium mb-4">เลือกวิธีชำระเงิน</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className={`border py-4 rounded-lg flex flex-col items-center justify-center ${
                paymentMethod === 'cash'
                  ? 'bg-[var(--coffee-primary)] text-white'
                  : 'border-[var(--coffee-primary)] text-[var(--coffee-primary)] hover:bg-[var(--coffee-light)]'
              }`}
              onClick={() => handlePaymentMethodSelect('cash')}
            >
              <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"></path>
              </svg>
              เงินสด
            </button>
            
            <button
              className={`border py-4 rounded-lg flex flex-col items-center justify-center ${
                paymentMethod === 'qr_code'
                  ? 'bg-[var(--coffee-primary)] text-white'
                  : 'border-[var(--coffee-primary)] text-[var(--coffee-primary)] hover:bg-[var(--coffee-light)]'
              }`}
              onClick={() => handlePaymentMethodSelect('qr_code')}
            >
              <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd"></path>
                <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z"></path>
              </svg>
              สแกน QR
            </button>
          </div>
          
          {/* Cash Payment Section */}
          {paymentMethod === 'cash' && (
            <div>
              <div className="border rounded-lg p-4 mb-4">
                <h5 className="font-medium mb-2">กรอกจำนวนเงินที่รับ</h5>
                <div className="flex items-center">
                  <span className="text-xl font-medium mr-2">฿</span>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={handleCashAmountChange}
                    className="border rounded py-2 px-3 w-full text-right text-xl"
                  />
                </div>
              </div>
              
              <div className="bg-[var(--coffee-light)] p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <span>ยอดสุทธิ</span>
                  <span className="font-medium">฿{total}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>รับเงิน</span>
                  <span className="font-medium">฿{cashAmount}</span>
                </div>
                <div className="flex justify-between text-lg font-medium text-[var(--coffee-primary)] border-t pt-2">
                  <span>เงินทอน</span>
                  <span>฿{change}</span>
                </div>
              </div>
              
              <Button
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                onClick={handleCompletePayment}
                disabled={isProcessing || cashAmount < total}
              >
                {isProcessing ? "กำลังประมวลผล..." : "ยืนยันการชำระเงิน"}
              </Button>
            </div>
          )}
          
          {/* QR Payment Section */}
          {paymentMethod === 'qr_code' && (
            <div className="text-center p-4">
              <div className="bg-[var(--coffee-light)] p-4 rounded-lg inline-block mb-4">
                {isLoadingQR ? (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[var(--coffee-primary)] border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                )}
              </div>
              <p className="mb-2">กรุณาสแกน QR Code เพื่อชำระเงิน ฿{total}</p>
              <div className="text-sm text-center mb-2 font-medium">
                รหัสอ้างอิง: {referenceId}
              </div>
              <div className="text-sm text-center text-muted-foreground mb-4">
                พร้อมเพย์ เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน
              </div>
              
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-pulse inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>รอการชำระเงิน...</span>
              </div>
              
              <Button
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors mt-6"
                onClick={handleCompletePayment}
                disabled={isProcessing}
              >
                {isProcessing ? "กำลังประมวลผล..." : "ยืนยันการชำระเงิน"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
