import { useState, useEffect } from "react";

export interface CartItemCustomizations {
  temperature: string;
  sugar_level: string;
  milk_type: string;
  toppings: { id: number; name: string; price: number }[];
  extras: { id: number; name: string; price: number }[];
  specialInstructions?: string;
  [key: string]: any; // เพิ่ม property แบบไดนามิก สำหรับตัวเลือกที่กำหนดเองในหลังบ้าน
}

export interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  customizations: CartItemCustomizations;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Load cart from localStorage on init
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
      }
    }
  }, []);
  
  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);
  
  const addToCart = (item: CartItem) => {
    // ถ้ามีไอเท็มที่มี id ตรงกัน ให้ทำการอัพเดทแทนที่จะเพิ่มใหม่
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex >= 0) {
      // มีรายการที่มี id เดียวกันอยู่แล้ว ให้อัพเดทแทนการเพิ่มใหม่
      setCart(prevCart => {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = item;
        return newCart;
      });
    } else {
      // ไม่มีรายการอยู่ก่อน ให้เพิ่มใหม่
      setCart(prevCart => [...prevCart, item]);
    }
  };
  
  const updateCartItem = (id: string, updatedItem?: CartItem) => {
    // ถ้ามีการส่ง updatedItem มา ให้อัพเดทข้อมูลในตะกร้า
    if (updatedItem) {
      setCart(prevCart => {
        const itemIndex = prevCart.findIndex(item => item.id === id);
        if (itemIndex >= 0) {
          const newCart = [...prevCart];
          newCart[itemIndex] = updatedItem;
          return newCart;
        }
        return prevCart;
      });
    }
    // ถ้าไม่ได้ส่ง updatedItem มา จะเป็นเพียงการเปิด modal แก้ไข (จัดการโดย pos.tsx)
  };
  
  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };
  
  const clearCart = () => {
    setCart([]);
  };
  
  return {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
  };
}
