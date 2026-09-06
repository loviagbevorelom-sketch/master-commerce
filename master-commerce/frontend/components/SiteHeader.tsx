"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";

function digits(n?: string): string {
  return (n ?? "").replace(/\D/g, "");
}

export default function SiteHeader({
  slug,
  name: initialName,
  whatsapp: initialWhatsapp,
}: {
  slug: string;
  name?: string;
  whatsapp?: string;
}) {
  const pathname = usePathname();
  const { totalQty } = useCart();
  const [drawer, setDrawer] = useState(false);
  const [shop, setShop] = useState<{ name?: string; whatsapp?: string }>({
    name: initialName,
    whatsapp: initialWhatsapp,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (shop.name && shop.name !== "Ma boutique") return;
    api
      .getShop(slug)
      .then((s) =>
        setShop({ name: s.name, whatsapp: s.whatsapp_number ?? undefined })
      )
      .catch(() => {});
  }, [slug, shop.name]);

  // Fermer le menu mobile à la navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const qty = totalQty();
  const wa = digits(shop.whatsapp);

  const isCommandes = pathname?.includes(`/${slug}/commandes`) || pathname?.includes(`/${slug}/order`);
  const isCheckout = pathname === `/${slug}/checkout` || pathname?.includes(`/${slug}/checkout`);
  const isMenu = pathname === `/${slug}` || pathname === `/${slug}/` || (!isCommandes && !isCheckout);

  const activePillClass =
    "inline-flex items-center justify-center px-4 py-2 transition-all duration-200 bg-[#D32F2F] text-white text-[13px] rounded-full shadow-[0_2px_8px_rgba(211,47,47,0.4)] font-bold leading-none";
  const inactivePillClass =
    "inline-flex items-center justify-center px-4 py-2 rounded-full text-[13px] text-[#555] hover:text-[#1c1b1b] hover:bg-white hover:shadow-sm transition-all duration-200 font-medium leading-none";

  const brandName = shop.name
    ? shop.name.split("—")[0].split("–")[0].replace(/\uFFFD/g, "").trim()
    : "Kubafoodies";

  return (
    <>
      {/* ── Header Principal ── */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/96 backdrop-blur-md border-b border-[#eae7e7] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] transition-shadow">
        <div className="h-16 md:h-20 max-w-[1140px] mx-auto px-4 md:px-6 flex items-center justify-between gap-3">

          {/* Logo + nom + badge */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-none">
            <Link href={`/${slug}`} className="flex items-center gap-2.5 shrink-0 min-w-0 group">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-[#D32F2F]/5 flex items-center justify-center border border-[#D32F2F]/15 group-hover:scale-105 transition-transform">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${brandName} Logo`}
                  className="w-full h-full object-cover"
                  src="/images/logo-icon.png"
                />
              </div>
              <span className="font-heading text-[17px] md:text-[18px] text-on-surface tracking-tight font-bold group-hover:text-[#D32F2F] transition-colors truncate max-w-[220px] sm:max-w-none">
                {brandName}
              </span>
            </Link>

            {/* Badge statut — masqué sur très petit écran */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-semibold shrink-0 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
              <span>Ouvert</span>
            </div>
          </div>

          {/* Nav pills — Desktop uniquement */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#f0eded] shrink-0 border border-[#e5e2e1]">
            <Link
              href={`/${slug}`}
              className={isMenu ? activePillClass : inactivePillClass}
            >
              Menu &amp; Plats
            </Link>
            {isCheckout && (
              <span className={activePillClass}>
                Finaliser la commande
              </span>
            )}
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=Bonjour%2C%20je%20souhaite%20des%20renseignements%20pour%20un%20service%20traiteur`}
                target="_blank"
                rel="noopener noreferrer"
                className={inactivePillClass}
              >
                Traiteur
              </a>
            )}
            <Link
              href={`/${slug}/commandes`}
              className={isCommandes ? activePillClass : inactivePillClass}
            >
              Suivi Commande
            </Link>
          </nav>

          {/* Actions droite */}
          <div className="flex items-center gap-2 shrink-0">
            {/* WhatsApp — large écran */}
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white text-on-surface text-[13px] font-semibold shadow-sm border border-[#eae7e7] hover:bg-[#f6f3f2] transition-colors leading-none"
              >
                <span className="material-symbols-outlined text-[16px] text-[#10B981] leading-none">chat</span>
                <span className="leading-none">{shop.whatsapp}</span>
              </a>
            )}

            {/* Bouton hamburger — Mobile uniquement */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-[#f0eded] text-on-surface transition-all active:scale-95"
              aria-label="Menu de navigation"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] leading-none">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>

            {/* Bouton panier */}
            <button
              onClick={() => setDrawer(true)}
              className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#D32F2F] text-white hover:bg-[#B71C1C] transition-all active:scale-95 shadow-[0_3px_10px_rgba(211,47,47,0.35)]"
              aria-label="Ouvrir le panier"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] leading-none">shopping_bag</span>
              {qty > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#10B981] text-white text-[11px] flex items-center justify-center font-bold shadow-sm leading-none">
                  {qty}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Menu Mobile déroulant ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-[#eae7e7] bg-white ${
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
              href={`/${slug}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                isMenu
                  ? "bg-[#D32F2F]/8 text-[#D32F2F]"
                  : "text-on-surface hover:bg-[#f6f3f2]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">restaurant_menu</span>
              Menu &amp; Plats
            </Link>
            {isCheckout && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold bg-[#D32F2F]/8 text-[#D32F2F]">
                <span className="material-symbols-outlined text-[18px] leading-none">shopping_cart_checkout</span>
                Finaliser la commande
              </div>
            )}
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=Bonjour%2C%20je%20souhaite%20des%20renseignements%20pour%20un%20service%20traiteur`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-on-surface hover:bg-[#f6f3f2] transition-all"
              >
                <span className="material-symbols-outlined text-[18px] leading-none text-[#25D366]">forum</span>
                Service Traiteur
              </a>
            )}
            <Link
              href={`/${slug}/commandes`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                isCommandes
                  ? "bg-[#D32F2F]/8 text-[#D32F2F]"
                  : "text-on-surface hover:bg-[#f6f3f2]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">package_2</span>
              Suivi Commande
            </Link>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold text-on-surface hover:bg-[#f6f3f2] transition-all"
              >
                <span className="material-symbols-outlined text-[18px] leading-none text-[#10B981]">chat</span>
                {shop.whatsapp}
              </a>
            )}
          </nav>
        </div>
      </header>

      <CartDrawer slug={slug} open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}