"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { api, API_BASE } from "@/lib/api";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, setQty, remove } = useCart();
  const [shop, setShop] = useState<{
    name: string;
    currency: string;
    whatsapp?: string;
  }>({ name: "Kubafoodies", currency: "FCFA" });

  useEffect(() => {
    api
      .getShop(slug)
      .then((s) => {
        setShop({
          name: s.name,
          currency: s.currency,
          whatsapp: s.whatsapp_number ?? undefined,
        });
      })
      .catch(() => {});
  }, [slug]);

  const total = items.reduce(
    (sum, i) => sum + (i.product.promo_price ?? i.product.price) * i.qty,
    0
  );
  const qty = items.reduce((s, i) => s + i.qty, 0);
  const displayName = shop.name ? shop.name.split("—")[0].trim() : "Kubafoodies";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader slug={slug} name={shop.name} whatsapp={shop.whatsapp} />

      {/* ── Padding top généreux pour éliminer tout chevauchement avec l'entête ── */}
      <main className="flex-1 w-full pt-28 md:pt-32 pb-16">
        <div className="w-full max-w-[1140px] mx-auto px-gutter">

          {/* En-tête du panier responsive */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#eae7e7]">
            <div>
              <span className="font-thermal-mono text-thermal-mono text-on-surface-variant uppercase tracking-widest text-[11px]">
                Récapitulatif de commande
              </span>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1">
                Votre Panier
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                {qty} article{qty > 1 ? "s" : ""} sélectionné{qty > 1 ? "s" : ""} chez {displayName}
              </p>
            </div>
            <Link
              href={`/${slug}`}
              className="inline-flex items-center gap-1.5 text-[#D32F2F] font-semibold text-[13px] hover:underline self-start sm:self-auto leading-none"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">arrow_back</span>
              <span className="leading-none">Continuer mes achats</span>
            </Link>
          </div>

          {items.length === 0 ? (
            /* État Panier Vide */
            <div className="rounded-3xl bg-surface-container-lowest border border-[#eae7e7] p-12 sm:p-16 flex flex-col items-center text-center max-w-[640px] mx-auto shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#D32F2F]/60 to-[#D32F2F]" />
              <div className="w-20 h-20 rounded-full bg-[#D32F2F]/10 flex items-center justify-center text-[#D32F2F] mb-6 shadow-inner ring-4 ring-[#D32F2F]/5">
                <span className="material-symbols-outlined text-[36px] leading-none">shopping_bag</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                Votre panier est vide
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mt-2 leading-relaxed">
                Ajoutez vos plats préférés depuis notre carte du jour pour passer commande en direct sur WhatsApp.
              </p>
              <Link
                href={`/${slug}`}
                className="mt-8 h-12 px-8 rounded-xl bg-[#D32F2F] text-white font-bold text-[14px] shadow-[0_4px_14px_rgba(211,47,47,0.35)] hover:bg-[#B71C1C] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 leading-none"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">restaurant_menu</span>
                <span className="leading-none">Explorer le menu</span>
              </Link>
            </div>
          ) : (
            /* Layout Panier Responsive : 2 Colonnes PC/Tablette (Articles à gauche, Récap sticky à droite) */
            <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">

              {/* Liste des articles */}
              <div className="flex flex-col gap-4">
                {items.map(({ product, qty: q }) => {
                  const unit = product.promo_price ?? product.price;
                  const img = product.image_path
                    ? product.image_path.startsWith("http") || product.image_path.startsWith("/images")
                      ? product.image_path
                      : `${API_BASE.replace("/api", "")}${product.image_path}`
                    : null;

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-surface-container-lowest border border-[#eae7e7] p-4 sm:p-5 sm:items-center justify-between shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container shrink-0">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🍽️
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-headline-sm text-[16px] text-on-surface font-semibold truncate">
                            {product.name}
                          </h3>
                          <span className="font-thermal-mono text-thermal-mono text-on-surface-variant mt-0.5">
                            {formatPrice(unit, shop.currency)} l&apos;unité
                          </span>
                          <span className="font-numeric-price text-sm text-primary font-bold mt-1 sm:hidden">
                            {formatPrice(unit * q, shop.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Contrôles Quantité & Prix sous-total */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#eae7e7]">
                        {/* Stepper +/- */}
                        <div className="flex items-center bg-surface-container-low border border-[#eae7e7] rounded-xl p-1 shadow-sm">
                          <button
                            onClick={() => setQty(product.id, q - 1)}
                            className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
                            aria-label="Diminuer la quantité"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">remove</span>
                          </button>
                          <span className="w-8 text-center font-heading text-sm font-semibold text-on-surface">
                            {q}
                          </span>
                          <button
                            onClick={() => setQty(product.id, q + 1)}
                            className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
                            aria-label="Augmenter la quantité"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        </div>

                        {/* Sous-total article */}
                        <span className="hidden sm:block font-numeric-price text-numeric-price text-on-surface min-w-[100px] text-right">
                          {formatPrice(unit * q, shop.currency)}
                        </span>

                        {/* Bouton supprimer */}
                        <button
                          onClick={() => remove(product.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                          aria-label="Supprimer cet article"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aside Récapitulatif Sticky */}
              <aside className="lg:sticky lg:top-28 rounded-2xl bg-surface-container-lowest border border-[#eae7e7] p-6 flex flex-col gap-5 shadow-[0_2px_12px_rgba(26,26,26,0.04)]">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Récapitulatif
                </h2>

                <div className="flex flex-col gap-3 py-3 border-y border-[#eae7e7]">
                  <div className="flex items-center justify-between font-body-md text-body-md">
                    <span className="text-on-surface-variant">Sous-total</span>
                    <span className="font-numeric-price font-semibold text-on-surface">
                      {formatPrice(total, shop.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">moped</span>
                      <span>Livraison estimée</span>
                    </span>
                    <span className="font-label-sm text-secondary bg-secondary-container px-2 py-0.5 rounded-full font-semibold">
                      Calculée à l&apos;étape suivante
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                    Total
                  </span>
                  <span className="font-numeric-price text-2xl text-[#D32F2F] font-black">
                    {formatPrice(total, shop.currency)}
                  </span>
                </div>

                <Link
                  href={`/${slug}/checkout`}
                  className="h-12 rounded-xl bg-[#D32F2F] text-white font-bold text-[14.5px] flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(211,47,47,0.35)] hover:bg-[#B71C1C] active:translate-y-[1px] transition-all leading-none"
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">shopping_cart_checkout</span>
                  <span className="leading-none">Passer la commande</span>
                </Link>

                <div className="flex items-center justify-center gap-2 text-on-surface-variant font-body-sm text-body-sm text-center">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                  <span>Sans compte · Validation directe sur WhatsApp</span>
                </div>
              </aside>

            </div>
          )}

        </div>
      </main>

      <SiteFooter name={shop.name} whatsapp={shop.whatsapp} />
    </div>
  );
}