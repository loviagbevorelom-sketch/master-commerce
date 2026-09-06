"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { API_BASE } from "@/lib/api";

interface Props {
  slug: string;
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ slug, open, onClose }: Props) {
  const { items, setQty, remove } = useCart();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce(
    (s, i) => s + (i.product.promo_price ?? i.product.price) * i.qty,
    0
  );

  return (
    /* Portail global — toujours dans le DOM pour que CSS gère l'animation */
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ease-in-out ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Panier"
    >
      {/* Overlay semi-transparent */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Panel coulissant — transform CSS, pas de JS */}
      <aside
        ref={panelRef}
        className={`absolute inset-y-0 right-0 w-full max-w-[480px] bg-surface flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── En-tête ── */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-surface-container-high shrink-0">
          <div>
            <h2 className="font-heading text-[20px] font-bold text-on-surface tracking-tight leading-tight">
              Mon Panier
            </h2>
            <p className="font-sans text-[13px] text-on-surface-variant mt-0.5">
              {totalQty === 0
                ? "Panier vide"
                : `${totalQty} article${totalQty > 1 ? "s" : ""} sélectionné${totalQty > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
            aria-label="Fermer le panier"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">close</span>
          </button>
        </div>

        {/* ── Contenu ── */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-[32px]">production_quantity_limits</span>
            </div>
            <div>
              <p className="font-heading text-[17px] font-semibold text-on-surface">Votre panier est vide</p>
              <p className="font-sans text-[13px] text-on-surface-variant mt-1 max-w-[240px] mx-auto">
                Parcourez le menu et ajoutez vos plats préférés.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-1 px-5 h-10 rounded-full bg-surface-container-high text-on-surface font-sans text-[13px] font-medium flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">arrow_back</span>
              <span>Découvrir le menu</span>
            </button>
          </div>
        ) : (
          <>
            {/* Liste des articles — défilable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 min-h-0">
              {items.map(({ product, qty }) => {
                const unit = product.promo_price ?? product.price;
                const img = product.image_path
                  ? product.image_path.startsWith("http") || product.image_path.startsWith("/images")
                    ? product.image_path
                    : `${API_BASE.replace("/api", "")}${product.image_path}`
                  : null;
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3 transition-all duration-200"
                  >
                    {/* Miniature */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container shadow-sm">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>

                    {/* Infos produit */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-heading text-[14px] leading-snug text-on-surface truncate font-semibold">
                        {product.name}
                      </span>
                      <span className="font-sans text-[12px] text-on-surface-variant mt-0.5">
                        {formatPrice(unit, "FCFA")} / unité
                      </span>
                      <span className="font-heading text-[13px] text-[#D32F2F] font-bold mt-0.5">
                        {formatPrice(unit * qty, "FCFA")}
                      </span>
                    </div>

                    {/* Contrôles */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm">
                        <button
                          onClick={() => setQty(product.id, qty - 1)}
                          className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors active:scale-90"
                          aria-label="Diminuer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">remove</span>
                        </button>
                        <span className="w-7 text-center font-heading text-[14px] text-on-surface font-bold select-none">
                          {qty}
                        </span>
                        <button
                          onClick={() => setQty(product.id, qty + 1)}
                          className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors active:scale-90"
                          aria-label="Augmenter"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                        </button>
                      </div>
                      <button
                        onClick={() => remove(product.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                        aria-label="Supprimer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Footer récapitulatif ── */}
            <div className="px-6 pt-4 pb-6 border-t border-surface-container-high bg-surface-container-lowest/80 flex flex-col gap-3 shrink-0">
              {/* Récap coûts */}
              <div className="flex flex-col gap-2 bg-surface-container-low/70 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[13px] text-on-surface-variant">Sous-total</span>
                  <span className="font-heading text-[14px] font-semibold text-on-surface">
                    {formatPrice(total, "FCFA")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-secondary leading-none">moped</span>
                    <span>Livraison estimée</span>
                  </span>
                  <span className="font-sans text-[11px] text-secondary bg-secondary-container px-2 py-0.5 rounded-full font-semibold">
                    À l&apos;étape suivante
                  </span>
                </div>
              </div>

              {/* Badge confiance */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5 leading-none">verified_user</span>
                <div>
                  <p className="font-sans text-[13px] font-semibold text-on-surface">Paiement à la réception</p>
                  <p className="font-sans text-[12px] text-on-surface-variant mt-0.5">
                    Espèces, T-Money ou Flooz remis au livreur.
                  </p>
                </div>
              </div>

              {/* CTA principal */}
              <Link
                href={`/${slug}/checkout`}
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-[#D32F2F] text-white font-bold text-[14px] shadow-[0_4px_14px_rgba(211,47,47,0.35)] hover:bg-[#B71C1C] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 leading-none"
              >
                <span className="material-symbols-outlined text-[19px] leading-none">shopping_cart_checkout</span>
                <span>Passer la commande · {formatPrice(total, "FCFA")}</span>
              </Link>

              <button
                onClick={onClose}
                className="font-sans text-[12px] text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px] leading-none">arrow_back</span>
                <span>Continuer mes achats</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}