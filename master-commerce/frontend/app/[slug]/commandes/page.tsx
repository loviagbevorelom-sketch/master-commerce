"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Order } from "@/lib/types";
import OrderTicket from "@/components/OrderTicket";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function OrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState({
    name: "Kubafoodies",
    whatsapp: undefined as string | undefined,
    currency: "FCFA",
  });
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    api
      .getShop(slug)
      .then((s) =>
        setShop({
          name: s.name,
          whatsapp: s.whatsapp_number ?? undefined,
          currency: s.currency,
        })
      )
      .catch(() => {});

    const ref = localStorage.getItem("mc_last_order");
    if (!ref) {
      setLoading(false);
      return;
    }
    api
      .getOrder(ref)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchRef.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setSearchError("");
    api
      .getOrder(clean)
      .then((ord) => {
        setOrder(ord);
        localStorage.setItem("mc_last_order", ord.ref);
      })
      .catch(() => {
        setSearchError("Aucune commande trouvée avec cette référence.");
      })
      .finally(() => setLoading(false));
  };

  const displayName = shop.name ? shop.name.split("—")[0].trim() : "Kubafoodies";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader slug={slug} name={shop.name} whatsapp={shop.whatsapp} />

      {/* ── Padding top généreux (pt-28 md:pt-32) pour supprimer tout risque de chevauchement ── */}
      <main className="flex-1 w-full pt-24 sm:pt-28 md:pt-32 pb-16 page-enter">
        <div className="w-full max-w-[1140px] mx-auto px-gutter">

          {/* En-tête de page responsive */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 mb-8 border-b border-[#eae7e7]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-thermal-mono text-thermal-mono text-on-surface-variant uppercase tracking-widest text-[11px]">
                  Suivi de commande en direct
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                Mes Commandes
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Suivez la préparation et la livraison de votre commande chez {displayName}.
              </p>
            </div>

            {/* Barre de recherche par référence pour Tablette / PC */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 sm:max-w-xs w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ex: CMD-2026-..."
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-lowest border border-[#eae7e7] text-on-surface font-mono text-xs focus-stitch shadow-sm"
                />
                <span className="material-symbols-outlined text-[18px] text-outline absolute left-3 top-3">
                  search
                </span>
              </div>
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-on-surface text-surface-container-lowest font-semibold text-[13px] hover:bg-[#D32F2F] active:scale-95 transition-all shadow-sm shrink-0 leading-none flex items-center justify-center"
              >
                Chercher
              </button>
            </form>
          </div>

          {searchError && (
            <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{searchError}</span>
            </div>
          )}

          {/* ── Contenu principal : État Chargement / Ticket Actif / État Vide ── */}
          <div className="w-full flex justify-center">
            {loading ? (
              <div className="w-full max-w-[640px] rounded-2xl bg-surface-container-lowest border border-[#eae7e7] p-12 flex flex-col items-center gap-4 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-spin">
                  <span className="material-symbols-outlined text-[24px]">progress_activity</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Recherche de votre ticket en cours…
                </p>
              </div>
            ) : order ? (
              <div className="w-full max-w-[640px]">
                <OrderTicket slug={slug} order={order} />
              </div>
            ) : (
              /* État vide stylisé Stitch — Adaptatif Mobile, Tablette et Desktop */
              <div className="w-full max-w-[700px] rounded-3xl bg-surface-container-lowest border border-[#eae7e7] p-8 sm:p-14 flex flex-col items-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#D32F2F]/60 to-[#D32F2F]" />
                <div className="w-20 h-20 rounded-full bg-[#D32F2F]/10 flex items-center justify-center text-[#D32F2F] mb-6 shadow-inner ring-4 ring-[#D32F2F]/5">
                  <span className="material-symbols-outlined text-[36px]">receipt_long</span>
                </div>

                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Aucune commande enregistrée
                </h2>

                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-2 leading-relaxed">
                  Votre dernier ticket apparaîtra ici après votre commande. Vous pourrez y suivre le statut en direct avec notre équipe en cuisine.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <Link
                    href={`/${slug}`}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#D32F2F] text-white font-bold text-[14px] shadow-[0_4px_14px_rgba(211,47,47,0.35)] hover:bg-[#B71C1C] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 leading-none"
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">restaurant_menu</span>
                    <span className="leading-none">Découvrir le menu</span>
                  </Link>

                  {shop.whatsapp && (
                    <a
                      href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}?text=Bonjour,%20je%20souhaite%20des%20informations%20sur%20ma%20commande`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white text-on-surface font-semibold text-[13px] hover:bg-[#f6f3f2] transition-colors flex items-center justify-center gap-2 border border-[#eae7e7] shadow-xs leading-none"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#10B981] leading-none">chat</span>
                      <span className="leading-none">Assistance WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <SiteFooter name={shop.name} whatsapp={shop.whatsapp} />
    </div>
  );
}