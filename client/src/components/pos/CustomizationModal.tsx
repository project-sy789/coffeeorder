import { useState, useEffect } from "react";
import { Product, CustomizationOption } from "@shared/schema";
import { CartItem } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSocketQuery } from "@/hooks/useSocketQuery";

interface CustomizationModalProps {
  product: Product;
  customizationOptions: CustomizationOption[];
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  editingItemId?: string; // ID ของรายการที่กำลังแก้ไข (ถ้ามี)
  initialCustomizations?: {
    quantity?: number;
    type?: string;
    sugarLevel?: string;
    milkType?: string;
    toppings?: {id: number, name: string, price: number}[];
    extras?: {id: number, name: string, price: number}[];
    specialInstructions?: string;
    customOptions?: Record<string, {id: number, name: string, price: number}[]>;
  }; // ค่าเริ่มต้นสำหรับการแก้ไข
}

export default function CustomizationModal({
  product,
  customizationOptions,
  onClose,
  onAddToCart,
  editingItemId,
  initialCustomizations
}: CustomizationModalProps) {
  // ใช้ initialCustomizations ถ้ามี (กรณีแก้ไขรายการ)
  const [quantity, setQuantity] = useState(initialCustomizations?.quantity || 1);
  
  // หาค่า default จาก options
  const getDefaultOptionName = (optionType: string): string | undefined => {
    const options = customizationOptions.filter(opt => opt.type === optionType);
    const defaultOption = options.find(opt => opt.isDefault);
    if (defaultOption?.name) {
      console.log(`Found default option for ${optionType}: ${defaultOption.name}`);
    }
    return defaultOption?.name;
  };
  
  const [selectedType, setSelectedType] = useState<string>(
    initialCustomizations?.type || getDefaultOptionName('temperature') || "เย็น"
  );
  
  const [selectedSugarLevel, setSelectedSugarLevel] = useState<string>(
    initialCustomizations?.sugarLevel || getDefaultOptionName('sugar_level') || "หวานปกติ"
  );
  
  const [selectedMilkType, setSelectedMilkType] = useState<string>(
    initialCustomizations?.milkType || getDefaultOptionName('milk_type') || "นมสด"
  );
  
  const [selectedToppings, setSelectedToppings] = useState<{id: number, name: string, price: number}[]>(
    initialCustomizations?.toppings || []
  );
  
  const [selectedExtras, setSelectedExtras] = useState<{id: number, name: string, price: number}[]>(
    initialCustomizations?.extras || []
  );
  
  const [specialInstructions, setSpecialInstructions] = useState(initialCustomizations?.specialInstructions || "");
  
  // สำหรับ custom/dynamic options - เริ่มด้วยค่าเริ่มต้นตั้งแต่เปิดโมดัล
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, {id: number, name: string, price: number}[]>>(
    initialCustomizations?.customOptions || {}
  );
  
  const [totalPrice, setTotalPrice] = useState(product.price);
  
  // Query for all customization types ด้วย Socket.IO
  const { data: customizationTypes = [] } = useSocketQuery<string[]>(
    'getCustomizationTypes',
    {}
  );
  
  // Query for customization type display names (Thai) ด้วย Socket.IO
  const { data: typeDisplayNames = {} } = useSocketQuery<Record<string, string>>(
    'getCustomizationTypeLabels',
    {}
  );
  
  // Create a lookup map for all option types
  const optionsByType = customizationOptions.reduce<Record<string, CustomizationOption[]>>((acc, option) => {
    if (!acc[option.type]) {
      acc[option.type] = [];
    }
    acc[option.type].push(option);
    return acc;
  }, {});
  
  // For backward compatibility and to maintain existing functionality
  const typeOptions = optionsByType['temperature'] || []; // ใช้ temperature เป็นประเภทเครื่องดื่ม (ร้อน/เย็น) เพื่อให้ตรงกับหน้าลูกค้า
  const sugarLevelOptions = optionsByType['sugar_level'] || [];
  const milkTypeOptions = optionsByType['milk_type'] || [];
  const toppingOptions = optionsByType['toppings'] || []; // แก้ไขจาก topping เป็น toppings ให้ตรงกับหน้าลูกค้า
  const extraOptions = optionsByType['extras'] || []; // แก้ไขจาก extra เป็น extras ให้ตรงกับหน้าลูกค้า
  
  // เพิ่ม logging เพื่อดูค่าเริ่มต้นที่ได้มาจาก API
  useEffect(() => {
    if (customizationOptions && customizationOptions.length > 0) {
      console.log("Setting default options based on customizationTypes:", customizationTypes);
      
      // ดูว่าเรามีค่า default ของ temperature หรือไม่
      const defaultTemp = getDefaultOptionName('temperature');
      if (defaultTemp) {
        console.log("Setting default temperature to:", defaultTemp);
        setSelectedType(defaultTemp);
      }
      
      // ดูว่าเรามีค่า default ของ sugar_level หรือไม่
      const defaultSugar = getDefaultOptionName('sugar_level');
      if (defaultSugar) {
        console.log("Setting default sugar level to:", defaultSugar);
        setSelectedSugarLevel(defaultSugar);
      }
      
      // ดูว่าเรามีค่า default ของ milk_type หรือไม่
      const defaultMilk = getDefaultOptionName('milk_type');
      if (defaultMilk) {
        console.log("Setting default milk type to:", defaultMilk);
        setSelectedMilkType(defaultMilk);
      }
    }
  }, [customizationOptions, customizationTypes]);
  
  // Calculate price when options change
  useEffect(() => {
    let price = product.price;
    
    // Add price for type
    const typeOption = typeOptions.find(option => option.name === selectedType);
    if (typeOption) {
      price += typeOption.price || 0;
    }
    
    // Add price for milk type
    const milkOption = milkTypeOptions.find(option => option.name === selectedMilkType);
    if (milkOption) {
      price += milkOption.price || 0;
    }
    
    // Add price for toppings
    const toppingsPrice = selectedToppings.reduce((total, topping) => total + topping.price, 0);
    price += toppingsPrice;
    
    // Add price for extras
    const extrasPrice = selectedExtras.reduce((total, extra) => total + extra.price, 0);
    price += extrasPrice;
    
    // Multiply by quantity
    price *= quantity;
    
    setTotalPrice(price);
  }, [
    product.price,
    selectedType,
    selectedMilkType,
    selectedToppings,
    selectedExtras,
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
    // ทำงานเฉพาะเมื่อไม่ได้กำลังแก้ไขรายการที่มีอยู่แล้ว และ customizationTypes โหลดเสร็จแล้ว
    if (!editingItemId && customizationTypes && customizationTypes.length > 0) {
      // ถ้าไม่มีการแก้ไข ใช้ค่าเริ่มต้นจาก API เสมอ (ไม่ใช้ค่าที่ตั้งไว้แบบ hardcode)
      if (!initialCustomizations) {
        // ตั้งค่าเริ่มต้นสำหรับตัวเลือกมาตรฐาน
        const defaultTemp = getDefaultOptionName('temperature');
        if (defaultTemp) {
          setSelectedType(defaultTemp);
        }
        
        const defaultSugar = getDefaultOptionName('sugar_level');
        if (defaultSugar) {
          setSelectedSugarLevel(defaultSugar);
        }
        
        const defaultMilk = getDefaultOptionName('milk_type');
        if (defaultMilk) {
          setSelectedMilkType(defaultMilk);
        }
      }
      
      setSelectedCustomOptions(prev => {
        const newOptions = { ...prev };
        
        // ตรวจสอบแต่ละประเภทของตัวเลือก
        customizationTypes.forEach(type => {
          // ข้ามประเภทมาตรฐานที่จัดการแยกต่างหาก
          if (['temperature', 'sugar_level', 'milk_type', 'toppings', 'extras'].includes(type)) {
            return;
          }
          
          // ถ้ายังไม่มีข้อมูลของประเภทนี้ในตัวเลือกที่เลือก หรือไม่มีตัวเลือกที่เลือกไว้
          if (!newOptions[type] || newOptions[type].length === 0) {
            const options = customizationOptions.filter(opt => opt.type === type);
            const defaultOption = options.find(opt => opt.isDefault);
            
            // ถ้ามีค่าเริ่มต้น ให้เพิ่มเข้าไปในตัวเลือกที่เลือก
            if (defaultOption) {
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
  }, [customizationTypes, customizationOptions, editingItemId, initialCustomizations]);
  
  // Update price calculation to include dynamic customizations
  useEffect(() => {
    let price = product.price;
    
    // Add price for type
    const typeOption = typeOptions.find(option => option.name === selectedType);
    if (typeOption) {
      price += typeOption.price || 0;
    }
    
    // Add price for sugar level
    const sugarLevelOption = sugarLevelOptions.find(option => option.name === selectedSugarLevel);
    if (sugarLevelOption) {
      price += sugarLevelOption.price || 0;
    }
    
    // Add price for milk type
    const milkOption = milkTypeOptions.find(option => option.name === selectedMilkType);
    if (milkOption) {
      price += milkOption.price || 0;
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
  
  const handleAddToCart = () => {
    const cartItem: CartItem = {
      // ถ้ากำลังแก้ไข ให้ใช้ ID เดิม มิฉะนั้นสร้าง ID ใหม่
      id: editingItemId || `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      totalPrice,
      customizations: {
        temperature: selectedType, // เปลี่ยนจาก type เป็น temperature ให้ตรงกับ schema และหน้าลูกค้า
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
      <div className="bg-white rounded-lg w-1/2 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center bg-[var(--coffee-primary)] text-white">
          <h3 className="text-xl font-medium">ปรับแต่งเครื่องดื่ม</h3>
          <button className="text-2xl font-bold" onClick={onClose}>
            &times;
          </button>
        </div>
        
        {/* Product Info */}
        <div className="p-4 flex items-center border-b">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 object-cover rounded"
          />
          <div className="ml-4">
            <h4 className="text-lg font-medium">{product.name}</h4>
            <p className="text-[var(--coffee-primary)] font-medium">฿{product.price}</p>
          </div>
        </div>
        
        {/* Customization Options */}
        <div className="p-4 space-y-6">
          {/* Standard customization options */}
          {/* Type */}
          {typeOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">ประเภทเครื่องดื่ม</h5>
              <div className="grid grid-cols-2 gap-2">
                {typeOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded ${
                      selectedType === option.name
                        ? "border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white"
                        : "border-gray-300 hover:border-[var(--coffee-primary)]"
                    }`}
                    onClick={() => setSelectedType(option.name)}
                  >
                    {option.name}
                    {option.price !== null && option.price !== 0 ? 
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
              <h5 className="font-medium mb-2">ระดับความหวาน</h5>
              <div className="grid grid-cols-4 gap-2">
                {sugarLevelOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded ${
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
              <h5 className="font-medium mb-2">ชนิดนม</h5>
              <div className="grid grid-cols-3 gap-2">
                {milkTypeOptions.map(option => (
                  <button
                    key={option.id}
                    className={`border py-2 rounded ${
                      selectedMilkType === option.name
                        ? "border-[var(--coffee-primary)] bg-[var(--coffee-primary)] text-white"
                        : "border-gray-300 hover:border-[var(--coffee-primary)]"
                    }`}
                    onClick={() => setSelectedMilkType(option.name)}
                  >
                    {option.name}
                    {option.price !== null && option.price !== 0 ? 
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
              <h5 className="font-medium mb-2">ท็อปปิ้ง</h5>
              <div className="grid grid-cols-2 gap-2">
                {toppingOptions.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2 border rounded p-2"
                  >
                    <Checkbox
                      checked={selectedToppings.some(t => t.id === option.id)}
                      onCheckedChange={() => toggleTopping(option)}
                    />
                    <span>
                      {option.name} (+฿{option.price || 0})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Extras */}
          {extraOptions.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">เพิ่มเติม</h5>
              <div className="grid grid-cols-2 gap-2">
                {extraOptions.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center space-x-2 border rounded p-2"
                  >
                    <Checkbox
                      checked={selectedExtras.some(e => e.id === option.id)}
                      onCheckedChange={() => toggleExtra(option)}
                    />
                    <span>
                      {option.name} (+฿{option.price || 0})
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
            
            // ใช้ชื่อแสดงผลภาษาไทยจาก API ถ้ามี (หรือแปลง snake_case เป็น Title Case ถ้าไม่มี)
            const displayType = typeDisplayNames && typeDisplayNames[type] 
              ? typeDisplayNames[type] 
              : type
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              
            return (
              <div key={type}>
                <h5 className="font-medium mb-2">{displayType}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {options.map(option => (
                    <label
                      key={option.id}
                      className="flex items-center space-x-2 border rounded p-2"
                    >
                      <Checkbox
                        checked={isCustomOptionSelected(type, option.id)}
                        onCheckedChange={() => toggleCustomOption(type, option)}
                      />
                      <span>
                        {option.name} {option.price && option.price > 0 ? `(+฿${option.price})` : ""}
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
            <div className="flex border rounded w-1/3">
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
              className="w-full border rounded p-2"
              rows={2}
              placeholder="หากมีคำแนะนำเพิ่มเติม กรุณาระบุที่นี่..."
            />
          </div>
          
          {/* Add to Cart Button */}
          <Button
            className="w-full bg-[var(--coffee-primary)] text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
            onClick={handleAddToCart}
          >
            เพิ่มลงตะกร้า - ฿{totalPrice}
          </Button>
        </div>
      </div>
    </div>
  );
}
