import { useState, useEffect } from "react";
import { Product, CustomizationOption } from "@shared/schema";
import { CartItem } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CustomizationModalProps {
  product: Product;
  customizationOptions: CustomizationOption[];
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export default function CustomizationModal({
  product,
  customizationOptions,
  onClose,
  onAddToCart
}: CustomizationModalProps) {
  const [quantity, setQuantity] = useState(1);

  // หาค่า default จาก options
  const getDefaultOptionName = (optionType: string): string | undefined => {
    const options = customizationOptions.filter(opt => opt.type === optionType);
    // ตรวจสอบเงื่อนไขให้ชัดเจนว่าต้องเป็น true (ไม่ใช่แค่ truthy value)
    const defaultOption = options.find(opt => opt.isDefault === true);
    if (defaultOption) {
      console.log(`Found default option for ${optionType}: ${defaultOption.name}`);
      return defaultOption.name;
    }
    return undefined;
  };
  
  const [selectedType, setSelectedType] = useState<string>(
    getDefaultOptionName('temperature') || "ร้อน"
  );
  
  const [selectedSugarLevel, setSelectedSugarLevel] = useState<string>(
    getDefaultOptionName('sugar_level') || "ปกติ"
  );
  
  const [selectedMilkType, setSelectedMilkType] = useState<string>(
    getDefaultOptionName('milk_type') || "นมสด"
  );
  
  const [selectedToppings, setSelectedToppings] = useState<{id: number, name: string, price: number}[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<{id: number, name: string, price: number}[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  
  // For custom/dynamic options
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, {id: number, name: string, price: number}[]>>({});
  
  const [totalPrice, setTotalPrice] = useState(product.price);
  
  // Query for all customization types
  const { data: customizationTypes = [] } = useQuery<string[]>({
    queryKey: ['/api/customization-types'],
  });
  
  // Query for customization type settings (multiple selection etc.)
  const { data: typeSettings = {} } = useQuery<Record<string, { multipleSelection: boolean }>>({
    queryKey: ['/api/customization-type-settings'],
  });
  
  // Query for type display names (ชื่อหมวดหมู่สำหรับแสดงผล)
  const { data: typeDisplayNames = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/customization-types/display-names'],
  });
  
  // Create a lookup map for all option types
  const optionsByType = customizationOptions.reduce<Record<string, CustomizationOption[]>>((acc, option) => {
    if (!acc[option.type]) {
      acc[option.type] = [];
    }
    acc[option.type].push(option);
    return acc;
  }, {});
  
  // For backward compatibility and to maintain existing functionality
  const typeOptions = optionsByType['temperature'] || [];
  const sugarLevelOptions = optionsByType['sugar_level'] || [];
  const milkTypeOptions = optionsByType['milk_type'] || [];
  const toppingOptions = optionsByType['toppings'] || [];
  const extraOptions = optionsByType['extras'] || [];
  
  // Toggle for custom options by type
  const toggleCustomOption = (type: string, option: CustomizationOption) => {
    setSelectedCustomOptions(prev => {
      // Create a copy of the current state
      const newState = {...prev};
      
      // Initialize the array for this type if it doesn't exist
      if (!newState[type]) {
        newState[type] = [];
      }
      
      // Check if this option is already selected
      const exists = newState[type].some(item => item.id === option.id);
      
      if (exists) {
        // Remove if already selected
        newState[type] = newState[type].filter(item => item.id !== option.id);
      } else {
        // Add if not selected
        newState[type] = [
          ...newState[type], 
          { id: option.id, name: option.name, price: option.price || 0 }
        ];
      }
      
      return newState;
    });
  };
  
  // Function to check if a custom option is selected
  const isCustomOptionSelected = (type: string, optionId: number): boolean => {
    if (!selectedCustomOptions[type]) return false;
    return selectedCustomOptions[type].some(item => item.id === optionId);
  };
  
  // เมื่อ customizationTypes โหลดเสร็จแล้ว ให้ตั้งค่า default options ที่ยังไม่ได้ถูกเลือก
  useEffect(() => {
    // ทำงานเมื่อ customizationTypes โหลดเสร็จแล้ว
    if (customizationTypes && customizationTypes.length > 0) {
      console.log('Setting default options based on customizationTypes:', customizationTypes);
      
      // ตั้งค่าตัวเลือกเริ่มต้นสำหรับประเภทมาตรฐาน
      // หาค่าเริ่มต้นสำหรับ temperature
      const defaultTemp = getDefaultOptionName('temperature');
      if (defaultTemp) {
        console.log('Setting default temperature to:', defaultTemp);
        setSelectedType(defaultTemp);
      }
      
      // หาค่าเริ่มต้นสำหรับ sugar_level
      const defaultSugar = getDefaultOptionName('sugar_level');
      if (defaultSugar) {
        console.log('Setting default sugar level to:', defaultSugar);
        setSelectedSugarLevel(defaultSugar);
      }
      
      // หาค่าเริ่มต้นสำหรับ milk_type
      const defaultMilk = getDefaultOptionName('milk_type');
      if (defaultMilk) {
        console.log('Setting default milk type to:', defaultMilk);
        setSelectedMilkType(defaultMilk);
      }
      
      // จัดการตัวเลือกเริ่มต้นสำหรับ toppings
      const defaultToppings = customizationOptions
        .filter(opt => opt.type === 'toppings' && opt.isDefault === true)
        .map(opt => ({ id: opt.id, name: opt.name, price: opt.price || 0 }));
      
      if (defaultToppings.length > 0) {
        console.log('Setting default toppings:', defaultToppings);
        setSelectedToppings(defaultToppings);
      }
      
      // จัดการตัวเลือกเริ่มต้นสำหรับ extras
      const defaultExtras = customizationOptions
        .filter(opt => opt.type === 'extras' && opt.isDefault === true)
        .map(opt => ({ id: opt.id, name: opt.name, price: opt.price || 0 }));
      
      if (defaultExtras.length > 0) {
        console.log('Setting default extras:', defaultExtras);
        setSelectedExtras(defaultExtras);
      }
      
      // จัดการตัวเลือกที่กำหนดเองที่เหลือ
      setSelectedCustomOptions(prev => {
        const newOptions = { ...prev };
        
        // ตรวจสอบแต่ละประเภทของตัวเลือก
        customizationTypes.forEach(type => {
          // ข้ามประเภทมาตรฐานที่จัดการแยกต่างหาก
          if (['temperature', 'sugar_level', 'milk_type', 'toppings', 'extras'].includes(type)) {
            return;
          }
          
          // ถ้ายังไม่มีข้อมูลของประเภทนี้ในตัวเลือกที่เลือก
          if (!newOptions[type] || newOptions[type].length === 0) {
            const options = customizationOptions.filter(opt => opt.type === type);
            console.log(`Checking for default option in type ${type}:`, options);
            const defaultOption = options.find(opt => opt.isDefault === true);
            
            // ถ้ามีค่าเริ่มต้น ให้เพิ่มเข้าไปในตัวเลือกที่เลือก
            if (defaultOption) {
              console.log(`Found default option for ${type}:`, defaultOption);
              newOptions[type] = [{ 
                id: defaultOption.id, 
                name: defaultOption.name, 
                price: defaultOption.price || 0 
              }];
            }
          }
        });
        
        return newOptions;
      });
    }
  }, [customizationTypes, customizationOptions]);
  
  // Calculate price when options change
  useEffect(() => {
    let price = product.price;
    
    // Add price for temperature type
    const typeOption = typeOptions.find(option => option.name === selectedType);
    if (typeOption && typeof typeOption.price === 'number') {
      price += typeOption.price;
    }
    
    // Add price for sugar level
    const sugarLevelOption = sugarLevelOptions.find(option => option.name === selectedSugarLevel);
    if (sugarLevelOption && typeof sugarLevelOption.price === 'number') {
      price += sugarLevelOption.price;
    }
    
    // Add price for milk type
    const milkOption = milkTypeOptions.find(option => option.name === selectedMilkType);
    if (milkOption && typeof milkOption.price === 'number') {
      price += milkOption.price;
    }
    
    // Add price for toppings
    const toppingsPrice = selectedToppings.reduce((total, topping) => total + topping.price, 0);
    price += toppingsPrice;
    
    // Add price for extras
    const extrasPrice = selectedExtras.reduce((total, extra) => total + extra.price, 0);
    price += extrasPrice;
    
    // Add price for custom options
    Object.values(selectedCustomOptions).forEach(options => {
      const optionsPrice = options.reduce((total, option) => total + option.price, 0);
      price += optionsPrice;
    });
    
    // Multiply by quantity
    price *= quantity;
    
    setTotalPrice(price);
  }, [
    product.price,
    selectedType,
    selectedMilkType,
    selectedToppings,
    selectedExtras,
    selectedCustomOptions,
    quantity,
    typeOptions,
    milkTypeOptions
  ]);
  
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };
  
  const toggleTopping = (option: CustomizationOption) => {
    const exists = selectedToppings.some(topping => topping.id === option.id);
    
    if (exists) {
      setSelectedToppings(prev => prev.filter(topping => topping.id !== option.id));
    } else {
      setSelectedToppings(prev => [...prev, { id: option.id, name: option.name, price: option.price || 0 }]);
    }
  };
  
  const toggleExtra = (option: CustomizationOption) => {
    const exists = selectedExtras.some(extra => extra.id === option.id);
    
    if (exists) {
      setSelectedExtras(prev => prev.filter(extra => extra.id !== option.id));
    } else {
      setSelectedExtras(prev => [...prev, { id: option.id, name: option.name, price: option.price || 0 }]);
    }
  };
  
  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      totalPrice,
      customizations: {
        temperature: selectedType,
        temperaturePrice: typeOptions.find(option => option.name === selectedType)?.price || 0,
        sugar_level: selectedSugarLevel,
        sugarLevelPrice: sugarLevelOptions.find(option => option.name === selectedSugarLevel)?.price || 0,
        milk_type: selectedMilkType,
        milkTypePrice: milkTypeOptions.find(option => option.name === selectedMilkType)?.price || 0,
        toppings: selectedToppings,
        extras: selectedExtras,
        // Include dynamic customizations
        ...selectedCustomOptions,
        specialInstructions
      }
    };
    
    onAddToCart(cartItem);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center bg-[var(--coffee-primary)] text-white rounded-t-lg">
          <h3 className="text-xl font-medium">ปรับแต่งเครื่องดื่ม</h3>
          <button 
            className="rounded-full hover:bg-white/20 p-1 transition-colors" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Product Info */}
        <div className="p-4 flex items-center border-b">
          <img
            src={product.image || "https://via.placeholder.com/300x200"}
            alt={product.name}
            className="w-20 h-20 object-cover rounded"
          />
          <div className="ml-4">
            <h4 className="text-lg font-medium">{product.name}</h4>
            <p className="text-[var(--coffee-primary)] font-medium">฿{product.price}</p>
          </div>
        </div>
        
        {/* Customization Options */}
        <div className="p-4 space-y-5">
          {/* Standard customization options */}
          {/* Type */}
          {typeOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">{typeDisplayNames['temperature'] || 'ประเภทเครื่องดื่ม'}</h5>
              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded-md transition-colors ${
                      selectedType === option.name
                        ? "border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white"
                        : "border-gray-300 hover:border-[var(--coffee-primary)]"
                    }`}
                    onClick={() => setSelectedType(option.name)}
                  >
                    {option.name}
                    {option.price && option.price !== 0 ? 
                      option.price > 0 ? ` (+฿${option.price})` : ` (-฿${Math.abs(option.price)})` 
                    : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Sugar Level */}
          {sugarLevelOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">{typeDisplayNames['sugar_level'] || 'ระดับความหวาน'}</h5>
              <div className="grid grid-cols-2 gap-2">
                {sugarLevelOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded-md transition-colors ${
                      selectedSugarLevel === option.name
                        ? "border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white"
                        : "border-gray-300 hover:border-[var(--coffee-primary)]"
                    }`}
                    onClick={() => setSelectedSugarLevel(option.name)}
                  >
                    {option.name}
                    {option.price && option.price !== 0 ? 
                      option.price > 0 ? ` (+฿${option.price})` : ` (-฿${Math.abs(option.price)})` 
                    : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Milk Type */}
          {milkTypeOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">{typeDisplayNames['milk_type'] || 'ชนิดนม'}</h5>
              <div className="grid grid-cols-2 gap-2">
                {milkTypeOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded-md transition-colors ${
                      selectedMilkType === option.name
                        ? "border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white"
                        : "border-gray-300 hover:border-[var(--coffee-primary)]"
                    }`}
                    onClick={() => setSelectedMilkType(option.name)}
                  >
                    {option.name}
                    {option.price && option.price !== 0 ? 
                      option.price > 0 ? ` (+฿${option.price})` : ` (-฿${Math.abs(option.price)})` 
                    : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Toppings */}
          {toppingOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">{typeDisplayNames['toppings'] || 'ท็อปปิ้ง'}</h5>
              <div className="grid grid-cols-1 gap-2">
                {toppingOptions.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:border-[var(--coffee-primary)] transition-colors"
                  >
                    <Checkbox
                      checked={selectedToppings.some(t => t.id === option.id)}
                      onCheckedChange={() => toggleTopping(option)}
                    />
                    <span>
                      {option.name} {option.price !== undefined && option.price !== 0 ? 
                        option.price > 0 ? `(+฿${option.price})` : `(-฿${Math.abs(option.price)})` 
                      : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Extras */}
          {extraOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">{typeDisplayNames['extras'] || 'เพิ่มพิเศษ'}</h5>
              <div className="grid grid-cols-1 gap-2">
                {extraOptions.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:border-[var(--coffee-primary)] transition-colors"
                  >
                    <Checkbox
                      checked={selectedExtras.some(e => e.id === option.id)}
                      onCheckedChange={() => toggleExtra(option)}
                    />
                    <span>
                      {option.name} {option.price !== undefined && option.price !== 0 ? 
                        option.price > 0 ? `(+฿${option.price})` : `(-฿${Math.abs(option.price)})` 
                      : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Dynamic customization options from customizationTypes */}
          {customizationTypes.map(type => {
            // Skip the standard types we've already handled
            if (['temperature', 'sugar_level', 'milk_type', 'toppings', 'extras'].includes(type)) {
              return null;
            }
            
            const options = optionsByType[type] || [];
            if (options.length === 0) return null;
            
            // ใช้ชื่อหมวดหมู่จาก API หรือใช้ชื่อแบบแปลงรูปแบบถ้าไม่มี
            const displayType = typeDisplayNames[type] || 
              type.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
            return (
              <div key={type}>
                <h5 className="font-medium mb-2">{displayType}</h5>
                <div className="grid grid-cols-1 gap-2">
                  {options.map(option => (
                    <label
                      key={option.id}
                      className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:border-[var(--coffee-primary)] transition-colors"
                    >
                      <Checkbox
                        checked={isCustomOptionSelected(type, option.id)}
                        onCheckedChange={() => toggleCustomOption(type, option)}
                      />
                      <span>
                        {option.name} {option.price && option.price !== 0 ? 
                          option.price > 0 ? `(+฿${option.price})` : `(-฿${Math.abs(option.price)})` 
                        : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Quantity */}
          <div>
            <h5 className="font-medium mb-2">จำนวน</h5>
            <div className="flex border rounded-md w-1/2">
              <button
                className="px-3 py-1 text-xl border-r"
                onClick={decrementQuantity}
              >
                -
              </button>
              <Input
                type="text"
                value={quantity}
                className="flex-1 text-center py-1 border-none"
                readOnly
              />
              <button
                className="px-3 py-1 text-xl border-l"
                onClick={incrementQuantity}
              >
                +
              </button>
            </div>
          </div>
          
          {/* Special Instructions */}
          <div>
            <h5 className="font-medium mb-2">คำแนะนำพิเศษ</h5>
            <Textarea
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              className="w-full border rounded-md p-2"
              rows={2}
              placeholder="หากมีคำแนะนำเพิ่มเติม กรุณาระบุที่นี่..."
            />
          </div>
          
          {/* Add to Cart Button */}
          <Button
            className="w-full bg-[var(--coffee-primary)] text-white py-5 rounded-md font-medium hover:bg-opacity-90 transition-colors"
            onClick={handleAddToCart}
          >
            เพิ่มลงตะกร้า - ฿{totalPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}