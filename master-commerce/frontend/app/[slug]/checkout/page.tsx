"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { api, placeOrder } from "@/lib/api";
import { DeliveryZone } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { API_BASE } from "@/lib/api";

const WaIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.438 5.176L2 22l4.977-1.394C8.422 21.498 10.151 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.637 0-3.155-.494-4.425-1.34l-.317-.213-2.968.831.846-2.924-.233-.339A8.125 8.125 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
  </svg>
);

function StepBadge({ n }: { n: string }) {
  return (
    <span className="w-6 h-6 rounded-full bg-[#D32F2F] text-white font-sans text-[12px] flex items-center justify-center font-bold shrink-0 shadow-[0_2px_6px_rgba(211,47,47,0.4)] leading-none">
      {n}
    </span>
  );
}

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { items, clear } = useCart();

  const [shop, setShop] = useState({ name: "Ma boutique", currency: "FCFA", whatsapp: "" });
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [reception, setReception] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "fedapay">("cod");
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getShop(slug), api.getDeliveryZones(slug)])
      .then(([s, z]) => {
        setShop({ name: s.name, currency: s.currency, whatsapp: s.whatsapp_number ?? "" });
        setZones(z);
        if (z.length > 0) setZoneId(z[0].id);
      })
      .catch(() => { });
  }, [slug]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.product.promo_price ?? i.product.price) * i.qty, 0),
    [items]
  );

  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryFee = reception === "delivery" ? (selectedZone?.fee ?? 0) : 0;
  const total = Math.round(subtotal + deliveryFee);
  const count = items.reduce((s, i) => s + i.qty, 0);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await placeOrder(slug, {
        items: items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
        customer_name: name,
        customer_phone: phone,
        reception_mode: reception,
        delivery_zone_id: reception === "delivery" ? zoneId : null,
        payment_method: paymentMethod,
      });
      localStorage.setItem("mc_last_order", res.order_ref);
      clear();

      if (paymentMethod === "fedapay" && res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        router.push(`/${slug}/order/${res.order_ref}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  /* Panier vide */
  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader slug={slug} name={shop.name} whatsapp={shop.whatsapp} />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-space-md pt-28 md:pt-32 pb-16">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[32px]">production_quantity_limits</span>
          </div>
          <h1 className="font-heading text-headline-sm text-on-surface">Votre panier est vide</h1>
          <p className="font-sans text-body-sm text-on-surface-variant max-w-[280px]">
            Parcourez le menu et ajoutez vos plats préférés.
          </p>
          <Link
            href={`/${slug}`}
            className="mt-space-xs px-space-lg h-10 rounded-full bg-primary text-on-primary font-sans text-label-md flex items-center gap-1 hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Retour au menu</span>
          </Link>
        </main>
        <SiteFooter name={slug} whatsapp={shop.whatsapp} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader slug={slug} name={shop.name} whatsapp={shop.whatsapp} />

      <main className="flex-1 w-full pt-20 sm:pt-24 md:pt-28 pb-20 page-enter">
        <div className="w-full py-space-xl px-gutter">
          <div
            className="max-w-[520px] mx-auto bg-surface-container-lowest p-space-xl sm:p-space-2xl rounded-2xl flex flex-col gap-space-xl"
            style={{ boxShadow: "0 8px 30px rgba(26,26,26,0.06)" }}
          >

            {/* ── En-tête tunnel ──────────────────────────────────────── */}
            <div className="flex flex-col gap-space-2xs text-center">
              <div className="inline-flex items-center justify-center gap-space-2xs self-center px-space-sm py-space-2xs rounded-full bg-secondary-container text-on-secondary-container font-sans text-label-sm">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>Commande rapide &amp; sécurisée</span>
              </div>
              <h1 className="font-heading text-headline-md text-on-surface tracking-tight mt-space-2xs">
                Finaliser ma commande
              </h1>
              <p className="font-sans text-body-md text-on-surface-variant">
                Paiement en ligne FedaPay Sandbox ou à la livraison
              </p>
            </div>

            <form id="checkout-form" onSubmit={confirm} className="flex flex-col gap-space-xl">

              {/* ── Section 1 : Articles ─────────────────────────────── */}
              <section className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <StepBadge n="1" />
                    <h2 className="font-heading text-headline-sm text-on-surface">
                      Articles commandés ({count})
                    </h2>
                  </div>
                  <span className="font-mono text-thermal-mono text-primary font-bold">
                    {formatPrice(subtotal, shop.currency)}
                  </span>
                </div>
                <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm">
                  {items.map(({ product, qty }) => {
                    const unit = product.promo_price ?? product.price;
                    const img = product.image_path
                      ? product.image_path.startsWith("http") || product.image_path.startsWith("/images")
                        ? product.image_path
                        : `${API_BASE.replace("/api", "")}${product.image_path}`
                      : null;
                    return (
                      <div key={product.id} className="flex items-start justify-between gap-space-sm">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-sans text-label-lg text-on-surface truncate">{product.name}</span>
                            <span className="font-sans text-body-sm text-on-surface-variant">Quantité : {qty}</span>
                          </div>
                        </div>
                        <span className="font-sans text-body-md text-on-surface shrink-0">
                          {formatPrice(unit * qty, shop.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── Section 2 : Mode de réception ───────────────────── */}
              <section className="flex flex-col gap-space-sm">
                <div className="flex items-center gap-space-xs">
                  <StepBadge n="2" />
                  <h2 className="font-heading text-headline-sm text-on-surface">Mode de réception</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  {/* Retrait */}
                  <label
                    className={`cursor-pointer relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all flex flex-col justify-between gap-space-xs border ${reception === "pickup" ? "border-[#D32F2F] ring-2 ring-[#D32F2F]/20 shadow-[0_0_0_3px_rgba(211,47,47,0.08)]" : "border-[#eae7e7]"
                      }`}
                  >
                    <input
                      type="radio"
                      name="reception_mode"
                      value="pickup"
                      checked={reception === "pickup"}
                      onChange={() => setReception("pickup")}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-on-surface-variant text-[22px]">storefront</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${reception === "pickup" ? "bg-[#D32F2F]" : "bg-surface-container-highest"}`}>
                        <span className={`w-2 h-2 rounded-full bg-white ${reception === "pickup" ? "opacity-100" : "opacity-0"} transition-opacity`} />
                      </span>
                    </div>
                    <div>
                      <p className="font-sans text-label-lg text-on-surface">Retrait sur place</p>
                      <p className="font-sans text-body-sm text-tertiary font-semibold">Gratuit</p>
                    </div>
                  </label>

                  {/* Livraison */}
                  <label
                    className={`cursor-pointer relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all flex flex-col justify-between gap-space-xs border ${reception === "delivery" ? "border-[#D32F2F] ring-2 ring-[#D32F2F]/20 shadow-[0_0_0_3px_rgba(211,47,47,0.08)]" : "border-[#eae7e7]"
                      }`}
                  >
                    <input
                      type="radio"
                      name="reception_mode"
                      value="delivery"
                      checked={reception === "delivery"}
                      onChange={() => setReception("delivery")}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-primary text-[22px]">two_wheeler</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${reception === "delivery" ? "bg-[#D32F2F]" : "bg-surface-container-highest"}`}>
                        <span className={`w-2 h-2 rounded-full bg-white ${reception === "delivery" ? "opacity-100" : "opacity-0"} transition-opacity`} />
                      </span>
                    </div>
                    <div>
                      <p className="font-sans text-label-lg text-on-surface">Livraison à domicile</p>
                      <p className="font-sans text-body-sm text-on-surface-variant">Frais selon quartier</p>
                    </div>
                  </label>
                </div>
              </section>

              {/* ── Section 3 : Zone de livraison (conditionnelle) ───── */}
              {reception === "delivery" && zones.length > 0 && (
                <section className="flex flex-col gap-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <StepBadge n="3" />
                    <h2 className="font-heading text-headline-sm text-on-surface">Zone de livraison</h2>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-sans text-label-md text-on-surface-variant" htmlFor="zone-select">
                      Sélectionnez votre quartier *
                    </label>
                    <div className="relative">
                      <select
                        id="zone-select"
                        value={zoneId ?? ""}
                        onChange={(e) => setZoneId(Number(e.target.value))}
                        className="w-full h-12 px-space-md pr-10 rounded-xl bg-surface-container-low text-on-surface font-sans text-body-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                      >
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} — {formatPrice(z.fee, shop.currency)}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">
                        keyboard_arrow_down
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-sans text-label-md text-on-surface-variant" htmlFor="address-input">
                      Précisions adresse{" "}
                      <span className="font-normal text-[11px]">(Optionnel)</span>
                    </label>
                    <input
                      id="address-input"
                      type="text"
                      placeholder="Ex: Face pharmacie, portail bleu"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-12 px-space-md rounded-xl bg-surface-container-low text-on-surface font-sans text-body-md placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </section>
              )}

              {/* ── Section 4 : Mode de paiement (FedaPay vs COD) ────── */}
              <section className="flex flex-col gap-space-sm">
                <div className="flex items-center gap-space-xs">
                  <StepBadge n={reception === "delivery" ? "4" : "3"} />
                  <h2 className="font-heading text-headline-sm text-on-surface">Mode de paiement</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  {/* Paiement à la livraison */}
                  <label
                    className={`cursor-pointer relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all flex flex-col justify-between gap-space-xs border ${paymentMethod === "cod" ? "border-[#D32F2F] ring-2 ring-[#D32F2F]/20 shadow-[0_0_0_3px_rgba(211,47,47,0.08)]" : "border-[#eae7e7]"
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-on-surface-variant text-[22px]">payments</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${paymentMethod === "cod" ? "bg-[#D32F2F]" : "bg-surface-container-highest"}`}>
                        <span className={`w-2 h-2 rounded-full bg-white ${paymentMethod === "cod" ? "opacity-100" : "opacity-0"} transition-opacity`} />
                      </span>
                    </div>
                    <div>
                      <p className="font-sans text-label-lg text-on-surface font-bold">À la livraison</p>
                      <p className="font-sans text-body-sm text-on-surface-variant">Espèces / T-Money à la réception</p>
                    </div>
                  </label>

                  {/* Paiement en ligne (FedaPay Sandbox) */}
                  <label
                    className={`cursor-pointer relative p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all flex flex-col justify-between gap-space-xs border ${paymentMethod === "fedapay" ? "border-blue-600 ring-2 ring-blue-600/20 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]" : "border-[#eae7e7]"
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="fedapay"
                      checked={paymentMethod === "fedapay"}
                      onChange={() => setPaymentMethod("fedapay")}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <span>💳 FedaPay</span>
                      </div>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${paymentMethod === "fedapay" ? "bg-blue-600" : "bg-surface-container-highest"}`}>
                        <span className={`w-2 h-2 rounded-full bg-white ${paymentMethod === "fedapay" ? "opacity-100" : "opacity-0"} transition-opacity`} />
                      </span>
                    </div>
                    <div>
                      <p className="font-sans text-label-lg text-on-surface font-bold">Paiement en ligne</p>
                      <p className="font-sans text-body-sm text-blue-600 font-medium">T-Money, Flooz, MTN &amp; Carte</p>
                    </div>
                  </label>
                </div>
              </section>

              {/* ── Section 5 : Coordonnées ──────────────────────────── */}
              <section className="flex flex-col gap-space-sm">
                <div className="flex items-center gap-space-xs">
                  <StepBadge n={reception === "delivery" ? "5" : "4"} />
                  <h2 className="font-heading text-headline-sm text-on-surface">Vos coordonnées</h2>
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-sans text-label-md text-on-surface" htmlFor="client-name">
                    Nom complet *
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    placeholder="Ex: Koffi Mensah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full h-12 px-space-md rounded-xl bg-surface-container-low text-on-surface font-sans text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-sans text-label-md text-on-surface" htmlFor="client-phone">
                    Numéro WhatsApp *
                  </label>
                  <div className="flex items-center rounded-xl bg-surface-container-low overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                    <div className="flex items-center gap-1.5 px-space-md h-12 bg-surface-container text-on-surface shrink-0 font-mono text-thermal-mono font-semibold">
                      <span className="text-[16px]">🇹🇬</span>
                      <span>+228</span>
                    </div>
                    <input
                      id="client-phone"
                      type="tel"
                      placeholder="90 12 34 56"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      minLength={8}
                      className="w-full h-12 px-space-md bg-transparent text-on-surface font-mono text-thermal-mono focus:outline-none"
                    />
                  </div>
                  <span className="font-sans text-[11px] text-on-surface-variant">
                    Votre reçu et le suivi vous seront envoyés ici.
                  </span>
                </div>
              </section>

              {/* ── Section 6 : Ticket synthèse des coûts ───────────── */}
              <section className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs shadow-inner">
                <div className="flex items-center justify-between font-sans text-body-md text-on-surface-variant">
                  <span>Sous-total articles</span>
                  <span className="font-mono">{formatPrice(subtotal, shop.currency)}</span>
                </div>
                <div className="flex items-center justify-between font-sans text-body-md text-on-surface-variant">
                  <span>
                    {reception === "pickup"
                      ? "Retrait en boutique"
                      : `Frais de livraison${selectedZone ? ` (${selectedZone.name})` : ""}`}
                  </span>
                  <span className="font-mono">
                    {reception === "pickup" || deliveryFee === 0
                      ? "Gratuit"
                      : formatPrice(deliveryFee, shop.currency)}
                  </span>
                </div>
                <div className="h-[1px] w-full bg-surface-container-highest my-space-2xs" />
                <div className="flex items-center justify-between">
                  <span className="font-heading text-headline-sm text-on-surface font-bold uppercase tracking-wide text-[14px]">
                    Total à payer
                  </span>
                  <span className="font-heading text-[20px] text-on-surface font-bold">
                    {formatPrice(total, shop.currency)}
                  </span>
                </div>
                <div className="mt-space-xs p-space-xs rounded-lg bg-surface-container-lowest flex items-start gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                    {paymentMethod === "fedapay" ? "verified" : "credit_card_off"}
                  </span>
                  <p className="font-sans text-[12px] leading-snug text-on-surface-variant">
                    {paymentMethod === "fedapay" ? (
                      <span><strong>Paiement sécurisé FedaPay Sandbox.</strong> Validation en ligne instantanée par Mobile Money / Carte.</span>
                    ) : (
                      <span><strong>Paiement à la livraison.</strong> Règlement en espèces ou transfert T-Money à la réception.</span>
                    )}
                  </p>
                </div>
              </section>

              {/* ── Erreur ───────────────────────────────────────────── */}
              {error && (
                <div className="p-space-sm rounded-xl bg-error-container text-on-error-container font-sans text-body-sm flex flex-col gap-2 border border-[#D32F2F]/20">
                  <div className="flex items-center gap-2 font-bold text-[#D32F2F]">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                  {error.toLowerCase().includes("introuvable") && (
                    <div className="pt-1 border-t border-error-container/40 flex items-center justify-between gap-2">
                      <span className="text-[12px] opacity-80">Votre panier contient des articles non disponibles dans cette boutique.</span>
                      <button
                        type="button"
                        onClick={() => {
                          clear();
                          window.location.href = `/${slug}`;
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#D32F2F] text-white text-[11px] font-bold shrink-0 hover:bg-[#B71C1C] transition-colors"
                      >
                        Nettoyer le panier
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── CTA Principal ─────────────────────────────────────── */}
              <div className="flex flex-col gap-space-xs pt-space-xs">
                {paymentMethod === "fedapay" ? (
                  <button
                    type="submit"
                    disabled={loading || items.length === 0}
                    className="w-full h-12 rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white font-sans text-label-lg flex items-center justify-center gap-space-xs shadow-lg active:translate-y-[1px] transition-all disabled:opacity-60 font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">credit_card</span>
                    <span>{loading ? "Initialisation FedaPay…" : "Payer avec FedaPay (Mobile Money / Carte)"}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || items.length === 0}
                    className="w-full h-12 rounded-[14px] bg-whatsapp hover:bg-whatsapp-hover text-white font-sans text-label-lg flex items-center justify-center gap-space-xs shadow-whatsapp active:translate-y-[1px] transition-all disabled:opacity-60 font-bold"
                  >
                    <WaIcon />
                    <span>{loading ? "Enregistrement…" : "Confirmer ma commande sur WhatsApp"}</span>
                  </button>
                )}
                <p className="font-sans text-[11px] text-center text-on-surface-variant">
                  {paymentMethod === "fedapay"
                    ? "Vous serez redirigé vers le guichet sécurisé FedaPay Sandbox."
                    : "Votre commande sera enregistrée et confirmée sur WhatsApp."}
                </p>
              </div>

            </form>
          </div>
        </div>
      </main>

      <SiteFooter name={shop.name} whatsapp={shop.whatsapp} />
    </div>
  );
}