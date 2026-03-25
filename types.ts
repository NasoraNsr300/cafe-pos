
export interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  detail: string;
  image: string;
  status: 'In Stock' | 'Sold Out';
  category: string;
  type?: string; // เพิ่มฟิลด์ประเภทสินค้า
}

export interface CartItem extends Product {
  quantity: number;
}

// เปลี่ยนจาก Enum เป็น Interface เพื่อรองรับ Dynamic Categories
export interface CategoryItem {
  id: string;
  name: string;
}

// ข้อมูลหมวดหมู่เริ่มต้นสำหรับระบบ (Seed Data)

export interface Member {
  uid: string;
  email: string;
  displayName: string;
  address: string;
  birthDate: string;
  role: 'member' | 'admin' | 'staff';
  createdAt: any; // Firestore Timestamp
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  timestamp: any;
  status: 'pending' | 'ready' | 'completed' | 'cancelled';
  cashReceived?: number;
  change?: number;
  customerName?: string;
  customerId?: string;
}

// ข้อมูลหมวดหมู่เริ่มต้นสำหรับระบบ (Seed Data)
export const DEFAULT_CATEGORIES = [
  'เครื่องดื่ม',
  'เบเกอรี่',
  'ของหวาน'
];

