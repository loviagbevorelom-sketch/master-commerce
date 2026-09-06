"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, getToken, logout } from "@/lib/admin";

interface Shop {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  whatsapp_number: string;
  currency: string;
  is_active: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    adminApi.me().then(async (res) => {
      if (res.ok) setRole((await res.json()).role ?? null);
    });
    adminApi.getShops().then(async (res) => {
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      setShops(await res.json());
      setLoading(false);
    });
  }, [router]);

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await adminApi.createShop({ name, whatsapp_number: phone });
    if (res.ok) {
      const shop = await res.json();
      setName("");
      setPhone("");
      setShops((prev) => [...prev, shop]);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.detail === "string" ? data.detail : "Erreur de création"
      );
    }
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  }

  return (
    <main className="mx-auto max-w-3xl min-h-screen pb-16 bg-background text-on-surface page-enter">
      {/* Header Sticky */}
      <header className="px-6 py-4 sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-surface-container-high flex items-center justify-between shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D32F2F]">
            Espace Restaurateur
          </span>
          <h1 className="font-heading text-xl font-bold text-on-surface">
            Mes Établissements
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          {role === "owner" && (
            <Link
              href="/admin/plateforme"
              className="px-3.5 py-1.5 rounded-full text-[12px] font-bold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              🛡️ Plateforme
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            type="button"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Liste des boutiques */}
      <section className="px-6 mt-6 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm mt-3 text-on-surface-variant">Chargement de vos établissements…</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-surface-container-high p-8 shadow-card">
            <p className="font-semibold text-on-surface">Aucun établissement configuré</p>
            <p className="text-[12px] text-on-surface-variant mt-1">Créez votre première boutique ci-dessous pour démarrer.</p>
          </div>
        ) : (
          shops.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl p-5 bg-white border border-surface-container-high shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#D32F2F]/8 text-[#D32F2F] border border-[#D32F2F]/15">
                    <span className="material-symbols-outlined text-[26px]">storefront</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-base text-on-surface truncate">{s.name}</p>
                    <p className="text-[12px] font-mono text-on-surface-variant mt-0.5">
                      /{s.slug} · WhatsApp : {s.whatsapp_number}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    s.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                  }`}
                >
                  {s.is_active ? "En ligne" : "Hors ligne"}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-container-high flex gap-2 flex-wrap items-center">
                <Link
                  href={`/admin/shops/${s.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D32F2F] text-white hover:bg-[#B71C1C] transition-all shadow-[0_2px_8px_rgba(211,47,47,0.3)] leading-none inline-flex items-center justify-center"
                >
                  📊 Tableau de bord
                </Link>
                <Link
                  href={`/admin/shops/${s.id}/orders`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors leading-none inline-flex items-center justify-center"
                >
                  🛒 Commandes
                </Link>
                <Link
                  href={`/admin/shops/${s.id}/produits`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors leading-none inline-flex items-center justify-center"
                >
                  🍲 Menu & Plats
                </Link>
                <Link
                  href={`/admin/shops/${s.id}/publications`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors leading-none inline-flex items-center justify-center"
                >
                  📣 Posts Sociaux
                </Link>
                <Link
                  href={`/admin/shops/${s.id}/settings`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors leading-none inline-flex items-center justify-center"
                >
                  ⚙️ Réglages & QR
                </Link>
                <Link
                  href={`/${s.slug}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors leading-none inline-flex items-center justify-center"
                >
                  👁️ Vitrine ↗
                </Link>
                <button
                  onClick={() => copyLink(s.slug)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs leading-none inline-flex items-center justify-center ${
                    copiedSlug === s.slug
                      ? "bg-emerald-600 text-white"
                      : "bg-[#1a1a1a] text-white hover:bg-black"
                  }`}
                >
                  {copiedSlug === s.slug ? "✅ Lien copié !" : "🔗 Copier le lien"}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Formulaire de création */}
      <form
        onSubmit={createShop}
        className="mx-6 mt-6 rounded-2xl p-5 bg-white border border-surface-container-high shadow-card flex flex-col gap-4"
      >
        <div>
          <h2 className="font-heading text-[15px] font-bold text-on-surface">
            ➕ Créer un nouvel établissement
          </h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">Ajoutez un nouveau restaurant ou point de vente.</p>
        </div>

        <input
          className="w-full rounded-xl px-4 py-3 text-sm bg-surface-container-low border border-surface-container-high outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
          placeholder="Nom du restaurant (ex: Saveurs d'Aho)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
        <input
          className="w-full rounded-xl px-4 py-3 text-sm bg-surface-container-low border border-surface-container-high outline-none focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
          type="tel"
          placeholder="Numéro WhatsApp de réception (ex: +22890000000)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        {error && (
          <p className="text-[12px] font-semibold text-error bg-error-container/30 px-3 py-2 rounded-lg">{error}</p>
        )}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#D32F2F] text-white hover:bg-[#B71C1C] transition-all shadow-[0_4px_14px_rgba(211,47,47,0.35)] active:scale-95 leading-none flex items-center justify-center"
        >
          Créer l&apos;établissement
        </button>
      </form>
    </main>
  );
}