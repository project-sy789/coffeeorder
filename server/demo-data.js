/**
 * ข้อมูลตัวอย่างสำหรับการติดตั้งระบบ POS คาเฟ่
 * ใช้เพื่อเป็นตัวอย่างในการเริ่มต้นใช้งานระบบ
 */

// ข้อมูลตัวอย่างหมวดหมู่สินค้า
const categories = [
  'กาแฟ',
  'ชา',
  'เครื่องดื่มผลไม้',
  'เครื่องดื่มเย็น',
  'ขนมหวาน',
  'เบเกอรี่'
];

// ประเภทตัวเลือกการปรับแต่ง
const customizationTypes = [
  { 
    type: 'ระดับความหวาน',
    label: 'ความหวาน',
    multipleSelection: false
  },
  { 
    type: 'ชนิดนม',
    label: 'นม',
    multipleSelection: false
  },
  { 
    type: 'ระดับความร้อน',
    label: 'อุณหภูมิ',
    multipleSelection: false
  },
  { 
    type: 'ท็อปปิ้ง',
    label: 'ท็อปปิ้ง',
    multipleSelection: true
  },
  { 
    type: 'เพิ่มเติม',
    label: 'เพิ่มเติม',
    multipleSelection: true
  }
];

// ข้อมูลตัวเลือกการปรับแต่ง
const customizationOptions = [
  // ระดับความหวาน
  {
    name: 'ไม่หวาน',
    price: 0,
    type: 'ระดับความหวาน',
    available: true
  },
  {
    name: 'หวานน้อย',
    price: 0,
    type: 'ระดับความหวาน',
    available: true
  },
  {
    name: 'หวานปกติ',
    price: 0,
    type: 'ระดับความหวาน',
    available: true
  },
  {
    name: 'หวานพิเศษ',
    price: 5,
    type: 'ระดับความหวาน',
    available: true
  },
  
  // ชนิดนม
  {
    name: 'ไม่ใส่นม',
    price: 0,
    type: 'ชนิดนม',
    available: true
  },
  {
    name: 'นมสด',
    price: 0,
    type: 'ชนิดนม',
    available: true
  },
  {
    name: 'นมข้นหวาน',
    price: 5,
    type: 'ชนิดนม',
    available: true
  },
  {
    name: 'นมถั่วเหลือง',
    price: 10,
    type: 'ชนิดนม',
    available: true
  },
  {
    name: 'นมอัลมอนด์',
    price: 15,
    type: 'ชนิดนม',
    available: true
  },
  
  // ระดับความร้อน
  {
    name: 'ร้อน',
    price: 0,
    type: 'ระดับความร้อน',
    available: true
  },
  {
    name: 'เย็น',
    price: 10,
    type: 'ระดับความร้อน',
    available: true
  },
  {
    name: 'ปั่น',
    price: 15,
    type: 'ระดับความร้อน',
    available: true
  },
  
  // ท็อปปิ้ง
  {
    name: 'วิปครีม',
    price: 10,
    type: 'ท็อปปิ้ง',
    available: true
  },
  {
    name: 'ฟองนม',
    price: 5,
    type: 'ท็อปปิ้ง',
    available: true
  },
  {
    name: 'ช็อกโกแลตชิพ',
    price: 10,
    type: 'ท็อปปิ้ง',
    available: true
  },
  {
    name: 'คาราเมล',
    price: 10,
    type: 'ท็อปปิ้ง',
    available: true
  },
  
  // เพิ่มเติม
  {
    name: 'เพิ่มช็อต',
    price: 20,
    type: 'เพิ่มเติม',
    available: true
  },
  {
    name: 'เพิ่มไซรัป',
    price: 10,
    type: 'เพิ่มเติม',
    available: true
  },
  {
    name: 'ใส่น้ำแข็งน้อย',
    price: 0,
    type: 'เพิ่มเติม',
    available: true
  }
];

// ข้อมูลตัวอย่างวัตถุดิบ
const inventory = [
  {
    name: 'เมล็ดกาแฟอาราบิก้า',
    quantity: 10,
    unit: 'กก.',
    reorderLevel: 2
  },
  {
    name: 'เมล็ดกาแฟโรบัสต้า',
    quantity: 8,
    unit: 'กก.',
    reorderLevel: 2
  },
  {
    name: 'นมสด',
    quantity: 24,
    unit: 'ลิตร',
    reorderLevel: 5
  },
  {
    name: 'นมข้นหวาน',
    quantity: 10,
    unit: 'กระป๋อง',
    reorderLevel: 3
  },
  {
    name: 'น้ำตาล',
    quantity: 15,
    unit: 'กก.',
    reorderLevel: 3
  },
  {
    name: 'น้ำเชื่อม',
    quantity: 5,
    unit: 'ขวด',
    reorderLevel: 1
  },
  {
    name: 'ชาเขียว',
    quantity: 5,
    unit: 'กก.',
    reorderLevel: 1
  },
  {
    name: 'ชาดำ',
    quantity: 5,
    unit: 'กก.',
    reorderLevel: 1
  },
  {
    name: 'ชาไทย',
    quantity: 5,
    unit: 'กก.',
    reorderLevel: 1
  },
  {
    name: 'ผงช็อกโกแลต',
    quantity: 7,
    unit: 'กก.',
    reorderLevel: 2
  },
  {
    name: 'ผงชาเขียวมัทฉะ',
    quantity: 3,
    unit: 'กก.',
    reorderLevel: 1
  },
  {
    name: 'วิปครีม',
    quantity: 10,
    unit: 'กระป๋อง',
    reorderLevel: 2
  },
  {
    name: 'แก้วกระดาษ 8 ออนซ์',
    quantity: 200,
    unit: 'ใบ',
    reorderLevel: 50
  },
  {
    name: 'แก้วกระดาษ 16 ออนซ์',
    quantity: 200,
    unit: 'ใบ',
    reorderLevel: 50
  },
  {
    name: 'ฝาแก้ว',
    quantity: 300,
    unit: 'ฝา',
    reorderLevel: 80
  },
  {
    name: 'หลอด',
    quantity: 400,
    unit: 'อัน',
    reorderLevel: 100
  }
];

// ข้อมูลตัวอย่างสินค้า
const products = [
  {
    name: 'อเมริกาโน่',
    description: 'กาแฟสไตล์อิตาเลียนเข้มข้น ชงด้วยน้ำร้อน',
    price: 55,
    image: 'https://img.freepik.com/free-photo/americano-coffee-mug_1358-513.jpg',
    category: 'กาแฟ',
    active: true
  },
  {
    name: 'ลาเต้',
    description: 'กาแฟเอสเพรสโซผสมนมสด อ่อนนุ่มละมุนลิ้น',
    price: 65,
    image: 'https://img.freepik.com/free-photo/cappuccino-coffee-cup_1203-2348.jpg',
    category: 'กาแฟ',
    active: true
  },
  {
    name: 'คาปูชิโน่',
    description: 'กาแฟเอสเพรสโซผสมนมร้อน ตกแต่งด้วยฟองนมนุ่ม',
    price: 65,
    image: 'https://img.freepik.com/free-photo/delicious-cappuccino-served-cup_23-2150883137.jpg',
    category: 'กาแฟ',
    active: true
  },
  {
    name: 'มอคค่า',
    description: 'กาแฟเอสเพรสโซผสมนมและช็อกโกแลต หวานละมุน',
    price: 70,
    image: 'https://img.freepik.com/free-photo/classic-coffee-drink-white-cup_23-2150883138.jpg',
    category: 'กาแฟ',
    active: true
  },
  {
    name: 'เอสเพรสโซ',
    description: 'กาแฟเข้มข้น สกัดจากเมล็ดกาแฟคุณภาพ',
    price: 50,
    image: 'https://img.freepik.com/free-photo/espresso-coffee-copper-cezve-grained-wooden-table_114579-33553.jpg',
    category: 'กาแฟ',
    active: true
  },
  {
    name: 'ชาเขียว',
    description: 'ชาเขียวญี่ปุ่นคุณภาพสูง หอมละมุน',
    price: 60,
    image: 'https://img.freepik.com/free-photo/cup-green-tea-with-fresh-mint-leaves-black-surface_114579-45013.jpg',
    category: 'ชา',
    active: true
  },
  {
    name: 'ชามัทฉะลาเต้',
    description: 'ชาเขียวมัทฉะผสมนมสด รสชาติเข้มข้น',
    price: 75,
    image: 'https://img.freepik.com/free-photo/matcha-latte-with-ice-glass_93675-135060.jpg',
    category: 'ชา',
    active: true
  },
  {
    name: 'ชาไทย',
    description: 'ชาไทยสูตรเข้มข้น หอมกลิ่นเครื่องเทศ',
    price: 60,
    image: 'https://img.freepik.com/free-photo/tea-pouring-cup_144627-21887.jpg',
    category: 'ชา',
    active: true
  },
  {
    name: 'น้ำส้มคั้นสด',
    description: 'น้ำส้มคั้นสดๆ วิตามินซีสูง ไม่ใส่น้ำตาล',
    price: 60,
    image: 'https://img.freepik.com/free-photo/glass-orange-juice-placed-wooden-table_1150-20065.jpg',
    category: 'เครื่องดื่มผลไม้',
    active: true
  },
  {
    name: 'น้ำมะนาว',
    description: 'น้ำมะนาวคั้นสด ผสมน้ำเชื่อม สดชื่น',
    price: 50,
    image: 'https://img.freepik.com/free-photo/glass-lemonade-with-mint-white-wooden-background_124507-6098.jpg',
    category: 'เครื่องดื่มผลไม้',
    active: true
  },
  {
    name: 'สมูทตี้ผลไม้รวม',
    description: 'ผลไม้นานาชนิดปั่นรวมกัน หวานละมุน สดชื่น',
    price: 80,
    image: 'https://img.freepik.com/free-photo/freshly-prepared-strawberry-milkshake_144627-7343.jpg',
    category: 'เครื่องดื่มผลไม้',
    active: true
  },
  {
    name: 'ช็อกโกแลตเย็น',
    description: 'ช็อกโกแลตเย็นเข้มข้น หวานละมุน',
    price: 70,
    image: 'https://img.freepik.com/free-photo/chocolate-milkshake-with-whipped-cream-red-yellow-straws_1147-105.jpg',
    category: 'เครื่องดื่มเย็น',
    active: true
  },
  {
    name: 'นมสดปั่น',
    description: 'นมสดปั่นเย็นๆ ละมุนลิ้น',
    price: 65,
    image: 'https://img.freepik.com/free-photo/vanilla-milkshake-served-with-chocolate-cookies_661915-272.jpg',
    category: 'เครื่องดื่มเย็น',
    active: true
  },
  {
    name: 'ช็อกโกแลตมัดฟัด',
    description: 'เค้กช็อกโกแลตหนานุ่ม หวานกำลังดี',
    price: 75,
    image: 'https://img.freepik.com/free-photo/chocolate-cake-decorated-with-fresh-berries-mint_144627-10563.jpg',
    category: 'ขนมหวาน',
    active: true
  },
  {
    name: 'ครัวซองอัลมอนด์',
    description: 'ครัวซองเนยสดหอมกรุ่น โรยอัลมอนด์ด้านบน',
    price: 55,
    image: 'https://img.freepik.com/free-photo/croissant-with-coffee-cup-breakfast_1150-9460.jpg',
    category: 'เบเกอรี่',
    active: true
  }
];

// ความสัมพันธ์ระหว่างสินค้าและวัตถุดิบ
const productIngredients = [
  // อเมริกาโน่
  { productName: 'อเมริกาโน่', inventoryName: 'เมล็ดกาแฟอาราบิก้า', quantityUsed: 0.02 },
  { productName: 'อเมริกาโน่', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'อเมริกาโน่', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // ลาเต้
  { productName: 'ลาเต้', inventoryName: 'เมล็ดกาแฟอาราบิก้า', quantityUsed: 0.02 },
  { productName: 'ลาเต้', inventoryName: 'นมสด', quantityUsed: 0.15 },
  { productName: 'ลาเต้', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'ลาเต้', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // คาปูชิโน่
  { productName: 'คาปูชิโน่', inventoryName: 'เมล็ดกาแฟอาราบิก้า', quantityUsed: 0.02 },
  { productName: 'คาปูชิโน่', inventoryName: 'นมสด', quantityUsed: 0.1 },
  { productName: 'คาปูชิโน่', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'คาปูชิโน่', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // มอคค่า
  { productName: 'มอคค่า', inventoryName: 'เมล็ดกาแฟอาราบิก้า', quantityUsed: 0.02 },
  { productName: 'มอคค่า', inventoryName: 'นมสด', quantityUsed: 0.1 },
  { productName: 'มอคค่า', inventoryName: 'ผงช็อกโกแลต', quantityUsed: 0.01 },
  { productName: 'มอคค่า', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'มอคค่า', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // เอสเพรสโซ
  { productName: 'เอสเพรสโซ', inventoryName: 'เมล็ดกาแฟอาราบิก้า', quantityUsed: 0.02 },
  { productName: 'เอสเพรสโซ', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'เอสเพรสโซ', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // ชาเขียว
  { productName: 'ชาเขียว', inventoryName: 'ชาเขียว', quantityUsed: 0.01 },
  { productName: 'ชาเขียว', inventoryName: 'น้ำตาล', quantityUsed: 0.01 },
  { productName: 'ชาเขียว', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'ชาเขียว', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // ชามัทฉะลาเต้
  { productName: 'ชามัทฉะลาเต้', inventoryName: 'ผงชาเขียวมัทฉะ', quantityUsed: 0.01 },
  { productName: 'ชามัทฉะลาเต้', inventoryName: 'นมสด', quantityUsed: 0.15 },
  { productName: 'ชามัทฉะลาเต้', inventoryName: 'น้ำตาล', quantityUsed: 0.01 },
  { productName: 'ชามัทฉะลาเต้', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'ชามัทฉะลาเต้', inventoryName: 'ฝาแก้ว', quantityUsed: 1 },
  
  // ชาไทย
  { productName: 'ชาไทย', inventoryName: 'ชาไทย', quantityUsed: 0.01 },
  { productName: 'ชาไทย', inventoryName: 'นมข้นหวาน', quantityUsed: 0.05 },
  { productName: 'ชาไทย', inventoryName: 'แก้วกระดาษ 8 ออนซ์', quantityUsed: 1 },
  { productName: 'ชาไทย', inventoryName: 'ฝาแก้ว', quantityUsed: 1 }
];

// ข้อมูลสมาชิกตัวอย่าง
const members = [
  {
    name: 'ศุภกร แก้วเจริญ',
    phone: '0891234567',
    email: 'supakorn@example.com',
    points: 150,
    birthdate: new Date('1990-05-15')
  },
  {
    name: 'นภัสสร ใจดี',
    phone: '0987654321',
    email: 'napassorn@example.com',
    points: 220,
    birthdate: new Date('1995-08-23')
  },
  {
    name: 'วิชัย รักดี',
    phone: '0812345678',
    email: 'wichai@example.com',
    points: 80,
    birthdate: new Date('1988-02-10')
  }
];

// ข้อมูลโปรโมชั่นตัวอย่าง
const promotions = [
  {
    name: 'ลด 10% สำหรับเครื่องดื่มทุกชนิด',
    discountType: 'percentage',
    discountValue: 10,
    code: 'DRINK10',
    minimumOrder: 100,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    active: true,
    usageLimit: 100,
    usedCount: 0,
    applicableProducts: null
  },
  {
    name: 'ลด 50 บาท',
    discountType: 'fixed',
    discountValue: 50,
    code: 'SAVE50',
    minimumOrder: 200,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
    active: true,
    usageLimit: 50,
    usedCount: 0,
    applicableProducts: null
  }
];

// ข้อมูลตั้งค่าคะแนนสะสม
const pointSettings = [
  {
    pointCalculationType: 'fixed',
    pointRatio: 10, // ทุก 10 บาท ได้ 1 คะแนน
    minimumAmount: 50,
    active: true,
    applicableProducts: null
  }
];

// ข้อมูลแลกคะแนนสะสม
const pointRedemptionRules = [
  {
    name: 'ส่วนลด 50 บาท',
    pointCost: 100,
    discountType: 'fixed',
    discountValue: 50,
    minimumOrder: 100,
    maximumDiscount: 50,
    active: true,
    applicableProducts: null
  },
  {
    name: 'ส่วนลด 15%',
    pointCost: 150,
    discountType: 'percentage',
    discountValue: 15,
    minimumOrder: 150,
    maximumDiscount: 100,
    active: true,
    applicableProducts: null
  }
];

// ข้อมูลตัวอย่างออเดอร์
const orders = [
  {
    staffId: 1,
    customerId: 1,  // ลูกค้าสมาชิก
    total: 165,
    discount: 0,
    paymentMethod: 'cash',
    status: 'completed',
    orderItems: [
      {
        productId: 1, // อเมริกาโน่
        quantity: 1,
        price: 55,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['ไม่หวาน'] },
          { type: 'ระดับความร้อน', options: ['ร้อน'] }
        ])
      },
      {
        productId: 3, // ลาเต้
        quantity: 2,
        price: 55,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['หวานปกติ'] },
          { type: 'ระดับความร้อน', options: ['ร้อน'] },
          { type: 'ชนิดนม', options: ['นมสด'] }
        ])
      }
    ]
  },
  {
    staffId: 1,
    customerId: 2,  // ลูกค้าสมาชิก
    total: 180,
    discount: 0,
    paymentMethod: 'promptpay',
    status: 'completed',
    orderItems: [
      {
        productId: 6, // มอคค่า
        quantity: 2,
        price: 65,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['หวานน้อย'] },
          { type: 'ระดับความร้อน', options: ['เย็น'] }
        ])
      },
      {
        productId: 12, // เค้กช็อกโกแลต
        quantity: 1,
        price: 50,
        customizations: JSON.stringify([])
      }
    ]
  },
  {
    staffId: 1,
    customerId: null,  // ลูกค้าทั่วไป
    total: 120,
    discount: 0,
    paymentMethod: 'credit_card',
    status: 'completed',
    orderItems: [
      {
        productId: 9, // ชามัทฉะลาเต้
        quantity: 2,
        price: 60,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['หวานปกติ'] },
          { type: 'ระดับความร้อน', options: ['เย็น'] }
        ])
      }
    ]
  },
  {
    staffId: 1,
    customerId: 3,  // ลูกค้าสมาชิก
    total: 220,
    discount: 20,
    promotionCode: 'DRINK10',
    paymentMethod: 'cash',
    status: 'completed',
    orderItems: [
      {
        productId: 5, // คาปูชิโน่
        quantity: 2,
        price: 60,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['หวานน้อย'] },
          { type: 'ระดับความร้อน', options: ['ร้อน'] }
        ])
      },
      {
        productId: 13, // ครัวซองต์
        quantity: 2,
        price: 50,
        customizations: JSON.stringify([])
      }
    ]
  },
  {
    staffId: 1,
    customerId: null,  // ลูกค้าทั่วไป
    total: 55,
    discount: 0,
    paymentMethod: 'cash',
    status: 'canceled',
    cancelReason: 'ลูกค้ายกเลิกเอง',
    orderItems: [
      {
        productId: 3, // ลาเต้
        quantity: 1,
        price: 55,
        customizations: JSON.stringify([
          { type: 'ระดับความหวาน', options: ['หวานปกติ'] },
          { type: 'ระดับความร้อน', options: ['ร้อน'] }
        ])
      }
    ]
  }
];

export default {
  categories,
  customizationTypes,
  customizationOptions,
  inventory,
  products,
  productIngredients,
  members,
  promotions,
  pointSettings,
  pointRedemptionRules,
  orders
};