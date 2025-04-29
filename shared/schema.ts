import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System settings (for PromptPay and other configurations)
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});

// Users (staff and admins)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // staff, admin
  active: boolean("active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  active: true,
});

// Products (menu items)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: doublePrecision("price").notNull(),
  image: text("image").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  active: true,
});

// Customization options
export const customizationOptions = pgTable("customization_options", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // type, sugar_level, milk_type, topping
  price: doublePrecision("price").default(0),
  isDefault: boolean("is_default").default(false),
});

export const insertCustomizationOptionSchema = createInsertSchema(customizationOptions).omit({
  id: true,
});

// Members (customers)
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  points: integer("points").notNull().default(0),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  points: true,
  registeredAt: true,
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code"), // รหัสคำสั่งซื้อรูปแบบใหม่ YYYYMMDD-XXX
  customerId: integer("customer_id"), // null means non-member
  staffId: integer("staff_id").notNull(),
  total: doublePrecision("total").notNull(),
  discount: doublePrecision("discount").notNull().default(0),
  promotionCode: text("promotion_code"), // เพิ่มฟิลด์สำหรับเก็บรหัสโปรโมชั่น
  paymentMethod: text("payment_method").notNull(), // cash, qr_code
  status: text("status").notNull().default("pending"), // pending, preparing, ready, completed, cancelled
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: doublePrecision("price").notNull(),
  customizations: jsonb("customizations"), // Store selected customizations as JSON
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Promotions
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // percentage, fixed, or points
  value: doublePrecision("value").notNull(),
  discountValue: doublePrecision("discount_value"), // มูลค่าส่วนลดสำหรับโปรโมชั่นแบบแต้ม (ใช้เมื่อ type เป็น 'points')
  code: text("code"),
  minimumOrder: doublePrecision("minimum_order").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  applicableProducts: jsonb("applicable_products").default([]),
  usageLimit: integer("usage_limit").default(0), // 0 หมายถึงไม่จำกัดจำนวนการใช้
  usedCount: integer("used_count").default(0), // จำนวนครั้งที่ถูกใช้ไปแล้ว
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// การตั้งค่าแต้มสมาชิก
export const pointSettings = pgTable("point_settings", {
  id: serial("id").primaryKey(),
  pointCalculationType: text("point_calculation_type").notNull(), // amount (ตามยอดซื้อ), order (ต่อคำสั่งซื้อ), item (ต่อรายการ)
  pointRatio: doublePrecision("point_ratio").notNull(), // จำนวนแต้มต่อหน่วย (เช่น 1 แต้มต่อทุก 10 บาท, 1 แต้มต่อการสั่ง 1 ครั้ง, หรือ 1 แต้มต่อการสั่ง 1 รายการ)
  minimumAmount: doublePrecision("minimum_amount").default(0), // ยอดซื้อขั้นต่ำที่จะได้รับแต้ม (สำหรับคำนวณ amount)
  applicableProducts: jsonb("applicable_products").default([]), // รายการสินค้าที่สามารถรับแต้มสะสมได้ (ถ้าว่างคือทุกรายการ)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
});



// Inventory items
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  unit: text("unit").notNull(), // g, kg, ml, l, pcs
  reorderLevel: doublePrecision("reorder_level").notNull(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
});

// Types
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CustomizationOption = typeof customizationOptions.$inferSelect;
export type InsertCustomizationOption = z.infer<typeof insertCustomizationOptionSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

// เพิ่ม insert schema สำหรับ pointSettings
export const insertPointSettingSchema = createInsertSchema(pointSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PointSetting = typeof pointSettings.$inferSelect;
export type InsertPointSetting = z.infer<typeof insertPointSettingSchema>;

// Product Ingredients - connection between products and inventory items
export const productIngredients = pgTable("product_ingredients", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  inventoryId: integer("inventory_id").notNull(),
  quantityUsed: doublePrecision("quantity_used").notNull(),
});

export const insertProductIngredientSchema = createInsertSchema(productIngredients).omit({
  id: true,
});

// Inventory Transactions (for tracking stock changes)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  type: text("type").notNull(), // receive, use, adjustment
  quantity: doublePrecision("quantity").notNull(),
  notes: text("notes"),
  orderId: integer("order_id"), // If related to an order
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(), // User ID who made the transaction
});

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

// Types for product ingredients and inventory transactions
export type ProductIngredient = typeof productIngredients.$inferSelect;
export type InsertProductIngredient = z.infer<typeof insertProductIngredientSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

// Order with items relationship
export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
};

// Product with ingredients relationship
export type ProductWithIngredients = Product & {
  ingredients: (ProductIngredient & { inventory: Inventory })[];
};

// Point Redemption Rules - กฎการแลกแต้ม
export const pointRedemptionRules = pgTable("point_redemption_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pointCost: integer("point_cost").notNull(), // จำนวนแต้มที่ต้องใช้
  discountValue: doublePrecision("discount_value").notNull(), // มูลค่าส่วนลดที่ได้รับ (บาท)
  discountType: text("discount_type").notNull().default("fixed"), // fixed (บาทส่วนลด) หรือ percentage (เปอร์เซ็นต์ส่วนลด)
  minimumOrder: doublePrecision("minimum_order").default(0), // ยอดขั้นต่ำที่สามารถใช้แต้มได้
  maximumDiscount: doublePrecision("maximum_discount"), // ส่วนลดสูงสุดที่ได้รับ (สำหรับ percentage)
  applicableProducts: jsonb("applicable_products").default([]), // สินค้าที่สามารถใช้ได้ (ค่าว่างคือใช้ได้ทุกรายการ)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPointRedemptionRuleSchema = createInsertSchema(pointRedemptionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PointRedemptionRule = typeof pointRedemptionRules.$inferSelect;
export type InsertPointRedemptionRule = z.infer<typeof insertPointRedemptionRuleSchema>;
