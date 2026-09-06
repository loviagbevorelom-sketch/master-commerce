"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, logout } from "@/lib/admin";
import { formatPrice } from "@/lib/format";

interface Overview {
  merchants_total: number;
  shops_total: number;
  orders_total: number;
  pending_orders: number;
  revenue: number;
  commission: number;
  setup_revenue: number;
  recent_orders: {
    ref: string;
    shop_name: string;
    total: number;
    currency: string;
    status: string;
    created_at: string;
  }[];
}

interface PlatformShop {
  id: number;
  name: string;
  slug: string;
  whatsapp_number: string;
  currency: string;
  is_active: boolean;
  merchant_email: string | null;
  commission_rate: number;
  setup_fee: number;
  orders_count: number;
  revenue: number;
  commission: number;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Attente",
  confirmed: "✅ Confirmée",
  delivered: "🚚 Livrée",
  cancelled: "❌ Annulée",
};

export default function PlatformPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [shops, setShops] = useState<PlatformShop[]>([]);
  const [form, setForm] = useState({
    merchant_email: "",
    name: "",
    whatsapp_number: "",
    commission_rate: "10",
    setup_fee: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [ovRes, shopsRes] = await Promise.all([
      adminApi.platformOverview(),
      adminApi.platformShops(),
    ]);
    if (ovRes.ok) setOv(await ovRes.json());
    if (shopsRes.ok) setShops(await shopsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const payload = {
      merchant_email: form.merchant_email,
      name: form.name,
      whatsapp_number: form.whatsapp_number,
      commission_rate: Number(form.commission_rate) / 100,
      setup_fee: Number(form.setup_fee || 0),
    };
    const res = await adminApi.platformCreateShop(payload);
    if (res.ok) {
      setOk(
        `✅ Boutique « ${form.name} » créée à façon (commission ${form.commission_rate} %, setup ${formatPrice(Number(form.setup_fee) || 0, "FCFA")}).`
      );
      setForm({ merchant_email: "", name: "", whatsapp_number: "", commission_rate: "10", setup_fee: "" });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(
        typeof d.detail === "string"
          ? d.detail
          : "Erreur — le marchand doit d'abord être enregistré"
      );
    }
  }

  async function toggleActive(s: PlatformShop) {
    await adminApi.platformUpdateShop(s.id, { is_active: !s.is_active });
    load();
  }

  const kpis = ov
    ? [
        { label: "Boutiques", value: ov.shops_total, icon: "🛍️", cls: "bg-white" },
        { label: "Marchands", value: ov.merchants_total, icon: "👤", cls: "bg-white" },
        { label: "Commandes", value: ov.orders_total, icon: "🧾", cls: "bg-white" },
        { label: "À traiter", value: ov.pending_orders, icon: "⏳", cls: "bg-amber-50" },
        { label: "Chiffres d'affaires", value: formatPrice(ov.revenue, "FCFA"), icon: "💰", cls: "bg-white" },
        { label: "Commissions (10%…)", value: formatPrice(ov.commission, "FCFA"), icon: "📈", cls: "bg-indigo-50" },
        { label: "Frais création", value: formatPrice(ov.setup_revenue, "FCFA"), icon: "🧰", cls: "bg-white" },
      ]
    : [];

  return (
    <main className="mx-auto max-w-4xl min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-neutral-500">
            ← Boutiques
          </Link>
          <h1 className="font-bold">🛡️ Plateforme Master Commerce</h1>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = "/admin/login";
          }}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Déconnexion
        </button>
      </header>

      {loading ? (
        <p className="text-center text-neutral-400 text-sm mt-10">Chargement…</p>
      ) : (
        <div className="px-4 mt-4 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div
                key={k.label}
                className={`${k.cls} rounded-2xl p-4 shadow-sm border border-neutral-100`}
              >
                <p className="text-xs text-neutral-500">
                  {k.icon} {k.label}
                </p>
                <p className="text-lg font-bold mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          {error && (
            <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</p>
          )}
          {ok && (
            <p className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3">{ok}</p>
          )}

          <form
            onSubmit={createShop}
            className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 space-y-3"
          >
            <h2 className="font-bold text-sm">🏗️ Créer une boutique à façon (monétisation)</h2>
            <p className="text-xs text-neutral-500">
              Vendée/offerte au marchand : vous fixez la commission et le forfait de mise en
              place. Le marchand doit déjà avoir un compte (inscription /auth/register).
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                type="email"
                placeholder="Email du marchand"
                value={form.merchant_email}
                onChange={(e) => setForm({ ...form, merchant_email: e.target.value })}
                required
              />
              <input
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                placeholder="Nom de la boutique"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
              />
              <input
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                type="tel"
                placeholder="Numéro WhatsApp (+228…)"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                  type="number"
                  min="0"
                  max="99"
                  placeholder="Commission %"
                  value={form.commission_rate}
                  onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                  required
                />
                <input
                  className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
                  type="number"
                  min="0"
                  placeholder="Setup (FCFA)"
                  value={form.setup_fee}
                  onChange={(e) => setForm({ ...form, setup_fee: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm"
            >
              Créer la boutique pour le marchand
            </button>
          </form>

          <section>
            <h2 className="font-bold text-sm mb-2">🏪 Toutes les boutiques</h2>
            <div className="space-y-2">
              {shops.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 flex flex-wrap items-center gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-sm">
                      {s.name}
                      <span className="text-neutral-400 font-normal"> /{s.slug}</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      {s.merchant_email ?? "—"} · WhatsApp {s.whatsapp_number}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {s.orders_count} cmd(s) · CA {formatPrice(s.revenue, s.currency)} ·
                      commission {Math.round(s.commission_rate * 100)}% (
                      {formatPrice(s.commission, s.currency)}) · setup{" "}
                      {formatPrice(s.setup_fee, s.currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                      s.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {s.is_active ? "En ligne" : "Hors ligne"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {ov && ov.recent_orders.length > 0 && (
            <section>
              <h2 className="font-bold text-sm mb-2">🕘 Dernières commandes du réseau</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 divide-y divide-neutral-100">
                {ov.recent_orders.map((o) => (
                  <div key={o.ref} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{o.shop_name}</p>
                      <p className="text-xs text-neutral-500">
                        {o.ref} · {new Date(o.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatPrice(o.total, o.currency)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}