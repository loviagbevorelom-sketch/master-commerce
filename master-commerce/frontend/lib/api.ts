import { DeliveryZone, Order, Product, Shop } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const cacheOpts = { next: { revalidate: 30 } };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/public/${path}`, cacheOpts);
  if (!res.ok)
    throw new Error(
      res.status === 404 ? "Boutique introuvable" : "Erreur serveur"
    );
  return res.json();
}

export const api = {
  getShop: (slug: string) => get<Shop>(`shops/${slug}`),
  getCategories: (slug: string) =>
    get<{ id: number; name: string; slug: string }[]>(`shops/${slug}/categories`),
  getProducts: (slug: string) => get<Product[]>(`shops/${slug}/products`),
  getDeliveryZones: (slug: string) =>
    get<DeliveryZone[]>(`shops/${slug}/delivery-zones`),
  getOrder: (ref: string) => get<Order>(`orders/${ref}`),
};

export interface CheckoutPayload {
  items: { product_id: number; qty: number }[];
  customer_name: string;
  customer_phone: string;
  reception_mode: "delivery" | "pickup";
  delivery_zone_id: number | null;
  payment_method?: "cod" | "fedapay";
}

export interface CheckoutResult {
  order_ref: string;
  whatsapp_link: string;
  total: number;
  payment_method?: string;
  payment_status?: string;
  payment_url?: string | null;
}

export async function placeOrder(
  slug: string,
  payload: CheckoutPayload
): Promise<CheckoutResult> {
  const res = await fetch(`${API}/public/shops/${slug}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? "Erreur lors de la commande");
  }
  return res.json();
}

export async function simulateFedaPayPayment(ref: string): Promise<boolean> {
  const res = await fetch(`${API}/public/fedapay/simulate-success/${ref}`, {
    method: "POST",
  });
  return res.ok;
}

export const API_BASE = API;