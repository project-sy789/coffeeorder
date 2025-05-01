/**
 * ไฟล์นี้ใช้สำหรับแทนที่ MemStorage ด้วย DatabaseStorage
 * ที่เชื่อมต่อกับฐานข้อมูล PostgreSQL ผ่าน Drizzle ORM
 */

import { 
  Product, InsertProduct, 
  User, InsertUser, 
  CustomizationOption, InsertCustomizationOption,
  Member, InsertMember,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Setting, InsertSetting,
  Inventory, InsertInventory,
  Promotion, InsertPromotion,
  PointSetting, InsertPointSetting,
  PointRedemptionRule, InsertPointRedemptionRule,
  ProductIngredient, InsertProductIngredient,
  InventoryTransaction, InsertInventoryTransaction,
  OrderWithItems, ProductWithIngredients
} from "@shared/schema";

import { db } from "./db";
import { eq, and, gte, lte, desc, asc, like, inArray, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { IStorage } from "./storage";
import * as bcrypt from 'bcrypt';

/**
 * DatabaseStorage - ใช้ Drizzle ORM เชื่อมต่อกับฐานข้อมูล PostgreSQL
 * แทนที่ MemStorage เพื่อจัดเก็บข้อมูลแบบถาวร
 */
export class DatabaseStorage implements IStorage {
  
  // ===== Database Connection =====
  
  async checkDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // ทดสอบการเชื่อมต่อโดยดึงข้อมูลง่ายๆ
      // ใช้ SQL query โดยตรงเพื่อหลีกเลี่ยงปัญหา limit is not a function
      await sql`SELECT 1 as value`.run(db);
      return { success: true };
    } catch (error: any) {
      console.error('Database connection check failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown database error'
      };
    }
  }
  
  // ทดสอบการเชื่อมต่อฐานข้อมูลที่กำหนดเอง
  async testCustomConnection(connectionString: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ใช้ sql query โดยตรงเพื่อทดสอบการเชื่อมต่อ
      const { Pool } = require('pg');
      const testPool = new Pool({ connectionString });
      
      try {
        const client = await testPool.connect();
        await client.query('SELECT 1 as value');
        client.release();
        await testPool.end();
        return { success: true };
      } catch (dbError: any) {
        await testPool.end();
        console.error('Custom database connection failed:', dbError);
        return {
          success: false,
          error: dbError.message || 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้'
        };
      }
    } catch (error: any) {
      console.error('Error in testCustomConnection:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ'
      };
    }
  }
  
  // ===== Users =====
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(schema.users).where(eq(schema.users.role, role));
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set(user)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }
  
  // ===== Settings =====
  
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(schema.settings);
  }
  
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    return setting;
  }
  
  async createSetting(setting: InsertSetting): Promise<Setting> {
    const [newSetting] = await db.insert(schema.settings).values(setting).returning();
    return newSetting;
  }
  
  async updateSetting(id: number, setting: Partial<Setting>): Promise<Setting | undefined> {
    const [updatedSetting] = await db
      .update(schema.settings)
      .set(setting)
      .where(eq(schema.settings.id, id))
      .returning();
    return updatedSetting;
  }
  
  async createOrUpdateSetting(key: string, value: string, description: string | null = null): Promise<Setting> {
    // ตรวจสอบว่ามีการตั้งค่านี้อยู่แล้วหรือไม่
    const existingSetting = await this.getSetting(key);
    
    if (existingSetting) {
      // อัปเดตการตั้งค่าที่มีอยู่
      const [updatedSetting] = await db
        .update(schema.settings)
        .set({ value, description })
        .where(eq(schema.settings.id, existingSetting.id))
        .returning();
      return updatedSetting;
    } else {
      // สร้างการตั้งค่าใหม่
      return await this.createSetting({ key, value, description });
    }
  }
  
  // ===== Products =====
  
  async getProducts(): Promise<Product[]> {
    return await db.select().from(schema.products);
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return product;
  }
  
  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(schema.products).where(eq(schema.products.category, category));
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(schema.products).values({...product, active: true}).returning();
    return newProduct;
  }
  
  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(schema.products)
      .set(product)
      .where(eq(schema.products.id, id))
      .returning();
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(schema.products).where(eq(schema.products.id, id));
    return result.rowCount > 0;
  }
  
  async getProductWithIngredients(id: number): Promise<ProductWithIngredients | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const ingredients = await this.getProductIngredients(id);
    
    return {
      ...product,
      ingredients
    };
  }
  
  // ===== Customization Options =====
  
  async getCustomizationOptions(): Promise<CustomizationOption[]> {
    return await db.select().from(schema.customizationOptions);
  }
  
  async getCustomizationOption(id: number): Promise<CustomizationOption | undefined> {
    const [option] = await db.select().from(schema.customizationOptions).where(eq(schema.customizationOptions.id, id));
    return option;
  }
  
  async getCustomizationOptionsByType(type: string): Promise<CustomizationOption[]> {
    return await db.select().from(schema.customizationOptions).where(eq(schema.customizationOptions.type, type));
  }
  
  async createCustomizationOption(option: InsertCustomizationOption): Promise<CustomizationOption> {
    const [newOption] = await db.insert(schema.customizationOptions).values(option).returning();
    return newOption;
  }
  
  async updateCustomizationOption(id: number, option: Partial<CustomizationOption>): Promise<CustomizationOption | undefined> {
    const [updatedOption] = await db
      .update(schema.customizationOptions)
      .set(option)
      .where(eq(schema.customizationOptions.id, id))
      .returning();
    return updatedOption;
  }
  
  async deleteCustomizationOption(id: number): Promise<boolean> {
    const result = await db.delete(schema.customizationOptions).where(eq(schema.customizationOptions.id, id));
    return result.rowCount > 0;
  }
  
  // ===== Members =====
  
  async getMembers(): Promise<Member[]> {
    return await db.select().from(schema.members);
  }
  
  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.id, id));
    return member;
  }
  
  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    const [member] = await db.select().from(schema.members).where(eq(schema.members.phone, phone));
    return member;
  }
  
  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db.insert(schema.members).values(member).returning();
    return newMember;
  }
  
  async updateMember(id: number, member: Partial<Member>): Promise<Member | undefined> {
    const [updatedMember] = await db
      .update(schema.members)
      .set(member)
      .where(eq(schema.members.id, id))
      .returning();
    return updatedMember;
  }
  
  async addMemberPoints(id: number, points: number): Promise<Member | undefined> {
    const member = await this.getMember(id);
    if (!member) return undefined;
    
    const [updatedMember] = await db
      .update(schema.members)
      .set({ points: member.points + points })
      .where(eq(schema.members.id, id))
      .returning();
    
    return updatedMember;
  }
  
  // ===== Orders =====
  
  async getOrders(): Promise<Order[]> {
    return await db.select().from(schema.orders).orderBy(desc(schema.orders.orderDate));
  }
  
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    return order;
  }
  
  async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
    
    return {
      ...order,
      items
    };
  }
  
  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    console.log(`Searching orders between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    const orders = await db.select()
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.orderDate, startDate),
          lte(schema.orders.orderDate, endDate)
        )
      )
      .orderBy(desc(schema.orders.orderDate));
    
    console.log(`Found ${orders.length} orders in date range`);
    return orders;
  }
  
  private formatDateForOrderCode(date: Date): string {
    return date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
  }
  
  private async generateOrderCode(date: Date): Promise<string> {
    const dateCode = this.formatDateForOrderCode(date);
    
    // หาจำนวนออร์เดอร์ในวันนี้เพื่อสร้างเลขออร์เดอร์
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const ordersToday = await this.getOrdersByDateRange(startOfDay, endOfDay);
    const dailyOrderCount = ordersToday.length + 1;
    
    return `${dateCode}-${String(dailyOrderCount).padStart(3, '0')}`;
  }
  
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    // สร้างรหัสออร์เดอร์
    const orderCode = await this.generateOrderCode(new Date());
    
    // สร้างออร์เดอร์
    const [newOrder] = await db.insert(schema.orders)
      .values({
        ...order,
        orderCode,
        orderDate: new Date()
      })
      .returning();
    
    // เพิ่มรายการสินค้า
    for (const item of items) {
      await db.insert(schema.orderItems)
        .values({
          ...item,
          orderId: newOrder.id
        });
    }
    
    // ลดสินค้าในสต๊อกตามที่ใช้
    await this.processOrderInventoryChanges(newOrder.id);
    
    // ถ้ามีสมาชิกและคำสั่งซื้อเสร็จสมบูรณ์ ให้เพิ่มแต้ม
    if (newOrder.customerId && newOrder.status === 'completed') {
      const orderWithItems = await this.getOrderWithItems(newOrder.id);
      if (orderWithItems) {
        const points = await this.calculatePointsForOrder(newOrder, orderWithItems.items);
        await this.addMemberPoints(newOrder.customerId, points);
      }
    }
    
    return newOrder;
  }
  
  async updateOrderStatus(id: number, status: string, cancelReason?: string): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    
    const [updatedOrder] = await db
      .update(schema.orders)
      .set({ status, cancelReason })
      .where(eq(schema.orders.id, id))
      .returning();
    
    // ถ้าสถานะเปลี่ยนเป็นเสร็จสมบูรณ์และมีสมาชิก ให้เพิ่มแต้ม
    if (status === 'completed' && updatedOrder.customerId) {
      const orderWithItems = await this.getOrderWithItems(id);
      if (orderWithItems) {
        const points = await this.calculatePointsForOrder(updatedOrder, orderWithItems.items);
        await this.addMemberPoints(updatedOrder.customerId, points);
      }
    }
    
    return updatedOrder;
  }
  
  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(schema.orders)
      .set(orderData)
      .where(eq(schema.orders.id, id))
      .returning();
    
    return updatedOrder;
  }
  
  // ===== Inventory =====
  
  async getInventoryItems(): Promise<Inventory[]> {
    return await db.select().from(schema.inventory);
  }
  
  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id));
    return item;
  }
  
  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(schema.inventory).values(item).returning();
    return newItem;
  }
  
  async updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined> {
    const [updatedItem] = await db
      .update(schema.inventory)
      .set(item)
      .where(eq(schema.inventory.id, id))
      .returning();
    
    return updatedItem;
  }
  
  // ===== Promotions =====
  
  async getPromotions(): Promise<Promotion[]> {
    return await db.select().from(schema.promotions);
  }
  
  async getPromotion(id: number): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(schema.promotions).where(eq(schema.promotions.id, id));
    return promotion;
  }
  
  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const [newPromotion] = await db.insert(schema.promotions).values(promotion).returning();
    return newPromotion;
  }
  
  async updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined> {
    const [updatedPromotion] = await db
      .update(schema.promotions)
      .set(promotion)
      .where(eq(schema.promotions.id, id))
      .returning();
    
    return updatedPromotion;
  }
  
  async deletePromotion(id: number): Promise<boolean> {
    const result = await db.delete(schema.promotions).where(eq(schema.promotions.id, id));
    return result.rowCount > 0;
  }
  
  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    
    return await db.select()
      .from(schema.promotions)
      .where(
        and(
          lte(schema.promotions.startDate, now),
          gte(schema.promotions.endDate, now),
          eq(schema.promotions.active, true)
        )
      );
  }
  
  // ===== Point Settings =====
  
  async getPointSettings(): Promise<PointSetting[]> {
    return await db.select().from(schema.pointSettings);
  }
  
  async getActivePointSetting(): Promise<PointSetting | undefined> {
    const [setting] = await db.select()
      .from(schema.pointSettings)
      .where(eq(schema.pointSettings.active, true))
      .orderBy(desc(schema.pointSettings.id))
      .limit(1);
    
    return setting;
  }
  
  async createPointSetting(setting: InsertPointSetting): Promise<PointSetting> {
    // ยกเลิกการใช้งานตัวเก่าทั้งหมด
    if (setting.active) {
      await db
        .update(schema.pointSettings)
        .set({ active: false })
        .where(eq(schema.pointSettings.active, true));
    }
    
    const [newSetting] = await db.insert(schema.pointSettings).values(setting).returning();
    return newSetting;
  }
  
  async updatePointSetting(id: number, setting: Partial<PointSetting>): Promise<PointSetting | undefined> {
    // ยกเลิกการใช้งานตัวเก่าทั้งหมดถ้าตั้งค่าใหม่เป็น active
    if (setting.active) {
      await db
        .update(schema.pointSettings)
        .set({ active: false })
        .where(eq(schema.pointSettings.active, true));
    }
    
    const [updatedSetting] = await db
      .update(schema.pointSettings)
      .set(setting)
      .where(eq(schema.pointSettings.id, id))
      .returning();
    
    return updatedSetting;
  }
  
  async deletePointSetting(id: number): Promise<boolean> {
    const result = await db.delete(schema.pointSettings).where(eq(schema.pointSettings.id, id));
    return result.rowCount > 0;
  }
  
  // ===== Point Redemption Rules =====
  
  async getPointRedemptionRules(): Promise<PointRedemptionRule[]> {
    return await db.select().from(schema.pointRedemptionRules);
  }
  
  async getActivePointRedemptionRules(): Promise<PointRedemptionRule[]> {
    return await db.select()
      .from(schema.pointRedemptionRules)
      .where(eq(schema.pointRedemptionRules.active, true));
  }
  
  async getPointRedemptionRule(id: number): Promise<PointRedemptionRule | undefined> {
    const [rule] = await db.select().from(schema.pointRedemptionRules).where(eq(schema.pointRedemptionRules.id, id));
    return rule;
  }
  
  async createPointRedemptionRule(rule: InsertPointRedemptionRule): Promise<PointRedemptionRule> {
    const [newRule] = await db.insert(schema.pointRedemptionRules).values(rule).returning();
    return newRule;
  }
  
  async updatePointRedemptionRule(id: number, rule: Partial<PointRedemptionRule>): Promise<PointRedemptionRule | undefined> {
    const [updatedRule] = await db
      .update(schema.pointRedemptionRules)
      .set(rule)
      .where(eq(schema.pointRedemptionRules.id, id))
      .returning();
    
    return updatedRule;
  }
  
  async deletePointRedemptionRule(id: number): Promise<boolean> {
    const result = await db.delete(schema.pointRedemptionRules).where(eq(schema.pointRedemptionRules.id, id));
    return result.rowCount > 0;
  }
  
  async getAvailableRedemptionOptions(memberId: number, orderTotal: number): Promise<PointRedemptionRule[]> {
    const member = await this.getMember(memberId);
    if (!member) return [];
    
    const rules = await this.getActivePointRedemptionRules();
    
    return rules.filter(rule => {
      // ตรวจสอบว่าแต้มของสมาชิกมากกว่าหรือเท่ากับแต้มที่ต้องใช้
      if (member.points < rule.pointCost) return false;
      
      // ตรวจสอบว่ายอดสั่งซื้อมากกว่าหรือเท่ากับขั้นต่ำ
      if (orderTotal < rule.minimumOrderValue) return false;
      
      return true;
    });
  }
  
  // ===== Product Ingredients =====
  
  async getProductIngredients(productId: number): Promise<ProductIngredient[]> {
    return await db.select()
      .from(schema.productIngredients)
      .where(eq(schema.productIngredients.productId, productId));
  }
  
  async createProductIngredient(ingredient: InsertProductIngredient): Promise<ProductIngredient> {
    const [newIngredient] = await db.insert(schema.productIngredients).values(ingredient).returning();
    return newIngredient;
  }
  
  async updateProductIngredient(id: number, ingredient: Partial<ProductIngredient>): Promise<ProductIngredient | undefined> {
    const [updatedIngredient] = await db
      .update(schema.productIngredients)
      .set(ingredient)
      .where(eq(schema.productIngredients.id, id))
      .returning();
    
    return updatedIngredient;
  }
  
  async deleteProductIngredient(id: number): Promise<boolean> {
    const result = await db.delete(schema.productIngredients).where(eq(schema.productIngredients.id, id));
    return result.rowCount > 0;
  }
  
  // ===== Inventory Transactions =====
  
  async getInventoryTransactions(inventoryId?: number): Promise<InventoryTransaction[]> {
    if (inventoryId) {
      return await db.select()
        .from(schema.inventoryTransactions)
        .where(eq(schema.inventoryTransactions.inventoryId, inventoryId))
        .orderBy(desc(schema.inventoryTransactions.transactionDate));
    } else {
      return await db.select()
        .from(schema.inventoryTransactions)
        .orderBy(desc(schema.inventoryTransactions.transactionDate));
    }
  }
  
  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    // อัพเดตจำนวนในคลัง
    const inventory = await this.getInventoryItem(transaction.inventoryId);
    
    if (inventory) {
      let newQuantity = inventory.currentQuantity;
      
      if (transaction.type === 'add') {
        newQuantity += transaction.quantity;
      } else if (transaction.type === 'remove') {
        newQuantity -= transaction.quantity;
        
        // ตรวจสอบว่าพอสำหรับการใช้หรือไม่
        if (newQuantity < 0) {
          throw new Error(`ไม่มี ${inventory.name} เพียงพอในคลัง`);
        }
      }
      
      // อัพเดตจำนวนในคลัง
      await this.updateInventoryItem(inventory.id, { currentQuantity: newQuantity });
    }
    
    // บันทึกธุรกรรม
    const [newTransaction] = await db.insert(schema.inventoryTransactions)
      .values({
        ...transaction,
        transactionDate: new Date()
      })
      .returning();
    
    return newTransaction;
  }
  
  async processOrderInventoryChanges(orderId: number): Promise<boolean> {
    const orderWithItems = await this.getOrderWithItems(orderId);
    if (!orderWithItems) return false;
    
    for (const item of orderWithItems.items) {
      // หาส่วนผสมของสินค้า
      const product = await this.getProductWithIngredients(item.productId);
      if (product && product.ingredients) {
        for (const ingredient of product.ingredients) {
          // สร้างธุรกรรมการใช้วัตถุดิบ
          try {
            await this.createInventoryTransaction({
              inventoryId: ingredient.inventoryId,
              quantity: ingredient.quantity * item.quantity,
              type: 'remove',
              description: `ใช้ใน Order #${orderWithItems.orderCode} (${product.name})`,
              staffId: orderWithItems.staffId,
              relatedOrderId: orderId
            });
          } catch (error) {
            console.error(`Failed to process inventory for order ${orderId}:`, error);
            // ไม่ยกเลิกคำสั่งซื้อ แต่บันทึกความผิดพลาด
          }
        }
      }
    }
    
    return true;
  }
  
  // ===== Categories =====
  
  async getAllCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: schema.products.category })
      .from(schema.products)
      .where(sql`${schema.products.category} is not null`);
    
    return result.map(row => row.category);
  }
  
  async addCategory(category: string): Promise<boolean> {
    // ตรวจสอบว่ามีหมวดหมู่นี้แล้วหรือไม่
    const categories = await this.getAllCategories();
    if (categories.includes(category)) {
      return false; // มีหมวดหมู่นี้แล้ว
    }
    
    // ในฐานข้อมูลจริง ต้องสร้างตาราง categories
    // สำหรับตอนนี้เราจะสมมติว่ามี
    return true;
  }
  
  async updateCategory(oldCategory: string, newCategory: string): Promise<boolean> {
    // อัพเดตชื่อหมวดหมู่ในสินค้าทั้งหมด
    const result = await db
      .update(schema.products)
      .set({ category: newCategory })
      .where(eq(schema.products.category, oldCategory));
    
    return result.rowCount > 0;
  }
  
  async deleteCategory(category: string): Promise<boolean> {
    // ลบหมวดหมู่ (ตั้งค่าเป็น null) ในสินค้าทั้งหมด
    const result = await db
      .update(schema.products)
      .set({ category: null })
      .where(eq(schema.products.category, category));
    
    return result.rowCount > 0;
  }
  
  // ===== Customization Types =====
  
  async getAllCustomizationTypes(): Promise<string[]> {
    const result = await db.selectDistinct({ type: schema.customizationOptions.type })
      .from(schema.customizationOptions)
      .orderBy(asc(schema.customizationOptions.type));
    
    return result.map(row => row.type);
  }
  
  async getCustomizationTypeLabels(): Promise<Record<string, string>> {
    // สมมติว่ามีตาราง customization_type_labels
    // ในสถานการณ์จริงต้องสร้างตารางนี้
    
    const labels: Record<string, string> = {
      'sugar_level': 'ระดับความหวาน',
      'milk_type': 'ชนิดนม',
      'temperature': 'อุณหภูมิ',
      'toppings': 'ท็อปปิ้ง',
      'extras': 'เพิ่มพิเศษ'
    };
    
    return labels;
  }
  
  async addCustomizationType(type: string): Promise<boolean> {
    // ตรวจสอบว่ามีประเภทนี้แล้วหรือไม่
    const types = await this.getAllCustomizationTypes();
    if (types.includes(type)) {
      return false; // มีประเภทนี้แล้ว
    }
    
    return true;
  }
  
  async updateCustomizationType(oldType: string, newType: string): Promise<boolean> {
    // อัพเดตชื่อประเภทในตัวเลือกทั้งหมด
    const result = await db
      .update(schema.customizationOptions)
      .set({ type: newType })
      .where(eq(schema.customizationOptions.type, oldType));
    
    return result.rowCount > 0;
  }
  
  async deleteCustomizationType(type: string): Promise<boolean> {
    // ลบตัวเลือกทั้งหมดในประเภทนี้
    const result = await db
      .delete(schema.customizationOptions)
      .where(eq(schema.customizationOptions.type, type));
    
    return result.rowCount > 0;
  }
  
  // ===== Customization Type Settings =====
  
  async getCustomizationTypeSettings(type: string): Promise<{ multipleSelection: boolean } | undefined> {
    // สมมติว่ามีตาราง customization_type_settings
    // ในสถานการณ์จริงต้องสร้างตารางนี้
    
    const settings: Record<string, { multipleSelection: boolean }> = {
      'sugar_level': { multipleSelection: false },
      'milk_type': { multipleSelection: false },
      'temperature': { multipleSelection: false },
      'toppings': { multipleSelection: true },
      'extras': { multipleSelection: true }
    };
    
    return settings[type];
  }
  
  async getAllCustomizationTypeSettings(): Promise<Record<string, { multipleSelection: boolean }>> {
    // สมมติว่ามีตาราง customization_type_settings
    // ในสถานการณ์จริงต้องสร้างตารางนี้
    
    const settings: Record<string, { multipleSelection: boolean }> = {
      'sugar_level': { multipleSelection: false },
      'milk_type': { multipleSelection: false },
      'temperature': { multipleSelection: false },
      'toppings': { multipleSelection: true },
      'extras': { multipleSelection: true }
    };
    
    return settings;
  }
  
  async updateCustomizationTypeSettings(type: string, settings: { multipleSelection: boolean }): Promise<boolean> {
    // สมมติว่ามีตาราง customization_type_settings
    // ในสถานการณ์จริงต้องสร้างตารางนี้
    
    return true;
  }
  
  // ===== Analytics =====
  
  async getDailySales(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const orders = await db.select()
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.orderDate, startOfDay),
          lte(schema.orders.orderDate, endOfDay),
          eq(schema.orders.status, 'completed')
        )
      );
    
    return orders.reduce((total, order) => total + order.totalAmount, 0);
  }
  
  async getPopularProducts(limit: number): Promise<{productId: number, productName: string, count: number}[]> {
    // การใช้ raw SQL เพื่อการรวมข้อมูลที่ซับซ้อน
    const result = await db.execute(sql`
      SELECT oi.product_id AS "productId", p.name AS "productName", COUNT(*) AS count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
      GROUP BY oi.product_id, p.name
      ORDER BY count DESC
      LIMIT ${limit}
    `);
    
    return result.rows.map(row => ({
      productId: row.productId,
      productName: row.productName,
      count: parseInt(row.count)
    }));
  }
  
  async getLowStockItems(): Promise<Inventory[]> {
    return await db.select()
      .from(schema.inventory)
      .where(sql`current_quantity <= minimum_quantity`);
  }
  
  async getProductUsageReport(): Promise<{productId: number, productName: string, inventoryUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[]}[]> {
    const report: {productId: number, productName: string, inventoryUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[]}[] = [];
    
    const products = await this.getProducts();
    
    for (const product of products) {
      const ingredientUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[] = [];
      
      // หาส่วนผสมของสินค้า
      const productWithIngredients = await this.getProductWithIngredients(product.id);
      
      if (productWithIngredients && productWithIngredients.ingredients) {
        for (const ingredient of productWithIngredients.ingredients) {
          const inventory = await this.getInventoryItem(ingredient.inventoryId);
          
          if (inventory) {
            ingredientUsage.push({
              inventoryId: inventory.id,
              inventoryName: inventory.name,
              quantity: ingredient.quantity,
              unit: inventory.unit
            });
          }
        }
      }
      
      report.push({
        productId: product.id,
        productName: product.name,
        inventoryUsage: ingredientUsage
      });
    }
    
    return report;
  }
  
  // ===== Points Calculation =====
  
  async calculatePointsForOrder(order: Order, items: OrderItem[]): Promise<number> {
    // ตรวจสอบการตั้งค่าคะแนน
    const pointSetting = await this.getActivePointSetting();
    if (!pointSetting) return 0;
    
    // คำนวณคะแนน
    const amount = order.totalAmount - order.discountAmount;
    const points = Math.floor(amount / pointSetting.spendingPerPoint);
    
    return points;
  }
}