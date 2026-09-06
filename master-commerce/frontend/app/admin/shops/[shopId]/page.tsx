"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

interface OrderRow {
  id: number;
  ref: string;
  customer_name: string;
  customer_phone: string;
  reception_mode: "delivery" | "pickup";
  delivery_zone_name: string | null;
  total: number;
  currency: string;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  created_at: string;
  items: { product_id: number; product_name: string; unit_price: number; qty: number }[];
}

const STATUS_META: Record<OrderRow["status"], { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-secondary-fixed text-on-secondary-fixed-variant" },
  confirmed: { label: "Confirmée", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
  delivered: { label: "Livrée", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
  cancelled: { label: "Annulée", cls: "bg-surface-container-high text-on-surface-variant" },
};

const DONE = ["confirmed", "delivered"];

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ShopDashboard() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = "FCFA";

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([adminApi.getOrders(sid), adminApi.getProducts(sid)]);
    if (o.ok) setOrders(await o.json());
    if (p.ok) setProducts(await p.json());
    setLoading(false);
  }, [sid]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const today = todayStr();
    const done = orders.filter((o) => DONE.includes(o.status));
    const todayDone = done.filter((o) => o.created_at.slice(0, 10) === today);
    const revenueToday = todayDone.reduce((s, o) => s + o.total, 0);
    const revenueAll = done.reduce((s, o) => s + o.total, 0);
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => o.status === "pending");
    const avg = done.length > 0 ? revenueAll / done.length : 0;

    const counts: Record<string, number> = {};
    const revenue: Record<string, number> = {};
    for (const o of done) {
      for (const it of o.items) {
        counts[it.product_name] = (counts[it.product_name] ?? 0) + it.qty;
        revenue[it.product_name] =
          (revenue[it.product_name] ?? 0) + it.qty * it.unit_price;
      }
    }
    const top = Object.entries(counts)
      .map(([name, qty]) => ({ name, qty, total: revenue[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
    const maxQty = top[0]?.qty ?? 1;

    const lowStock = products.filter((p) => p.stock !== null && p.stock <= 5);
    const outOfStock = products.filter((p) => p.stock === 0);

    return {
      revenueToday,
      revenueAll,
      ordersCount: done.length,
      delivered,
      pending,
      avg,
      top,
      maxQty,
      lowStock,
      outOfStock,
    };
  }, [orders, products]);

  const deliveryRate =
    stats.ordersCount > 0
      ? Math.round((stats.delivered / stats.ordersCount) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-5xl min-h-screen page-enter"
      style={{ background: "#fff8f4" }}
    >
      <header className="px-5 pt-5 pb-3 sticky top-0 z-20 backdrop-blur-xl"
        style={{ background: "rgba(255,248,244,0.9)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="text-sm font-semibold text-[#D32F2F] hover:underline"
          >
            ← Mes boutiques
          </Link>
          <nav className="flex gap-2 flex-wrap">
            {[
              { href: `/admin/shops/${sid}`, label: "📊 Bord" },
              { href: `/admin/shops/${sid}/orders`, label: "🛒 Commandes" },
              { href: `/admin/shops/${sid}/produits`, label: "🍲 Menu & Plats" },
              { href: `/admin/shops/${sid}/publications`, label: "📣 Posts Sociaux" },
              { href: `/admin/shops/${sid}/settings`, label: "⚙️ Réglages & QR" },
            ].map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all leading-none inline-flex items-center justify-center"
                style={
                  t.href === `/admin/shops/${sid}`
                    ? { background: "#D32F2F", color: "#fff", boxShadow: "0 2px 8px rgba(211,47,47,0.35)" }
                    : { background: "#f3ede9", color: "#3e4a3d" }
                }
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="px-5 pb-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D32F2F]">
              Vue Marchand Agréé · Actualisé à l&apos;instant
            </span>
            <h1 className="text-[28px] font-semibold tracking-tight leading-8 text-on-surface">
              📊 Ma journée
            </h1>
          </div>
          {!loading && Math.round(stats.revenueToday) > 0 && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-full bg-[#D32F2F]/8 text-[#D32F2F]">💰 {formatPrice(stats.revenueToday, currency)} encaissés aujourd&apos;hui</span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-sm" style={{ color: "#6e7b6c" }}>Chargement…</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[20px] p-5 bg-surface-container-lowest relative overflow-hidden"
                style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)", background: "#ffffff" }}
              >
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-xl pointer-events-none"
                  style={{ background: "rgba(127,252,151,0.25)" }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-on-surface-variant">💰 Encaissé aujourd&apos;hui</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#D32F2F]/10 text-[#D32F2F]">
                    <span className="material-symbols-outlined text-[18px] leading-none">payments</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[22px] font-bold tracking-tight text-on-surface">
                    {formatPrice(stats.revenueToday, currency)}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-[#D32F2F]">
                    <span className="material-symbols-outlined text-[16px] leading-none">trending_up</span>
                    <span>Total confirmé/livré</span>
                  </div>
                </div>
                <div className="mt-4 pt-1 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>CA cumulé</span>
                  <span className="font-semibold text-on-surface">
                    {formatPrice(stats.revenueAll, currency)}
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] p-5 bg-surface-container-lowest"
                style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)", background: "#ffffff" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold" style={{ color: "#3e4a3d" }}>🧾 Commandes reçues</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#ede7e3", color: "#3e4a3d" }}
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[22px] font-bold tracking-tight" style={{ color: "#1d1b19" }}>
                    {stats.ordersCount} <span className="text-[18px] font-semibold" style={{ color: "#3e4a3d" }}>commandes</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: "#3e4a3d" }}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#ede7e3", color: "#1d1b19" }}
                    >
                      {stats.delivered} livrées
                    </span>
                    <span>•</span>
                    <span>Panier moyen {formatPrice(stats.avg, currency)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-1 flex items-center gap-2">
                  <div className="w-full h-2 rounded-full overflow-hidden bg-surface-container-high">
                  <div className="h-full rounded-full bg-[#D32F2F]" style={{ width: `${deliveryRate}%` }} />
                </div>
                <span className="text-[11px] whitespace-nowrap text-on-surface-variant">{deliveryRate}% livrées</span>
                </div>
              </div>

              <div className="rounded-[20px] p-5 relative overflow-hidden"
                style={{ background: "rgba(255,219,202,0.35)", boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ background: "#9d4300" }} />
                    <span className="text-[13px] font-bold" style={{ color: "#5c2400" }}>
                      📦 À préparer maintenant
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{ background: "#fd761a", color: "#ffffff" }}
                  >
                    Urgent
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-[22px] font-bold tracking-tight" style={{ color: "#5c2400" }}>
                    {stats.pending.length} <span className="text-[18px] font-semibold" style={{ color: "#9d4300" }}>tickets en cuisine</span>
                  </div>
                  {stats.pending.length > 0 ? (
                    <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: "#783200" }}>
                      <span className="material-symbols-outlined text-[16px]">timer</span>
                      <span>
                        {stats.pending.slice(0, 2).map((o) => o.customer_name.split(" ")[0]).join(", ")}…
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: "#783200" }}>
                      Tout est servi. 🔥
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-1 flex items-center justify-between">
                  <Link
                    href={`/admin/shops/${sid}/orders`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "#9d4300", color: "#fff" }}
                  >
                    Traiter les commandes
                  </Link>
                  <span className="text-xs" style={{ color: "#5c2400" }}>
                    {stats.pending.length} en attente
                  </span>
                </div>
              </div>
            </div>

            {/* Top produits + Récentes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-[20px] p-6 flex flex-col gap-4 bg-white shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#D32F2F]/10 text-[#D32F2F]">
                      <span className="material-symbols-outlined text-[18px] leading-none">trending_up</span>
                    </div>
                    <h2 className="text-[18px] font-semibold text-on-surface">📈 Top produits du jour</h2>
                  </div>
                  <span className="text-xs text-on-surface-variant">Classé par volume</span>
                </div>
                {stats.top.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    Aucune vente confirmée aujourd&apos;hui. Partagez votre lien !
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {stats.top.map((t, i) => (
                      <div key={t.name} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-surface-container text-on-surface">
                              {i + 1}
                            </span>
                            <span className="text-[15px] font-semibold text-on-surface truncate max-w-[180px]">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-on-surface-variant">{t.qty} cmds</span>
                            <span className="text-[17px] font-bold text-on-surface">
                              {formatPrice(t.total, currency)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-surface-container-high">
                          <div className="h-full rounded-full transition-all duration-700 bg-[#D32F2F]"
                            style={{ width: `${Math.max(8, (t.qty / stats.maxQty) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[20px] p-6 flex flex-col gap-4 bg-white shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] leading-none">history</span>
                    </div>
                    <h2 className="text-[18px] font-semibold text-on-surface">🕓 Dernières commandes</h2>
                  </div>
                  <Link href={`/admin/shops/${sid}/orders`} className="inline-flex items-center gap-1 text-[13px] font-semibold hover:underline text-[#D32F2F]">
                    Voir tout
                  </Link>
                </div>
                {orders.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Aucune commande pour l&apos;instant.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-surface-container-high">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="py-3 flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            {new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-[14px] font-semibold truncate text-on-surface">{o.customer_name}</span>
                          <span className="text-[12px] truncate text-on-surface-variant">
                            {o.reception_mode === "delivery" ? `Livraison — ${o.delivery_zone_name ?? "zone non précisée"}` : "Retrait sur place"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[16px] font-bold text-on-surface">
                            {formatPrice(o.total, currency)}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5 ${STATUS_META[o.status].cls}`}>
                            {STATUS_META[o.status].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Alertes stock bas */}
            {(stats.lowStock.length > 0 || stats.outOfStock.length > 0) && (
              <div className="rounded-[20px] p-6 flex flex-col gap-3"
                style={{ background: "#ffffff", boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-error leading-none">warning</span>
                    <h2 className="text-[17px] font-semibold text-on-surface">⚠️ Alertes &amp; Stock bas</h2>
                  </div>
                  <Link href={`/admin/shops/${sid}/produits`} className="text-[13px] font-semibold hover:underline text-[#D32F2F]">
                    Gérer les stocks →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.outOfStock.map((p) => (
                    <div key={p.id} className="rounded-xl p-3 flex flex-col gap-1"
                      style={{ background: "#ffdad6", color: "#93000a" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold" style={{ color: "#93000a" }}>{p.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "#b61722", color: "#fff" }}>
                          Épuisé
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "#93000a" }}>Rupture — masqué de la vitrine.</p>
                    </div>
                  ))}
                  {stats.lowStock.filter((p) => p.stock !== 0).map((p) => (
                    <div key={p.id} className="rounded-xl p-3 flex flex-col gap-1"
                      style={{ background: "rgba(255,219,202,0.5)", color: "#783200" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold" style={{ color: "#783200" }}>{p.name}</span>
                        <span className="text-xs font-bold" style={{ color: "#9d4300" }}>Reste {p.stock}</span>
                      </div>
                      <p className="text-xs" style={{ color: "#783200" }}>Stock critique pour le service du soir.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}