export type UserRole = "STAFF" | "MANAGER" | "OWNER" | "CUSTOMER";

export interface StaffUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus = "RECEIVED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID";

export interface OrderItem {
  id: string;
  item_name_snapshot: string;
  variant_name_snapshot?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  table_number?: string | null;
  delivery_address?: string | null;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  tax: number;
  delivery_charge: number;
  total: number;
  payment_method: string;
  special_instructions?: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
}

export interface RestaurantSettings {
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  tax_percentage: number;
  delivery_charge: number;
  min_delivery_order: number;
  delivery_area: string;
  whatsapp_notification_phone?: string;
}

export interface TeamMember {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface CashRecord {
  id: string;
  order_id: string;
  order_number: string;
  order_type: string;
  rider_name?: string | null;
  amount: number;
  status: "PENDING" | "RECEIVED";
  received_at?: string | null;
  confirmed_by?: string | null;
  created_at: string;
}
