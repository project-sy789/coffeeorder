import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Loader2, CreditCard, QrCode, BanknoteIcon } from "lucide-react";
import { generateQRCode } from "@/lib/qrcode";

export default function CustomPayment() {
  const [match, params] = useRoute('/custom-payment/:orderId');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvc: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const orderId = params?.orderId ? parseInt(params.orderId) : null;

  useEffect(() => {
    if (!orderId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อมูลคำสั่งซื้อ",
        variant: "destructive"
      });
      setLocation('/');
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const { response, data } = await apiRequest('GET', `/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลคำสั่งซื้อได้');
        }
        
        setOrderDetails(data);
      } catch (error: any) {
        toast({
          title: "ข้อผิดพลาด",
          description: error.message || "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้",
          variant: "destructive"
        });
        setLocation('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, toast, setLocation]);

  // สร้าง QR code เมื่อเลือกวิธีการชำระเงินเป็น QR
  useEffect(() => {
    if (selectedMethod === 'qr' && orderDetails) {
      const generatePromptpayQR = async () => {
        try {
          const qrCode = await generateQRCode(orderDetails.total);
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
  }, [selectedMethod, orderDetails, toast]);

  const handlePaymentMethodChange = (value: string) => {
    setSelectedMethod(value);
  };

  const handleCardDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProcessPayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "กรุณาเลือกวิธีการชำระเงิน",
        description: "โปรดเลือกวิธีการชำระเงินก่อนดำเนินการต่อ",
        variant: "destructive"
      });
      return;
    }

    if (selectedMethod === 'card') {
      // ตรวจสอบข้อมูลบัตร
      if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.expiry || !cardDetails.cvc) {
        toast({
          title: "ข้อมูลบัตรไม่ครบถ้วน",
          description: "กรุณากรอกข้อมูลบัตรให้ครบถ้วน",
          variant: "destructive"
        });
        return;
      }
    }

    setProcessingPayment(true);

    try {
      // ในกรณีของการชำระเงินจริงๆ เราจะต้องส่งข้อมูลไปยังระบบประมวลผลการชำระเงิน
      // แต่ในตัวอย่างนี้ เราจะจำลองการชำระเงินสำเร็จหลังจากรอสักครู่
      
      // อัพเดทสถานะคำสั่งซื้อ
      const { response } = await apiRequest('POST', '/api/payment-status', {
        paymentMethod: selectedMethod,
        orderId: orderId,
        status: 'completed'
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถอัพเดทสถานะการชำระเงินได้');
      }

      // ลบข้อมูลคำสั่งซื้อปัจจุบันจาก localStorage
      localStorage.removeItem('currentOrderId');

      // รอสักครู่แล้วนำทางไปยังหน้าชำระเงินสำเร็จ
      setTimeout(() => {
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

  if (isLoading || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>กำลังโหลดข้อมูลการชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>ชำระเงิน</CardTitle>
          <CardDescription>
            กรุณาเลือกวิธีการชำระเงินสำหรับคำสั่งซื้อของคุณ
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* แสดงรายละเอียดคำสั่งซื้อ */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-2">รายละเอียดคำสั่งซื้อ #{orderId}</h3>
            <p>วันที่: {new Date(orderDetails.createdAt).toLocaleString('th-TH')}</p>
            {orderDetails.items && (
              <div className="mt-2">
                <p className="font-medium">รายการสินค้า:</p>
                <ul className="space-y-1 pl-4">
                  {orderDetails.items.map((item: any) => (
                    <li key={item.id} className="text-sm">
                      {item.product.name} x{item.quantity} - {item.price * item.quantity} บาท
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {orderDetails.discount > 0 && (
              <p className="mt-2 text-green-600">ส่วนลด: {orderDetails.discount} บาท</p>
            )}
            <p className="mt-2 font-semibold text-lg">ยอดรวม: {orderDetails.total} บาท</p>
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
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center cursor-pointer">
                  <BanknoteIcon className="w-5 h-5 mr-2 text-green-600" />
                  เงินสด
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="qr" id="qr" />
                <Label htmlFor="qr" className="flex items-center cursor-pointer">
                  <QrCode className="w-5 h-5 mr-2 text-blue-600" />
                  QR พร้อมเพย์
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center cursor-pointer">
                  <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                  บัตรเครดิต/เดบิต
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
                จำนวนเงิน: {orderDetails.total} บาท
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
          
          {selectedMethod === 'card' && (
            <div className="bg-white p-4 border rounded-lg space-y-4">
              <h3 className="font-medium">ข้อมูลบัตรเครดิต/เดบิต</h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cardNumber">หมายเลขบัตร</Label>
                  <Input 
                    id="cardNumber" 
                    name="cardNumber" 
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    value={cardDetails.cardNumber}
                    onChange={handleCardDetailChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cardName">ชื่อบนบัตร</Label>
                  <Input 
                    id="cardName" 
                    name="cardName" 
                    placeholder="FIRSTNAME LASTNAME"
                    value={cardDetails.cardName}
                    onChange={handleCardDetailChange}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">วันหมดอายุ</Label>
                    <Input 
                      id="expiry" 
                      name="expiry" 
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardDetails.expiry}
                      onChange={handleCardDetailChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC/CVV</Label>
                    <Input 
                      id="cvc" 
                      name="cvc" 
                      placeholder="123"
                      maxLength={3}
                      value={cardDetails.cvc}
                      onChange={handleCardDetailChange}
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleProcessPayment} 
                disabled={processingPayment}
                className="w-full"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังประมวลผล...
                  </>
                ) : (
                  `ชำระเงิน ${orderDetails.total} บาท`
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                ข้อมูลการชำระเงินของคุณจะถูกเข้ารหัสและปลอดภัย
              </p>
            </div>
          )}
          
          {selectedMethod === 'cash' && (
            <div className="bg-white p-4 border rounded-lg flex flex-col items-center space-y-3">
              <Check className="w-12 h-12 text-green-500" />
              <h3 className="font-medium text-center">ชำระเงินด้วยเงินสดที่ร้าน</h3>
              <p className="text-center text-gray-600">
                กรุณาแสดงหมายเลขคำสั่งซื้อ #{orderId} ที่เคาน์เตอร์<br />
                จำนวนเงิน: {orderDetails.total} บาท
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
        </CardContent>
        
        <CardFooter className="flex flex-col items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            disabled={processingPayment}
          >
            กลับสู่หน้าหลัก
          </Button>
          <p className="text-xs text-gray-500">
            หากมีปัญหาเกี่ยวกับการชำระเงิน กรุณาติดต่อเจ้าหน้าที่
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}