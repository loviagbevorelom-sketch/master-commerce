("i@x.com")
    _make_shop(h1, "Boutique A")
    h2 = _register_and_login("j@x.com")
    s2 = _make_shop(h2, "Boutique B")
    # i essaie de modifier la boutique de j → 404
    r = client.patch(f"/api/shops/{s2['id']}", headers=h1, json={"name": "Piraté"})
    assert r.status_code == 404


def test_checkout_recalcule_le_total():
    h = _register_and_login("ck@x.com")
    shop = _make_shop(h)
    client.post(f"/api/shops/{shop['id']}/products", headers=h,
                json={"name": "Pagne", "price": 10000, "promo_price": 8000})
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": 1, "qty": 2}],
        "customer_name": "Koffi", "customer_phone": "90000000",
        "delivery_zone": "Lomé"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 16000           # prix promo × 2, calculé SERVEUR
    assert "wa.me/22890000000" in data["whatsapp_link"]
    assert "Pagne" in data["whatsapp_link"]


def test_checkout_produit_autre_boutique_refuse():
    h1 = _register_and_login("iso1@x.com")
    h2 = _register_and_login("iso2@x.com")
    _make_shop(h1, "Shop Uno")
    shop2 = _make_shop(h2, "Shop Dos")
    r = client.post(f"/api/public/shops/{shop2['slug']}/checkout", json={
        "items": [{"product_id": 999, "qty": 1}],
        "customer_name": "X", "customer_phone": "90000000", "delivery_zone": "Y"})
    assert r.status_code == 404


def test_catalogue_public_masque_inactifs():
    h = _register_and_login("cat@x.com")
    shop = _make_shop(h)
    client.post(f"/api/shops/{shop['id']}/products", headers=h,
                json={"name": "Visible", "price": 100, "is_active": True})
    client.post(f"/api/shops/{shop['id']}/products", headers=h,
                json={"name": "Caché", "price": 100, "is_active": False})
    r = client.get(f"/api/public/shops/{shop['slug']}/products")
    names = [p["name"] for p in r.json()]
    assert "Visible" in names and "Caché" not in names


def test_boutique_inactive_404():
    h = _register_and_login("off@x.com")
    shop = _make_shop(h)
    client.patch(f"/api/shops/{shop['id']}", headers=h, json={"is_active": False})
    assert client.get(f"/api/public/shops/{shop['slug']}").status_code == 404
EOF

cat > backend/Dockerfile <<'EOF'
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir psycopg2-binary
COPY . .
RUN adduser --disabled-password appuser && mkdir -p /app/uploads && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
EOF

printf '__pycache__\n*.pyc\n.pytest_cache\nuploads/\n.env\n' > backend/.dockerignore

echo "── Création du frontend ──"

cat > frontend/next.config.mjs <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = { output: "standalone" };
export default nextConfig;
EOF

cat > frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

cat > frontend/lib/types.ts <<'EOF'
export interface Shop {
  name: string; slug: string; description: string | null; currency: string;
}
export interface Product {
  id: number; name: string; description: string | null;
  price: number; promo_price: number | null; stock: number | null;
  image_path: string | null; category_id: number | null; is_active: boolean;
}
export interface Category { id: number; name: string; slug: string; }
EOF

cat > frontend/lib/format.ts <<'EOF'
export function formatPrice(value: number, currency: string): string {
  return `value.toLocaleString("fr−FR").replace(/2˘02f∣0˘0a0/g,""){value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")}value.toLocaleString("fr−FR").replace(/2˘02f∣0˘0a0/g,""){currency}`;
}
EOF

cat > frontend/lib/api.ts <<'EOF'
import { Product, Shop } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`API/public/shops/{API}/public/shops/API/public/shops/{path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(res.status === 404 ? "Boutique introuvable" : "Erreur serveur");
  return res.json();
}

export const api = {
  getShop: (slug: string) => get<Shop>(slug),
  getCategories: (slug: string) => get<{ id: number; name: string }[]>(`${slug}/categories`),
  getProducts: (slug: string) => get<Product[]>(`${slug}/products`),
};

export interface CheckoutPayload {
  items: { product_id: number; qty: number }[];
  customer_name: string; customer_phone: string; delivery_zone: string;
}

export async function requestCheckoutLink(slug: string, payload: CheckoutPayload): Promise<string> {
  const res = await fetch(`API/public/shops/{API}/public/shops/API/public/shops/{slug}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? "Erreur lors de la commande");
  }
  const data = await res.json();
  return data.whatsapp_link;
}

export const API_BASE = API;
EOF

cat > frontend/lib/cart.tsx <<'EOF'
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "./types";

export interface CartItem { product: Product; qty: number; }

interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  totalQty: () => number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mc_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* panier corrompu → ignoré */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: Math.min(99, i.qty + qty) } : i);
      }
      return [...prev, { product, qty }];
    });
  };

  const setQty = (productId: number, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => (i.product.id === productId ? { ...i, qty: Math.min(99, qty) } : i)));
  };

  const remove = (productId: number) =>
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  const clear = () => setItems([]);
  const totalQty = () => items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count: items.length, add, setQty, remove, clear, totalQty }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
EOF

cat > frontend/lib/admin.ts <<'EOF'
"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "mc_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function logout() { localStorage.removeItem(TOKEN_KEY); }

export async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const res = await fetch(`API{API}API{path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/admin/login";
  }
  return res;
}

export const adminApi = {
  register: (email: string, password: string) =>
    fetch(`${API}/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password });
    return fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
  },
  getShops: () => adminFetch("/shops"),
  createShop: (data: object) =>
    adminFetch("/shops", { method: "POST", body: JSON.stringify(data) }),
  updateShop: (id: number, data: object) =>
    adminFetch(`/shops/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getProducts: (shopId: number) => adminFetch(`/shops/${shopId}/products`),
  createProduct: (shopId: number, data: object) =>
    adminFetch(`/shops/${shopId}/products`, { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (shopId: number, productId: number, data: object) =>
    adminFetch(`/shops/shopId/products/{shopId}/products/shopId/products/{productId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProduct: (shopId: number, productId: number) =>
    adminFetch(`/shops/shopId/products/{shopId}/products/shopId/products/{productId}`, { method: "DELETE" }),
  uploadImage: (shopId: number, productId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return adminFetch(`/shops/shopId/products/{shopId}/products/shopId/products/{productId}/image`, { method: "POST", body: fd });
  },
  getPublications: (shopId: number) => adminFetch(`/shops/${shopId}/publications`),
};
EOF

cat > frontend/app/layout.tsx <<'EOF'
import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

export const metadata: Metadata = {
  title: "Master Commerce",
  description: "Votre boutique en ligne, commandes sur WhatsApp",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <CartProvider>{children}</CartProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }` }} />
      </body>
    </html>
  );
}
EOF

cat > frontend/app/manifest.ts <<'EOF'
import type { MetadataRoute } from "next";

export default function manifest() {
  return {
    name: "Master Commerce",
    short_name: "Commerce",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  };
}
EOF

cat > frontend/public/sw.js <<'EOF'
const CACHE = "mc-v1";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
EOF

cat > frontend/app/[slug]/page.tsx <<'EOF'
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { CartButton } from "@/components/CartButton";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shop = await api.getShop(slug);
    return {
      title: shop.name,
      description: shop.description ?? `Catalogue en ligne de ${shop.name}`,
      openGraph: { title: shop.name, description: shop.description ?? undefined },
    };
  } catch {
    return { title: "Boutique introuvable" };
  }
}

export default async function CataloguePage({ params }: Props) {
  const { slug } = await params;
  let shop, products, categories;
  try {
    [shop, categories, products] = await Promise.all([
      api.getShop(slug), api.getCategories(slug), api.getProducts(slug),
    ]);
  } catch {
    notFound();
  }

  return (
    <main className="pb-20">
      <header className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-5 pt-10 pb-7 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold">{shop.name}</h1>
        {shop.description && (
          <p className="mt-2 text-sm text-emerald-100 leading-relaxed">{shop.description}</p>
        )}
      </header>

      {categories.length > 0 && (
        <nav className="flex gap-2 px-4 py-4 overflow-x-auto">
          <Link href={`/${slug}`}
            className="whitespace-nowrap px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold">
            Tout
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/slug?cat={slug}?cat=slug?cat={c.id}`}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-white border border-neutral-200 text-sm font-semibold text-neutral-700">
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="text-center text-neutral-500 mt-16 px-6">
          Aucun produit disponible pour le moment.
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-3 px-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} currency={shop.currency} slug={slug} />
          ))}
        </section>
      )}

      <CartButton slug={slug} />
    </main>
  );
}
EOF

cat > frontend/app/[slug]/not-found.tsx <<'EOF'
export default function ShopNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="text-5xl">🔍</span>
      <h1 className="mt-4 text-xl font-bold">Boutique introuvable</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Vérifiez le lien ou contactez le commerçant.
      </p>
    </main>
  );
}
EOF

cat > frontend/components/CartButton.tsx <<'EOF'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

export default function CartButton({ slug }: { slug: string }) {
  const { totalQty } = useCart();
  const qty = totalQty();
  const pathname = usePathname();
  if (qty === 0 || pathname.includes("/cart")) return null;

  return (
    <Link href={`/${slug}/cart`}
      className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full
        bg-emerald-600 text-white pl-4 pr-5 py-3 shadow-xl shadow-emerald-600/30
        font-semibold text-sm active:scale-95 transition">
      🛒 Panier
      <span className="bg-white text-emerald-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
        {qty}
      </span>
    </Link>
  );
}
EOF

cat > frontend/components/ProductCard.tsx <<'EOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";

interface Props { product: Product; currency: string; slug: string; }

export function ProductCard({ product, currency, slug }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const hasPromo = product.promo_price !== null;
  const imageUrl = product.image_path
    ? `process.env.NEXTPUBLICAPIURL?.replace("/api","")??"http://localhost:8000"{process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000"}process.env.NEXTP​UBLICA​PIU​RL?.replace("/api","")??"http://localhost:8000"{product.image_path}`
    : null;

  function addToCart() {
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 hover:shadow-md ${outOfStock ? "opacity-60" : ""}`}>
      <Link href={`/slug/checkout/{slug}/checkout/slug/checkout/{product.id}`}>
        <div className="relative aspect-square bg-neutral-100 overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
          )}
          {hasPromo && !outOfStock && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Promo</span>
          )}
          {outOfStock && (
            <span className="absolute inset-x-0 bottom-0 bg-neutral-900/80 text-white text-xs text-center py-1">Épuisé</span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link href={`/slug/checkout/{slug}/checkout/slug/checkout/{product.id}`}>
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</h3>
          <p className="mt-1.5">
            {hasPromo ? (
              <>
                <span className="text-xs text-neutral-400 line-through mr-1.5">
                  {formatPrice(product.price, currency)}
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {formatPrice(product.promo_price!, currency)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-emerald-700">
                {formatPrice(product.price, currency)}
              </span>
            )}
          </p>
        </Link>
        <button onClick={addToCart} disabled={outOfStock}
          className={`mt-2.5 w-full py-2 rounded-xl text-sm font-semibold transition active:scale-[0.97]
            disabled:opacity-40 disabled:cursor-not-allowed ${
              added ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
          {outOfStock ? "Indisponible" : added ? "✅ Ajouté !" : "🛒 Ajouter"}
        </button>
      </div>
    </div>
  );
}
EOF

cat > frontend/app/[slug]/cart/page.tsx <<'EOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { requestCheckoutLink } from "@/lib/api";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, setQty, remove, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOTE AGENT : récupérer la devise réelle via api.getShop(slug) dans un useEffect.
  const currency = "FCFA";

  const total = items.reduce(
    (sum, i) => sum + (i.product.promo_price ?? i.product.price) * i.qty, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const link = await requestCheckoutLink(slug, {
        items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
        customer_name: name, customer_phone: phone, delivery_zone: zone,
      });
      clear();
      window.location.href = link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl">🛒</span>
        <h1 className="mt-4 text-xl font-bold">Votre panier est vide</h1>
        <Link href={`/${slug}`} className="mt-4 text-emerald-700 font-medium text-sm">
          ← Retour au catalogue
        </Link>
      </main>
    );
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="font-bold">🛒 Mon panier ({items.length})</h1>
        <Link href={`/${slug}`} className="text-sm text-emerald-700 font-medium">+ Ajouter</Link>
      </header>

      <section className="px-4 mt-4 space-y-2">
        {items.map(({ product, qty }) => {
          const unit = product.promo_price ?? product.price;
          const out = product.stock !== null && product.stock <= 0;
          return (
            <div key={product.id} className={`bg-white rounded-2xl p-3 shadow-sm flex gap-3 ${out ? "opacity-50" : ""}`}>
              <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                {product.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`process.env.NEXTPUBLICAPIURL?.replace("/api","")??"http://localhost:8000"{process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000"}process.env.NEXTP​UBLICA​PIU​RL?.replace("/api","")??"http://localhost:8000"{product.image_path}`}
                    alt="" className="w-full h-full object-cover" />
                ) : <span>🛍️</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <p className="text-xs text-neutral-500">{formatPrice(unit, currency)} / unité</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <button type="button" onClick={() => setQty(product.id, qty - 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-100 font-bold">−</button>
                  <span className="w-8 text-center font-semibold text-sm">{qty}</span>
                  <button type="button" onClick={() => setQty(product.id, qty + 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-100 font-bold">+</button>
                  <button type="button" onClick={() => remove(product.id)}
                    className="ml-auto text-xs text-red-500 hover:text-red-700">Retirer</button>
                </div>
              </div>
              <p className="text-sm font-bold text-emerald-700 shrink-0 self-center">
                {formatPrice(unit * qty, currency)}
              </p>
            </div>
          );
        })}
      </section>

      <form onSubmit={submit} className="px-4 mt-5 space-y-3">
        <input className={input} placeholder="Votre nom complet" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="tel" placeholder="Votre téléphone" value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        <input className={input} placeholder="Zone de livraison" value={zone}
          onChange={(e) => setZone(e.target.value)} required />

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
          <span className="text-sm text-neutral-600">Total commande</span>
          <span className="text-lg font-bold text-emerald-700">{formatPrice(total, currency)}</span>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50
            text-white font-semibold shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition">
          {loading ? "Préparation…" : "Commander tout sur WhatsApp 📲"}
        </button>
        <p className="text-xs text-center text-neutral-400">
          Le total est vérifié côté serveur avant envoi — aucun risque d&apos;erreur de prix.
        </p>
      </form>
    </main>
  );
}
EOF

cat > frontend/app/admin/layout.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuthPage = pathname.includes("/admin/login") || pathname.includes("/admin/register");
    if (!isAuthPage && !getToken()) {
      window.location.href = "/admin/login";
    } else {
      setChecked(true);
    }
  }, [pathname]);

  return <>{children}</>;
}
EOF

cat > frontend/app/admin/login/page.tsx <<'EOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, setToken } from "@/lib/admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await adminApi.login(email, password);
    if (res.ok) {
      const data = await res.json();
      setToken(data.access_token);
      router.push("/admin");
    } else {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    }
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-4xl">🛍️</span>
          <h1 className="mt-2 text-xl font-bold">Master Commerce</h1>
          <p className="text-sm text-neutral-500">Connectez-vous à votre espace</p>
        </div>
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        <p className="text-sm text-center text-neutral-500">
          Pas de compte ?{" "}
          <Link href="/admin/register" className="text-emerald-700 font-medium">Créer un compte</Link>
        </p>
      </form>
    </main>
  );
}
EOF

cat > frontend/app/admin/register/page.tsx <<'EOF'
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, setToken } from "@/lib/admin";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const reg = await adminApi.register(email, password);
    if (!reg.ok) {
      const data = await reg.json().catch(() => ({}));
      setError(data.detail === "Email déjà enregistré"
        ? "Cet email est déjà utilisé"
        : data.detail?.[0]?.msg ?? "Mot de passe trop court (8 caractères min.)");
      setLoading(false);
      return;
    }
    const login = await adminApi.login(email, password);
    if (login.ok) {
      setToken((await login.json()).access_token);
      router.push("/admin");
    }
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-4xl">🛍️</span>
          <h1 className="mt-2 text-xl font-bold">Créer votre compte</h1>
          <p className="text-sm text-neutral-500">Lancez votre boutique en 2 minutes</p>
        </div>
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Mot de passe (8 caractères min.)"
          value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50">
          {loading ? "Création…" : "Créer mon compte"}
        </button>
        <p className="text-sm text-center text-neutral-500">
          Déjà inscrit ? <Link href="/admin/login" className="text-emerald-700 font-medium">Se connecter</Link>
        </p>
      </form>
    </main>
  );
}
EOF

cat > frontend/app/admin/page.tsx <<'EOF'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, getToken, logout } from "@/lib/admin";

interface Shop { id: number; name: string; slug: string; description: string | null;
  whatsapp_number: string; currency: string; is_active: boolean; }

export default function AdminPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) return;
    adminApi.getShops().then(async (res) => {
      if (res.status === 401) { router.push("/admin/login"); return; }
      setShops(await res.json());
      setLoading(false);
    });
  }, [router]);

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await adminApi.createShop({ name, whatsapp_number: phone });
    if (res.ok) {
      const shop = await res.json();
      setName(""); setPhone("");
      setShops((prev) => [...prev, shop]);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.detail === "string" ? data.detail : "Erreur de création");
    }
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(`window.location.origin/{window.location.origin}/window.location.origin/{slug}`);
    alert("🔗 Lien copié !");
  }

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 flex items-center justify-between sticky top-0">
        <h1 className

> ⚠️ The response reached the length limit. Reply **continue** to get the rest.
