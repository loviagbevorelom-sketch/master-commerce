"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";

interface Post {
  product_id: number;
  product_name: string;
  text: string;
}

export default function PublicationsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [posts, setPosts] = useState<Post[]>([]);
  const [shopPost, setShopPost] = useState("");
  const [socialPost, setSocialPost] = useState("");
  const [activeTab, setActiveTab] = useState<"whatsapp" | "tiktok" | "dishes">("whatsapp");
  const [copied, setCopied] = useState<number | "shop" | "social" | null>(null);

  useEffect(() => {
    adminApi.getPublications(sid).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
        setShopPost(data.shop_post ?? "");
        setSocialPost(data.social_post ?? "");
      }
    });
  }, [sid]);

  async function copy(text: string, key: number | "shop" | "social") {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

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
            <h1 className="font-heading text-lg font-bold">📣 Publications Réseaux Sociaux</h1>
          </div>

          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {nav.map((n) => {
              const active = n.href === `/admin/shops/${sid}/publications`;
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        <div className="mb-6">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Textes de promotion prêts à copier</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Générez des messages professionnels avec le lien de votre catalogue pour votre statut WhatsApp, bio TikTok et page Facebook.
          </p>
        </div>

        {/* Sous-onglets de formats */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-surface-container-high pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "bg-[#D32F2F] text-white shadow-xs"
                : "bg-white border border-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>📱 Statut WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tiktok")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "tiktok"
                ? "bg-[#D32F2F] text-white shadow-xs"
                : "bg-white border border-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>🎬 TikTok & Instagram</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dishes")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "dishes"
                ? "bg-[#D32F2F] text-white shadow-xs"
                : "bg-white border border-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span>🍲 Posts par Plat ({posts.length})</span>
          </button>
        </div>

        {/* Tab 1 : Statut WhatsApp */}
        {activeTab === "whatsapp" && (
          <div className="bg-white rounded-3xl border border-surface-container-high p-6 shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading text-base font-bold text-on-surface">Message récapitulatif (Statut WhatsApp)</h3>
                <p className="text-xs text-on-surface-variant">Idéal pour publier votre menu complet du jour dans votre statut WhatsApp.</p>
              </div>
              <button
                type="button"
                onClick={() => copy(shopPost, "shop")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  copied === "shop"
                    ? "bg-emerald-600 text-white"
                    : "bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                }`}
              >
                <span>{copied === "shop" ? "✅ Copié !" : "📋 Copier le texte"}</span>
              </button>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap text-neutral-800 bg-neutral-50 rounded-2xl p-4 border border-surface-container-high leading-relaxed">
              {shopPost || "Chargement..."}
            </pre>
          </div>
        )}

        {/* Tab 2 : TikTok & Instagram */}
        {activeTab === "tiktok" && (
          <div className="bg-white rounded-3xl border border-surface-container-high p-6 shadow-card flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading text-base font-bold text-on-surface">Légende & Bio (TikTok / Instagram)</h3>
                <p className="text-xs text-on-surface-variant">À coller sous vos vidéos de plats ou dans votre biographie.</p>
              </div>
              <button
                type="button"
                onClick={() => copy(socialPost, "social")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  copied === "social"
                    ? "bg-emerald-600 text-white"
                    : "bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                }`}
              >
                <span>{copied === "social" ? "✅ Copié !" : "📋 Copier le texte"}</span>
              </button>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap text-neutral-800 bg-neutral-50 rounded-2xl p-4 border border-surface-container-high leading-relaxed">
              {socialPost || "Chargement..."}
            </pre>
          </div>
        )}

        {/* Tab 3 : Par Plat */}
        {activeTab === "dishes" && (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.product_id}
                className="bg-white rounded-2xl border border-surface-container-high p-5 shadow-card flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-heading text-sm font-bold text-on-surface">
                    {post.product_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(post.text, post.product_id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      copied === post.product_id
                        ? "bg-emerald-600 text-white"
                        : "bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                    }`}
                  >
                    {copied === post.product_id ? "✅ Copié !" : "Copier"}
                  </button>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap text-neutral-800 bg-neutral-50 rounded-xl p-3.5 border border-surface-container-high leading-relaxed">
                  {post.text}
                </pre>
              </div>
            ))}

            {posts.length === 0 && (
              <p className="text-center py-10 text-sm text-on-surface-variant">
                Ajoutez des plats dans votre menu pour générer des publications individuelles.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

