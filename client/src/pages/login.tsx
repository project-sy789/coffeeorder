import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { loginUser } from "@/lib/socket";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("เข้าสู่ระบบด้วย Socket.IO");
      
      // เข้าสู่ระบบด้วย Socket.IO ผ่านฟังก์ชัน
      const response = await loginUser<{success: boolean, user: any, error?: string}>(username, password);
      
      // ตรวจสอบการตอบกลับจาก socket server
      if (response.error) {
        console.error("Login error:", response.error);
        toast({
          title: "เข้าสู่ระบบไม่สำเร็จ",
          description: response.error || "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // ถ้าสำเร็จ
      const userData = response.user;
      console.log("Login successful:", userData);
      localStorage.setItem("user", JSON.stringify(userData));
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "กำลังนำคุณไปยังหน้าจอสำหรับพนักงาน",
      });
      setLocation("/");
      // รีโหลดหน้าเพื่อให้ App.tsx อัพเดต user state
      window.location.href = "/";
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.message || "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">เข้าสู่ระบบสำหรับพนักงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[var(--coffee-primary)] hover:bg-[var(--coffee-secondary)]"
              disabled={isLoading}
            >
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setLocation("/customer")}
                className="text-sm text-gray-500"
              >
                กลับไปยังหน้าลูกค้า
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}