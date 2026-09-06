function digits(n?: string): string {
  return (n ?? "").replace(/\D/g, "");
}

export default function SiteFooter({
  name,
  whatsapp,
  slug = "kubafoodies",
}: {
  name: string;
  whatsapp?: string;
  slug?: string;
}) {
  const wa = digits(whatsapp);
  const cleanName = name.split("—")[0].trim();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#0f0f0f] mt-0 pt-14 pb-8 border-t border-white/5">
      <div className="max-w-[1140px] mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-10 md:gap-6">

        {/* ── Colonne 1 : Marque ── */}
        <div className="flex flex-col gap-4 max-w-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${cleanName} Logo`}
                className="w-full h-full object-cover"
                src="/images/logo-icon.png"
              />
            </div>
            <span className="text-white font-bold text-[17px] tracking-tight">
              {cleanName}
            </span>
          </div>
          <p className="text-white/50 text-[13px] leading-relaxed">
            Gastronomie ouest-africaine &amp; service traiteur d&apos;exception.
            Commandez directement via WhatsApp.
          </p>
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-[13px] font-semibold hover:bg-[#25D366]/20 transition-colors w-fit"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.68.46-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
              </svg>
              <span>{whatsapp}</span>
            </a>
          )}
        </div>

        {/* ── Colonne 2 : Navigation rapide ── */}
        <div className="flex flex-col gap-4">
          <span className="text-white/30 text-[11px] uppercase tracking-[0.12em] font-semibold">
            Navigation
          </span>
          <nav className="flex flex-col gap-2.5">
            <a href={`/${slug}#menu`} className="text-white/60 text-[13px] hover:text-white transition-colors">
              Menu &amp; Plats
            </a>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=Bonjour%2C%20je%20souhaite%20des%20renseignements%20pour%20un%20service%20traiteur`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 text-[13px] hover:text-white transition-colors"
              >
                Service Traiteur
              </a>
            )}
            <a href={`/${slug}/commandes`} className="text-white/60 text-[13px] hover:text-white transition-colors">
              Suivi de commande
            </a>
          </nav>
        </div>

        {/* ── Colonne 3 : Informations légales ── */}
        <div className="flex flex-col gap-4">
          <span className="text-white/30 text-[11px] uppercase tracking-[0.12em] font-semibold">
            Informations
          </span>
          <div className="flex flex-col gap-2.5">
            <a href="#mentions-legales" className="text-white/60 text-[13px] hover:text-white transition-colors">
              Mentions légales
            </a>
            <a href="#confidentialite" className="text-white/60 text-[13px] hover:text-white transition-colors">
              Politique de confidentialité
            </a>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
            <span className="text-white/50 text-[11px]">Commandes ouvertes</span>
          </div>
        </div>

      </div>

      {/* ── Séparateur bas de page ── */}
      <div className="max-w-[1140px] mx-auto px-6 mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-white/25 text-[12px]">
          © {year} {cleanName}. Tous droits réservés.
        </p>
        <p className="text-white/20 text-[11px] flex items-center gap-1">
          <span>Propulsé par</span>
          <span className="text-white/35 font-semibold">Master Commerce</span>
        </p>
      </div>
    </footer>
  );
}