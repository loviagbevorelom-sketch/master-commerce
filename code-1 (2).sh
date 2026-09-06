="font-bold">🛍️ Mes boutiques</h1>
        <button onClick={() => { logout(); router.push("/admin/login"); }}
          className="text-sm text-neutral-500 hover:text-neutral-800">Déconnexion</button>
      </header>

      <section className="px-4 mt-4 space-y-3">
        {loading ? (
          <p className="text-center text-neutral-400 text-sm">Chargement…</p>
        ) : shops.length === 0 ? (
          <p className="text-center text-neutral-500 text-sm mt-10">
            Créez votre première boutique ci-dessous 👇
          </p>
        ) : (
          shops.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-neutral-500">/{s.slug}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                  {s.is_active ? "En ligne" : "Hors ligne"}
                </span>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link href={`/admin/shops/${s.id}`}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold">
                  Gérer
                </Link>
                <Link href={`/${s.slug}`} target="_blank"
                  className="px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-semibold">
                  👁️ Aperçu
                </Link>
                <button onClick={() => copyLink(s.slug)}
                  className="px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-semibold">
                  🔗 Copier le lien
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <form onSubmit={createShop} className="mx-4 mt-6 bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-bold text-sm">➕ Nouvelle boutique</h2>
        <input className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm"
          placeholder="Nom de la boutique" value={name}
          onChange={(e) => setName(e.target.value)} required minLength={2} />
        <input className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm"
          type="tel" placeholder="Numéro WhatsApp (ex : +22890000000)" value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit"
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm">
          Créer la boutique
        </button>
      </form>
    </main>
  );
}
EOF

cat > "frontend/app/[slug]/checkout/[productId]/page.tsx" <<'EOF'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, requestCheckoutLink } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Product, Shop } from "@/lib/types";

export default function ExpressCheckoutPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [currency, setCurrency] = useState("FCFA");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getShop(slug), api.getProducts(slug)])
      .then(([shop, products]) => {
        setCurrency(shop.currency);
        setProduct(products.find((p) => p.id === Number(productId)) ?? null);
      })
      .catch(() => setProduct(null));
  }, [slug, productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setLoading(true); setError(null);
    try {
      const link = await requestCheckoutLink(slug, {
        items: [{ product_id: product.id, qty }],
        customer_name: name, customer_phone: phone, delivery_zone: zone,
      });
      window.location.href = link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  if (!product) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <span className="text-4xl">🔍</span>
        <p className="mt-3 font-bold">Produit introuvable</p>
        <Link href={`/${slug}`} className="mt-3 text-sm text-emerald-700 font-medium">
          ← Retour au catalogue
        </Link>
      </main>
    );
  }

  const unit = product.promo_price ?? product.price;
  const input = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0">
        <Link href={`/${slug}`} className="text-sm text-emerald-700 font-medium">← {slug}</Link>
        <h1 className="font-bold mt-1">Commande express</h1>
      </header>

      <section className="px-4 mt-4 bg-white rounded-2xl p-4 shadow-sm flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
          {product.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`process.env.NEXTPUBLICAPIURL?.replace("/api","")??"http://localhost:8000"{process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000"}process.env.NEXTP​UBLICA​PIU​RL?.replace("/api","")??"http://localhost:8000"{product.image_path}`}
              alt="" className="w-full h-full object-cover" />
          ) : <span className="text-2xl">🛍️</span>}
        </div>
        <div>
          <p className="font-semibold text-sm">{product.name}</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">{formatPrice(unit, currency)}</p>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-8 h-8 rounded-lg bg-neutral-100 font-bold">−</button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(99, qty + 1))}
              className="w-8 h-8 rounded-lg bg-neutral-100 font-bold">+</button>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="px-4 mt-5 space-y-3">
        <input className={input} placeholder="Votre nom complet" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="tel" placeholder="Votre téléphone" value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        <input className={input} placeholder="Zone de livraison" value={zone}
          onChange={(e) => setZone(e.target.value)} required />
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between">
          <span className="text-sm text-neutral-600">Total ({qty} article{qty > 1 ? "s" : ""})</span>
          <span className="text-lg font-bold text-emerald-700">{formatPrice(unit * qty, currency)}</span>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50
            shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition">
          {loading ? "Préparation…" : "Commander sur WhatsApp 📲"}
        </button>
      </form>
    </main>
  );
}
EOF

cat > "frontend/app/admin/shops/[shopId]/page.tsx" <<'EOF'
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export default function ManageShopPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState("FCFA");
  const [form, setForm] = useState({ name: "", price: "", promo_price: "", stock: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await adminApi.getProducts(sid);
    if (res.ok) { setProducts(await res.json()); }
    setLoading(false);
  }, [sid]);

  useEffect(() => { load(); }, [load]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const payload: Record<string, unknown> = {
      name: form.name, price: Number(form.price),
    };
    if (form.promo_price) payload.promo_price = Number(form.promo_price);
    if (form.stock) payload.stock = Number(form.stock);
    const res = await adminApi.createProduct(sid, payload);
    if (res.ok) {
      setForm({ name: "", price: "", promo_price: "", stock: "" });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(typeof d.detail === "string" ? d.detail
        : d.detail?.[0]?.msg ?? "Erreur — vérifiez que le prix promo < prix normal");
    }
  }

  async function toggleActive(p: Product) {
    await adminApi.updateProduct(sid, p.id, { is_active: !p.is_active });
    load();
  }

  async function removeProduct(id: number) {
    if (!confirm("Supprimer ce produit ?")) return;
    await adminApi.deleteProduct(sid, id);
    load();
  }

  async function uploadImage(productId: number, file: File) {
    const res = await adminApi.uploadImage(sid, productId, file);
    if (res.ok) load();
    else alert("Image refusée (JPEG/PNG/WebP, max 5 Mo)");
  }

  const input = "rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-neutral-500">← Boutiques</Link>
        <div className="flex gap-2">
          <Link href={`/admin/shops/${sid}/publications`} className="text-sm font-semibold text-emerald-700">📣 Posts</Link>
          <Link href={`/admin/shops/${sid}/settings`} className="text-sm font-semibold text-emerald-700">⚙️ Réglages</Link>
        </div>
      </header>

      <section className="px-4 mt-4 space-y-2">
        <h2 className="font-bold text-sm">📦 Produits ({products.length})</h2>
        {loading ? <p className="text-sm text-neutral-400">Chargement…</p> :
          products.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl p-3 shadow-sm flex gap-3 items-center ${!p.is_active ? "opacity-50" : ""}`}>
              <div className="w-14 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                {p.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`process.env.NEXTPUBLICAPIURL?.replace("/api","")??"http://localhost:8000"{process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:8000"}process.env.NEXTP​UBLICA​PIU​RL?.replace("/api","")??"http://localhost:8000"{p.image_path}`}
                    alt="" className="w-full h-full object-cover" />
                ) : <span>🛍️</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.promo_price
                    ? <><s>{formatPrice(p.price, currency)}</s> {formatPrice(p.promo_price, currency)}</>
                    : formatPrice(p.price, currency)}
                  {p.stock !== null && ` · stock : ${p.stock}`}
                </p>
                <label className="text-xs text-emerald-700 font-medium cursor-pointer">
                  📷 {p.image_path ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadImage(p.id, e.target.files[0])} />
                </label>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button onClick={() => toggleActive(p)}
                  className="text-xs font-semibold text-neutral-600">
                  {p.is_active ? "👁️ Visible" : "🚫 Caché"}
                </button>
                <button onClick={() => removeProduct(p.id)}
                  className="text-xs text-red-500">Supprimer</button>
              </div>
            </div>
          ))}
      </section>

      <form onSubmit={addProduct} className="mx-4 mt-5 bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-bold text-sm">➕ Nouveau produit</h2>
        <input className={`${input} w-full`} placeholder="Nom du produit" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div className="grid grid-cols-3 gap-2">
          <input className={input} type="number" min="1" placeholder="Prix" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className={input} type="number" min="1" placeholder="Promo (opt.)" value={form.promo_price}
            onChange={(e) => setForm({ ...form, promo_price: e.target.value })} />
          <input className={input} type="number" min="0" placeholder="Stock (opt.)" value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm">
          Ajouter le produit
        </button>
      </form>
    </main>
  );
}
EOF

cat > "frontend/app/admin/shops/[shopId]/publications/page.tsx" <<'EOF'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";

interface Post { product_id: number; product_name: string; text: string; }

export default function PublicationsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [shopPost, setShopPost] = useState("");
  const [copied, setCopied] = useState<number | "shop" | null>(null);

  useEffect(() => {
    adminApi.getPublications(Number(shopId)).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setShopPost(data.shop_post);
      }
    });
  }, [shopId]);

  async function copy(text: string, key: number | "shop") {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0">
        <Link href={`/admin/shops/${shopId}`} className="text-sm text-neutral-500">← Produits</Link>
        <h1 className="font-bold">📣 Agent Publications</h1>
        <p className="text-xs text-neutral-500">Copiez-collez dans vos statuts WhatsApp / Facebook</p>
      </header>

      <section className="px-4 mt-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">🏪 Post vitrine boutique</h2>
            <button onClick={() => copy(shopPost, "shop")}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white">
              {copied === "shop" ? "✅ Copié !" : "Copier"}
            </button>
          </div>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-neutral-700 bg-neutral-50 rounded-xl p-3">{shopPost}</pre>
        </div>

        {posts.map((post) => (
          <div key={post.product_id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold truncate">{post.product_name}</p>
              <button onClick={() => copy(post.text, post.product_id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                {copied === post.product_id ? "✅ Copié !" : "Copier"}
              </button>
            </div>
            <pre className="mt-2 text-xs whitespace-pre-wrap text-neutral-700 bg-neutral-50 rounded-xl p-3">{post.text}</pre>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="text-center text-sm text-neutral-500">
            Ajoutez des produits pour générer des posts.
          </p>
        )}
      </section>
    </main>
  );
}
EOF

cat > "frontend/app/admin/shops/[shopId]/settings/page.tsx" <<'EOF'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/admin";

export default function SettingsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const sid = Number(shopId);
  const [form, setForm] = useState({ name: "", description: "", whatsapp_number: "", currency: "FCFA" });
  const [saved, setSaved] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    adminApi.getShops().then(async (res) => {
      if (res.ok) {
        const shop = (await res.json()).find((s: { id: number }) => s.id === sid);
        if (shop) {
          setForm({ name: shop.name, description: shop.description ?? "",
            whatsapp_number: shop.whatsapp_number, currency: shop.currency });
        }
      }
    });
    setLink(`window.location.origin/{window.location.origin}/window.location.origin/{""}`);
  }, [sid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminApi.updateShop(sid, form);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  const input = "w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className="mx-auto max-w-lg min-h-screen pb-10">
      <header className="bg-white border-b border-neutral-100 px-5 py-4 sticky top-0">
        <Link href={`/admin/shops/${sid}`} className="text-sm text-neutral-500">← Produits</Link>
        <h1 className="font-bold">⚙️ Réglages boutique</h1>
      </header>

      <form onSubmit={save} className="px-4 mt-4 space-y-3">
        <input className={input} placeholder="Nom" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className={input} rows={3} placeholder="Description (affichée en haut du catalogue)"
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className={input} type="tel" placeholder="Numéro WhatsApp" value={form.whatsapp_number}
          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} required />
        <input className={input} placeholder="Devise (FCFA, GNF…)" value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <button type="submit"
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold">
          {saved ? "✅ Enregistré !" : "Enregistrer"}
        </button>
      </form>

      <div className="mx-4 mt-6 bg-white rounded-2xl p-4 shadow-sm text-center">
        <h2 className="font-bold text-sm text-left">🔗 QR code de votre boutique</h2>
        {/* NOTE AGENT : brancher le QR (ex : https://api.qrserver.com/v1/create-qr-code/?data=LIEN&size=200x200)
            une fois le slug connu via getShops(). Imprimable sur le comptoir. */}
        <p className="mt-2 text-xs text-neutral-500">
          Le QR code pointe vers votre page catalogue — les clients le scannent et commandent direct.
        </p>
      </div>
    </main>
  );
}
EOF

cat > frontend/Dockerfile <<'EOF'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
EOF

printf 'node_modules\n.next\n.env.local\n' > frontend/.dockerignore

echo "── Fichiers racine ──"

cat > docker-compose.yml <<'EOF'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: commerce
      POSTGRES_USER: commerce
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changez-moi}
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://commerce:${POSTGRES_PASSWORD:-changez-moi}@db:5432/commerce
      SECRET_KEY: ${SECRET_KEY:-changez-moi-en-prod}
      UPLOAD_DIR: /app/uploads
      DEBUG: "false"
    volumes: [uploads:/app/uploads]
    depends_on: [db]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: ${PUBLIC_API_URL:-https://api.mondomaine.com/api}
    depends_on: [backend]
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [frontend, backend]
    restart: unless-stopped

volumes:
  pgdata:
  uploads:
  caddy_data:
EOF

cat > Caddyfile <<'EOF'
{$DOMAIN} {
    handle /uploads/* {
        reverse_proxy backend:8000
    }
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
EOF

cat > .env.example <<'EOF'
# Copier vers .env et personnaliser
DOMAIN=mondomaine.com
PUBLIC_API_URL=https://api.mondomaine.com
POSTGRES_PASSWORD=changez-moi
SECRET_KEY=generez-avec-openssl-rand-hex-32
EOF

echo ""
echo "✅ Projet créé dans ./$ROOT"
echo ""
echo "   Démarrage dev :"
echo "   cd $ROOT/backend && python -m venv .venv && source .venv/bin/activate"
echo "   pip install -r requirements.txt && uvicorn app.main:app --reload"
echo "   cd ../frontend && npm install && npm run dev"
echo ""
echo "   Puis donnez le dossier à votre agent avec GUIDE_AGENT.md."
