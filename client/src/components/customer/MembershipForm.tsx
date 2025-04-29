import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Member } from "@shared/schema";
import { User, Phone } from "lucide-react";

interface MembershipFormProps {
  onMemberFound?: (member: Member) => void;
}

export default function MembershipForm({ onMemberFound }: MembershipFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!phone || phone.length < 9) {
      toast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      // ใช้ fetch แทน apiRequest เพื่อจัดการกับ 404 ด้วยตัวเอง
      const response = await fetch(`/api/members/phone/${phone}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.status === 200) {
        // พบข้อมูลสมาชิก
        const member = await response.json();
        toast({
          title: "พบข้อมูลสมาชิก",
          description: `ยินดีต้อนรับคุณ ${member.name}`,
        });
        
        if (onMemberFound) {
          onMemberFound(member);
        }
        
        // Clear form
        setName("");
        setPhone("");
        setShowSignupForm(false);
      } else if (response.status === 404) {
        // ไม่พบข้อมูลสมาชิก
        toast({
          title: "ไม่พบข้อมูลสมาชิก",
          description: "คุณต้องการสมัครสมาชิกใหม่หรือไม่?",
        });
        setShowSignupForm(true);
      } else {
        // มีข้อผิดพลาดอื่นๆ
        console.error("Unexpected error:", response.status);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถตรวจสอบข้อมูลสมาชิกได้",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error searching for member:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถค้นหาข้อมูลสมาชิกได้",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !phone || phone.length < 9) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ถูกต้อง",
        variant: "destructive"
      });
      return;
    }

    setIsSigningUp(true);
    try {
      const { response, data } = await apiRequest("POST", "/api/members", {
        name,
        phone,
        points: 0,
        joinDate: new Date().toISOString()
      });

      if (response.ok) {
        const member = data;
        toast({
          title: "สมัครสมาชิกสำเร็จ",
          description: `ยินดีต้อนรับคุณ ${member.name} เข้าสู่ระบบสมาชิก`,
        });
        
        if (onMemberFound) {
          onMemberFound(member);
        }
        
        // Clear form
        setName("");
        setPhone("");
        setShowSignupForm(false);
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error signing up member:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสมัครสมาชิกได้",
        variant: "destructive"
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleSkip = () => {
    setShowSignupForm(false);
    setName("");
    setPhone("");
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">สมาชิก</h3>
      {!showSignupForm ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">เบอร์โทรศัพท์</label>
            <div className="flex">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <Input
                  type="tel"
                  placeholder="กรอกเบอร์โทรศัพท์"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  maxLength={10}
                />
              </div>
              <Button 
                className="ml-2 whitespace-nowrap" 
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? "กำลังค้นหา..." : "ค้นหาสมาชิก"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">* หากไม่ต้องการใช้สิทธิ์สมาชิก สามารถข้ามได้</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">ชื่อ</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="กรอกชื่อ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">เบอร์โทรศัพท์</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Phone size={16} className="text-gray-400" />
              </div>
              <Input
                type="tel"
                placeholder="กรอกเบอร์โทรศัพท์"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              className="w-full"
              onClick={handleSignUp}
              disabled={isSigningUp}
            >
              {isSigningUp ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSkip}
            >
              ข้าม
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}