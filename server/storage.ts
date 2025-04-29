import { z } from 'zod';
import { Setting, InsertSetting, User, InsertUser, Product, InsertProduct, 
  CustomizationOption, InsertCustomizationOption, Member, InsertMember, 
  Order, InsertOrder, OrderItem, InsertOrderItem, Inventory, InsertInventory,
  Promotion, InsertPromotion, ProductIngredient, InsertProductIngredient,
  InventoryTransaction, InsertInventoryTransaction, OrderWithItems, ProductWithIngredients,
  PointSetting, InsertPointSetting, PointRedemptionRule, InsertPointRedemptionRule
} from '@shared/schema';
import bcrypt from 'bcrypt';
import { db } from './db';
import { eq, and, desc, sql, like, gt, lt, or, isNull, asc } from 'drizzle-orm';
import * as schema from '@shared/schema';
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from './db';

export interface IStorage {
  // Database Connection
  checkDatabaseConnection(): Promise<{ success: boolean; error?: string }>;
  
  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: number, setting: Partial<Setting>): Promise<Setting | undefined>;
  createOrUpdateSetting(key: string, value: string, description?: string | null): Promise<Setting>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  getProductWithIngredients(id: number): Promise<ProductWithIngredients | undefined>;
  getAllCategories(): Promise<string[]>;
  addCategory(category: string): Promise<boolean>;
  updateCategory(oldCategory: string, newCategory: string): Promise<boolean>;
  deleteCategory(category: string): Promise<boolean>;

  // Customization options
  getCustomizationOptions(): Promise<CustomizationOption[]>;
  getCustomizationOption(id: number): Promise<CustomizationOption | undefined>;
  getCustomizationOptionsByType(type: string): Promise<CustomizationOption[]>;
  createCustomizationOption(option: InsertCustomizationOption): Promise<CustomizationOption>;
  updateCustomizationOption(id: number, option: Partial<CustomizationOption>): Promise<CustomizationOption | undefined>;
  deleteCustomizationOption(id: number): Promise<boolean>;
  getAllCustomizationTypes(): Promise<string[]>;
  getCustomizationTypeLabels(): Promise<Record<string, string>>; // เพิ่มฟังก์ชันใหม่สำหรับดึงชื่อแสดงผลของหมวดหมู่
  addCustomizationType(type: string): Promise<boolean>;
  updateCustomizationType(oldType: string, newType: string): Promise<boolean>;
  deleteCustomizationType(type: string): Promise<boolean>;

  // Members
  getMembers(): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  getMemberByPhone(phone: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<Member>): Promise<Member | undefined>;
  addMemberPoints(id: number, points: number): Promise<Member | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<OrderWithItems | undefined>;
  getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: number, status: string, cancelReason?: string): Promise<Order | undefined>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  
  // Promotions
  getPromotions(): Promise<Promotion[]>;
  getPromotion(id: number): Promise<Promotion | undefined>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined>;
  deletePromotion(id: number): Promise<boolean>;
  getActivePromotions(): Promise<Promotion[]>;

  // Point Settings
  getPointSettings(): Promise<PointSetting[]>;
  getActivePointSetting(): Promise<PointSetting | undefined>;
  createPointSetting(setting: InsertPointSetting): Promise<PointSetting>;
  updatePointSetting(id: number, setting: Partial<PointSetting>): Promise<PointSetting | undefined>;
  deletePointSetting(id: number): Promise<boolean>;
  
  // Point Redemption Rules
  getPointRedemptionRules(): Promise<PointRedemptionRule[]>;
  getPointRedemptionRule(id: number): Promise<PointRedemptionRule | undefined>;
  createPointRedemptionRule(rule: InsertPointRedemptionRule): Promise<PointRedemptionRule>;
  updatePointRedemptionRule(id: number, rule: Partial<PointRedemptionRule>): Promise<PointRedemptionRule | undefined>;
  deletePointRedemptionRule(id: number): Promise<boolean>;
  getActivePointRedemptionRules(): Promise<PointRedemptionRule[]>;
  getAvailableRedemptionOptions(memberId: number, orderTotal: number): Promise<PointRedemptionRule[]>;
  
  // Inventory
  getInventoryItems(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined>;
  
  // Product Ingredients
  getProductIngredients(productId: number): Promise<ProductIngredient[]>;
  createProductIngredient(ingredient: InsertProductIngredient): Promise<ProductIngredient>;
  updateProductIngredient(id: number, ingredient: Partial<ProductIngredient>): Promise<ProductIngredient | undefined>;
  deleteProductIngredient(id: number): Promise<boolean>;
  
  // Inventory Transactions
  getInventoryTransactions(inventoryId?: number): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  processOrderInventoryChanges(orderId: number): Promise<boolean>;
  
  // Customization type settings
  getCustomizationTypeSettings(type: string): Promise<{ multipleSelection: boolean } | undefined>;
  getAllCustomizationTypeSettings(): Promise<Record<string, { multipleSelection: boolean }>>;
  updateCustomizationTypeSettings(type: string, settings: { multipleSelection: boolean }): Promise<boolean>;
  
  // Analytics
  getDailySales(date: Date): Promise<number>;
  getPopularProducts(limit: number): Promise<{productId: number, productName: string, count: number}[]>;
  getLowStockItems(): Promise<Inventory[]>;
  getProductUsageReport(): Promise<{productId: number, productName: string, inventoryUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[]}[]>;
  
  // Member Points Calculation
  calculatePointsForOrder(order: Order, items: OrderItem[]): Promise<number>;
}

export class MemStorage implements IStorage {
  async checkDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
    // สำหรับ in-memory storage เราจะถือว่าสำเร็จเสมอ
    return { success: true };
  }
  
  async createOrUpdateSetting(key: string, value: string, description: string | null = null): Promise<Setting> {
    // ตรวจสอบว่ามีการตั้งค่านี้อยู่แล้วหรือไม่
    const existingSetting = await this.getSetting(key);
    
    if (existingSetting) {
      // อัปเดตการตั้งค่าที่มีอยู่
      return await this.updateSetting(existingSetting.id, { value, description }) as Setting;
    } else {
      // สร้างการตั้งค่าใหม่
      return await this.createSetting({ key, value, description });
    }
  }
  private settings: Map<number, Setting>;
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private customizationOptions: Map<number, CustomizationOption>;
  private members: Map<number, Member>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem[]>;
  private inventory: Map<number, Inventory>;
  private promotions: Map<number, Promotion>;
  private pointSettings: Map<number, PointSetting>;
  private pointRedemptionRules: Map<number, PointRedemptionRule>;
  private productIngredients: Map<number, ProductIngredient>;
  private inventoryTransactions: Map<number, InventoryTransaction>;
  
  private categories: Set<string>;
  private customizationTypes: Set<string>;
  private customizationTypeSettings: Map<string, { multipleSelection: boolean }>;
  
  // ตัวแปรสำหรับการสร้างรหัสคำสั่งซื้อแบบใหม่
  private lastOrderDate: string; // วันที่ล่าสุดที่มีการสร้างคำสั่งซื้อ (YYYYMMDD)
  private dailyOrderCount: number; // จำนวนคำสั่งซื้อประจำวัน
  
  private currentSettingId: number;
  private currentUserId: number;
  private currentProductId: number;
  private currentCustomizationId: number;
  private currentMemberId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;
  private currentInventoryId: number;
  private currentPromotionId: number;
  private currentPointSettingId: number;
  private currentPointRedemptionRuleId: number;
  private currentProductIngredientId: number;
  private currentInventoryTransactionId: number;
  
  constructor() {
    this.settings = new Map();
    this.users = new Map();
    this.products = new Map();
    this.customizationOptions = new Map();
    this.members = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.inventory = new Map();
    this.promotions = new Map();
    this.pointSettings = new Map();
    this.pointRedemptionRules = new Map();
    this.productIngredients = new Map();
    this.inventoryTransactions = new Map();
    
    this.categories = new Set();
    this.customizationTypes = new Set();
    this.customizationTypeSettings = new Map();
    
    // กำหนดค่าเริ่มต้นสำหรับระบบหมายเลขคำสั่งซื้อแบบใหม่
    const today = new Date();
    this.lastOrderDate = this.formatDateForOrderCode(today);
    this.dailyOrderCount = 0;
    
    this.currentSettingId = 1;
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentCustomizationId = 1;
    this.currentMemberId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    this.currentInventoryId = 1;
    this.currentPromotionId = 1;
    this.currentPointSettingId = 1;
    this.currentPointRedemptionRuleId = 1;
    this.currentProductIngredientId = 1;
    this.currentInventoryTransactionId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }
  
  // ฟังก์ชั่นสำหรับสร้างรหัสวันที่ในรูปแบบ YYYYMMDD
  private formatDateForOrderCode(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  // ฟังก์ชั่นสร้างรหัสคำสั่งซื้อในรูปแบบ YYYYMMDD-XXX
  private generateOrderCode(date: Date): string {
    const dateString = this.formatDateForOrderCode(date);
    
    // ตรวจสอบว่าเป็นวันใหม่หรือไม่
    if (dateString !== this.lastOrderDate) {
      this.lastOrderDate = dateString;
      this.dailyOrderCount = 0;
    }
    
    // เพิ่มจำนวนคำสั่งซื้อของวัน
    this.dailyOrderCount++;
    
    // สร้างรหัสคำสั่งซื้อในรูปแบบ YYYYMMDD-XXX
    return `${dateString}-${String(this.dailyOrderCount).padStart(3, '0')}`;
  }
  
  private async initializeSampleData() {
    // Initialize admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    this.users.set(1, {
      id: 1,
      username: 'admin',
      password: adminPasswordHash,
      name: 'ผู้ดูแลระบบ',
      role: 'admin',
      active: true
    });
    this.currentUserId++;
    
    // Initialize staff user
    const staffPasswordHash = await bcrypt.hash('staff123', 10);
    this.users.set(2, {
      id: 2,
      username: 'staff',
      password: staffPasswordHash,
      name: 'พนักงาน',
      role: 'staff',
      active: true
    });
    this.currentUserId++;
    
    // Initialize categories
    const categories = ['กาแฟ', 'ชา', 'เครื่องดื่มอื่นๆ', 'ขนม'];
    categories.forEach(category => this.categories.add(category));
    
    // Initialize customization types
    const types = ['sugar_level', 'milk_type', 'temperature', 'toppings', 'extras'];
    types.forEach(type => {
      this.customizationTypes.add(type);
      // Default settings: sugar_level, milk_type, temperature are single selection
      // toppings, extras are multiple selection
      const multipleSelection = type === 'toppings' || type === 'extras';
      this.customizationTypeSettings.set(type, { multipleSelection });
    });
    
    // Initialize customization options
    const customizationOptions = [
      { type: 'sugar_level', name: 'ไม่หวาน', price: 0, isDefault: false },
      { type: 'sugar_level', name: 'หวานน้อย', price: 0, isDefault: false },
      { type: 'sugar_level', name: 'หวานปกติ', price: 0, isDefault: true },  // ตั้งค่าเริ่มต้นเป็นหวานปกติ
      { type: 'sugar_level', name: 'หวานพิเศษ', price: 5, isDefault: false },
      { type: 'milk_type', name: 'นมสด', price: 0, isDefault: true },  // ตั้งค่าเริ่มต้นเป็นนมสด
      { type: 'milk_type', name: 'นมข้นหวาน', price: 0, isDefault: false },
      { type: 'milk_type', name: 'นมถั่วเหลือง', price: 10, isDefault: false },
      { type: 'milk_type', name: 'นมอัลมอนด์', price: 15, isDefault: false },
      { type: 'temperature', name: 'เย็น', price: 0, isDefault: true },  // ตั้งค่าเริ่มต้นเป็นเย็น
      { type: 'temperature', name: 'ร้อน', price: -5, isDefault: false },
      { type: 'temperature', name: 'ปั่น', price: 10, isDefault: false },
      { type: 'toppings', name: 'ฟองนมครีม', price: 10, isDefault: false },
      { type: 'toppings', name: 'วิปครีม', price: 15, isDefault: false },
      { type: 'toppings', name: 'บุก', price: 10, isDefault: false },
      { type: 'toppings', name: 'เจลลี่กาแฟ', price: 15, isDefault: false },
      { type: 'extras', name: 'ช็อต espresso เพิ่ม', price: 15, isDefault: false },
      { type: 'extras', name: 'ไซรัปเพิ่ม', price: 10, isDefault: false },
    ];
    
    customizationOptions.forEach(option => {
      const id = this.currentCustomizationId++;
      this.customizationOptions.set(id, { ...option, id });
    });
    
    // Initialize products
    const products = [
      { name: 'เอสเพรสโซ่', price: 45, category: 'กาแฟ', image: 'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?w=500', description: 'กาแฟเข้มข้น' },
      { name: 'อเมริกาโน่', price: 50, category: 'กาแฟ', image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500', description: 'กาแฟดำรสชาติกลมกล่อม' },
      { name: 'ลาเต้', price: 55, category: 'กาแฟ', image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500', description: 'กาแฟผสมนม' },
      { name: 'คาปูชิโน่', price: 55, category: 'กาแฟ', image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500', description: 'กาแฟผสมนมและฟองนม' },
      { name: 'มอคค่า', price: 60, category: 'กาแฟ', image: 'https://images.unsplash.com/photo-1529892485617-25f63cd7b1e9?w=500', description: 'กาแฟผสมช็อคโกแลต' },
      { name: 'ชาไทย', price: 45, category: 'ชา', image: 'https://images.unsplash.com/photo-1593591893839-580af67a4d2c?w=500', description: 'ชาไทยรสชาติเข้มข้น' },
      { name: 'ชานม', price: 45, category: 'ชา', image: 'https://images.unsplash.com/photo-1577019449620-692800d79a50?w=500', description: 'ชาผสมนม' },
      { name: 'ชาเขียว', price: 50, category: 'ชา', image: 'https://images.unsplash.com/photo-1627435601361-ec25f5ce9c28?w=500', description: 'ชาเขียวญี่ปุ่น' },
      { name: 'ชามะนาว', price: 45, category: 'ชา', image: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=500', description: 'ชามะนาวเย็น' },
      { name: 'ชาดำเย็น', price: 40, category: 'ชา', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=500', description: 'ชาดำเย็น' },
      { name: 'น้ำส้ม', price: 40, category: 'เครื่องดื่มอื่นๆ', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500', description: 'น้ำส้มคั้นสด' },
      { name: 'น้ำมะนาว', price: 35, category: 'เครื่องดื่มอื่นๆ', image: 'https://images.unsplash.com/photo-1621263764928-df1444c3a451?w=500', description: 'น้ำมะนาวสดผสมน้ำผึ้ง' },
      { name: 'ช็อคโกแลตเย็น', price: 55, category: 'เครื่องดื่มอื่นๆ', image: 'https://images.unsplash.com/photo-1627998792088-f8016b438988?w=500', description: 'ช็อคโกแลตเย็น' },
      { name: 'นมสด', price: 35, category: 'เครื่องดื่มอื่นๆ', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500', description: 'นมสดเย็น' },
      { name: 'คุกกี้', price: 30, category: 'ขนม', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500', description: 'คุกกี้ช็อคโกแลตชิพ' },
      { name: 'ครัวซองค์', price: 45, category: 'ขนม', image: 'https://images.unsplash.com/photo-1592398191627-25b13249ffe9?w=500', description: 'ครัวซองค์เนยสด' },
      { name: 'เค้กช็อคโกแลต', price: 65, category: 'ขนม', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500', description: 'เค้กช็อคโกแลตเข้มข้น' },
      { name: 'บราวนี่', price: 55, category: 'ขนม', image: 'https://images.unsplash.com/photo-1590841609987-4ac211afdde1?w=500', description: 'บราวนี่หน้ากรอบด้านในนุ่ม' },
    ];
    
    products.forEach(product => {
      const id = this.currentProductId++;
      this.products.set(id, { ...product, id, active: true });
    });
    
    // Initialize inventory items
    const inventoryItems = [
      { name: 'เมล็ดกาแฟ', quantity: 5000, unit: 'กรัม', minimumLevel: 1000 },
      { name: 'นมสด', quantity: 10000, unit: 'มิลลิลิตร', minimumLevel: 2000 },
      { name: 'ชา', quantity: 2000, unit: 'กรัม', minimumLevel: 500 },
      { name: 'น้ำตาล', quantity: 5000, unit: 'กรัม', minimumLevel: 1000 },
      { name: 'น้ำเชื่อม', quantity: 3000, unit: 'มิลลิลิตร', minimumLevel: 500 },
      { name: 'ช็อคโกแลตไซรัป', quantity: 2000, unit: 'มิลลิลิตร', minimumLevel: 500 },
      { name: 'วิปครีม', quantity: 1000, unit: 'กรัม', minimumLevel: 200 },
      { name: 'ผงชาเขียว', quantity: 1000, unit: 'กรัม', minimumLevel: 200 },
      { name: 'น้ำส้ม', quantity: 5000, unit: 'มิลลิลิตร', minimumLevel: 1000 },
      { name: 'มะนาว', quantity: 2000, unit: 'กรัม', minimumLevel: 500 },
    ];
    
    inventoryItems.forEach(item => {
      const id = this.currentInventoryId++;
      this.inventory.set(id, { ...item, id });
    });
    
    // Initialize product ingredients
    const productIngredients = [
      { productId: 1, inventoryId: 1, quantity: 18, unit: 'กรัม' }, // เอสเพรสโซ่ - เมล็ดกาแฟ
      { productId: 2, inventoryId: 1, quantity: 18, unit: 'กรัม' }, // อเมริกาโน่ - เมล็ดกาแฟ
      { productId: 3, inventoryId: 1, quantity: 18, unit: 'กรัม' }, // ลาเต้ - เมล็ดกาแฟ
      { productId: 3, inventoryId: 2, quantity: 150, unit: 'มิลลิลิตร' }, // ลาเต้ - นมสด
      { productId: 4, inventoryId: 1, quantity: 18, unit: 'กรัม' }, // คาปูชิโน่ - เมล็ดกาแฟ
      { productId: 4, inventoryId: 2, quantity: 100, unit: 'มิลลิลิตร' }, // คาปูชิโน่ - นมสด
      { productId: 5, inventoryId: 1, quantity: 18, unit: 'กรัม' }, // มอคค่า - เมล็ดกาแฟ
      { productId: 5, inventoryId: 2, quantity: 100, unit: 'มิลลิลิตร' }, // มอคค่า - นมสด
      { productId: 5, inventoryId: 6, quantity: 30, unit: 'มิลลิลิตร' }, // มอคค่า - ช็อคโกแลตไซรัป
      { productId: 6, inventoryId: 3, quantity: 10, unit: 'กรัม' }, // ชาไทย - ชา
      { productId: 6, inventoryId: 4, quantity: 20, unit: 'กรัม' }, // ชาไทย - น้ำตาล
      { productId: 6, inventoryId: 2, quantity: 50, unit: 'มิลลิลิตร' }, // ชาไทย - นมสด
      { productId: 7, inventoryId: 3, quantity: 10, unit: 'กรัม' }, // ชานม - ชา
      { productId: 7, inventoryId: 2, quantity: 100, unit: 'มิลลิลิตร' }, // ชานม - นมสด
      { productId: 8, inventoryId: 8, quantity: 10, unit: 'กรัม' }, // ชาเขียว - ผงชาเขียว
    ];
    
    productIngredients.forEach(ingredient => {
      const id = this.currentProductIngredientId++;
      this.productIngredients.set(id, { ...ingredient, id });
    });
    
    // Initialize promotions
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const promotions = [
      { 
        name: 'ส่วนลด 10%', 
        type: 'percentage' as const, 
        value: 10, 
        code: 'SAVE10',
        minimumOrder: 100,
        startDate: now,
        endDate: nextMonth,
        usageLimit: 100,
        usedCount: 0,
        active: true,
        applicableProducts: null
      },
      { 
        name: 'ลด 50 บาท', 
        type: 'fixed' as const, 
        value: 50, 
        code: 'FLAT50',
        minimumOrder: 200,
        startDate: now,
        endDate: nextMonth,
        usageLimit: 50,
        usedCount: 0,
        active: true,
        applicableProducts: null
      }
    ];
    
    promotions.forEach(promotion => {
      const id = this.currentPromotionId++;
      this.promotions.set(id, { ...promotion, id, createdAt: now });
    });
    
    // Initialize members
    const members = [
      { name: 'คุณสมชาย ใจดี', phone: '0812345678', email: 'somchai@example.com' },
      { name: 'คุณสมหญิง รักเรียน', phone: '0898765432', email: 'somying@example.com' },
    ];
    
    members.forEach(member => {
      const id = this.currentMemberId++;
      this.members.set(id, { 
        ...member, 
        id, 
        points: 0, 
        registeredAt: new Date() 
      });
    });
    
    // Initialize settings
    const settingsList = [
      { key: 'store_name', value: 'คาเฟ่ของฉัน', description: 'ชื่อร้าน' },
      { key: 'store_status', value: 'open', description: 'สถานะร้าน (open, busy, closed)' },
      { key: 'promptpay_id', value: '0812345678', description: 'เบอร์พร้อมเพย์' },
      { key: 'promptpay_type', value: 'phone', description: 'ประเภทพร้อมเพย์ (phone, national_id)' }
    ];
    
    settingsList.forEach(setting => {
      const id = this.currentSettingId++;
      this.settings.set(id, { ...setting, id });
    });
    
    // Initialize some sample orders
    const createSampleOrder = () => {
      const date = new Date();
      date.setHours(date.getHours() - Math.random() * 24 * 7); // Random time in the last week
      
      const order: InsertOrder = {
        status: 'completed',
        staffId: Math.random() > 0.5 ? 1 : 2,
        customerId: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : null, // 30% chance to have customer
        total: 0, // Will be calculated
        discount: Math.random() > 0.8 ? Math.floor(Math.random() * 30) + 10 : 0, // 20% chance to have discount
        paymentMethod: Math.random() > 0.6 ? 'cash' : 'qr',
        createdAt: date,
        updatedAt: date
      };
      
      // Generate 1-3 random order items
      const items: InsertOrderItem[] = [];
      const itemCount = Math.floor(Math.random() * 3) + 1;
      
      let total = 0;
      
      for (let i = 0; i < itemCount; i++) {
        const productId = Math.floor(Math.random() * 18) + 1;
        const product = this.products.get(productId);
        
        if (product) {
          const quantity = Math.floor(Math.random() * 2) + 1;
          const price = product.price;
          
          const item: InsertOrderItem = {
            productId,
            orderId: 0, // Will be set in createOrder
            quantity,
            price,
            customizations: {}
          };
          
          items.push(item);
          total += price * quantity;
        }
      }
      
      // Update total
      order.total = total - order.discount;
      
      // Create the order
      const id = this.currentOrderId++;
      
      // สร้างรหัสคำสั่งซื้อในรูปแบบใหม่ (YYYYMMDD-XXX)
      const orderCode = this.generateOrderCode(date);
      
      const newOrder: Order = {
        ...order,
        id,
        orderCode, // เพิ่มรหัสคำสั่งซื้อรูปแบบใหม่
        status: "completed", // Always completed for sample orders
        customerId: order.customerId ?? null,
        discount: order.discount ?? 0,
        createdAt: date,
        updatedAt: date
      };
      
      this.orders.set(id, newOrder);
      
      // Save order items
      const orderItems = items.map(item => ({
        ...item,
        id: this.currentOrderItemId++,
        orderId: id,
        quantity: item.quantity ?? 1,
        customizations: item.customizations ?? {}
      }));
      
      this.orderItems.set(id, orderItems);
    };
    
    // Create 20 sample orders for past dates
    for (let i = 0; i < 20; i++) {
      createSampleOrder();
    }
    
    // Create 5 sample orders for today
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const hours = Math.floor(Math.random() * 12) + 7; // Between 7 AM - 7 PM
      const minutes = Math.floor(Math.random() * 60);
      
      const orderDate = new Date(today);
      orderDate.setHours(hours, minutes, 0, 0);
      
      createSampleOrder(orderDate);
    }
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    // ค้นหาการตั้งค่าตาม key แล้วเรียงตาม id จากมากไปน้อย เพื่อเอาค่าล่าสุดเสมอ
    const settings = Array.from(this.settings.values())
      .filter(setting => setting.key === key)
      .sort((a, b) => b.id - a.id);
    
    // รีเทิร์นการตั้งค่าล่าสุด (มี id มากที่สุด)
    return settings.length > 0 ? settings[0] : undefined;
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const id = this.currentSettingId++;
    const newSetting: Setting = { ...setting, id };
    this.settings.set(id, newSetting);
    return newSetting;
  }

  async updateSetting(id: number, setting: Partial<Setting>): Promise<Setting | undefined> {
    const existingSetting = this.settings.get(id);
    if (!existingSetting) return undefined;
    
    const updatedSetting = { ...existingSetting, ...setting };
    this.settings.set(id, updatedSetting);
    return updatedSetting;
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser: User = { 
      ...user, 
      id,
      password: hashedPassword,
      active: true 
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.active);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.category === category && product.active);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const newProduct: Product = { ...product, id, active: true };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct = { ...existingProduct, ...product };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;
    
    // Soft delete
    this.products.set(id, { ...product, active: false });
    return true;
  }

  // Customization options
  async getCustomizationOptions(): Promise<CustomizationOption[]> {
    const options = Array.from(this.customizationOptions.values());
    console.log("Customization options returned from storage:", options);
    return options;
  }

  async getCustomizationOption(id: number): Promise<CustomizationOption | undefined> {
    return this.customizationOptions.get(id);
  }

  async getCustomizationOptionsByType(type: string): Promise<CustomizationOption[]> {
    const options = Array.from(this.customizationOptions.values())
      .filter(option => option.type === type);
    console.log(`Customization options for type ${type}:`, options);
    return options;
  }

  async createCustomizationOption(option: InsertCustomizationOption): Promise<CustomizationOption> {
    const id = this.currentCustomizationId++;
    
    // ถ้าเพิ่มตัวเลือกใหม่และตั้งค่าเป็นค่าเริ่มต้น ต้องยกเลิกค่าเริ่มต้นของตัวเลือกอื่นในประเภทเดียวกัน
    if (option.isDefault) {
      // หาตัวเลือกอื่นที่เป็นค่าเริ่มต้นในประเภทเดียวกัน และยกเลิกค่าเริ่มต้น
      for (const [existingId, existingOption] of this.customizationOptions.entries()) {
        if (existingOption.type === option.type && existingOption.isDefault) {
          existingOption.isDefault = false;
          this.customizationOptions.set(existingId, existingOption);
        }
      }
    }
    
    const newOption: CustomizationOption = { ...option, id };
    this.customizationOptions.set(id, newOption);
    return newOption;
  }

  async updateCustomizationOption(id: number, option: Partial<CustomizationOption>): Promise<CustomizationOption | undefined> {
    const existingOption = this.customizationOptions.get(id);
    if (!existingOption) return undefined;
    
    // หากมีการอัพเดตเป็นค่าเริ่มต้น ต้องยกเลิกค่าเริ่มต้นของตัวเลือกอื่นในประเภทเดียวกัน
    if (option.isDefault === true) {
      console.log(`Setting option ${id} (${existingOption.name}) as default for ${existingOption.type}`);
      
      for (const [existingId, currentOption] of this.customizationOptions.entries()) {
        if (existingId !== id && 
            currentOption.type === (option.type || existingOption.type) && 
            currentOption.isDefault === true) {
          console.log(`Removing default from option ${existingId} (${currentOption.name})`);
          currentOption.isDefault = false;
          this.customizationOptions.set(existingId, currentOption);
        }
      }
    }
    
    const updatedOption = { ...existingOption, ...option };
    this.customizationOptions.set(id, updatedOption);
    return updatedOption;
  }

  async deleteCustomizationOption(id: number): Promise<boolean> {
    return this.customizationOptions.delete(id);
  }

  // Members
  async getMembers(): Promise<Member[]> {
    return Array.from(this.members.values());
  }

  async getMember(id: number): Promise<Member | undefined> {
    return this.members.get(id);
  }

  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    return Array.from(this.members.values()).find(member => member.phone === phone);
  }

  async createMember(member: InsertMember): Promise<Member> {
    const id = this.currentMemberId++;
    const now = new Date();
    const newMember: Member = { 
      ...member, 
      id, 
      points: 0, 
      registeredAt: now 
    };
    
    this.members.set(id, newMember);
    return newMember;
  }

  async updateMember(id: number, member: Partial<Member>): Promise<Member | undefined> {
    const existingMember = this.members.get(id);
    if (!existingMember) return undefined;
    
    const updatedMember = { ...existingMember, ...member };
    this.members.set(id, updatedMember);
    return updatedMember;
  }

  async addMemberPoints(id: number, points: number): Promise<Member | undefined> {
    const member = this.members.get(id);
    if (!member) return undefined;
    
    const updatedMember = { 
      ...member, 
      points: member.points + points 
    };
    
    this.members.set(id, updatedMember);
    return updatedMember;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const items = this.orderItems.get(id) || [];
    const itemsWithProducts = items.map(item => {
      const product = this.products.get(item.productId);
      if (!product) {
        console.error(`Product with ID ${item.productId} not found for order item ${item.id}`);
        return { ...item, product: { id: item.productId, name: 'Unknown Product', price: item.price, category: '', image: '', description: null, active: true } };
      }
      return { ...item, product };
    });
    
    return { ...order, items: itemsWithProducts };
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    console.log(`Searching orders between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    const result = Array.from(this.orders.values()).filter(order => {
      const orderDate = new Date(order.createdAt);
      const isInRange = orderDate >= startDate && orderDate <= endDate;
      
      // Log for debugging
      if (isInRange) {
        console.log(`Found order ${order.id} from ${new Date(order.createdAt).toISOString()}`);
      }
      
      return isInRange;
    });
    
    console.log(`Found ${result.length} orders in date range`);
    return result;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const id = this.currentOrderId++;
    const now = new Date();
    
    // สร้างรหัสคำสั่งซื้อในรูปแบบใหม่ (YYYYMMDD-XXX)
    const orderCode = this.generateOrderCode(now);
    
    const newOrder: Order = {
      ...order,
      id,
      orderCode, // เพิ่มรหัสคำสั่งซื้อรูปแบบใหม่
      status: "pending",
      customerId: order.customerId ?? null,
      discount: order.discount ?? 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.orders.set(id, newOrder);
    
    // Save order items
    const orderItems = items.map(item => ({
      ...item,
      id: this.currentOrderItemId++,
      orderId: id,
      quantity: item.quantity ?? 1,
      customizations: item.customizations ?? {}
    }));
    
    this.orderItems.set(id, orderItems);
    
    // Add points to member if applicable (10 baht = 1 point)
    if (order.customerId) {
      const points = Math.floor(order.total / 10);
      this.addMemberPoints(order.customerId, points);
    }
    
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string, cancelReason?: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { 
      ...order, 
      status,
      cancelReason: status === 'cancelled' ? cancelReason : null,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { 
      ...order, 
      ...orderData,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Inventory
  async getInventoryItems(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    return this.inventory.get(id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = this.currentInventoryId++;
    const newItem: Inventory = { ...item, id };
    this.inventory.set(id, newItem);
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined> {
    const existingItem = this.inventory.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item };
    this.inventory.set(id, updatedItem);
    return updatedItem;
  }

  // Analytics
  async getDailySales(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const orders = await this.getOrdersByDateRange(startOfDay, endOfDay);
    return orders.reduce((sum, order) => sum + order.total, 0);
  }
  
  async getPopularProducts(limit: number): Promise<{productId: number, productName: string, count: number}[]> {
    const productCounts: Record<number, number> = {};
    
    // Collect all order items
    for (const [_, items] of this.orderItems.entries()) {
      for (const item of items) {
        const productId = item.productId;
        productCounts[productId] = (productCounts[productId] || 0) + item.quantity;
      }
    }
    
    // Convert to array and sort
    const popularProducts = Object.entries(productCounts)
      .map(([productId, count]) => {
        const product = this.products.get(Number(productId));
        return {
          productId: Number(productId),
          productName: product?.name || 'Unknown',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
      
    return popularProducts;
  }

  // Promotions
  async getPromotions(): Promise<Promotion[]> {
    return Array.from(this.promotions.values());
  }

  async getPromotion(id: number): Promise<Promotion | undefined> {
    return this.promotions.get(id);
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const id = this.currentPromotionId++;
    const now = new Date();
    const newPromotion: Promotion = { 
      ...promotion, 
      id, 
      active: true,
      createdAt: now,
      // Ensure required fields have defaults if not provided
      code: promotion.code ?? null,
      minimumOrder: promotion.minimumOrder ?? null,
      applicableProducts: promotion.applicableProducts ?? null,
      usageLimit: promotion.usageLimit ?? 0,
      usedCount: 0
    };
    this.promotions.set(id, newPromotion);
    return newPromotion;
  }

  async updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined> {
    const existingPromotion = this.promotions.get(id);
    if (!existingPromotion) return undefined;
    
    const updatedPromotion = { ...existingPromotion, ...promotion };
    this.promotions.set(id, updatedPromotion);
    return updatedPromotion;
  }

  async deletePromotion(id: number): Promise<boolean> {
    const promotion = this.promotions.get(id);
    if (!promotion) return false;
    
    // Soft delete
    this.promotions.set(id, { ...promotion, active: false });
    return true;
  }

  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return Array.from(this.promotions.values()).filter(promotion => {
      const startDate = new Date(promotion.startDate);
      const endDate = new Date(promotion.endDate);
      return promotion.active && now >= startDate && now <= endDate;
    });
  }

  // Point Settings
  async getPointSettings(): Promise<PointSetting[]> {
    return Array.from(this.pointSettings.values());
  }
  
  async getActivePointSetting(): Promise<PointSetting | undefined> {
    return Array.from(this.pointSettings.values()).find(setting => setting.active);
  }
  
  async createPointSetting(setting: InsertPointSetting): Promise<PointSetting> {
    const id = this.currentPointSettingId++;
    const now = new Date();
    
    // ถ้าตั้งค่าตัวนี้เป็น active ให้ deactivate ตัวอื่นทั้งหมด
    if (setting.active) {
      for (const [settingId, pointSetting] of this.pointSettings.entries()) {
        if (pointSetting.active) {
          this.pointSettings.set(settingId, { ...pointSetting, active: false });
        }
      }
    }
    
    const newSetting: PointSetting = { 
      ...setting, 
      id, 
      createdAt: now,
      updatedAt: now,
      // ตั้งค่าเริ่มต้น
      applicableProducts: setting.applicableProducts ?? null
    };
    
    this.pointSettings.set(id, newSetting);
    return newSetting;
  }
  
  async updatePointSetting(id: number, setting: Partial<PointSetting>): Promise<PointSetting | undefined> {
    const existingSetting = this.pointSettings.get(id);
    if (!existingSetting) {
      return undefined;
    }
    
    // ถ้าตั้งค่าตัวนี้เป็น active ให้ deactivate ตัวอื่นทั้งหมด
    if (setting.active) {
      for (const [settingId, pointSetting] of this.pointSettings.entries()) {
        if (settingId !== id && pointSetting.active) {
          this.pointSettings.set(settingId, { ...pointSetting, active: false });
        }
      }
    }
    
    const updatedSetting = { 
      ...existingSetting, 
      ...setting,
      updatedAt: new Date()
    };
    
    this.pointSettings.set(id, updatedSetting);
    return updatedSetting;
  }
  
  async deletePointSetting(id: number): Promise<boolean> {
    // ถ้าเป็น active setting ไม่ควรลบ
    const setting = this.pointSettings.get(id);
    if (!setting || setting.active) {
      return false;
    }
    
    return this.pointSettings.delete(id);
  }

  // Point Redemption Rules
  async getPointRedemptionRules(): Promise<PointRedemptionRule[]> {
    return Array.from(this.pointRedemptionRules.values());
  }
  
  async getActivePointRedemptionRules(): Promise<PointRedemptionRule[]> {
    return Array.from(this.pointRedemptionRules.values())
      .filter(rule => rule.active);
  }
  
  async getPointRedemptionRule(id: number): Promise<PointRedemptionRule | undefined> {
    return this.pointRedemptionRules.get(id);
  }
  
  async createPointRedemptionRule(rule: InsertPointRedemptionRule): Promise<PointRedemptionRule> {
    const id = this.currentPointRedemptionRuleId++;
    const now = new Date();
    
    const newRule: PointRedemptionRule = {
      id,
      ...rule,
      createdAt: now,
      updatedAt: now,
      // ตั้งค่าเริ่มต้น
      active: rule.active ?? true,
      applicableProducts: rule.applicableProducts ?? [],
      maximumDiscount: rule.maximumDiscount ?? null,
      minimumOrder: rule.minimumOrder ?? 0
    };
    
    this.pointRedemptionRules.set(id, newRule);
    return newRule;
  }
  
  async updatePointRedemptionRule(id: number, rule: Partial<PointRedemptionRule>): Promise<PointRedemptionRule | undefined> {
    const existingRule = this.pointRedemptionRules.get(id);
    if (!existingRule) {
      return undefined;
    }
    
    const updatedRule = { 
      ...existingRule, 
      ...rule,
      updatedAt: new Date()
    };
    
    this.pointRedemptionRules.set(id, updatedRule);
    return updatedRule;
  }
  
  async deletePointRedemptionRule(id: number): Promise<boolean> {
    return this.pointRedemptionRules.delete(id);
  }
  
  async getAvailableRedemptionOptions(memberId: number, orderTotal: number): Promise<PointRedemptionRule[]> {
    // ตรวจสอบว่าสมาชิกมีอยู่จริงหรือไม่
    const member = await this.getMember(memberId);
    if (!member) {
      throw new Error('Member not found');
    }
    
    // ดึงกฎการแลกแต้มที่ active อยู่
    const activeRules = await this.getActivePointRedemptionRules();
    
    // กรองกฎที่สามารถใช้ได้ จากคะแนนสะสมของสมาชิกและยอดสั่งซื้อ
    const availableRules = activeRules.filter(rule => {
      // ตรวจสอบว่ามีคะแนนเพียงพอที่จะแลกหรือไม่
      const hasEnoughPoints = member.points >= rule.pointCost;
      
      // ตรวจสอบว่ายอดสั่งซื้อถึงขั้นต่ำหรือไม่ (ถ้ามีการกำหนด)
      const minimumOrderThreshold = rule.minimumOrder ?? 0;
      const meetsMinimumOrder = minimumOrderThreshold === 0 || orderTotal >= minimumOrderThreshold;
      
      // ส่งคืนเฉพาะกฎที่สามารถใช้ได้
      return hasEnoughPoints && meetsMinimumOrder;
    });
    
    return availableRules;
  }

  // Product Ingredients
  async getProductIngredients(productId: number): Promise<ProductIngredient[]> {
    return Array.from(this.productIngredients.values())
      .filter(ingredient => ingredient.productId === productId);
  }
  
  async createProductIngredient(ingredient: InsertProductIngredient): Promise<ProductIngredient> {
    const id = this.currentProductIngredientId++;
    const newIngredient: ProductIngredient = { ...ingredient, id };
    this.productIngredients.set(id, newIngredient);
    return newIngredient;
  }
  
  async updateProductIngredient(id: number, ingredient: Partial<ProductIngredient>): Promise<ProductIngredient | undefined> {
    const existingIngredient = this.productIngredients.get(id);
    if (!existingIngredient) return undefined;
    
    const updatedIngredient = { ...existingIngredient, ...ingredient };
    this.productIngredients.set(id, updatedIngredient);
    return updatedIngredient;
  }
  
  async deleteProductIngredient(id: number): Promise<boolean> {
    return this.productIngredients.delete(id);
  }
  
  // Product with Ingredients
  async getProductWithIngredients(id: number): Promise<ProductWithIngredients | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const productIngredients = await this.getProductIngredients(id);
    const ingredientsWithDetails = productIngredients.map(ingredient => {
      const inventoryItem = this.inventory.get(ingredient.inventoryId);
      return { ...ingredient, inventory: inventoryItem! };
    });
    
    return { ...product, ingredients: ingredientsWithDetails };
  }
  
  // Inventory Transactions
  async getInventoryTransactions(inventoryId?: number): Promise<InventoryTransaction[]> {
    let transactions = Array.from(this.inventoryTransactions.values());
    if (inventoryId) {
      transactions = transactions.filter(t => t.inventoryId === inventoryId);
    }
    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const id = this.currentInventoryTransactionId++;
    const now = new Date();
    
    const newTransaction: InventoryTransaction = {
      ...transaction,
      id,
      createdAt: now
    };
    
    this.inventoryTransactions.set(id, newTransaction);
    
    // Update inventory quantity
    const inventoryItem = await this.getInventoryItem(transaction.inventoryId);
    if (inventoryItem) {
      let newQuantity = inventoryItem.quantity;
      
      // Add or subtract based on transaction type
      if (transaction.type === 'receive') {
        newQuantity += transaction.quantity;
      } else if (transaction.type === 'use' || transaction.type === 'adjustment') {
        newQuantity -= transaction.quantity;
      }
      
      // Update inventory
      await this.updateInventoryItem(inventoryItem.id, { quantity: newQuantity });
    }
    
    return newTransaction;
  }
  
  async processOrderInventoryChanges(orderId: number): Promise<boolean> {
    const order = await this.getOrderWithItems(orderId);
    if (!order || order.status !== 'completed') return false;
    
    // Process each order item
    for (const item of order.items) {
      const product = await this.getProductWithIngredients(item.productId);
      if (!product || !product.ingredients.length) continue;
      
      // Reduce inventory for each ingredient
      for (const ingredient of product.ingredients) {
        await this.createInventoryTransaction({
          inventoryId: ingredient.inventoryId,
          type: 'use',
          quantity: ingredient.quantity * item.quantity,
          note: `ใช้ในออเดอร์ #${orderId}`,
          orderId
        });
      }
    }
    
    return true;
  }
  
  // Get low stock items
  async getLowStockItems(): Promise<Inventory[]> {
    return Array.from(this.inventory.values())
      .filter(item => item.quantity <= item.minimumLevel);
  }
  
  // Categories
  async getAllCategories(): Promise<string[]> {
    return Array.from(this.categories);
  }
  
  async addCategory(category: string): Promise<boolean> {
    if (this.categories.has(category)) return false;
    this.categories.add(category);
    return true;
  }
  
  async updateCategory(oldCategory: string, newCategory: string): Promise<boolean> {
    if (!this.categories.has(oldCategory) || this.categories.has(newCategory)) return false;
    
    this.categories.delete(oldCategory);
    this.categories.add(newCategory);
    
    // Update products with this category
    for (const [id, product] of this.products.entries()) {
      if (product.category === oldCategory) {
        this.products.set(id, { ...product, category: newCategory });
      }
    }
    
    return true;
  }
  
  async deleteCategory(category: string): Promise<boolean> {
    if (!this.categories.has(category)) return false;
    
    // Check if any products are using this category
    const productsUsingCategory = Array.from(this.products.values())
      .some(product => product.category === category && product.active);
    
    if (productsUsingCategory) return false;
    
    this.categories.delete(category);
    return true;
  }
  
  // Customization Types
  async getAllCustomizationTypes(): Promise<string[]> {
    return Array.from(this.customizationTypes);
  }
  
  async getCustomizationTypeLabels(): Promise<Record<string, string>> {
    // ตั้งค่าชื่อแสดงผลเริ่มต้นสำหรับหมวดหมู่พื้นฐาน
    const defaultLabels: Record<string, string> = {
      'sugar_level': 'ระดับความหวาน',
      'milk_type': 'ชนิดนม',
      'temperature': 'ประเภทเครื่องดื่ม',
      'toppings': 'ท็อปปิ้ง',
      'extras': 'เพิ่มพิเศษ'
    };
    
    // ในอนาคตอาจมีการเก็บข้อมูลนี้ในฐานข้อมูล
    // แต่ตอนนี้เรายังไม่มีฐานข้อมูลสำหรับเก็บชื่อแสดงผล จึงใช้ค่าเริ่มต้น
    
    return defaultLabels;
  }
  
  async addCustomizationType(type: string): Promise<boolean> {
    if (this.customizationTypes.has(type)) return false;
    this.customizationTypes.add(type);
    return true;
  }
  
  async updateCustomizationType(oldType: string, newType: string): Promise<boolean> {
    if (!this.customizationTypes.has(oldType) || this.customizationTypes.has(newType)) return false;
    
    this.customizationTypes.delete(oldType);
    this.customizationTypes.add(newType);
    
    // Update customization options with this type
    for (const [id, option] of this.customizationOptions.entries()) {
      if (option.type === oldType) {
        this.customizationOptions.set(id, { ...option, type: newType });
      }
    }
    
    return true;
  }
  
  async deleteCustomizationType(type: string): Promise<boolean> {
    if (!this.customizationTypes.has(type)) return false;
    
    // Check if any customization options are using this type
    const optionsUsingType = Array.from(this.customizationOptions.values())
      .some(option => option.type === type);
    
    if (optionsUsingType) return false;
    
    this.customizationTypes.delete(type);
    this.customizationTypeSettings.delete(type);
    return true;
  }
  
  // Customization type settings
  async getCustomizationTypeSettings(type: string): Promise<{ multipleSelection: boolean } | undefined> {
    return this.customizationTypeSettings.get(type);
  }
  
  async getAllCustomizationTypeSettings(): Promise<Record<string, { multipleSelection: boolean }>> {
    const settings: Record<string, { multipleSelection: boolean }> = {};
    for (const [type, setting] of this.customizationTypeSettings.entries()) {
      settings[type] = setting;
    }
    return settings;
  }
  
  async updateCustomizationTypeSettings(type: string, settings: { multipleSelection: boolean }): Promise<boolean> {
    if (!this.customizationTypes.has(type)) return false;
    this.customizationTypeSettings.set(type, settings);
    return true;
  }
  
  // Product Usage Report
  async getProductUsageReport(): Promise<{productId: number, productName: string, inventoryUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[]}[]> {
    const products = await this.getProducts();
    const result = [];
    
    for (const product of products) {
      const ingredients = await this.getProductIngredients(product.id);
      
      if (ingredients.length === 0) continue;
      
      const inventoryUsages = [];
      for (const ingredient of ingredients) {
        const inventory = await this.getInventoryItem(ingredient.inventoryId);
        if (inventory) {
          inventoryUsages.push({
            inventoryId: inventory.id,
            inventoryName: inventory.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit
          });
        }
      }
      
      if (inventoryUsages.length > 0) {
        result.push({
          productId: product.id,
          productName: product.name,
          inventoryUsage: inventoryUsages
        });
      }
    }
    
    return result;
  }
  
  // Member Points Calculation
  async calculatePointsForOrder(order: Order, items: OrderItem[]): Promise<number> {
    // ถ้าไม่มีการตั้งค่า point setting หรือไม่มี setting ที่ active อยู่ ให้คืนค่า 0
    const pointSetting = await this.getActivePointSetting();
    if (!pointSetting) {
      return 0;
    }
    
    // ถ้าไม่มีลูกค้าที่เป็นสมาชิก ให้คืนค่า 0
    if (!order.customerId) {
      return 0;
    }
    
    let pointsEarned = 0;
    
    // คำนวณแต้มตามประเภทการคำนวณ
    switch(pointSetting.pointCalculationType) {
      case 'amount': // ตามยอดเงิน
        if (order.total >= (pointSetting.minimumAmount || 0)) {
          // สูตร: ยอดเงิน / อัตราแลกเปลี่ยน = จำนวนแต้ม
          pointsEarned = Math.floor(order.total / pointSetting.pointRatio);
        }
        break;
        
      case 'order': // ต่อการสั่ง 1 ครั้ง
        pointsEarned = pointSetting.pointRatio;
        break;
        
      case 'item': // ต่อจำนวนรายการ
        // ถ้ามีการกำหนดสินค้าเฉพาะ
        if (pointSetting.applicableProducts && Array.isArray(pointSetting.applicableProducts)) {
          const applicableProducts = pointSetting.applicableProducts as number[];
          // นับเฉพาะจำนวนรายการที่อยู่ในรายการที่กำหนด
          let itemCount = 0;
          for (const item of items) {
            if (applicableProducts.includes(item.productId)) {
              itemCount += item.quantity;
            }
          }
          pointsEarned = Math.floor(itemCount * pointSetting.pointRatio);
        } else {
          // นับทุกรายการ
          const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
          pointsEarned = Math.floor(totalItems * pointSetting.pointRatio);
        }
        break;
    }
    
    return pointsEarned;
  }
}

// Import the DatabaseStorage class
import { DatabaseStorage } from './databaseStorage';

// Create a PostgreSQL session store
const PostgresSessionStore = connectPg(session);

// ตรวจสอบว่ามีตัวแปรแวดล้อม USE_MEMORY_STORAGE หรือ DATABASE_CONNECTION_ERROR ที่กำหนดให้ใช้ memory storage หรือไม่
// หรือตรวจสอบว่ามีปัญหาการเชื่อมต่อฐานข้อมูลหรือไม่
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true' || process.env.DATABASE_CONNECTION_ERROR === 'true';

// ใช้ MemStorage สำหรับการทดสอบหรือเมื่อมีปัญหาการเชื่อมต่อฐานข้อมูล
// หรือใช้ DatabaseStorage สำหรับเก็บข้อมูลถาวรใน PostgreSQL
export const storage = useMemoryStorage ? new MemStorage() : new DatabaseStorage();