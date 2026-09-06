# 🛍️ MASTER COMMERCE — Guide technique (À LIRE AVANT TOUTE MODIFICATION)

## 1. Le projet
SaaS e-commerce multi-boutiques pour commerçants d'Afrique de l'Ouest qui
vendent via WhatsApp. Flux : commerçant crée boutique+produits → partage le
lien /{slug} → client parcourt, ajoute au panier, remplit nom/tél/zone →
le serveur calcule le total, stocke la commande (Order) et génère un lien
wa.me pré-rempli → commande arrive sur WhatsApp du commerçant, qui la gère
dans son admin (statuts confirmed/delivered/cancelled + stock). Pas de
paiement en ligne (FedaPay = phase future). Une seconde strate : panneau
**Plateforme** réservé au propriétaire (rôle owner) pour monétiser
(commissions % + frais de création, boutiques « à façon »).

## 2. Règles STRICTES (R1-R10)
- R1 : analyser l'existant avant toute modification
- R2 modèles = MerchantUser (role merchant|owner), Shop, Category, Product,
  DeliveryZone, Order, OrderItem (la commande est bien stockée désormais)
- R3 : back-office complet (auth, CRUD, upload, réglages, statuts commandes)
- R4 : ne rien inventer hors périmètre (paiement FedaPay = phase ultérieure)
- R5 : lien WhatsApp généré UNIQUEMENT dans app/services/whatsapp.py
- R6 : isolation multi-boutiques stricte (get_owned_shop dans chaque route merchant)
- R7 : total checkout TOUJOURS recalculé serveur
- R8 : code 100% fonctionnel, aucun stub/TODO
- R9 : statuts commande = pending → (confirmed|delivered) → delivered|cancelled ;
  transitions invalides refusées (409) ; stock décrémenté à la confirmation,
  restitué si annulation (voir ALLOWED_TRANSITIONS dans shops.py)
- R10 : endpoints /api/platform/* réservés au propriétaire (get_current_owner,
  rôle owner) ; KPIs CA/commissions + création boutique à façon.
  Compte owner seedé via settings.PLATFORM_OWNER_EMAIL/PASSWORD.

## 3. Architecture
backend/  FastAPI + SQLAlchemy + JWT + Pillow
  app/main.py (app, CORS, routers, /uploads, seed zones + compte owner)
  core/{config,security}.py · db/session.py · models/__init__.py · schemas/__init__.py
  api/deps.py (get_current_merchant, get_owned_shop, get_current_owner)
  api/v1/{auth,shops,products,public,publications,platform}.py
  services/{whatsapp,publications,images}.py · tests/
frontend/ Next.js14 App Router + TS + Tailwind + PWA
  app/layout.tsx (CartProvider) · app/manifest.ts
  app/[slug]/ (catalogue, cart, checkout, commandes, order/[ref]) · app/admin/**
  (dashboard marchand, orders, publications, settings, plateforme/ owner)
  components/ · lib/{api,admin,cart,types,format}.ts · public/sw.js

## 4. Endpoints clés
Publics : GET /api/public/shops/{slug}[/categories|/products|/delivery-zones]
          POST /api/public/shops/{slug}/checkout
          body: {items:[{product_id,qty}], customer_name, customer_phone,
                 reception_mode: delivery|pickup, delivery_zone_id}
          → {order_ref, whatsapp_link, total}
          GET /api/public/orders/{ref} (ticket + whatsapp_link persisté)
Merchant: POST /api/auth/register · POST /api/auth/login · GET /api/auth/me (role)
          CRUD /api/shops, /api/shops/{sid}/products(+/{pid}/image multipart),
          /api/shops/{sid}/categories · GET /api/shops/{sid}/publications
          GET /api/shops/{sid}/orders · PATCH /api/shops/{sid}/orders/{oid}/status
Owner (/api/platform/*) : overview (KPIs), shops (tout réseau), POST shops
          (boutique à façon), PATCH shops/{id} (commission, actif), delivery-zones

## 5. Environnement
backend: DATABASE_URL (sqlite:///./dev.db en dev), SECRET_KEY, UPLOAD_DIR,
         PLATFORM_OWNER_EMAIL/PASSWORD (seed owner)
frontend: NEXT_PUBLIC_API_URL=http://localhost:8000/api (gravée au build !)

## 6. TA MISSION
1. Lis le code, ne modifie rien d'abord (R1)
2. Vérifie la cohérence des imports (main.py ↔ api/v1/*)
3. Création tables en dev (Base.metadata.create_all) ; SQLite : supprime la
   dev.db si tu ajoutes une colonne (create_all n'altère pas l'existant)
4. pytest -q → zéro échec
5. Lance les 2 serveurs, valide : register → boutique → produit → catalogue
   → panier → checkout → commande listée → confirmation (stock ok) ; puis
   owner → plateforme → KPIs + boutique à façon
6. Signale toute incohérence ; n'invente qu'en dernier recours, documente.

## 7. Lancement
cd backend && python -m venv .venv && .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload     # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:3000
Compte propriétaire : owner@mastercommerce.app / owner-mc-admin123 (dev)
