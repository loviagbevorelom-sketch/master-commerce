"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi, setToken } from "@/lib/admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await adminApi.login(email, password);
    if (res.ok) {
      const data = await res.json();
      setToken(data.access_token);
      router.push("/admin");
    } else {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-[#fafaf9]">

      {/* ── Panneau gauche décoratif ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#1a1a1a] p-10 relative overflow-hidden">
        {/* Déco blob */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#D32F2F]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-[#D32F2F]/10 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-icon.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-bold text-[17px] tracking-tight">Master Commerce</span>
        </div>

        {/* Texte central */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D32F2F]/15 border border-[#D32F2F]/30 text-[#ff8a75] text-[12px] font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] animate-pulse" />
            Espace Marchand
          </div>
          <h2 className="text-white font-extrabold text-[28px] leading-snug tracking-tight mb-3">
            Gérez votre boutique<br />depuis un seul endroit
          </h2>
          <p className="text-white/50 text-[14px] leading-relaxed">
            Commandes en temps réel, gestion des stocks, génération de menus et partage WhatsApp en quelques clics.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-col gap-2.5">
          {["📊 Tableau de bord en temps réel", "📦 Gestion produits & stocks", "📣 Génération de posts sociaux", "🔗 Partage WhatsApp instantané"].map((f) => (
            <div key={f} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white/70 text-[13px]">
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* En-tête mobile */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#eae7e7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-icon.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[17px] text-[#1a1a1a] tracking-tight">Master Commerce</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-[26px] font-extrabold text-[#1a1a1a] tracking-tight mb-1">
              Connexion
            </h1>
            <p className="text-[#888] text-[14px]">
              Accédez à votre espace marchand
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-semibold text-[#444]">
                Adresse email
              </label>
              <input
                id="email"
                className="w-full h-12 rounded-xl border border-[#e0ddd9] bg-white px-4 text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-semibold text-[#444]">
                Mot de passe
              </label>
              <input
                id="password"
                className="w-full h-12 rounded-xl border border-[#e0ddd9] bg-white px-4 text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/15 transition-all"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[13px]">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-xl bg-[#D32F2F] text-white font-bold text-[14px] shadow-[0_4px_14px_rgba(211,47,47,0.4)] hover:bg-[#B71C1C] active:scale-95 transition-all disabled:opacity-60 mt-1"
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>

            <p className="text-[13px] text-center text-[#888] mt-1">
              Pas encore de compte ?{" "}
              <Link href="/admin/register" className="text-[#D32F2F] font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>

          {/* Retour vitrine */}
          <div className="mt-8 pt-6 border-t border-[#eae7e7] text-center">
            <Link href="/kubafoodies" className="inline-flex items-center gap-1.5 text-[#888] text-[13px] hover:text-[#1a1a1a] transition-colors">
              <span>←</span>
              <span>Retour à la vitrine</span>
            </Link>
          </div>

        </div>
      </div>

    </main>
  );
}

