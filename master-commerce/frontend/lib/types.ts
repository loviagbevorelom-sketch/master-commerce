export interface Shop {
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  whatsapp_number?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  stock: number | null;
  image_path: string | null;
  category_id: number | null;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface DeliveryZone {
  id: number;
  city: string;
  name: string;
  fee: number;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  unit_price: number;
  qty: number;
}

export interface Order {
  ref: string;
  shop_name: string;
  currency: string;
  customer_name: string;
  customer_phone: string;
  reception_mode: "delivery" | "pickup";
  delivery_zone_name: string | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  status: string;
  payment_method?: "cod" | "fedapay";
  payment_status?: "pending" | "paid" | "failed";
  payment_url?: string | null;
  whatsapp_link: string | null;
  created_at: string;
  items: OrderItem[];
}