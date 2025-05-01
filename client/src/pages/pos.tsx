import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import MenuPanel from "@/components/pos/MenuPanel";
import CartPanel from "@/components/pos/CartPanel";
import CustomizationModal from "@/components/pos/CustomizationModal";
import PaymentModal from "@/components/pos/PaymentModal";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { Product, CustomizationOption, Member } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProductWithEditData } from "@/products";
import { 
  useSocketProducts, 
  useSocketCategories, 
  useSocketCustomizationOptions,
  useSocketSettingValue
} from "@/hooks/useSocketQuery";
import { registerRole } from "@/lib/socket";

interface POSProps {
  user: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

export default function POS({ user }: POSProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithEditData | null>(null);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [latestOrderId, setLatestOrderId] = useState<number | null>(null);
  
  // ตรวจสอบการล็อกอิน - ถ้าไม่มีข้อมูลผู้ใช้ จะแสดงข้อความและลิงก์ไปหน้าลูกค้า
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-[var(--coffee-primary)]">
            ต้องเข้าสู่ระบบก่อนใช้งานหน้านี้
          </h1>
          <p className="text-gray-600 mb-8">
            หน้านี้สำหรับพนักงานเท่านั้น กรุณาเข้าสู่ระบบเพื่อใช้งาน
          </p>
          <button
            onClick={() => setLocation("/customer")}
            className="bg-[var(--coffee-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--coffee-secondary)] transition-colors"
          >
            ไปที่หน้าลูกค้า
          </button>
        </div>
      </div>
    );
  }
  
  const { cart, addToCart, updateCartItem, removeFromCart, clearCart } = useCart();
  
  // ลงทะเบียนบทบาทของผู้ใช้เป็น staff
  useEffect(() => {
    if (user) {
      // ต้องเป็นค่าที่กำหนดใน registerRole เท่านั้น
      const userRole = user.role === 'admin' ? 'admin' : 'staff';
      registerRole(userRole as 'admin' | 'staff' | 'customer');
    }
  }, [user]);
  
  // ใช้ Socket.IO hooks แทนการเรียก API โดยตรง
  const { 
    data: products = [], 
    isLoading: loadingProducts 
  } = useSocketProducts<Product[]>();

  // ใช้ Socket.IO hook สำหรับการตั้งค่าชื่อร้าน
  const { 
    data: storeNameSetting = "ร้านกาแฟ" 
  } = useSocketSettingValue<string>('store_name');
  
  // ใช้ค่าจาก Socket.IO หรือค่าเริ่มต้น
  const storeName = storeNameSetting || "ร้านกาแฟ";
  
  // ใช้ Socket.IO hook สำหรับการตั้งค่าสถานะร้าน
  const { 
    data: storeStatusSetting = "open" 
  } = useSocketSettingValue<string>('store_status');
  
  // ใช้ค่าจาก Socket.IO หรือค่าเริ่มต้น
  const storeStatus = storeStatusSetting || "open";
  
  // ใช้ Socket.IO hook สำหรับดึงข้อมูลหมวดหมู่
  const { 
    data: categories = []
  } = useSocketCategories<string[]>();
  
  // Set the active category to the first category in the list when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && activeCategory === "") {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);
  
  // ใช้ Socket.IO hook สำหรับดึงข้อมูลตัวเลือกปรับแต่ง
  const { 
    data: customizationOptions = [] 
  } = useSocketCustomizationOptions<CustomizationOption[]>();
  
  const filteredProducts = products.filter(
    product => product.category === activeCategory && product.active
  );
  
  const handleProductSelect = (product: Product) => {
    // ตรวจสอบสถานะร้านค้าก่อนเปิดหน้าเลือกรายละเอียดสินค้า
    if (storeStatus === 'close') {
      toast({
        title: "ร้านปิดให้บริการ",
        description: "ขออภัย ไม่สามารถสั่งสินค้าได้ในขณะนี้ เนื่องจากร้านปิดให้บริการชั่วคราว กรุณาเปิดร้านจากหน้าตั้งค่าก่อน",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedProduct(product);
    setIsCustomizationModalOpen(true);
  };
  
  const handleCustomizationClose = () => {
    setIsCustomizationModalOpen(false);
    setSelectedProduct(null);
  };
  
  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
  };
  
  const handleCheckout = () => {
    setIsPaymentModalOpen(true);
  };
  
  const handleEditItem = (itemId: string) => {
    // หาข้อมูลสินค้าจากตะกร้า
    const cartItem = cart.find(item => item.id === itemId);
    if (cartItem) {
      // ค้นหาข้อมูลสินค้าจากรายการสินค้าทั้งหมด
      const product = products.find(p => p.id === cartItem.productId);
      if (product) {
        // ดึงข้อมูลการปรับแต่งจากรายการเดิม
        const customizations = cartItem.customizations || {};
        
        // ตั้งค่าสินค้าที่เลือกและเปิด modal การแก้ไข
        setSelectedProduct({
          ...product,
          // เพิ่ม editingData เพื่อส่งไปที่ CustomizationModal
          editingData: {
            itemId,
            initialCustomizations: {
              quantity: cartItem.quantity,
              type: customizations.type,
              sugarLevel: customizations.sugar_level,
              milkType: customizations.milk_type,
              toppings: customizations.toppings || [],
              extras: customizations.extras || [],
              specialInstructions: customizations.specialInstructions,
              // ส่งค่า customOptions ที่เป็นตัวเลือกเพิ่มเติมอื่นๆ
              customOptions: Object.entries(customizations).reduce((acc, [key, value]) => {
                if (!['type', 'sugar_level', 'milk_type', 'toppings', 'extras', 'specialInstructions'].includes(key)) {
                  acc[key] = value;
                }
                return acc;
              }, {} as Record<string, any>)
            }
          }
        });
        setIsCustomizationModalOpen(true);
      }
    }
  };
  
  const switchToAdmin = () => {
    setLocation("/admin");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-[var(--coffee-primary)] text-white py-3 px-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <h1 className="text-2xl font-display font-bold tracking-wide">{storeName}</h1>
          <span className="ml-4 bg-[var(--coffee-accent)] text-[var(--coffee-dark)] px-3 py-1 rounded-full text-sm font-medium">POS System</span>
        </div>
        <div className="flex items-center space-x-4">
          {/* แสดงสถานะร้าน */}
          {storeStatus === 'open' && (
            <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              <span>เปิดให้บริการ</span>
            </div>
          )}
          {storeStatus === 'busy' && (
            <div className="flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
              <span>ให้บริการชั่วคราว</span>
            </div>
          )}
          {storeStatus === 'close' && (
            <div className="flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
              <span>ปิดให้บริการ</span>
            </div>
          )}
          
          <div className="text-sm">
            <span className="opacity-75">พนักงาน:</span> {user.name}
          </div>
          <button 
            onClick={switchToAdmin}
            className="bg-[var(--coffee-dark)] px-3 py-2 rounded text-sm hover:bg-opacity-80 transition-colors"
          >
            หลังบ้าน
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Menu Panel */}
        <MenuPanel 
          activeCategory={activeCategory}
          categories={categories}
          products={filteredProducts}
          isLoading={loadingProducts}
          onCategoryChange={setActiveCategory}
          onProductSelect={handleProductSelect}
        />
        
        {/* Cart Panel */}
        <CartPanel 
          cart={cart}
          onRemoveItem={removeFromCart}
          onEditItem={handleEditItem}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          selectedMember={selectedMember}
          onSelectMember={setSelectedMember}
          storeStatus={storeStatus}
        />
      </div>
      
      {/* Modals */}
      {isCustomizationModalOpen && selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          customizationOptions={customizationOptions}
          onClose={handleCustomizationClose}
          onAddToCart={addToCart}
          editingItemId={selectedProduct.editingData?.itemId}
          initialCustomizations={selectedProduct.editingData?.initialCustomizations}
        />
      )}
      
      {isPaymentModalOpen && (
        <PaymentModal
          cart={cart}
          onClose={handlePaymentClose}
          onComplete={(orderId) => {
            setLatestOrderId(orderId);
            clearCart();
          }}
          staffId={user.id}
          memberId={selectedMember?.id}
          selectedMember={selectedMember}
        />
      )}
      
      {/* แสดงสถานะออร์เดอร์ (ถ้ามี) */}
      {latestOrderId && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-96 border border-[var(--coffee-light)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">สถานะรายการสั่งซื้อล่าสุด</h3>
            <button 
              onClick={() => setLatestOrderId(null)} 
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
          <div className="border-t pt-2">
            <p className="mb-1">หมายเลขออร์เดอร์: #{latestOrderId}</p>
            <p className="text-green-600 font-medium">รับออร์เดอร์แล้ว</p>
          </div>
        </div>
      )}
    </div>
  );
}
