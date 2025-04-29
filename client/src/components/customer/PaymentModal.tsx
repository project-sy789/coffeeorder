import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartItem } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { generateQRCode, generateMerchantQRCode } from "@/lib/qrcode";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { 
  CreditCard, BanknoteIcon, CheckCircle2, Loader2, Tag, 
  X, CheckCircle, ArrowRight, AlertCircle, ChevronsRight
} from "lucide-react";

interface PaymentModalProps {
  cart: CartItem[];
  onClose: () => void;
  onComplete: (orderId: number) => void;
  memberId?: number;
}

interface PromotionResult {
  valid: boolean;
  promotion?: {
    id: number;
    name: string;
    type: string;
    value: number;
  },
  discountAmount: number;
  message: string;
}

export default function PaymentModal({
  cart,
  onClose,
  onComplete,
  memberId
}: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState<'discount' | 'payment'>('discount');
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr">("cash");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoadingQR, setIsLoadingQR] = useState(true);
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);
  const [validatingPromotion, setValidatingPromotion] = useState(false);
  const [availablePointPromotions, setAvailablePointPromotions] = useState<any[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [usingPoints, setUsingPoints] = useState(false);
  const { toast } = useToast();

  const subtotalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = promotionResult?.valid ? promotionResult.discountAmount : 0;
  const totalAmount = subtotalAmount - discountAmount;
  const referenceId = uuidv4().substring(0, 8);
  
  // Load member info when component mounts
  useEffect(() => {
    if (memberId) {
      const getMemberInfo = async () => {
        try {
          const response = await apiRequest("GET", `/api/members/${memberId}`);
          if (response.response.ok) {
            setMemberInfo(response.data);
          }
        } catch (error) {
          console.error("Error fetching member info:", error);
        }
      };
      
      getMemberInfo();
    }
  }, [memberId]);
  
  // Load point redemption rules when component mounts
  useEffect(() => {
    if (memberId) {
      const getPointRedemptionOptions = async () => {
        setLoadingPromotions(true);
        try {
          // เรียกใช้ API เพื่อรับตัวเลือกการแลกแต้มที่ใช้ได้สำหรับสมาชิกนี้
          const response = await apiRequest("POST", "/api/calculate-redemption-options", {
            memberId: memberId, 
            total: subtotalAmount
          });
          
          if (response.response.ok) {
            // ตัวเลือกการแลกแต้มที่เรียกมาจะมีเฉพาะที่สมาชิกมีคะแนนเพียงพอและตรงตามเงื่อนไขเท่านั้น
            setAvailablePointPromotions(response.data.map((rule: any) => ({
              id: rule.id,
              name: rule.name,
              value: rule.pointCost,
              discountValue: rule.discountValue,
              discountType: rule.discountType,
              maximumDiscount: rule.maximumDiscount
            })));
          }
        } catch (error) {
          console.error("Error fetching point redemption options:", error);
          // กรณีที่ API ยังไม่พร้อมใช้งาน ลองดึงข้อมูลจากตัวเลือกเดิม
          try {
            const fallbackResponse = await apiRequest("GET", "/api/point-redemption-rules");
            if (fallbackResponse.response.ok) {
              // กรองกฎที่ active และคะแนนของสมาชิกเพียงพอที่จะแลก
              const rules = fallbackResponse.data.filter((rule: any) => 
                rule.active && memberInfo && memberInfo.points >= rule.pointCost
              );
              setAvailablePointPromotions(rules.map((rule: any) => ({
                id: rule.id,
                name: rule.name,
                value: rule.pointCost,
                discountValue: rule.discountValue,
                discountType: rule.discountType,
                maximumDiscount: rule.maximumDiscount
              })));
            }
          } catch (fallbackError) {
            console.error("Error fetching fallback point redemption rules:", fallbackError);
          }
        } finally {
          setLoadingPromotions(false);
        }
      };
      
      getPointRedemptionOptions();
    }
  }, [memberId, memberInfo, subtotalAmount]);

  // Load QR code when component mounts or when payment method changes
  useEffect(() => {
    if (currentStep === 'payment' && paymentMethod === "qr") {
      const loadQRCode = async () => {
        setIsLoadingQR(true);
        try {
          const qrCode = await generateMerchantQRCode(totalAmount, referenceId);
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
      
      loadQRCode();
    }
  }, [currentStep, paymentMethod, totalAmount, referenceId, toast]);

  const handlePromotionValidate = async () => {
    if (!promotionCode.trim()) {
      toast({
        title: "กรุณากรอกรหัสส่วนลด",
        variant: "destructive",
      });
      return;
    }

    setValidatingPromotion(true);
    
    try {
      const response = await apiRequest("POST", "/api/promotions/validate-code", {
        code: promotionCode,
        orderTotal: subtotalAmount
      });
      
      if (response.response.ok) {
        setPromotionResult(response.data as PromotionResult);
        toast({
          title: "สำเร็จ",
          description: response.data.message,
        });
      } else {
        const errorData = await response.response.json();
        setPromotionResult(null);
        toast({
          title: "ไม่สามารถใช้รหัสส่วนลดได้",
          description: errorData.message || "รหัสส่วนลดไม่ถูกต้อง",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating promotion:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถตรวจสอบรหัสส่วนลดได้",
        variant: "destructive",
      });
    } finally {
      setValidatingPromotion(false);
    }
  };

  const handleClearPromotion = () => {
    setPromotionCode("");
    setPromotionResult(null);
    setUsingPoints(false);
  };
  
  // ฟังก์ชันสำหรับการใช้แต้มสมาชิก
  const handleUsePoints = async (promotion: any) => {
    if (!memberId || !memberInfo) return;
    
    if (memberInfo.points < promotion.value) {
      toast({
        title: "แต้มไม่เพียงพอ",
        description: `คุณมีแต้มสะสม ${memberInfo.points} แต้ม แต่ต้องใช้ ${promotion.value} แต้ม`,
        variant: "destructive",
      });
      return;
    }
    
    // สร้าง promotion result คล้ายกับการใช้รหัสส่วนลด
    setPromotionResult({
      valid: true,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        type: "points",
        value: promotion.value
      },
      discountAmount: promotion.discountValue || 0,
      message: `ใช้แต้มสะสม ${promotion.value} แต้ม เพื่อรับส่วนลด ${formatCurrency(promotion.discountValue || 0)}`
    });
    
    setUsingPoints(true);
    
    toast({
      title: "ใช้แต้มสะสมสำเร็จ",
      description: `คุณได้ใช้แต้มสะสม ${promotion.value} แต้ม เพื่อรับส่วนลด ${formatCurrency(promotion.discountValue || 0)}`,
    });
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    
    try {
      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations
        })),
        total: subtotalAmount,
        discount: discountAmount,
        paymentMethod: paymentMethod === "qr" ? "qr_code" : "cash",
        referenceId,
        memberId: memberId, // ใช้ member ID ที่ถูกส่งมาจาก props (ถ้ามี)
        promotionCode: promotionResult?.valid && !usingPoints ? promotionCode : undefined,
        usePoints: usingPoints,
        pointsUsed: usingPoints && promotionResult?.promotion ? promotionResult.promotion.value : 0,
        pointsPromotion: usingPoints && promotionResult?.promotion ? promotionResult.promotion.id : undefined
      };
      
      console.log("Submitting order with data:", orderData);
      
      // Submit order to backend
      const response = await apiRequest("POST", "/api/customer/orders", orderData);
      
      if (!response.response.ok) {
        throw new Error("ไม่สามารถส่งคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
      }
      
      const orderResult = response.data;
      
      // ตรวจสอบว่ามีค่า id หรือไม่
      let orderId = 0;
      if (orderResult && orderResult.id) {
        orderId = orderResult.id;
        
        // แสดงข้อความเพิ่มเติมหากมีการใช้แต้มสะสม
        if (usingPoints && promotionResult?.promotion?.value) {
          toast({
            title: "ใช้แต้มสะสมสำเร็จ",
            description: `คุณได้ใช้ ${promotionResult.promotion.value} แต้ม เพื่อรับส่วนลด ${formatCurrency(discountAmount)}`,
          });
        }
      } else {
        console.log("Warning: Created order has no ID, using 0 as fallback");
      }
      
      // Show success state
      setCompleted(true);
      setProcessing(false);
      
      // Auto close after success and pass orderId back to parent
      setTimeout(() => {
        onComplete(orderId);
      }, 3000);
      
    } catch (error) {
      console.error("Order submission error:", error);
      setProcessing(false);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถส่งคำสั่งซื้อได้",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    setCurrentStep('payment');
  };

  return (
    <Dialog open={true} onOpenChange={() => !processing && !completed && onClose()}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {currentStep === 'discount' ? 'รหัสส่วนลด' : 'ชำระเงิน'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {currentStep === 'discount' ? 'ขั้นตอนที่ 1: กรอกรหัสส่วนลด (ถ้ามี) แล้วกดดำเนินการต่อ' : 'ขั้นตอนที่ 2: เลือกวิธีชำระเงินและยืนยันคำสั่งซื้อ'}
          </DialogDescription>
        </DialogHeader>
        
        {completed ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">การชำระเงินสำเร็จ</h3>
            <p className="text-muted-foreground mb-4">ขอบคุณที่ใช้บริการ</p>
          </div>
        ) : currentStep === 'discount' ? (
          <>
            <div className="space-y-5">
              {/* แสดงรายการสินค้าในตะกร้า */}
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-[var(--coffee-primary)]/10 p-3 border-b">
                  <h3 className="font-medium text-[var(--coffee-primary)]">รายการสินค้า</h3>
                </div>
                <div className="max-h-40 overflow-y-auto p-0">
                  <ul className="divide-y">
                    {cart.map((item) => (
                      <li key={item.id} className="p-3 hover:bg-muted/20">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.customizations.type && `${item.customizations.type}`}
                              {item.customizations.milk_type && `, ${item.customizations.milk_type}`}
                              {item.customizations.sugar_level && `, ${item.customizations.sugar_level}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p>{formatCurrency(item.totalPrice)}</p>
                            <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t p-3 bg-[var(--coffee-primary)]/5">
                  <div className="flex justify-between font-medium">
                    <span>ยอดรวมทั้งสิ้น</span>
                    <span>{formatCurrency(subtotalAmount)}</span>
                  </div>
                </div>
              </div>
              
              {/* รหัสส่วนลด */}
              <div className="border rounded-lg p-4 bg-white">
                <Label htmlFor="promoCode" className="text-sm font-medium mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-[var(--coffee-primary)]" />
                  รหัสส่วนลด
                </Label>
                
                {promotionResult?.valid ? (
                  <div className="flex items-center justify-between mt-2 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium">{promotionResult.promotion?.name}</div>
                        <div className="text-xs text-muted-foreground">ส่วนลด: {formatCurrency(promotionResult.discountAmount)}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={handleClearPromotion}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Input
                      id="promoCode"
                      placeholder="กรอกรหัสส่วนลด"
                      value={promotionCode}
                      onChange={(e) => setPromotionCode(e.target.value)}
                      className="flex-1"
                      disabled={validatingPromotion || processing}
                    />
                    <Button 
                      onClick={handlePromotionValidate} 
                      disabled={validatingPromotion || processing || !promotionCode.trim()}
                      size="sm"
                    >
                      {validatingPromotion ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : "ใช้รหัส"}
                    </Button>
                  </div>
                )}
                
                {!promotionResult?.valid && promotionCode.trim() === "" && (
                  <div className="text-xs mt-2 text-muted-foreground flex items-start">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5 mt-0.5" />
                    <span>หากไม่มีรหัสส่วนลด สามารถข้ามขั้นตอนนี้ได้</span>
                  </div>
                )}
              </div>
              
              {/* ยอดสั่งซื้อและเช็คสมาชิก */}
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex justify-between text-sm">
                  <div className="text-muted-foreground">ยอดรวม:</div>
                  <div>{formatCurrency(subtotalAmount)}</div>
                </div>
                
                {promotionResult?.valid && (
                  <div className="flex justify-between mt-1 text-sm">
                    <div className="text-muted-foreground">ส่วนลด:</div>
                    <div className="text-green-600">- {formatCurrency(discountAmount)}</div>
                  </div>
                )}
                
                <div className="flex justify-between font-medium mt-2 text-lg pt-2 border-t">
                  <div>ยอดสุทธิ:</div>
                  <div className="text-[var(--coffee-primary)]">{formatCurrency(totalAmount)}</div>
                </div>
                
                {/* แสดงข้อความสำหรับสมาชิก */}
                {memberId ? (
                  <>
                    <div className="text-xs text-center mt-2 text-green-600 flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      คุณจะได้รับคะแนนสะสมจากการสั่งซื้อนี้
                    </div>
                    
                    {/* แสดงแต้มสะสมที่มีและโปรโมชั่นแลกแต้ม */}
                    {!promotionResult?.valid && (
                      <div className="mt-4 pt-2 border-t border-dashed">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">แต้มสะสมของคุณ</h4>
                          <span className="text-sm font-medium">{memberInfo?.points || 0} แต้ม</span>
                        </div>
                        
                        {loadingPromotions ? (
                          <div className="flex justify-center py-2">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : availablePointPromotions.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">แลกแต้มสะสมเพื่อรับส่วนลด:</p>
                            {availablePointPromotions.map((promotion) => (
                              <Button 
                                key={promotion.id}
                                size="sm"
                                variant="outline"
                                className="w-full justify-between"
                                disabled={memberInfo?.points < promotion.value || processing}
                                onClick={() => handleUsePoints(promotion)}
                              >
                                <span>ใช้ {promotion.value} แต้ม</span>
                                <span className="text-green-600">- {formatCurrency(promotion.discountValue || 0)}</span>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-1">ไม่มีโปรโมชั่นแลกแต้มที่ใช้ได้ในขณะนี้</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-center mt-2 text-muted-foreground">
                    สิทธิพิเศษสำหรับสมาชิก: สามารถสะสมแต้มเพื่อรับสิทธิพิเศษได้
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={processing}
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={handleNextStep}
                disabled={processing}
                className="bg-[var(--coffee-primary)]"
              >
                ดำเนินการต่อ
                <ChevronsRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">              
              {/* สรุปยอดเงิน */}
              <div className="bg-[var(--coffee-primary)]/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-muted-foreground">ยอดรวม</div>
                  <div>{formatCurrency(subtotalAmount)}</div>
                </div>
                
                {promotionResult?.valid && (
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm flex items-center">
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-muted-foreground">{promotionResult.promotion?.name}</span>
                    </div>
                    <div className="text-green-600">- {formatCurrency(discountAmount)}</div>
                  </div>
                )}
                
                <div className="flex justify-between font-medium text-lg pt-2 border-t border-[var(--coffee-primary)]/20">
                  <div>ยอดสุทธิ</div>
                  <div className="text-[var(--coffee-primary)]">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
              
              <Tabs defaultValue="cash" onValueChange={(value) => setPaymentMethod(value as "cash" | "qr")}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="qr" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>ชำระผ่าน QR</span>
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="flex items-center gap-2">
                    <BanknoteIcon className="h-4 w-4" />
                    <span>เงินสด</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="qr" className="space-y-4">
                  <div className="bg-white rounded-lg p-4 flex flex-col items-center border">
                    <div className="text-sm text-muted-foreground mb-2">
                      สแกน QR code เพื่อชำระเงิน
                    </div>
                    <div className="border p-2 rounded-lg mb-2">
                      {isLoadingQR ? (
                        <div className="w-48 h-48 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-[var(--coffee-primary)]" />
                        </div>
                      ) : (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code" 
                          className="w-48 h-48" 
                        />
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">รหัสอ้างอิง:</span> {referenceId}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">จำนวนเงิน:</span> {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="cash" className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-center mb-4">
                      กรุณาชำระเงินที่เคาน์เตอร์เมื่อรับเครื่องดื่ม
                    </p>
                    <div className="text-center text-xl font-medium text-[var(--coffee-primary)]">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="flex justify-between gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('discount')}
                disabled={processing}
              >
                ย้อนกลับ
              </Button>
              <Button 
                onClick={handleSubmitOrder}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังดำเนินการ
                  </>
                ) : 'ยืนยันการสั่งซื้อ'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}