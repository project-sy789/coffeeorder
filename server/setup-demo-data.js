/**
 * สคริปต์สำหรับตั้งค่าข้อมูลตัวอย่าง (demo data) ในฐานข้อมูล
 * ใช้สำหรับแสดงตัวอย่างการทำงานและการทดสอบระบบ
 */

// นำเข้าข้อมูลตัวอย่าง
import demoData from './demo-data.js';
// ใช้ dynamic import เพื่อความเข้ากันได้ดีกับ ESM
let storage;

// ฟังก์ชันสำหรับโหลด storage
async function loadStorage() {
  if (!storage) {
    try {
      const storageModule = await import('./storage.js');
      storage = storageModule.storage;
    } catch (error) {
      console.error("Error loading storage module:", error);
      throw new Error("Failed to load storage module");
    }
  }
  return storage;
}

// สีสำหรับแสดงข้อความในคอนโซล
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

/**
 * แสดงข้อความในคอนโซลพร้อมสี
 */
function log(message, color = colors.reset) {
  console.log(color, message, colors.reset);
}

/**
 * ตรวจสอบว่ามีข้อมูลในตารางหรือไม่
 * @param {string} table ชื่อตาราง
 * @returns {Promise<boolean>} มีข้อมูลหรือไม่
 */
async function hasData(table) {
  try {
    let result = false;
    
    switch (table) {
      case 'products':
        const products = await storage.getProducts();
        result = products && products.length > 0;
        break;
      case 'inventory':
        const inventory = await storage.getInventoryItems();
        result = inventory && inventory.length > 0;
        break;
      case 'customization_options':
        const options = await storage.getCustomizationOptions();
        result = options && options.length > 0;
        break;
      case 'categories':
        const categories = await storage.getAllCategories();
        result = categories && categories.length > 0;
        break;
      case 'customization_types':
        const types = await storage.getAllCustomizationTypes();
        result = types && types.length > 0;
        break;
      case 'members':
        const members = await storage.getMembers();
        result = members && members.length > 0;
        break;
      case 'promotions':
        const promotions = await storage.getPromotions();
        result = promotions && promotions.length > 0;
        break;
      case 'point_settings':
        const pointSettings = await storage.getPointSettings();
        result = pointSettings && pointSettings.length > 0;
        break;
      case 'point_redemption_rules':
        const pointRules = await storage.getPointRedemptionRules();
        result = pointRules && pointRules.length > 0;
        break;
      case 'orders':
        const orders = await storage.getOrders();
        result = orders && orders.length > 0;
        break;
      default:
        result = false;
    }
    
    return result;
  } catch (error) {
    console.error(`Error checking data in ${table}:`, error);
    return false;
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง settings
 */
async function setupSettings() {
  try {
    log("การตั้งค่าพื้นฐาน...", colors.cyan);
    await storage.createOrUpdateSetting('store_status', 'open', 'สถานะการเปิดให้บริการ (open/closed)');
    await storage.createOrUpdateSetting('promptpay_id', '0899999999', 'หมายเลขพร้อมเพย์สำหรับรับชำระเงิน');
    await storage.createOrUpdateSetting('promptpay_type', 'phone', 'ประเภทพร้อมเพย์ (phone/id)');
    log("✓ เพิ่มการตั้งค่าพื้นฐานเรียบร้อยแล้ว", colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มการตั้งค่าพื้นฐานได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง categories
 */
async function setupCategories() {
  try {
    if (await hasData('categories') && !force) {
      log("มีข้อมูลหมวดหมู่อยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มหมวดหมู่สินค้า...", colors.cyan);
    for (const category of demoData.categories) {
      await storage.addCategory(category);
    }
    log(`✓ เพิ่ม ${demoData.categories.length} หมวดหมู่เรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มหมวดหมู่ได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง customization_types
 */
async function setupCustomizationTypes() {
  try {
    if (await hasData('customization_types') && !force) {
      log("มีข้อมูลประเภทตัวเลือกการปรับแต่งอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มประเภทตัวเลือกการปรับแต่ง...", colors.cyan);
    for (const typeData of demoData.customizationTypes) {
      await storage.addCustomizationType(typeData.type);
      // ตั้งค่าการเลือกหลายรายการ
      await storage.updateCustomizationTypeSettings(typeData.type, {
        multipleSelection: typeData.multipleSelection
      });
    }
    log(`✓ เพิ่ม ${demoData.customizationTypes.length} ประเภทตัวเลือกการปรับแต่งเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มประเภทตัวเลือกการปรับแต่งได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง inventory
 */
async function setupInventory() {
  try {
    if (await hasData('inventory') && !force) {
      log("มีข้อมูลวัตถุดิบอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มวัตถุดิบ...", colors.cyan);
    for (const item of demoData.inventory) {
      await storage.createInventoryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        reorderLevel: item.reorderLevel
      });
    }
    log(`✓ เพิ่ม ${demoData.inventory.length} วัตถุดิบเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มวัตถุดิบได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง products
 */
async function setupProducts() {
  try {
    if (await hasData('products') && !force) {
      log("มีข้อมูลสินค้าอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มสินค้า...", colors.cyan);
    const productMap = new Map(); // เก็บ id ของสินค้าเพื่อใช้ในการเพิ่มความสัมพันธ์กับวัตถุดิบ
    
    for (const product of demoData.products) {
      const newProduct = await storage.createProduct({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
        active: product.active
      });
      productMap.set(product.name, newProduct.id);
    }
    log(`✓ เพิ่ม ${demoData.products.length} สินค้าเรียบร้อยแล้ว`, colors.green);
    
    // เพิ่มความสัมพันธ์ระหว่างสินค้าและวัตถุดิบ
    log("กำลังเพิ่มความสัมพันธ์ระหว่างสินค้าและวัตถุดิบ...", colors.cyan);
    const inventoryItems = await storage.getInventoryItems();
    const inventoryMap = new Map();
    inventoryItems.forEach(item => inventoryMap.set(item.name, item.id));
    
    for (const relation of demoData.productIngredients) {
      const productId = productMap.get(relation.productName);
      const inventoryId = inventoryMap.get(relation.inventoryName);
      
      if (productId && inventoryId) {
        await storage.createProductIngredient({
          productId,
          inventoryId,
          quantityUsed: relation.quantityUsed
        });
      }
    }
    log(`✓ เพิ่มความสัมพันธ์ระหว่างสินค้าและวัตถุดิบเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มสินค้าได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตัวอย่างสำหรับตาราง customization_options
 */
async function setupCustomizationOptions() {
  try {
    if (await hasData('customization_options') && !force) {
      log("มีข้อมูลตัวเลือกการปรับแต่งอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มตัวเลือกการปรับแต่ง...", colors.cyan);
    for (const option of demoData.customizationOptions) {
      await storage.createCustomizationOption({
        name: option.name,
        price: option.price,
        type: option.type,
        available: option.available
      });
    }
    log(`✓ เพิ่ม ${demoData.customizationOptions.length} ตัวเลือกการปรับแต่งเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มตัวเลือกการปรับแต่งได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลสมาชิกตัวอย่าง
 */
async function setupMembers() {
  try {
    if (await hasData('members') && !force) {
      log("มีข้อมูลสมาชิกอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มข้อมูลสมาชิกตัวอย่าง...", colors.cyan);
    for (const member of demoData.members) {
      await storage.createMember({
        name: member.name,
        phone: member.phone,
        email: member.email,
        points: member.points,
        birthdate: member.birthdate
      });
    }
    log(`✓ เพิ่ม ${demoData.members.length} สมาชิกเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มข้อมูลสมาชิกได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลโปรโมชั่นตัวอย่าง
 */
async function setupPromotions() {
  try {
    if (await hasData('promotions') && !force) {
      log("มีข้อมูลโปรโมชั่นอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มข้อมูลโปรโมชั่นตัวอย่าง...", colors.cyan);
    for (const promotion of demoData.promotions) {
      await storage.createPromotion({
        name: promotion.name,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        code: promotion.code,
        minimumOrder: promotion.minimumOrder,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        active: promotion.active,
        usageLimit: promotion.usageLimit,
        usedCount: promotion.usedCount,
        applicableProducts: promotion.applicableProducts
      });
    }
    log(`✓ เพิ่ม ${demoData.promotions.length} โปรโมชั่นเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มข้อมูลโปรโมชั่นได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลตั้งค่าคะแนนสะสมตัวอย่าง
 */
async function setupPointSettings() {
  try {
    if (await hasData('point_settings') && !force) {
      log("มีข้อมูลตั้งค่าคะแนนสะสมอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มข้อมูลตั้งค่าคะแนนสะสมตัวอย่าง...", colors.cyan);
    for (const setting of demoData.pointSettings) {
      await storage.createPointSetting({
        pointCalculationType: setting.pointCalculationType,
        pointRatio: setting.pointRatio,
        minimumAmount: setting.minimumAmount,
        active: setting.active,
        applicableProducts: setting.applicableProducts
      });
    }
    log(`✓ เพิ่มการตั้งค่าคะแนนสะสมเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มข้อมูลตั้งค่าคะแนนสะสมได้: ${error.message}`, colors.red);
  }
}

/**
 * เพิ่มข้อมูลกฎการแลกคะแนนตัวอย่าง
 */
async function setupPointRedemptionRules() {
  try {
    if (await hasData('point_redemption_rules') && !force) {
      log("มีข้อมูลกฎการแลกคะแนนอยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มข้อมูลกฎการแลกคะแนนตัวอย่าง...", colors.cyan);
    for (const rule of demoData.pointRedemptionRules) {
      await storage.createPointRedemptionRule({
        name: rule.name,
        pointCost: rule.pointCost,
        discountType: rule.discountType,
        discountValue: rule.discountValue,
        minimumOrder: rule.minimumOrder,
        maximumDiscount: rule.maximumDiscount,
        active: rule.active,
        applicableProducts: rule.applicableProducts
      });
    }
    log(`✓ เพิ่ม ${demoData.pointRedemptionRules.length} กฎการแลกคะแนนเรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มข้อมูลกฎการแลกคะแนนได้: ${error.message}`, colors.red);
  }
}

/**
 * สร้างข้อมูลออเดอร์ตัวอย่าง
 */
async function setupOrders() {
  try {
    if (await hasData('orders') && !force) {
      log("มีข้อมูลออเดอร์อยู่แล้ว ข้ามขั้นตอนนี้", colors.yellow);
      return;
    }
    
    log("กำลังเพิ่มข้อมูลออเดอร์ตัวอย่าง...", colors.cyan);
    
    // สร้างออเดอร์พร้อมรายการสั่งซื้อ
    for (const order of demoData.orders) {
      const { orderItems, ...orderData } = order;
      
      // สร้างออเดอร์ก่อน แล้วจึงสร้างรายการสั่งซื้อ
      const newOrder = await storage.createOrder(orderData, orderItems);
      
      log(`✓ สร้างออเดอร์ #${newOrder.id} สำเร็จ (${orderItems.length} รายการ)`, colors.green);
    }
    
    log(`✓ เพิ่ม ${demoData.orders.length} ออเดอร์เรียบร้อยแล้ว`, colors.green);
  } catch (error) {
    log(`✗ ไม่สามารถเพิ่มข้อมูลออเดอร์ได้: ${error.message}`, colors.red);
  }
}

/**
 * ตรวจสอบการมีอยู่ของข้อมูลและเพิ่มข้อมูลถ้ายังไม่มี
 */
let force = false;
async function setupDemoData(forceSetup = false) {
  // โหลด storage ก่อนใช้งาน
  try {
    storage = await loadStorage();
  } catch (err) {
    console.error("Error loading storage before setup:", err);
    throw new Error("Failed to load storage for demo data setup");
  }
  
  force = forceSetup;
  log("เริ่มต้นการตั้งค่าข้อมูลตัวอย่าง...", colors.bright + colors.blue);
  
  // เริ่มต้นเพิ่มข้อมูลตามลำดับ
  await setupSettings();
  await setupCategories();
  await setupCustomizationTypes();
  await setupInventory();
  await setupProducts();
  await setupCustomizationOptions();
  
  // เพิ่มข้อมูลส่วนที่ขาดหายไป
  await setupMembers();
  await setupPromotions();
  await setupPointSettings();
  await setupPointRedemptionRules();
  
  // เพิ่มออเดอร์ตัวอย่าง (ต้องเพิ่มหลังจากที่มีสินค้าและสมาชิกแล้ว)
  await setupOrders();
  
  log("การตั้งค่าข้อมูลตัวอย่างเสร็จสิ้น", colors.bright + colors.blue);
  return true;
}

// Export the function
export { setupDemoData };