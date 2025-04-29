import { Product, CustomizationOption } from "@shared/schema";

// Mock product data for development and testing
export const sampleProducts: Product[] = [
  {
    id: 1,
    name: "เอสเปรสโซ่",
    category: "กาแฟร้อน",
    price: 45,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=350&fit=crop",
    description: "กาแฟเข้มข้น",
    active: true
  },
  {
    id: 2,
    name: "คาปูชิโน่",
    category: "กาแฟร้อน",
    price: 55,
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&h=350&fit=crop",
    description: "กาแฟผสมนมสตีม",
    active: true
  },
  {
    id: 3,
    name: "ลาเต้",
    category: "กาแฟร้อน",
    price: 55,
    image: "https://images.unsplash.com/photo-1497636577773-f1231844b336?w=500&h=350&fit=crop",
    description: "กาแฟผสมนม",
    active: true
  },
  {
    id: 4,
    name: "อเมริกาโน่",
    category: "กาแฟร้อน",
    price: 45,
    image: "https://images.unsplash.com/photo-1572286258217-215cf8e064b9?w=500&h=350&fit=crop",
    description: "กาแฟผสมน้ำร้อน",
    active: true
  },
  {
    id: 5,
    name: "มอคค่า",
    category: "กาแฟร้อน",
    price: 60,
    image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&h=350&fit=crop",
    description: "กาแฟผสมช็อคโกแลต",
    active: true
  },
  {
    id: 6,
    name: "ฮันนี่ลาเต้",
    category: "กาแฟร้อน",
    price: 65,
    image: "https://images.unsplash.com/photo-1579888944880-d98341245702?w=500&h=350&fit=crop",
    description: "กาแฟผสมนมและน้ำผึ้ง",
    active: true
  },
  // กาแฟเย็น items
  {
    id: 7,
    name: "เอสเปรสโซ่เย็น",
    category: "กาแฟเย็น",
    price: 55,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&h=350&fit=crop",
    description: "กาแฟเข้มข้นเสิร์ฟเย็น",
    active: true
  },
  {
    id: 8,
    name: "ลาเต้เย็น",
    category: "กาแฟเย็น",
    price: 65,
    image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&h=350&fit=crop",
    description: "กาแฟผสมนมเสิร์ฟเย็น",
    active: true
  },
  // ชา items
  {
    id: 9,
    name: "ชาเขียว",
    category: "ชา",
    price: 50,
    image: "https://images.unsplash.com/photo-1519811170192-85eadc19f786?w=500&h=350&fit=crop",
    description: "ชาเขียวญี่ปุ่น",
    active: true
  },
  {
    id: 10,
    name: "ชาไทย",
    category: "ชา",
    price: 60,
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=500&h=350&fit=crop",
    description: "ชาไทยดั้งเดิม",
    active: true
  }
];

// Mock customization options for development and testing
export const sampleCustomizationOptions: CustomizationOption[] = [
  // Type options
  {
    id: 1,
    name: "ร้อน",
    type: "type",
    price: 0
  },
  {
    id: 2,
    name: "เย็น",
    type: "type",
    price: 10
  },
  // Sugar level options
  {
    id: 3,
    name: "ไม่หวาน",
    type: "sugar_level",
    price: 0
  },
  {
    id: 4,
    name: "น้อย",
    type: "sugar_level",
    price: 0
  },
  {
    id: 5,
    name: "ปกติ",
    type: "sugar_level",
    price: 0
  },
  {
    id: 6,
    name: "มาก",
    type: "sugar_level",
    price: 0
  },
  // Milk type options
  {
    id: 7,
    name: "นมสด",
    type: "milk_type",
    price: 0
  },
  {
    id: 8,
    name: "นมข้น",
    type: "milk_type",
    price: 0
  },
  {
    id: 9,
    name: "นมอัลมอนด์",
    type: "milk_type",
    price: 15
  },
  // Topping options
  {
    id: 10,
    name: "วิปครีม",
    type: "topping",
    price: 10
  },
  {
    id: 11,
    name: "ช็อกโกแลตชิพ",
    type: "topping",
    price: 10
  },
  {
    id: 12,
    name: "คาราเมล",
    type: "topping",
    price: 15
  },
  {
    id: 13,
    name: "บราวนี่",
    type: "topping",
    price: 20
  }
];

// Sample categories
export const productCategories = [
  "กาแฟร้อน",
  "กาแฟเย็น",
  "ชา",
  "นมและช็อคโกแลต",
  "สมูทตี้",
  "ขนม"
];

// Helper function to get products by category
export function getProductsByCategory(category: string): Product[] {
  return sampleProducts.filter(product => product.category === category && product.active);
}

// Helper function to get customization options by type
export function getCustomizationOptionsByType(type: string): CustomizationOption[] {
  return sampleCustomizationOptions.filter(option => option.type === type);
}
