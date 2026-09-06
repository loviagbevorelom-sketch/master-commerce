"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi, adminFetch } from "@/lib/admin";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { API_BASE } from "@/lib/api";

interface CategoryRow {
  id: number;
  name: string;
}

const IMG = (p: string | null) =>
  p ? `${API_BASE.replace("/api", "")}${p}` : null;

type FilterKey = "all" | "promo" | "alert" | "out";

function StockControl({
  p,
  sid,
  changed,
}: {
  p: Product;
  sid: number;
  changed: () => void;
}) {
  const save = async (stock: number | null) => {
    await adminApi.updateProduct(sid, p.id, { stock });
    changed();
  };
  if (p.stock === null) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          ∞ Toujours actif
        </span>
      </div>
    );
  }
  const out = p.stock <= 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => save(out ? 10 : p.stock! + 1)}
        className="w-7 h-7 rounded-full font-bold leading-none bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors inline-flex items-center justify-center"
        aria-label="Augmenter le stock"
      >
        +
      </button>
      <span
        className={`min-w-[44px] text-center text-sm font-bold tabular-nums ${
          out ? "text-error" : "text-on-surface"
        }`}
      >
        {out ? "Épuisé" : p.stock}
      </span>
      {!out && (
        <button
          type="button"
          onClick={() => save(p.stock! - 1)}
          className="w-7 h-7 rounded-full font-bold leading-none bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors inline-flex items-center justify-center"
          aria-label="Diminuer le stock"
        >
          −
        </button>
      )}
      {p.stock! <= 5 && (
        <button
          type="button"
          onClick={() => save(p.stock! + 10)}
          className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 transition-colors"
        >
          Réappro +10
        </button>
      )}
    </div>
  );
}

function AvailabilityToggle({
  p,
  sid,
  changed,
}: {
  p: Product;
  sid: number;
  changed: () => void;
}) {
  const active = p.is_active;
  const save = async (v: boolean) => {
    await adminApi.updateProduct(sid, p.id, { is_active: v });
    changed();
  };
  const out = p.stock !== null && p.stock <= 0;
  if (out) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container text-error border border-error/20">
        Fini aujourd&apos;hui
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => save(!active)}
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
          : "bg-neutral-100 text-neutral-500 border border-neutral-200"
      }`}
    >
      {active ? "✓ Disponible" : "Indisponible"}
    </button>
  );
}

export default function ShopProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    price: "",
    promo_price: "",
    stock: "",
    category_id: "",
  });
  const [draftCat, setDraftCat] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      adminApi.getProducts(sid),
      adminFetch(`/shops/${sid}/categories`),
    ]);
    if (p.ok) setProducts(await p.json());
    if (c.ok) setCats(await c.json());
    setLoading(false);
  }, [sid]);

  useEffect(() => {
    load();
  }, [load]);

  const catName = useMemo(() => {
    const m = new Map(cats.map((c) => [c.id, c.name]));
    return (id: number | null) => (id && m.get(id)) || "Non classé";
  }, [cats]);

  const counts = useMemo(() => {
    const active = products.filter((p) => p.is_active && (p.stock === null || p.stock > 0)).length;
    const offered = products.filter((p) => p.promo_price !== null && p.promo_price! < p.price).length;
    const out = products.filter((p) => p.stock !== null && p.stock <= 0).length;
    const alert = products.filter((p) => p.stock !== null && p.stock > 0 && p.stock <= 5).length;
    return { active, offered, out, alert };
  }, [products]);

  const visible = useMemo(() => {
    if (filter === "all") return products;
    if (filter === "promo")
      return products.filter((p) => p.promo_price !== null && p.promo_price! < p.price);
    if (filter === "out") return products.filter((p) => p.stock !== null && p.stock <= 0);
    return products.filter((p) => p.stock !== null && p.stock > 0 && p.stock <= 5);
  }, [products, filter]);

  async function onCreate() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price: Number(draft.price) || 0,
      promo_price:
        draft.promo_price !== "" ? Number(draft.promo_price) : null,
      stock: draft.stock !== "" ? Number(draft.stock) : null,
      category_id: draftCat !== "" ? Number(draftCat) : null,
      is_active: true,
    };
    const res = await adminApi.createProduct(sid, payload);
    if (res.ok) {
      const created = await res.json();
      if (fileRef.current?.files?.[0]) {
        await adminApi.uploadImage(sid, created.id, fileRef.current.files[0]);
      }
      setShowModal(false);
      setDraft({ name: "", description: "", price: "", promo_price: "", stock: "", category_id: "" });
      if (fileRef.current) fileRef.current.value = "";
      setDraftCat("");
      load();
    }
    setSaving(false);
  }

  async function onDelete(p: Product) {
    if (!confirm(`Supprimer « ${p.name} » du menu ?`)) return;
    await adminApi.deleteProduct(sid, p.id);
    load();
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
            <h1 className="font-heading text-lg font-bold">🍲 Menu &amp; Gestion des Plats</h1>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
              {nav.map((n) => {
                const active = n.href === `/admin/shops/${sid}/produits`;
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
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white bg-[#D32F2F] hover:bg-[#B71C1C] transition-all shadow-[0_4px_14px_rgba(211,47,47,0.35)] leading-none shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">add</span>
              <span className="leading-none">Nouveau plat</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 page-enter">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D32F2F]">
              Carte &amp; Stocks
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-on-surface mt-0.5">
              📦 Gestion du Menu &amp; des Stocks
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {counts.active} actifs
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
              {counts.alert} alarmes stock
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-error-container text-error border border-error/20">
              {counts.out} épuisés
            </span>
          </div>
        </div>

        {/* Filtres par onglets */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { k: "all", label: "Tous les plats", n: products.length },
              { k: "promo", label: "🔥 Promo", n: counts.offered },
              { k: "alert", label: "⚠️ Alerte stock", n: counts.alert },
              { k: "out", label: "🚫 Épuisés", n: counts.out },
            ] as { k: FilterKey; label: string; n: number }[]
          ).map((f) => (
            <button
              type="button"
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                filter === f.k
                  ? "bg-[#D32F2F] text-white shadow-[0_4px_12px_rgba(211,47,47,0.3)]"
                  : "bg-white text-on-surface-variant border border-surface-container-high hover:border-[#D32F2F]/40 hover:text-[#D32F2F]"
              }`}
            >
              {f.label} <span className="opacity-75">({f.n})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3 text-on-surface-variant text-sm">
            <span className="material-symbols-outlined animate-spin text-[#D32F2F]">progress_activity</span>
            <span>Chargement des plats...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl p-10 flex flex-col items-center gap-2 text-center bg-white border border-surface-container-high shadow-card">
            <span className="material-symbols-outlined text-[40px] text-neutral-400">restaurant_menu</span>
            <p className="font-semibold text-on-surface">Aucun plat dans cette vue</p>
            <p className="text-sm text-on-surface-variant">
              Ajoutez un nouveau plat pour lancer votre vitrine.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* En-tête table (desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="col-span-4">Plat &amp; catégorie</span>
              <span className="col-span-2">Prix</span>
              <span className="col-span-2">Stock</span>
              <span className="col-span-2">Disponibilité</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            {visible.map((p) => {
              const img = IMG(p.image_path);
              const inPromo = p.promo_price !== null && p.promo_price! < p.price;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-center gap-3 col-span-4">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-surface-container-high shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-neutral-100 text-neutral-400 border border-surface-container-high shrink-0">
                        <span className="material-symbols-outlined text-[24px]">restaurant</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface truncate">
                          {p.name}
                        </span>
                        {inPromo && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-[#D32F2F] text-white">
                            -{(100 - Math.round((p.promo_price! / p.price) * 100))}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant">{catName(p.category_id)}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 col-span-2">
                    <span className="text-base font-bold text-on-surface">
                      {formatPrice(p.price, "FCFA")}
                    </span>
                    {inPromo && (
                      <span className="text-xs line-through text-on-surface-variant">
                        {formatPrice(p.promo_price!, "FCFA")}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2">
                    <StockControl p={p} sid={sid} changed={load} />
                  </div>

                  <div className="col-span-2">
                    <AvailabilityToggle p={p} sid={sid} changed={load} />
                  </div>

                  <div className="col-span-2 flex justify-start md:justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-error-container text-error hover:bg-error/20 transition-colors"
                      aria-label={`Supprimer ${p.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center text-on-surface-variant">
          Astuce : un plat « ∞ Toujours actif » reste visible même en stock limité ;
          passez-le en stock fini pour afficher le compteur.
        </p>
      </main>

      {/* Modal d'ajout de plat */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto bg-white shadow-2xl border border-surface-container-high"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-on-surface">
                Ajouter un nouveau plat 🍲
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-neutral-700">Nom du plat *</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="ex : Pinon sauce adjo"
                className="rounded-xl px-4 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-neutral-700">Description</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ingrédients, allergènes, temps de préparation…"
                rows={2}
                className="rounded-xl px-4 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface resize-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-neutral-700">Prix (FCFA) *</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  placeholder="1500"
                  className="rounded-xl px-4 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-neutral-700">Prix promo</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={draft.promo_price}
                  onChange={(e) => setDraft({ ...draft, promo_price: e.target.value })}
                  placeholder="1000"
                  className="rounded-xl px-4 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-neutral-700">Stock (vide = ∞)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                  placeholder="∞ illimité"
                  className="rounded-xl px-4 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold text-neutral-700">Catégorie</span>
                <select
                  value={draftCat}
                  onChange={(e) => setDraftCat(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm border border-surface-container-high bg-white focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20 transition-all text-on-surface"
                >
                  <option value="">— non classé —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-neutral-700">Photo du plat</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
              />
            </label>

            <button
              type="button"
              onClick={onCreate}
              disabled={saving || !draft.name.trim() || Number(draft.price) <= 0}
              className="mt-2 rounded-xl py-3 text-sm font-bold text-white bg-[#D32F2F] hover:bg-[#B71C1C] transition-all shadow-[0_4px_14px_rgba(211,47,47,0.35)] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? "Création…" : "Ajouter au menu ✨"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}