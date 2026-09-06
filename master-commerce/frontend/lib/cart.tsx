"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Product } from "./types";

export interface CartItem {
  product: Product;
  qty: number;
  shopSlug?: string;
}

interface CartContextValue {
  items: CartItem[];
  allItems: CartItem[];
  count: number;
  add: (product: Product, qty?: number, shopSlug?: string) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: (targetSlug?: string) => void;
  totalQty: () => number;
  totalAmount: () => number;
  currentSlug: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mc_cart";

function extractSlug(pathname: string | null): string | null {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  if (["admin", "api", "health", "favicon.ico"].includes(first)) return null;
  return first;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSlug = useMemo(() => extractSlug(pathname), [pathname]);

  const [allItems, setAllItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAllItems(JSON.parse(raw));
    } catch {
      /* panier corrompu → réinitialisé */
      setAllItems([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allItems));
    }
  }, [allItems, hydrated]);

  // Articles filtrés pour la boutique courante (ou tous si pas de slug identifié)
  const items = useMemo(() => {
    if (!currentSlug) return allItems;
    return allItems.filter((i) => !i.shopSlug || i.shopSlug === currentSlug);
  }, [allItems, currentSlug]);

  const add = (product: Product, qty = 1, shopSlug?: string) => {
    const slugToUse = shopSlug || currentSlug || undefined;
    setAllItems((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && (!slugToUse || !i.shopSlug || i.shopSlug === slugToUse)
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && (!slugToUse || !i.shopSlug || i.shopSlug === slugToUse)
            ? { ...i, qty: Math.min(99, i.qty + qty), shopSlug: slugToUse || i.shopSlug }
            : i
        );
      }
      return [...prev, { product, qty, shopSlug: slugToUse }];
    });
  };

  const setQty = (productId: number, qty: number) => {
    setAllItems((prev) => {
      if (qty <= 0) {
        return prev.filter(
          (i) => !(i.product.id === productId && (!currentSlug || !i.shopSlug || i.shopSlug === currentSlug))
        );
      }
      return prev.map((i) =>
        i.product.id === productId && (!currentSlug || !i.shopSlug || i.shopSlug === currentSlug)
          ? { ...i, qty: Math.min(99, qty) }
          : i
      );
    });
  };

  const remove = (productId: number) => {
    setAllItems((prev) =>
      prev.filter(
        (i) => !(i.product.id === productId && (!currentSlug || !i.shopSlug || i.shopSlug === currentSlug))
      )
    );
  };

  const clear = (targetSlug?: string) => {
    const slugToClear = targetSlug || currentSlug;
    if (!slugToClear) {
      setAllItems([]);
    } else {
      setAllItems((prev) => prev.filter((i) => i.shopSlug && i.shopSlug !== slugToClear));
    }
  };

  const totalQty = () => items.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = () =>
    items.reduce((sum, i) => sum + (i.product.promo_price ?? i.product.price) * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        allItems,
        count: items.length,
        add,
        setQty,
        remove,
        clear,
        totalQty,
        totalAmount,
        currentSlug,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
