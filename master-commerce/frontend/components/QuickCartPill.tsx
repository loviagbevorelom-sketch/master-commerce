"use client";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useState } from "react";
import CartDrawer from "./CartDrawer";

export default function QuickCartPill({
  slug,
  currency = "FCFA",
}: {
  slug: string;
  currency?: string;
}) {
  const { totalQty, totalAmount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const qty = totalQty();
  const total = totalAmount();

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        type="button"
        className="group inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-full bg-white text-on-surface shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#eae7e7] hover:shadow-md transition-all active:scale-95 leading-none"
      >
        <span
          className="material-symbols-outlined text-[18px] text-[#D32F2F] leading-none"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          shopping_bag
        </span>
        <span className="font-semibold text-[13px] leading-none">
          {qty} {qty > 1 ? "articles" : "article"}
        </span>
        <span className="w-1 h-1 rounded-full bg-outline-variant shrink-0" />
        <span className="font-heading font-black text-sm text-[#D32F2F] leading-none">
          {formatPrice(total, currency)}
        </span>
      </button>

      <CartDrawer slug={slug} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
