import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, ShoppingBag } from "lucide-react";

export default function PaymentSuccess() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<{
    status: 'success' | 'processing' | 'failed';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  useEffect(() => {
    // ดึง orderId จาก session storage หรือ local storage
    const storedOrderId = localStorage.getItem('currentOrderId');
    const paymentRef = localStorage.getItem('paymentReferenceId');
    const storedPaymentMethod = localStorage.getItem('paymentMethod');
    setOrderId(storedOrderId);
    setPaymentMethod(storedPaymentMethod);

    // ตรวจสอบสถานะการชำระเงินแบบใหม่
    const checkPaymentStatus = async () => {
      // ในระบบจริงควรตรวจสอบสถานะการชำระเงินจากเซิร์ฟเวอร์
      // แต่ในตัวอย่างนี้เราใช้ค่าที่เก็บไว้ใน localStorage เพื่อความง่าย
      
      if (storedOrderId) {
        try {
          // ส่งคำขอไปยัง API เพื่ออัพเดทสถานะการชำระเงิน
          // อาจดึงข้อมูลจากระบบชำระเงินจริงหรือธนาคารก่อนการอัพเดท
          await apiRequest("POST", "/api/payment-status", {
            orderId: parseInt(storedOrderId),
            status: "completed", // ในระบบจริงควรส่งสถานะที่ถูกต้องตามผลการตรวจสอบ
            paymentMethod: storedPaymentMethod || 'custom'
          });
          
          // ลบข้อมูลการชำระเงินหลังจากอัพเดทสถานะเรียบร้อยแล้ว
          localStorage.removeItem('currentOrderId');
          localStorage.removeItem('paymentReferenceId');
          localStorage.removeItem('paymentMethod');
          
          setPaymentStatus({
            status: 'success',
            message: paymentRef 
              ? `การชำระเงินสำเร็จ! หมายเลขอ้างอิง: ${paymentRef}`
              : 'การชำระเงินสำเร็จ! ขอบคุณสำหรับการสั่งซื้อ'
          });
        } catch (error) {
          console.error("Failed to update order status:", error);
          setPaymentStatus({
            status: 'success', // ยังถือว่าสำเร็จเพื่อให้ผู้ใช้ไม่สับสน
            message: 'การชำระเงินสำเร็จ แต่ไม่สามารถอัพเดทสถานะออเดอร์ได้'
          });
        }
      } else {
        setPaymentStatus({
          status: 'success',
          message: 'การชำระเงินสำเร็จ!'
        });
      }
      
      setIsLoading(false);
    };

    // ทำการตรวจสอบสถานะการชำระเงิน
    checkPaymentStatus();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">สถานะการชำระเงิน</CardTitle>
          <CardDescription className="text-center">
            ขอบคุณที่ใช้บริการร้านกาแฟของเรา
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center py-6">
          {isLoading ? (
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          ) : paymentStatus ? (
            <>
              {paymentStatus.status === 'success' && (
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              )}
              {paymentStatus.status === 'processing' && (
                <div className="animate-spin w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
              )}
              {paymentStatus.status === 'failed' && (
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
              )}
              <p className={`text-lg font-medium text-center ${
                paymentStatus.status === 'success' ? 'text-green-700' : 
                paymentStatus.status === 'processing' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {paymentStatus.message}
              </p>
              
              {paymentStatus.status === 'success' && orderId && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg w-full">
                  <h3 className="font-medium text-center mb-2">รายละเอียดคำสั่งซื้อ</h3>
                  <div className="text-sm">
                    <p className="flex justify-between border-b pb-2">
                      <span>หมายเลขคำสั่งซื้อ:</span> 
                      <span className="font-medium">{orderId}</span>
                    </p>
                    <p className="flex justify-between pt-2">
                      <span>สถานะ:</span> 
                      <span className="text-green-600 font-medium">ชำระเงินแล้ว</span>
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-center text-gray-500">
                    โปรดเตรียมหมายเลขคำสั่งซื้อเพื่อรับสินค้า
                  </p>
                  <p className="mt-2 text-xs text-center text-gray-500">
                    วิธีการชำระเงิน: {paymentMethod === 'qr' ? 'QR พร้อมเพย์' : 'เงินสด'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-red-500">ไม่พบข้อมูลการชำระเงิน</p>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
          <Button 
            onClick={() => setLocation('/')}
            className="w-full md:w-auto"
          >
            กลับสู่หน้าหลัก
          </Button>
          {paymentStatus?.status === 'failed' && (
            <Button 
              variant="outline" 
              onClick={() => setLocation('/checkout')}
              className="w-full md:w-auto"
            >
              ลองอีกครั้ง
            </Button>
          )}
          {paymentStatus?.status === 'success' && (
            <Button 
              variant="outline" 
              onClick={() => setLocation('/customer')}
              className="w-full md:w-auto"
            >
              สั่งซื้อเพิ่มเติม
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}