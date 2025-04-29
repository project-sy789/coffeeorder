import { CartItem } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, Edit, ShoppingBag, Coffee, 
  ThermometerSnowflake, ShoppingCart, Minus, Plus,
  AlertTriangle
} from "lucide-react";

interface CartPanelProps {
  cart: CartItem[];
  onRemoveItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  storeStatus?: string;
  onAddToCart?: (item: CartItem) => void;
}

export default function CartPanel({
  cart,
  onRemoveItem,
  onEditItem,
  onClearCart,
  onCheckout,
  storeStatus = "open",
  onAddToCart
}: CartPanelProps) {
  // คำนวณยอดรวมและจำนวนรายการ
  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // แสดงรายการในคอนโซลเพื่อเช็คข้อมูลทุกรายการ
  console.log("Total cart items:", cart.length);
  
  // แสดง log สำหรับทุกรายการในตะกร้า
  cart.forEach((item, index) => {
    console.log(`Item #${index + 1}:`, item.name);
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-lg border">
      {/* ส่วนหัวตะกร้า */}
      <div className="bg-[var(--coffee-primary)] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-xl font-semibold">ตะกร้าสินค้า</h2>
          </div>
          {cart.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearCart}
              className="text-white hover:text-red-200 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span>ล้างตะกร้า</span>
            </Button>
          )}
        </div>
        <div className="flex justify-between mt-2">
          <div className="text-sm text-white/80">
            {itemCount} รายการในตะกร้า
          </div>
          <div className="text-sm text-white/80">
            ยอดรวม: {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>
      
      {/* ตรวจสอบถ้าตะกร้าว่างเปล่า */}
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
          <div className="bg-[var(--coffee-primary)]/10 p-5 rounded-full mb-4">
            <ShoppingBag className="h-12 w-12 text-[var(--coffee-primary)]/60" />
          </div>
          <p className="font-medium text-gray-700">ตะกร้าของคุณว่างเปล่า</p>
          <p className="text-sm mt-1 text-gray-500 text-center">
            เลือกเครื่องดื่มที่คุณชื่นชอบเพื่อเพิ่มลงในตะกร้า
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-1 bg-gray-50 h-[calc(100vh-360px)]">
          <div className="space-y-2">
            {/* แสดงรายการสินค้าในตะกร้า - แบบปรับปรุงใหม่ */}
            {cart.map((item, index) => (
              <div 
                key={`cart-item-${index}`} 
                className="p-4 hover:bg-gray-100/50 transition-colors rounded-lg bg-white mb-2 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-2 shrink-0 ${
                    item.customizations.temperature?.includes('เย็น') 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {item.customizations.temperature?.includes('เย็น') 
                      ? <ThermometerSnowflake className="h-5 w-5" />
                      : <Coffee className="h-5 w-5" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium text-gray-800 text-base">{index + 1}. {item.name}</div>
                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                          {formatOptionsList(item)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-[var(--coffee-primary)]">
                          {formatCurrency(item.totalPrice)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatCurrency(item.price)} / ชิ้น
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-3 pt-2">
                      <div className="flex items-center bg-white rounded-full border shadow-sm">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-gray-500"
                          onClick={() => {
                            if (item.quantity > 1 && onAddToCart) {
                              const updatedItem = {
                                ...item,
                                quantity: item.quantity - 1,
                                totalPrice: (item.totalPrice / item.quantity) * (item.quantity - 1)
                              };
                              onEditItem(item.id);
                              onAddToCart(updatedItem);
                            }
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-gray-500"
                          onClick={() => {
                            if (onAddToCart) {
                              const updatedItem = {
                                ...item,
                                quantity: item.quantity + 1,
                                totalPrice: (item.totalPrice / item.quantity) * (item.quantity + 1)
                              };
                              onEditItem(item.id);
                              onAddToCart(updatedItem);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditItem(item.id)}
                          className="h-8 rounded-full px-3 text-xs text-[var(--coffee-primary)] hover:bg-[var(--coffee-primary)]/10"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          แก้ไข
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.id)}
                          className="h-8 rounded-full px-3 text-xs text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      <div className="bg-white border-t p-4">
        {storeStatus === 'close' ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
            <div className="flex items-center text-red-800 mb-2">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="font-medium">ร้านปิดให้บริการ</span>
            </div>
            <p className="text-sm text-red-700">
              ขออภัย ไม่สามารถสั่งสินค้าได้ในขณะนี้ เนื่องจากร้านปิดให้บริการชั่วคราว 
              กรุณากลับมาใหม่ในภายหลัง
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <div className="text-gray-500">ยอดรวมสินค้า</div>
              <div>{formatCurrency(totalAmount)}</div>
            </div>
            <div className="flex justify-between">
              <div className="text-gray-500">ส่วนลด</div>
              <div className="text-green-600">฿0.00</div>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <div>ยอดชำระ</div>
              <div className="text-[var(--coffee-primary)]">{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        )}
        
        <Button 
          className="w-full bg-[var(--coffee-primary)] hover:bg-[var(--coffee-dark)] text-white font-medium py-6 text-lg rounded-full shadow-md hover:shadow-lg transition-all"
          disabled={cart.length === 0 || storeStatus === 'close'}
          onClick={onCheckout}
        >
          ดำเนินการชำระเงิน
        </Button>
      </div>
    </div>
  );
}

function formatCustomizations(item: CartItem): string {
  const parts = [];
  
  if (item.customizations.temperature) {
    parts.push(item.customizations.temperature);
  }
  
  if (item.customizations.sugar_level) {
    parts.push(`น้ำตาล: ${item.customizations.sugar_level}`);
  }
  
  if (item.customizations.milk_type) {
    parts.push(`นม: ${item.customizations.milk_type}`);
  }
  
  if (item.customizations.toppings && item.customizations.toppings.length > 0) {
    parts.push(`ท็อปปิ้ง: ${item.customizations.toppings.map(t => t.name).join(', ')}`);
  }
  
  if (item.customizations.extras && item.customizations.extras.length > 0) {
    parts.push(`เพิ่มเติม: ${item.customizations.extras.map(e => e.name).join(', ')}`);
  }
  
  if (item.customizations.specialInstructions) {
    parts.push(`หมายเหตุ: ${item.customizations.specialInstructions}`);
  }
  
  return parts.join(' • ');
}

function formatOptionsList(item: CartItem) {
  return (
    <div className="space-y-1">
      {item.customizations.temperature && (
        <Badge variant="outline" className="bg-white text-[10px] font-normal">
          {item.customizations.temperature}
          {item.customizations.temperaturePrice !== undefined && 
           item.customizations.temperaturePrice < 0 && 
           ` (-${Math.abs(item.customizations.temperaturePrice)} บาท)`}
        </Badge>
      )}
      {item.customizations.sugar_level && (
        <Badge variant="outline" className="bg-white text-[10px] font-normal ml-1">
          น้ำตาล: {item.customizations.sugar_level}
        </Badge>
      )}
      {item.customizations.milk_type && (
        <Badge variant="outline" className="bg-white text-[10px] font-normal ml-1">
          นม: {item.customizations.milk_type}
        </Badge>
      )}
      
      {/* แสดงตัวเลือกแบบไดนามิกจากหลังบ้านด้วย */}
      {Object.keys(item.customizations).map(key => {
        // ข้ามตัวเลือกพื้นฐานที่จัดการแล้ว และข้ามสิ่งที่ไม่ใช่อาร์เรย์
        if (
          !['type', 'temperature', 'sugar_level', 'milk_type', 'topping', 'extra', 'toppings', 'extras', 'specialInstructions'].includes(key) && 
          Array.isArray(item.customizations[key])
        ) {
          return (
            <div key={key} className="flex flex-wrap gap-1 mt-1">
              {item.customizations[key].map((option: any, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-white text-[10px] font-normal">
                  {option.name} {option.price ? `+${formatCurrency(option.price)}` : ''}
                </Badge>
              ))}
            </div>
          );
        }
        return null;
      })}
      
      {item.customizations.toppings && item.customizations.toppings.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.customizations.toppings.map((topping, idx) => (
            <Badge key={idx} variant="outline" className="bg-white text-[10px] font-normal">
              {topping.name} +{formatCurrency(topping.price)}
            </Badge>
          ))}
        </div>
      )}
      {item.customizations.extras && item.customizations.extras.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.customizations.extras.map((extra, idx) => (
            <Badge key={idx} variant="outline" className="bg-white text-[10px] font-normal">
              {extra.name} +{formatCurrency(extra.price)}
            </Badge>
          ))}
        </div>
      )}
      {item.customizations.specialInstructions && (
        <div className="text-xs italic mt-1 text-gray-600">
          "{item.customizations.specialInstructions}"
        </div>
      )}
    </div>
  );
}