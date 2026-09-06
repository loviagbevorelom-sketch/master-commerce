import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import QuickCartPill from "@/components/QuickCartPill";

export const revalidate = 30;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string }>;
};

function digits(n?: string): string {
  return (n ?? "").replace(/\D/g, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shop = await api.getShop(slug);
    return {
      title: `${shop.name} — Menu en ligne`,
      description: shop.description ?? `Commandez en ligne chez ${shop.name}`,
      openGraph: { title: shop.name, description: shop.description ?? undefined },
    };
  } catch {
    return { title: "Boutique introuvable" };
  }
}

export default async function CataloguePage({ params, searchParams }: Props) {
  const [{ slug }, { cat }] = await Promise.all([params, searchParams]);
  let shop, categories, products;
  try {
    [shop, categories, products] = await Promise.all([
      api.getShop(slug),
      api.getCategories(slug),
      api.getProducts(slug),
    ]);
  } catch {
    notFound();
  }

  const activeCat = cat ? Number(cat) : null;
  const visible =
    activeCat && categories.some((c) => c.id === activeCat)
      ? products.filter((p) => p.category_id === activeCat)
      : products;

  const wa = digits(shop.whatsapp_number);

  // Map category ID to category name for badge resolution in ProductCard
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <SiteHeader slug={slug} name={shop.name} whatsapp={shop.whatsapp_number} />

      <main className="w-full pt-16 md:pt-20 pb-16 bg-background page-enter">
        <div className="w-full max-w-container-catalog mx-auto px-[var(--container-gutter)] py-8 md:py-12">

          {/* ── Top Utility / Quick Cart Strip ───────────────────────── */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="font-thermal-mono text-thermal-mono text-on-surface-variant uppercase tracking-widest text-[11px]">
                Menu du jour • Lomé, Togo
              </span>
            </div>
            <div className="flex items-center gap-3">
              <QuickCartPill slug={slug} currency={shop.currency} />
            </div>
          </div>

          {/* ── Presentation Banner / Header (Style Stitch) ──────────── */}
          <section className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-12 border border-[#eae7e7]">
            {/* Blobs décoratifs */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-tertiary/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="font-heading text-[clamp(1.75rem,5vw,3rem)] leading-tight text-on-surface font-extrabold break-words w-full sm:w-auto">
                    {shop.name}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-label-sm text-label-sm font-bold shadow-sm shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    Ouvert
                  </span>
                </div>
                {shop.description && (
                  <p className="text-[clamp(0.9rem,1.2vw,1.05rem)] text-on-surface-variant leading-relaxed">
                    {shop.description}
                  </p>
                )}
              </div>

              {/* Bouton WhatsApp CTA vert officiel */}
              {wa && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl bg-[#25D366] text-white font-label-lg text-label-lg shadow-[0_4px_14px_rgba(37,211,102,0.4)] hover:bg-[#1EBE5D] active:scale-95 transition-all font-semibold"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.68.46-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
                    </svg>
                    <span>{shop.whatsapp_number}</span>
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* ── Category Tabs / Filter Pills (Centrage optique parfait & thème rouge) ── */}
          <div
            id="menu"
            className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 -mx-2 px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <Link
              href={`/${slug}#menu`}
              className={`shrink-0 py-2.5 px-5 rounded-full font-sans text-[13.5px] font-semibold leading-none whitespace-nowrap transition-all active:scale-95 inline-flex items-center justify-center text-center ${
                !activeCat
                  ? "bg-[#D32F2F] text-white shadow-[0_3px_12px_rgba(211,47,47,0.38)]"
                  : "bg-white border border-[#e8e4e4] text-[#4b5563] hover:border-[#D32F2F]/40 hover:text-[#D32F2F] shadow-xs"
              }`}
            >
              <span>Tout ({products.length})</span>
            </Link>
            {categories.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length;
              const isActive = activeCat === c.id;
              return (
                <Link
                  key={c.id}
                  href={`/${slug}?cat=${c.id}#menu`}
                  className={`shrink-0 py-2.5 px-5 rounded-full font-sans text-[13.5px] font-semibold leading-none whitespace-nowrap transition-all active:scale-95 inline-flex items-center justify-center text-center ${
                    isActive
                      ? "bg-[#D32F2F] text-white shadow-[0_3px_12px_rgba(211,47,47,0.38)]"
                      : "bg-white border border-[#e8e4e4] text-[#4b5563] hover:border-[#D32F2F]/40 hover:text-[#D32F2F] shadow-xs"
                  }`}
                >
                  <span>{c.name} ({count})</span>
                </Link>
              );
            })}
          </div>

          {/* ── Product Grid: Grille fluide minmax ──────────────────── */}
          {visible.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant">restaurant_menu</span>
              </div>
              <p className="font-heading text-lg font-semibold text-on-surface">
                Aucun plat dans cette catégorie
              </p>
              <p className="text-sm text-on-surface-variant">
                Consultez les autres catégories ou revenez bientôt !
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
              {visible.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={shop.currency}
                  slug={slug}
                  categoryName={catMap.get(p.category_id ?? 0)}
                />
              ))}
            </div>
          )}

          {/* ── Assurance / Fast Flow Footer Strip ───────────────────── */}
          <div className="mt-12 p-5 sm:p-6 rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary-container shrink-0">
                <span className="material-symbols-outlined text-[20px] leading-none">electric_bolt</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">
                  Commande Instantanée WhatsApp
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Panier validé directement avec notre équipe en cuisine.
                </p>
              </div>
            </div>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=Bonjour%20Kubafoodies,%20je%20souhaite%20commander%20pour%20le%20midi`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-full sm:w-auto h-11 px-5 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm hover:bg-surface-container-high transition-colors inline-flex items-center justify-center sm:justify-start gap-2"
              >
                <span className="material-symbols-outlined text-[18px] text-tertiary-container leading-none">forum</span>
                <span>Poser une question</span>
              </a>
            )}
          </div>

        </div>
      </main>

      <SiteFooter name={shop.name} whatsapp={shop.whatsapp_number} slug={slug} />
    </>
  );
}