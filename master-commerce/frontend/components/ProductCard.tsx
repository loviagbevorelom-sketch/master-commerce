"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { API_BASE } from "@/lib/api";

interface Props {
  product: Product;
  currency: string;
  slug: string;
  categoryName?: string;
}

export function ProductCard({ product, currency, slug, categoryName }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock !== null && product.stock <= 0;
  const hasPromo = product.promo_price !== null && product.promo_price < product.price;
  const pct = hasPromo
    ? Math.max(0, Math.round(100 - (product.promo_price! / product.price) * 100))
    : 0;

  const imageUrl = product.image_path
    ? product.image_path.startsWith("http") || product.image_path.startsWith("/images")
      ? product.image_path
      : `${API_BASE.replace("/api", "")}${product.image_path}`
    : null;

  function addToCart() {
    if (outOfStock) return;
    add(product, 1, slug);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  // Determine badge type based on category or promo
  const catLower = (categoryName ?? "").toLowerCase();
  const nameLower = product.name.toLowerCase();

  const isDrink = catLower.includes("boisson") || nameLower.includes("jus") || nameLower.includes("bissap") || nameLower.includes("gingembre");
  const isSpecial = catLower.includes("spécial") || catLower.includes("special") || nameLower.includes("pinon");
  const isPlatJour = catLower.includes("plat") || catLower.includes("jour") || nameLower.includes("tchiep");

  return (
    <article
      className={`group flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 border border-[#f0eded] ${
        outOfStock ? "opacity-75" : ""
      }`}
    >
      {/* ── Image 16:10 desktop, 4:3 mobile ────────────────────────────────── */}
      <div className="relative w-full aspect-[5/4] bg-surface-container overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              outOfStock ? "grayscale-[35%]" : ""
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container text-outline">
            <span className="material-symbols-outlined text-[40px]">restaurant</span>
          </div>
        )}

        {/* Badges on image — centrage parfait & thème rouge */}
        {!outOfStock && (
          <div className="absolute top-3 left-3">
            {hasPromo ? (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-[#D32F2F] text-white text-[11px] font-bold leading-none shadow-sm">
                -{pct}%
              </span>
            ) : isPlatJour ? (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#D32F2F] text-[11px] font-bold leading-none shadow-sm border border-[#D32F2F]/20">
                Plat du Jour
              </span>
            ) : isSpecial ? (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-secondary-container/95 backdrop-blur-md text-on-secondary-container text-[11px] font-semibold leading-none shadow-sm">
                Spécialité
              </span>
            ) : isDrink ? (
              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#059669] text-[11px] font-semibold leading-none shadow-sm">
                Boisson fraîche
              </span>
            ) : null}
          </div>
        )}

        {/* Overlay si épuisé */}
        {outOfStock && (
          <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3.5 py-1.5 rounded-full bg-surface-container-highest/90 text-on-surface font-label-md text-label-md font-semibold shadow-sm">
              Épuisé aujourd&apos;hui
            </span>
          </div>
        )}
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 justify-between">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2 line-clamp-2 leading-snug">
            {product.name}
          </h2>
          {product.description && (
            <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 leading-relaxed text-[0.82rem]">
              {product.description}
            </p>
          )}
        </div>

        {/* Prix + bouton */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f5f2f2]">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-numeric-price text-[clamp(1rem,2.2vw,1.2rem)] font-black tracking-tight ${
                outOfStock ? "text-on-surface-variant" : "text-[#D32F2F]"
              }`}
            >
              {formatPrice(hasPromo ? product.promo_price! : product.price, currency)}
            </span>
            {hasPromo && (
              <span className="font-body-sm text-body-sm text-outline/70 line-through text-[13px]">
                {formatPrice(product.price, currency)}
              </span>
            )}
          </div>

          <button
            onClick={addToCart}
            disabled={outOfStock}
            type="button"
            className={`h-9 px-4 rounded-xl text-[13px] font-bold transition-all inline-flex items-center justify-center leading-none gap-1.5 active:scale-95 ${
              outOfStock
                ? "bg-[#f5f5f5] text-[#aaa] cursor-not-allowed"
                : added
                ? "bg-[#10B981] text-white shadow-[0_3px_10px_rgba(16,185,129,0.4)]"
                : "bg-[#D32F2F] text-white shadow-[0_3px_10px_rgba(211,47,47,0.35)] hover:bg-[#B71C1C]"
            }`}
            aria-label={outOfStock ? "Indisponible" : `Ajouter ${product.name}`}
          >
            <span className="material-symbols-outlined text-[16px] leading-none">
              {outOfStock ? "block" : added ? "check" : "add_shopping_cart"}
            </span>
            <span className="leading-none">{outOfStock ? "Rupture" : added ? "Ajouté !" : "Ajouter"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}