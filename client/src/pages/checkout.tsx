import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, CreditCard, QrCode, BanknoteIcon } from "lucide-react";
import { generateQRCode } from "@/lib/qrcode";

// หน้าการชำระเงินแบบกำหนดเอง
export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState(350); // ตัวอย่างจำนวนเงิน 350 บาท
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState('qr'); // เปลี่ยนค่าเริ่มต้นเป็น 'qr' แทน
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  useEffect(() => {
    // สร้าง Payment Intent ทันทีที่โหลดหน้า
    const createPaymentIntent = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          amount: amount
        });
        
        const data = await response.response.json();
        
        if (data.clientSecret && data.referenceId) {
          setPaymentInfo(data);
        } else {
          toast({
            title: "มีข้อผิดพลาด",
            description: data.error || data.message || "ไม่สามารถเริ่มกระบวนการชำระเงินได้",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Payment intent error:", error);
        toast({
          title: "มีข้อผิดพลาด",
          description: "ไม่สามารถเริ่มกระบวนการชำระเงินได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    createPaymentIntent();
  }, [amount, toast]);
  
  // สร้าง QR code เมื่อเลือกวิธีการชำระเงินเป็น QR
  useEffect(() => {
    if (selectedMethod === 'qr' && paymentInfo && amount) {
      const generatePromptpayQR = async () => {
        try {
          const qrCode = await generateQRCode(amount);
          setQrCodeUrl(qrCode);
        } catch (error) {
          console.error('ไม่สามารถสร้าง QR code ได้:', error);
          toast({
            title: "ข้อผิดพลาด",
            description: "ไม่สามารถสร้าง QR code ได้",
            variant: "destructive"
          });
        }
      };
      
      generatePromptpayQR();
    }
  }, [selectedMethod, paymentInfo, amount, toast]);
  
  const handlePaymentMethodChange = (value: string) => {
    setSelectedMethod(value);
  };
  
  // ลบฟังก์ชัน handleCardDetailChange เนื่องจากไม่ได้ใช้ระบบบัตรแล้ว
  
  const handleProcessPayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "กรุณาเลือกวิธีการชำระเงิน",
        description: "โปรดเลือกวิธีการชำระเงินก่อนดำเนินการต่อ",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // ในกรณีของการจำลองระบบชำระเงิน เราจะยืนยันการชำระเงินสำเร็จหลังจากกดปุ่ม
      // สำหรับระบบจริง ควรมีการเชื่อมต่อกับ payment gateway
      
      // บันทึกข้อมูลการชำระเงินลง localStorage
      if (paymentInfo?.referenceId) {
        localStorage.setItem('paymentReferenceId', paymentInfo.referenceId);
      }
      localStorage.setItem('paymentMethod', selectedMethod);
      
      // สมมติว่าเราได้สร้างคำสั่งซื้อแล้วและมีเลขคำสั่งซื้อ (ในระบบจริงจะได้จาก API)
      // ในตัวอย่างนี้เราสุ่มขึ้นมาเพื่อให้ทำงานได้
      const mockOrderId = Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('currentOrderId', mockOrderId.toString());
      
      // รอสักครู่แล้วนำทางไปยังหน้าชำระเงินสำเร็จ
      setTimeout(() => {
        toast({
          title: "ชำระเงินสำเร็จ",
          description: `การชำระเงิน ${amount} บาท ถูกดำเนินการเรียบร้อยแล้ว`,
          variant: "default",
        });
        
        setLocation('/payment-success');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "การชำระเงินล้มเหลว",
        description: error.message || "เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน",
        variant: "destructive"
      });
      setProcessingPayment(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>ชำระเงิน</CardTitle>
          <CardDescription>
            กรุณาเลือกวิธีการชำระเงินสำหรับคำสั่งซื้อของคุณ
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : paymentInfo ? (
            <div className="space-y-6">
              {/* ข้อมูลสรุปรายการ */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-2">รายละเอียดรายการ</h3>
                <p className="mt-2 font-semibold text-lg">ยอดรวม: {amount} บาท</p>
                <p className="text-sm text-gray-500">หมายเลขอ้างอิง: {paymentInfo.referenceId}</p>
              </div>
              
              {/* วิธีการชำระเงิน */}
              <div>
                <h3 className="font-medium text-lg mb-3">เลือกวิธีการชำระเงิน</h3>
                <RadioGroup 
                  value={selectedMethod}
                  onValueChange={handlePaymentMethodChange}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="qr" id="qr" />
                    <Label htmlFor="qr" className="flex items-center cursor-pointer">
                      <QrCode className="w-5 h-5 mr-2 text-blue-600" />
                      QR พร้อมเพย์
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center cursor-pointer">
                      <BanknoteIcon className="w-5 h-5 mr-2 text-green-600" />
                      เงินสด
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* เนื้อหาตามวิธีการชำระเงินที่เลือก */}
              {selectedMethod === 'qr' && (
                <div className="bg-white p-4 border rounded-lg flex flex-col items-center space-y-3">
                  <h3 className="font-medium">สแกน QR Code เพื่อชำระเงิน</h3>
                  {qrCodeUrl ? (
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img src={qrCodeUrl} alt="QR Code" className="max-w-[200px] max-h-[200px]" />
                    </div>
                  ) : (
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  )}
                  <p className="text-sm text-gray-500">
                    สแกน QR Code นี้ด้วยแอพธนาคารหรือแอพพร้อมเพย์ของคุณ<br />
                    จำนวนเงิน: {amount} บาท
                  </p>
                  <Button 
                    onClick={handleProcessPayment} 
                    disabled={processingPayment}
                    className="mt-2 w-full"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยืนยันการชำระเงิน...
                      </>
                    ) : (
                      'ฉันได้ชำระเงินแล้ว'
                    )}
                  </Button>
                </div>
              )}
              
              {/* ตัดส่วนของ card payment ออก */}
              
              {selectedMethod === 'cash' && (
                <div className="bg-white p-4 border rounded-lg flex flex-col items-center space-y-3">
                  <Check className="w-12 h-12 text-green-500" />
                  <h3 className="font-medium text-center">ชำระเงินด้วยเงินสดที่ร้าน</h3>
                  <p className="text-center text-gray-600">
                    กรุณาแสดงหมายเลขอ้างอิง {paymentInfo.referenceId} ที่เคาน์เตอร์<br />
                    จำนวนเงิน: {amount} บาท
                  </p>
                  
                  <Button 
                    onClick={handleProcessPayment} 
                    disabled={processingPayment}
                    className="mt-2 w-full"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังยืนยันการชำระเงิน...
                      </>
                    ) : (
                      'ฉันได้ชำระเงินแล้ว'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-red-500">
              ไม่สามารถเริ่มกระบวนการชำระเงินได้ โปรดลองอีกครั้งในภายหลัง
            </div>
          )}
        </CardContent>
        
        <CardFooter className="text-sm text-gray-500 flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            disabled={processingPayment}
            className="mr-0 md:mr-2 w-full md:w-auto"
          >
            กลับสู่หน้าหลัก
          </Button>
          <p className="text-xs text-gray-500 text-center md:text-left">
            ระบบชำระเงินที่ปลอดภัย รองรับการชำระผ่าน QR Code และเงินสด<br />
            หากมีปัญหาเกี่ยวกับการชำระเงิน กรุณาติดต่อเจ้าหน้าที่
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}