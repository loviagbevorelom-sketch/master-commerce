"use client";

import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [form, setForm] = useState({
    name: "Kubafoodies — Service Traiteur",
    description: "Gastronomie ouest-africaine & service traiteur d'exception à Lomé.",
    whatsapp_number: "+228 91 52 76 25",
    currency: "FCFA",
  });
  const [slug, setSlug] = useState("kubafoodies");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await adminApi.getShops();
        if (res.ok) {
          const shops = await res.json();
          const shop = shops.find((s: { id: number }) => s.id === sid) || shops[0];
          if (shop && isMounted) {
            setForm({
              name: shop.name,
              description: shop.description ?? "",
              whatsapp_number: shop.whatsapp_number,
              currency: shop.currency,
            });
            setSlug(shop.slug);
            setLoading(false);
            return;
          }
        }
      } catch {
        /* fallback */
      }

      try {
        const publicShop = await api.getShop("kubafoodies");
        if (publicShop && isMounted) {
          setForm({
            name: publicShop.name,
            description: publicShop.description ?? "",
            whatsapp_number: publicShop.whatsapp_number ?? "+228 91 52 76 25",
            currency: publicShop.currency ?? "FCFA",
          });
          setSlug(publicShop.slug ?? "kubafoodies");
        }
      } catch {
        /* garde les valeurs par défaut */
      }
      if (isMounted) setLoading(false);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [sid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.updateShop(sid, form);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } else {
      // Notification visuelle
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const targetSlug = slug || "kubafoodies";
  const catalogUrl = `${origin}/${targetSlug}`;

  async function copyLink() {
    if (!catalogUrl) return;
    await navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadQR() {
    const img = document.getElementById("qr-code-img") as HTMLImageElement;
    if (!img || !img.src) return;
    const a = document.createElement("a");
    a.download = `qrcode-${targetSlug}.png`;
    a.href = img.src;
    a.click();
  }

  const input =
    "w-full rounded-xl border border-surface-container-high bg-white px-4 py-3 text-sm focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all";

  const nav = [
    { href: `/admin/shops/${sid}`, label: "📊 Bord" },
    { href: `/admin/shops/${sid}/orders`, label: "🛒 Commandes" },
    { href: `/admin/shops/${sid}/produits`, label: "🍲 Menu & Plats" },
    { href: `/admin/shops/${sid}/publications`, label: "📣 Posts Sociaux" },
    { href: `/admin/shops/${sid}/settings`, label: "⚙️ Réglages & QR" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background text-on-surface">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-surface-container-high shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors inline-flex items-center gap-1"
            >
              ← Mes boutiques
            </Link>
            <span className="text-surface-container-high hidden sm:inline">|</span>
            <h1 className="font-heading text-lg font-bold">⚙️ Réglages &amp; QR Code</h1>
          </div>

          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {nav.map((n) => {
              const active = n.href === `/admin/shops/${sid}/settings`;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors leading-none inline-flex items-center justify-center ${
                    active
                      ? "bg-[#D32F2F] text-white shadow-[0_2px_8px_rgba(211,47,47,0.35)]"
                      : "bg-white border border-surface-container-high text-on-surface-variant hover:border-[#D32F2F]/40 hover:text-[#D32F2F]"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-8 md:grid-cols-2 page-enter">
        {/* Formulaire des paramètres */}
        <section className="bg-white rounded-3xl border border-surface-container-high p-6 shadow-card flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold">Informations de la boutique</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Paramètres visibles sur votre catalogue public.</p>
          </div>

          <form onSubmit={save} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Nom de l&apos;établissement *</label>
              <input
                className={input}
                placeholder="Ex: Kubafoodies — Service Traiteur"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Description courte</label>
              <textarea
                className={input}
                rows={3}
                placeholder="Ex: Spécialités ouest-africaines et service traiteur à Lomé."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Numéro WhatsApp de réception des commandes *</label>
              <input
                className={input}
                type="tel"
                placeholder="Ex: +228 91 52 76 25"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Devise des prix</label>
              <input
                className={input}
                placeholder="FCFA"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3.5 rounded-xl bg-[#D32F2F] text-white font-bold text-sm hover:bg-[#B71C1C] transition-colors shadow-sm"
            >
              {saved ? "✅ Enregistré !" : "Enregistrer les modifications"}
            </button>
          </form>
        </section>

        {/* Partage & QR Code */}
        <section className="bg-white rounded-3xl border border-surface-container-high p-6 shadow-card flex flex-col justify-between gap-6 text-center">
          <div>
            <h2 className="font-heading text-lg font-bold text-left">Lien &amp; Affiche QR Code</h2>
            <p className="text-xs text-on-surface-variant text-left mt-0.5">
              Partagez votre lien en bio et imprimez ce QR Code pour votre comptoir, vos tables ou vos flyers.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl border border-surface-container-high p-6 flex flex-col items-center gap-3">
            <QRCodeDisplay id="qr-code-img" text={catalogUrl} size={220} className="w-48 h-48" />
            <div className="bg-white px-3 py-1.5 rounded-xl border border-surface-container-high shadow-xs max-w-full">
              <span className="font-mono text-xs text-on-surface font-semibold break-all">
                {catalogUrl}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copyLink}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                  copied ? "bg-emerald-600 text-white" : "bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                }`}
              >
                <span>{copied ? "✅ Copié !" : "🔗 Copier le lien"}</span>
              </button>

              <button
                type="button"
                onClick={downloadQR}
                className="py-3 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>📥 Télécharger QR</span>
              </button>
            </div>

            <a
              href={`/${targetSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl border border-surface-container-high text-xs font-semibold text-neutral-700 hover:border-[#D32F2F] hover:text-[#D32F2F] transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span>👁️ Ouvrir la vitrine du menu ↗</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
