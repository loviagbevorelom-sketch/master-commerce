"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";
import { formatPrice } from "@/lib/format";

interface OrderRow {
  id: number;
  ref: string;
  customer_name: string;
  customer_phone: string;
  reception_mode: "delivery" | "pickup";
  delivery_zone_name: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  payment_method?: "cod" | "fedapay";
  payment_status?: "pending" | "paid" | "failed";
  created_at: string;
  items: { product_name: string; unit_price: number; qty: number }[];
}

const FILTERS = [
  { k: "all", label: "Toutes", icon: "", countKey: "all", hover: "hover:bg-surface-container-low hover:border-surface-container-high", iconColor: "", count: "bg-surface-container text-on-surface-variant" },
  { k: "pending", label: "En attente", icon: "⏳", countKey: "pending", hover: "hover:bg-amber-50/70 hover:border-amber-200", count: "bg-amber-100 text-amber-800", iconColor: "text-amber-600" },
  { k: "confirmed", label: "Confirmées", icon: "✅", countKey: "confirmed", hover: "hover:bg-emerald-50/70 hover:border-emerald-200", count: "bg-emerald-100 text-emerald-800", iconColor: "text-emerald-600" },
  { k: "delivered", label: "Livrées", icon: "🚚", countKey: "delivered", hover: "hover:bg-blue-50/70 hover:border-blue-200", count: "bg-blue-100 text-blue-800", iconColor: "text-blue-600" },
  { k: "cancelled", label: "Annulées", icon: "❌", countKey: "cancelled", hover: "hover:bg-surface-container-low hover:border-surface-container-high", count: "bg-surface-container text-on-surface-variant", iconColor: "text-rose-500" },
] as const;

type FilterKey = (typeof FILTERS)[number]["k"];

function timeHM(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relTime(iso: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `${new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((w) => w[0]).join("") || "?").toUpperCase();
}

export default function ShopOrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shop, setShop] = useState<{ name: string; slug: string; is_active: boolean } | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [o, s] = await Promise.all([adminApi.getOrders(sid), adminApi.getShops()]);
    if (o.ok) setOrders(await o.json());
    if (s.ok) {
      const shops = await s.json();
      const cur = shops.find((x: { id: number }) => x.id === sid);
      if (cur) setShop({ name: cur.name, slug: cur.slug, is_active: cur.is_active });
    }
    setLoading(false);
  }, [sid]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(o: OrderRow, status: OrderRow["status"]) {
    await adminApi.updateOrderStatus(sid, o.id, status);
    load();
  }

  async function shareLink() {
    if (!shop) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const count = (k: FilterKey) =>
    k === "all" ? orders.length : orders.filter((o) => o.status === k).length;
  const pendingCount = count("pending");
  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const nav = [
    { href: `/admin/shops/${sid}`, label: "📊 Bord" },
    { href: `/admin/shops/${sid}/orders`, label: "🛒 Commandes" },
    { href: `/admin/shops/${sid}/produits`, label: "📦 Produits" },
    { href: `/admin/shops/${sid}/publications`, label: "📣 Posts" },
    { href: `/admin/shops/${sid}/settings`, label: "⚙️ Réglages" },
  ];

  const badge = {
    pending: "bg-amber-50 text-amber-800 border-amber-200/80",
    urgent: "bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F]/20",
    confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    delivered: "bg-stone-100 text-stone-700",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  return (
    <main className="mx-auto max-w-7xl min-h-screen flex flex-col bg-background text-on-surface font-sans antialiased">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-surface-container-high py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/shops/${sid}`}
              className="inline-flex items-center text-sm font-semibold text-[#D32F2F] hover:opacity-80 transition-opacity group"
            >
              <span className="mr-1.5 font-bold transition-transform group-hover:-translate-x-1">←</span>
              Tableau de bord
            </Link>
            <span className="text-on-surface-variant/40">•</span>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-medium text-[#065F46]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>{shop ? (shop.is_active ? "En ligne · Ouvert jusqu'à 22h00" : "Hors ligne") : "En ligne · Ouvert jusqu'à 22h00"}</span>
            </div>
          </div>

          <nav aria-label="Menu marchand" className="flex items-center self-start lg:self-center bg-white/90 p-1 rounded-full border border-surface-container-high shadow-card overflow-x-auto max-w-full no-scrollbar">
            {nav.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors leading-none ${
                  t.href === `/admin/shops/${sid}/orders`
                    ? "font-semibold text-white bg-[#D32F2F] shadow-[0_2px_8px_rgba(211,47,47,0.35)]"
                    : "font-medium text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>{t.label.split(" ")[0]}</span>
                <span>{t.label.split(" ").slice(1).join(" ")}</span>
              </Link>
            ))}
          </nav>

          {shop && (
            <div className="hidden lg:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-on-surface leading-none">{shop.name}</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">ID Boutique: #{sid}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#D32F2F] text-white font-heading font-bold text-xs flex items-center justify-center">
                {initials(shop.name)}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===== Contenu ===== */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 page-enter">
        {/* Titre + partage */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold tracking-widest text-[#D32F2F] uppercase mb-1">
              Cuisine &amp; Livraison
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
                <span>🛒</span> Commandes
              </h1>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#D32F2F]/8 text-[#D32F2F] border border-[#D32F2F]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                  {pendingCount} à traiter rapidement
                </span>
              )}
            </div>
          </div>
          {shop && (
            <button
              onClick={shareLink}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-surface-container-high text-xs font-semibold text-on-surface hover:bg-surface-container-low shadow-card transition-all active:scale-95"
              title="Copier l'URL publique de la boutique"
              type="button"
            >
              <svg className="w-4 h-4 text-[#D32F2F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>{copied ? "✓ Lien copié !" : "Partager mon lien boutique"}</span>
              <span className="text-[10px] font-mono bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded border border-surface-container-high hidden sm:inline">
                /{shop.slug}
              </span>
            </button>
          )}
        </section>

        {/* Filtres */}
        <section aria-label="Filtres par statut" className="overflow-x-auto pb-1 no-scrollbar">
          <div className="inline-flex items-center gap-2 p-1 rounded-2xl bg-white/80 backdrop-blur border border-surface-container-high shadow-card">
            {FILTERS.map((f) => {
              const active = filter === f.k;
              return (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all ${
                    active
                      ? "font-semibold bg-[#D32F2F] text-white shadow-sm"
                      : `font-medium text-on-surface border border-transparent hover:bg-surface-container-low hover:border-surface-container-high`
                  }`}
                >
                  {f.icon && <span>{f.icon}</span>}
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-surface-container text-on-surface-variant"}`}>
                    {count(f.k)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Liste */}
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block w-6 h-6 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm mt-3 text-on-surface-variant">Chargement…</p>
          </div>
        ) : visible.length === 0 ? (
          <section className="rounded-2xl border-2 border-dashed border-surface-container-high p-10 text-center bg-white/60">
            <div className="w-12 h-12 mx-auto rounded-full bg-surface-container flex items-center justify-center text-xl mb-3">🛒</div>
            <p className="text-sm font-medium text-on-surface">
              {filter === "all"
                ? "Aucune commande pour le moment."
                : `Aucune commande « ${FILTERS.find((f) => f.k === filter)?.label} ».`}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Partagez votre lien de commande à vos clients !
            </p>
            <div className="mt-4">
              {shop ? (
                <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold text-[#D32F2F] hover:underline">
                  Voir la vitrine client en direct →
                </a>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {visible.map((o) => {
              const urgent = o.status === "pending" && o.reception_mode === "delivery";
              const pickup = o.reception_mode === "pickup";
              const active = o.status === "pending" || o.status === "confirmed";
              const isPaid = o.payment_status === "paid";
              const isFedaPay = o.payment_method === "fedapay";
              const lineTotal = o.items.reduce((s, it) => s + it.unit_price * it.qty, 0);

              if (!active) {
                return (
                  <article key={o.id} className="bg-white/90 rounded-2xl border border-surface-container-high p-5 sm:p-6 opacity-90 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded ${o.status === "delivered" ? "bg-surface-container text-on-surface-variant" : "bg-rose-50 text-rose-700"}`}>
                            #{o.ref}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge[o.status]}`}>
                            <span>{o.status === "delivered" ? "🚚" : "❌"} {o.status === "delivered" ? "Livrée" : "Annulée"}</span>
                          </span>
                          {isFedaPay && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${isPaid ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                              💳 FedaPay {isPaid ? "Payé" : "En attente"}
                            </span>
                          )}
                          <span className="text-xs text-on-surface-variant">
                            {o.status === "delivered" ? "Terminée à" : "Annulée à"} {timeHM(o.created_at)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface">
                          <span className="font-bold">{o.customer_name}</span>
                          <span className="text-on-surface-variant">•</span>
                          <span>{pickup ? "🏃 Retrait comptoir" : `🚚 ${o.delivery_zone_name ?? "Zone non précisée"}`}</span>
                          <span className="text-on-surface-variant">•</span>
                          <span className="text-on-surface-variant">{o.items.reduce((s, it) => s + it.qty, 0)} article(s)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-container-high">
                        <div className="text-right">
                          <span className="text-xs text-on-surface-variant block">Total {o.status === "delivered" ? "réglé" : "non réglé"}</span>
                          <span className="font-heading font-bold text-lg text-on-surface">{formatPrice(o.total, o.currency)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-semibold">
                          {o.status === "delivered" ? "✓ Clôturée" : "Archivée"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={o.id}
                  className={`bg-white rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200 relative overflow-hidden ${
                    urgent ? "border-2 border-[#D32F2F]/30" : "border border-surface-container-high"
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${urgent ? "bg-[#D32F2F]" : o.status === "confirmed" ? "bg-emerald-500" : "bg-amber-400"}`}></div>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Gauche */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-sm bg-surface-container-low border border-surface-container-high px-2.5 py-1 rounded-lg text-on-surface">
                          #{o.ref}
                        </span>
                        {urgent ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.urgent}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-ping"></span>
                            En attente (Urgent)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${o.status === "pending" ? badge.pending : badge.confirmed}`}>
                            <span>{o.status === "pending" ? "⏳" : "✅"} {o.status === "pending" ? "En attente" : "Confirmée"}</span>
                          </span>
                        )}

                        {/* Badge Mode de Paiement */}
                        {isFedaPay ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${isPaid ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-blue-100 text-blue-800 border border-blue-300"}`}>
                            💳 FedaPay {isPaid ? "✓ Payé" : "⏳ En attente"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            💵 À la livraison (COD)
                          </span>
                        )}

                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-on-surface-variant/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                          {relTime(o.created_at)} · {timeHM(o.created_at)}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${o.status === "confirmed" ? "bg-emerald-100 text-emerald-900" : urgent ? "bg-amber-100 text-amber-900" : "bg-[#D32F2F]/10 text-[#D32F2F]"}`}>
                            {initials(o.customer_name)}
                          </div>
                          <div>
                            <div className="font-bold text-on-surface">{o.customer_name}</div>
                            <a className="text-xs text-[#D32F2F] hover:underline font-medium" href={`tel:${o.customer_phone}`}>
                              📞 {o.customer_phone}
                            </a>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 text-xs text-on-surface border px-3 py-2 rounded-xl ${urgent ? "bg-surface-container-low border-surface-container-high" : "bg-amber-50/50 border-amber-100"}`}>
                          <span className="text-base">{pickup ? "🏃" : "🚚"}</span>
                          <div>
                            <div className="font-semibold text-on-surface">
                              {pickup ? "Retrait sur place" : o.status === "confirmed" ? "Livraison en route" : "Livraison"}
                            </div>
                            <div className="text-on-surface-variant">
                              {pickup ? "Au comptoir" : o.delivery_zone_name ?? "Zone non précisée"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-surface-container-high space-y-1.5 text-xs text-on-surface">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span><span className="font-bold text-[#D32F2F] font-mono">{it.qty}×</span> {it.product_name}</span>
                            <span className="font-medium text-on-surface-variant">{formatPrice(it.unit_price * it.qty, o.currency)}</span>
                          </div>
                        ))}
                        {!pickup && o.delivery_fee > 0 && (
                          <div className="flex justify-between items-center text-on-surface-variant italic">
                            <span>Frais de livraison ({o.delivery_zone_name})</span>
                            <span>{formatPrice(o.delivery_fee, o.currency)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Droite : montant + actions */}
                    <div className="lg:w-72 lg:border-l lg:border-surface-container-high lg:pl-6 flex flex-col justify-between self-stretch pt-3 lg:pt-0 border-t lg:border-t-0 border-surface-container-high">
                      <div className="space-y-1 mb-4">
                        <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold block">
                          {o.status === "pending" ? "Montant à régler" : "Total commande"}
                        </span>
                        <div className="font-heading text-2xl font-extrabold text-on-surface">
                          {formatPrice(o.total, o.currency).replace(/ FCFA$/, "")}
                          <span className="text-sm font-semibold text-on-surface-variant font-sans"> FCFA</span>
                        </div>
                        <div className={`text-[11px] font-medium ${o.status === "confirmed" ? "text-emerald-800" : "text-on-surface-variant"}`}>
                          {pickup ? "Paiement au comptoir" : o.status === "confirmed" ? "✓ Confirmée" : `Sous-total ${formatPrice(lineTotal, o.currency)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {o.status === "pending" ? (
                          <button
                            onClick={() => setStatus(o, "confirmed")}
                            type="button"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D32F2F] text-white hover:bg-[#B71C1C] text-xs font-bold shadow-sm transition-all active:scale-95"
                            title="Confirmer la préparation"
                          >
                            <span>✓</span> Confirmer
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(o, "delivered")}
                            type="button"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold shadow-sm transition-all active:scale-95"
                            title="Marquer la commande livrée"
                          >
                            <span>🚚</span> Marquer livrée
                          </button>
                        )}
                        <button
                          onClick={() => setStatus(o, "cancelled")}
                          type="button"
                          className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 text-xs font-semibold transition-colors"
                          title="Annuler cette commande"
                        >
                          <span>✕</span> Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* ===== Footer ===== */}
      <footer className="mt-auto py-6 border-t border-surface-container-high bg-white/60 text-center text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto px-4">
          <span>Master Commerce · {shop?.name ?? "Boutique"} Admin Engine</span>
          <span className="mx-2">•</span>
          <span>Lomé, Togo</span>
        </div>
      </footer>
    </main>
  );
}