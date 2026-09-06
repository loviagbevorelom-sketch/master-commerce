"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { Order } from "@/lib/types";

export default function OrderTicket({ slug, order }: { slug: string; order: Order }) {
  const isPickup = order.reception_mode === "pickup";

  return (
    <div className="flex flex-col gap-6">
      {/* Bannière de succès */}
      <div className="bg-gradient-to-br from-[#B71C1C] via-[#D32F2F] to-[#C62828] text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_8px_30px_rgba(211,47,47,0.3)]">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-1 shadow-inner">
            <span className="material-symbols-outlined text-[34px] text-white">
              check_circle
            </span>
          </div>
          <span className="font-bold text-2xl sm:text-3xl tracking-tight">
            Commande reçue ! 🎉
          </span>
          <span className="text-sm text-white/90 max-w-md leading-relaxed">
            {isPickup
              ? "Récupérez votre commande au comptoir. Confirmez sur WhatsApp pour finaliser la préparation."
              : "L'équipe prépare votre commande. Confirmez sur WhatsApp pour finaliser la livraison."}
          </span>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide border border-white/20">
            <span className="material-symbols-outlined text-[16px]">receipt</span>
            {order.ref}
          </div>
        </div>
      </div>

      {/* Ticket physique */}
      <div className="rounded-3xl bg-white border border-surface-container-high p-5 sm:p-8 overflow-hidden relative shadow-card">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="font-heading text-xl font-bold text-on-surface">{order.shop_name}</span>
          <span className="text-xs text-on-surface-variant mt-1">
            {new Date(order.created_at).toLocaleString("fr-FR", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="border-t border-dashed border-surface-container-high py-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">badge</span>
            {order.customer_name}
          </span>
          <span className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">call</span>
            {order.customer_phone}
          </span>
        </div>

        <div className="border-t border-dashed border-surface-container-high py-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
            <span className="material-symbols-outlined text-[18px] text-[#D32F2F]">
              {isPickup ? "storefront" : "local_shipping"}
            </span>
            {isPickup ? "Retrait sur place" : `Livraison — ${order.delivery_zone_name ?? "Zone non spécifiée"}`}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] text-xs font-semibold border border-[#D32F2F]/20">
            {order.delivery_fee > 0 ? formatPrice(order.delivery_fee, order.currency) : "Gratuit"}
          </span>
        </div>

        <div className="flex flex-col gap-3 py-4">
          {order.items.map((it) => (
            <div key={`${it.product_id}-${it.product_name}`} className="flex items-start justify-between gap-4 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-[#D32F2F] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {it.qty}
                </span>
                <span className="font-medium truncate text-on-surface">{it.product_name}</span>
              </div>
              <span className="text-on-surface-variant shrink-0">
                {formatPrice(it.unit_price * it.qty, order.currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-surface-container-high py-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-on-surface-variant">
            <span>Sous-total</span>
            <span>{formatPrice(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Livraison</span>
            <span>
              {order.delivery_fee > 0
                ? formatPrice(order.delivery_fee, order.currency)
                : "Gratuit"}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-bold text-base text-on-surface">Total à payer</span>
            <span className="text-xl font-black text-[#D32F2F]">
              {formatPrice(order.total, order.currency)}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-surface-container-high pt-4 flex items-center justify-center text-xs text-on-surface-variant tracking-wide uppercase">
          Master Commerce · {order.ref}
        </div>
      </div>

      {/* Actions globales */}
      <div className="flex flex-col sm:flex-row gap-3">
        {order.whatsapp_link && (
          <a
            href={order.whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-12 rounded-full bg-[#25D366] hover:bg-[#1ebd59] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" aria-hidden>
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.09c-.25.7-1.46 1.34-2.01 1.38-.55.05-1.05.25-3.49-.73-2.98-1.18-4.87-4.26-5.02-4.46-.14-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.37.79-.37.2 0 .39 0 .56.01.18.01.43-.07.67.51.25.59.85 2.04.92 2.19.07.14.12.31.02.5-.1.2-.15.32-.3.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.61.17.3.76 1.26 1.64 2.04 1.13 1 2.08 1.31 2.38 1.46.3.15.47.12.64-.07.17-.2.73-.86.93-1.15.2-.3.39-.25.65-.15.26.1 1.66.78 1.94.93.29.15.48.22.55.34.07.12.07.71-.18 1.4z" />
            </svg>
            Confirmer sur WhatsApp
          </a>
        )}
        <Link
          href={`/${slug}`}
          className="flex-1 h-12 rounded-full bg-white border border-surface-container-high text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Retour au menu
        </Link>
      </div>
    </div>
  );
}