
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

export enum Category {
  DRINKS = 'เครื่องดื่ม',
  BAKERY = 'เบเกอรี่',
  DESSERT = 'ของหวาน'
}
