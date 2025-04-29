import * as admin from 'firebase-admin';
import {
  InsertSetting, Setting,
  InsertUser, User,
  InsertProduct, Product,
  InsertCustomizationOption, CustomizationOption,
  InsertMember, Member,
  InsertOrder, Order,
  InsertOrderItem, OrderItem,
  InsertPromotion, Promotion,
  InsertInventory, Inventory,
  InsertProductIngredient, ProductIngredient,
  InsertInventoryTransaction, InventoryTransaction,
  OrderWithItems,
  ProductWithIngredients
} from '../../shared/schema';
import * as bcrypt from 'bcrypt';

export interface IStorage {
  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: number, setting: Partial<Setting>): Promise<Setting | undefined>;
  
  // Users
  getUsers(): Promise<User[]>;
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
  
  // Analytics
  getDailySales(date: Date): Promise<number>;
  getPopularProducts(limit: number): Promise<{productId: number, productName: string, count: number}[]>;
  getLowStockItems(): Promise<Inventory[]>;
  getProductUsageReport(): Promise<{productId: number, productName: string, inventoryUsage: {inventoryId: number, inventoryName: string, quantity: number, unit: string}[]}[]>;
}

export class FirestoreStorage implements IStorage {
  private firestore: admin.firestore.Firestore;
  
  constructor() {
    this.firestore = admin.firestore();
    // this.initializeSampleData(); // You might want to comment this out in production
  }

  // แปลงเมธอดทั้งหมดจาก MemStorage เป็น FirestoreStorage โดยใช้ Firestore API
  // ตัวอย่างเช่น:
  
  async getSettings(): Promise<Setting[]> {
    const snapshot = await this.firestore.collection('settings').get();
    return snapshot.docs.map(doc => ({ 
      id: parseInt(doc.id), 
      ...doc.data() 
    } as Setting));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const snapshot = await this.firestore.collection('settings')
      .where('key', '==', key)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return undefined;
    }
    
    const doc = snapshot.docs[0];
    return { 
      id: parseInt(doc.id), 
      ...doc.data() 
    } as Setting;
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    // Get a new ID
    const idDoc = await this.firestore.collection('counters').doc('settings').get();
    let nextId = 1;
    
    if (idDoc.exists) {
      nextId = (idDoc.data()?.nextId || 0) + 1;
      await idDoc.ref.update({ nextId });
    } else {
      await this.firestore.collection('counters').doc('settings').set({ nextId: 1 });
    }
    
    // Create the setting
    const newSetting: Setting = { ...setting, id: nextId };
    await this.firestore.collection('settings').doc(nextId.toString()).set(newSetting);
    
    return newSetting;
  }

  async updateSetting(id: number, setting: Partial<Setting>): Promise<Setting | undefined> {
    const docRef = this.firestore.collection('settings').doc(id.toString());
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return undefined;
    }
    
    const updatedSetting = { ...doc.data(), ...setting } as Setting;
    await docRef.update(setting);
    
    return updatedSetting;
  }

  // ต้องเพิ่มเมธอดอื่นๆ ทั้งหมด...
  // ...
  
  private async initializeSampleData() {
    // Sample data initialization similar to MemStorage
    // ...
  }
}

let storageInstance: IStorage;

export function setupFirestoreStorage() {
  if (!storageInstance) {
    storageInstance = new FirestoreStorage();
  }
}

export const storage: IStorage = new FirestoreStorage();