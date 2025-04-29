import { useState, useEffect } from "react";
import { Product, CustomizationOption, Member } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MenuPanel from "@/components/customer/MenuPanel";
import CartPanel from "@/components/customer/CartPanel";
import PaymentModal from "@/components/customer/PaymentModal";
import CustomizationModal from "@/components/customer/CustomizationModal";
import MembershipForm from "@/components/customer/MembershipForm";
import OrderStatusPanel from "@/components/customer/OrderStatusPanel";
import LoginForm from "@/components/customer/LoginForm";
import { CartItem } from "@/hooks/useCart";
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from "wouter";

export default function Customer() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("กาแฟร้อน");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [storeName, setStoreName] = useState("ร้านกาแฟ");
  const [storeStatus, setStoreStatus] = useState("open");
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // จะเก็บหมวดหมู่ที่มีสินค้าอยู่จริงเท่านั้น
  const [categories, setCategories] = useState<string[]>([]);
  
  // คำนวณหมวดหมู่ที่มีสินค้าอยู่
  useEffect(() => {
    if (products.length > 0) {
      // เก็บเฉพาะหมวดหมู่ที่มีสินค้าที่เปิดใช้งานอยู่
      const activeProducts = products.filter(product => product.active);
      const categoriesWithProducts = activeProducts.reduce((acc, product) => {
        if (!acc[product.category]) {
          acc[product.category] = 0;
        }
        acc[product.category]++;
        return acc;
      }, {} as Record<string, number>);
      
      // ใช้เฉพาะหมวดหมู่ที่มีสินค้าอย่างน้อย 1 รายการ
      const uniqueCategories = Object.keys(categoriesWithProducts);
      setCategories(uniqueCategories);
      
      // ถ้าหมวดหมู่ที่เลือกอยู่ไม่มีในรายการหมวดหมู่ที่มีสินค้า ให้เลือกหมวดหมู่แรกในรายการแทน
      if (uniqueCategories.length > 0 && !uniqueCategories.includes(activeCategory)) {
        setActiveCategory(uniqueCategories[0]);
      }
    }
  }, [products, activeCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsResponse = await apiRequest('GET', '/api/products');
        if (productsResponse.data) {
          setProducts(productsResponse.data);
        }

        const optionsResponse = await apiRequest('GET', '/api/customization-options');
        if (optionsResponse.data) {
          setCustomizationOptions(optionsResponse.data);
        }

        // ดึงข้อมูลชื่อร้านและสถานะร้านจาก API
        try {
          const storeNameResponse = await apiRequest('GET', '/api/settings/value/store_name');
          if (storeNameResponse.data && storeNameResponse.data.value) {
            setStoreName(storeNameResponse.data.value);
          }
          
          // ดึงข้อมูลสถานะร้าน
          const storeStatusResponse = await apiRequest('GET', '/api/settings/value/store_status');
          if (storeStatusResponse.data && storeStatusResponse.data.value) {
            setStoreStatus(storeStatusResponse.data.value);
          }
        } catch (e) {
          console.log('Store settings not set yet, using default');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  const handleProductSelect = (product: Product) => {
    // ตรวจสอบสถานะร้านค้าก่อนเปิดหน้าเลือกรายละเอียดสินค้า
    if (storeStatus === 'close') {
      toast({
        title: "ร้านปิดให้บริการ",
        description: "ขออภัย ไม่สามารถสั่งสินค้าได้ในขณะนี้ เนื่องจากร้านปิดให้บริการชั่วคราว กรุณากลับมาใหม่ในภายหลัง",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedProduct(product);
  };

  const handleAddToCart = (item: CartItem) => {
    console.log("Adding to cart:", item);
    
    // If the item already has an ID, it might be an update to an existing item
    if (item.id) {
      // Find the item with matching ID and update it
      const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
      
      if (existingItemIndex !== -1) {
        // Update existing item
        const updatedCart = [...cart];
        updatedCart[existingItemIndex] = item;
        console.log("Updating existing item in cart:", updatedCart);
        setCart(updatedCart);
        return;
      }
    }
    
    // For new items, generate a new ID
    const cartItem = {
      ...item,
      id: item.id || uuidv4()
    };
    
    // Check if an item with the same productId and exact same customizations already exists
    const existingItemIndex = cart.findIndex(cartI => 
      cartI.productId === cartItem.productId && 
      JSON.stringify(cartI.customizations) === JSON.stringify(cartItem.customizations)
    );
    
    if (existingItemIndex !== -1) {
      // If the item exists with same customizations, update the quantity and total price
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + cartItem.quantity,
        totalPrice: existingItem.totalPrice + cartItem.totalPrice
      };
      console.log("Updating quantity for existing product:", updatedCart);
      setCart(updatedCart);
    } else {
      // If it's a new item, add it to the cart
      console.log("Adding new product to cart:", [...cart, cartItem]);
      setCart(prevCart => [...prevCart, cartItem]);
    }
    
    setSelectedProduct(null);
    
    toast({
      title: "เพิ่มลงตะกร้าแล้ว",
      description: `${item.name} x${item.quantity}`,
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const handleEditCartItem = (id: string) => {
    const item = cart.find(item => item.id === id);
    if (item) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        setSelectedProduct(product);
        handleRemoveFromCart(id);
      }
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "ตะกร้าว่างเปล่า",
        description: "กรุณาเลือกสินค้าก่อนชำระเงิน",
        variant: "destructive",
      });
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const [latestOrderId, setLatestOrderId] = useState<number | null>(null);
  
  const handleOrderComplete = (orderId: number) => {
    setCart([]);
    setShowPaymentModal(false);
    setLatestOrderId(orderId);
    
    toast({
      title: "สั่งซื้อสำเร็จ",
      description: "ขอบคุณที่ใช้บริการ",
    });
    
    // Scroll to order status panel to show the new order
    setTimeout(() => {
      const orderStatusElement = document.getElementById('order-status-panel');
      if (orderStatusElement) {
        orderStatusElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };
  
  const handleMemberFound = (member: Member) => {
    setCurrentMember(member);
    toast({
      title: "พบข้อมูลสมาชิก",
      description: `ยินดีต้อนรับคุณ ${member.name}`,
    });
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };
  
  const handleToggleStaffLogin = () => {
    setShowStaffLogin(!showStaffLogin);
  };
  
  const handleLoginSuccess = (user: any) => {
    // บันทึกข้อมูลผู้ใช้ใน localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    // แสดงข้อความแจ้งเตือนว่าล็อกอินสำเร็จ
    toast({
      title: "เข้าสู่ระบบสำเร็จ",
      description: `ยินดีต้อนรับ ${user.name}`,
    });
    
    // เปลี่ยนหน้าไปที่หน้าพนักงาน
    setLocation("/");
  };

  return (
    <div className="customer-page flex flex-col md:flex-row min-h-screen">
      {/* Header for mobile view */}
      <div className="md:hidden customer-header mb-4 px-4 py-2 border-b">
        <div>
          <h1 className="text-xl font-semibold">{storeName}</h1>
          <p className="text-sm opacity-80">ระบบสั่งเครื่องดื่มออนไลน์</p>
          
          {/* แสดงสถานะร้านในมุมมองมือถือ */}
          <div className="mt-2">
            {storeStatus === 'open' && (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                <span className="text-xs">เปิดให้บริการ</span>
              </div>
            )}
            {storeStatus === 'busy' && (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                <span className="text-xs">ให้บริการชั่วคราว (มีลูกค้าเยอะ)</span>
              </div>
            )}
            {storeStatus === 'close' && (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                <span className="text-xs">ปิดให้บริการ</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Left section - Menu */}
      <div className="md:w-2/3 p-4 overflow-y-auto" style={{ maxHeight: "100vh" }}>
        {/* Header for desktop view */}
        <div className="hidden md:block mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-[var(--coffee-primary)]">
            {storeName} - สั่งเครื่องดื่ม
          </h1>
          <p className="text-[var(--coffee-secondary)]">เลือกเครื่องดื่มที่คุณชื่นชอบ</p>
          
          {/* แสดงสถานะร้าน */}
          <div className="mt-2 flex items-center justify-center">
            {storeStatus === 'open' && (
              <div className="flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">เปิดให้บริการ</span>
              </div>
            )}
            {storeStatus === 'busy' && (
              <div className="flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">ให้บริการชั่วคราว (มีลูกค้าเยอะ)</span>
              </div>
            )}
            {storeStatus === 'close' && (
              <div className="flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">ปิดให้บริการ</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Status Panel - แสดงเฉพาะเมื่อมีคำสั่งซื้อล่าสุดหรือมีการล็อกอินด้วยบัญชีสมาชิก */}
        {(latestOrderId || currentMember) && (
          <div className="mb-6" id="order-status-panel">
            <OrderStatusPanel 
              customerId={currentMember?.id} 
              latestOrderId={latestOrderId}
            />
          </div>
        )}
        
        {/* Menu Panel */}
        <MenuPanel
          activeCategory={activeCategory}
          categories={categories}
          products={products.filter(p => p.category === activeCategory && p.active)}
          isLoading={isLoading}
          onCategoryChange={handleCategoryChange}
          onProductSelect={handleProductSelect}
        />
      </div>
      
      {/* Right section - Cart */}
      <div className="md:w-1/3 p-4 space-y-4 bg-[#f8f8f8] border-l border-gray-200 flex flex-col" style={{ maxHeight: "100vh" }}>

        {/* Member Info Display or Staff Login */}
        {showStaffLogin ? (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        ) : currentMember ? (
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">ข้อมูลสมาชิก</h3>
              <button 
                onClick={() => setCurrentMember(null)} 
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                เปลี่ยนสมาชิก
              </button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-800 font-medium">{currentMember.name}</p>
                <p className="text-gray-600 text-sm">{currentMember.phone}</p>
              </div>
              <div className="bg-[var(--coffee-primary)] rounded-lg text-white px-3 py-1">
                <p className="text-sm">คะแนนสะสม</p>
                <p className="font-medium text-center">{currentMember.points}</p>
              </div>
            </div>
          </div>
        ) : (
          <MembershipForm onMemberFound={handleMemberFound} />
        )}
        
        {/* Cart Panel */}
        <div className="bg-white shadow rounded-lg flex-1 overflow-hidden flex flex-col" style={{ minHeight: "50vh" }}>
          <CartPanel
            cart={cart}
            onRemoveItem={handleRemoveFromCart}
            onEditItem={handleEditCartItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
            storeStatus={storeStatus}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>
      
      {/* Modals */}
      {selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          customizationOptions={customizationOptions}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
      
      {showPaymentModal && (
        <PaymentModal
          cart={cart}
          onClose={handleClosePaymentModal}
          onComplete={handleOrderComplete}
          memberId={currentMember?.id}
        />
      )}
    </div>
  );
}