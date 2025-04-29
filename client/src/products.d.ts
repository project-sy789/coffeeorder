import { Product } from "@shared/schema";

// ขยาย interface สำหรับ Product เพื่อเพิ่ม properties สำหรับการแก้ไขสินค้า
export interface ProductWithEditData extends Product {
  editingData?: {
    itemId: string;
    initialCustomizations: {
      quantity?: number;
      type?: string;
      sugarLevel?: string;
      milkType?: string;
      toppings?: {id: number, name: string, price: number}[];
      extras?: {id: number, name: string, price: number}[];
      specialInstructions?: string;
      customOptions?: Record<string, any>;
    };
  };
}