# BRIEF STITCH — Master Commerce

**Rôle de stitch** : uniquement ARRANGER VISUELLEMENT chaque écran (couleurs, typographie, espacement, rayons, ombres, hiérarchie). **Ne rien ajouter, ne rien retirer, ne pas casser le fonctionnement.** Le brief ci-dessous décrit chaque écran réel, ses modules, ses états et ses actions. Les captures d'écran fournies par le client (dossier `screens/`) font foi pour la forme ; ce document garantit que toutes les fonctionnalités visibles correspondent bien au produit réel.

---

## 0. Règles NON-négociables (garde-fous)

1. **Aucune fonctionnalité nouvelle** : pas de compte client, pas de paiement en ligne, pas de recherche/rechamp, pas de page produit, pas de notes d'annulation client, pas de nouveau champ.
2. **Chaque élément doit rester présent** : badges promo `-X%`, prix barrés, état « Épuisé », steppers de quantité, toggles disponibilité, modale nouveau plat, filtres à compteurs, chips de statut, liens WhatsApp, monogramme si pas d'image.
3. **Le texte des boutons restera identique** (ex. « Je confirme ma commande », « ✓ Confirmer », « Réappro +10 », « Ajouter au menu ✨ »).
4. **On garde les formats** : prix en `1 500 FCFA`, réfs `MC-…`, monogramme 2 lettres, emojis (ex. 🛒 📊 🦴 dans les titres d'admin) et icônes Material Symbols déjà utilisées.
5. **Le back/le layout responsive actuel est conservé** : grilles (`lg:grid-cols-…`), tiroir panier, sticky summaries, rabattements en colonne sur mobile.

---

## 1. Direction visuelle cible (« Restauco modernisé » — validée)

- **Accent primaire** : coral `#FE5F41` — utilisé pour les CTA principaux, les boutons `+` d'ajout, les badges promo.
- **Titres** : charbon chaud `#262019` (sous-titres et titres replacés dans ce ton).
- **Polices** : **Sora** pour les titres, **Inter** pour le texte.
- **Fond de page** : crème chaud `#FFF7F3` ; **cartes blanches** arrondies 22–28 px, ombres douces.
- **Hero vitrine** : garder la mise en page existante (dégradé sombre actuel OU variante claire crème au choix de stitch, sans casser les blocs).
- **Admin** : remplacer les verts dominants (`#006b2c`, `#7ffc97`, fond `#fff8f4`) par la palette coral/charbon/vert *apaisée* si cohérent — **sans changer la position des éléments ni les actions**.
- **Ajout décidé (fonctionnalité, implémentée par opencode pas stitch)** : une **section avis clients** (2–3 témoignages statiques) entre « Comment ça marche » et le CTA de la vitrine. Stitch peut le prévoir dans sa maquette de l'écran 01.

> En cas de doute entre ce document et une capture : **la capture prime**, mais toute disparition d'élément fonctionnel doit être signalée au client.

---

## 2. Architecture & contexte

- Frontend Next.js : porte `3000` · Backend FastAPI : `:8000` (API `/api`, images `/uploads`).
- Multi-boutiques : chaque marchand gère ses boutiques (`/admin`) ; le rôle **owner** a accès à `/admin/plateforme`.
- Commande client **sans compte** (nom + téléphone) → confirmation de la commande via **WhatsApp** (`wa.me`).
- Panier : `localStorage mc_cart` · dernière commande : `mc_last_order` · token : `mc_token`.
- Statuts commande : `pending → confirmed → delivered` / `pending|confirmed → cancelled`. Stock décrémenté à la confirmation/livraison, restauré à l'annulation.
- Boutique de démo : `Ai Business`, slug `ai-business`. `/` redirige vers `/ai-business`.

---

## 3. Fiches écrans (16)

---

### 01 · Vitrine catalogue  — `app/[slug]/page.tsx` (route `/{slug}`)
La page publique principale. Tout est listé de haut en bas :
1. **Header sticky** (`components/SiteHeader.tsx`) : fond crème/blur, carré vert icône `ramen_dining` + nom boutique, nav « Le menu » / « Comment ça marche » / « WhatsApp », bouton pilule blanc bordure + logo WhatsApp (numéro visible sur ≥lg), bouton **Panier** vert avec badge coral (compteur) et tiroir au clic.
2. **Hero plein écran** : dégradé `forest-dark → forest → #2f7d4e`, halos ember/crème flous ; pastille « Ouvert jusqu'à 22h00 » (point vert pulsant) ; H1 nom boutique ; description ; boutons **« Commander maintenant »** (coral, ancre `#menu`) + **« Nous écrire sur WhatsApp »** (outline crème) ; 3 puces de confiance (icons `verified`, `local_shipping`, `schedule`) ; à droite **collage de 3 photos** ou, si aucune image, **monogramme 2 lettres** sur disque décoratif (cercles concentriques + halo coral).
3. **Bande confiance** (bande blanche) : 3 items `🕒 Frais du jour` / `✅ Confirmation WhatsApp` / `🚚 Livraison ou retrait`, icônes sur carré coral pâle.
4. **Menu `#menu`** : eyebrow « NOTRE CARTE », H2 « Plats du jour » ; **pills filtres** `Tout voir (n)` + chaque catégorie avec compteur (actif : vert plein ; inactif : blanc + bordure) ; grille 1→4 colonnes de **cartes produit** (`components/ProductCard.tsx`).
5. **Cartes produit** : image 4:3 (placeholder icône `restaurant_menu` si absente), badge coral `-X%` si promo, overla « **Épuisé** » (fond crème flouté + pastille sombre) si stock 0, nom, description 2 lignes, **prix barré si promo**, bouton rond `+` (coral → vert « check » 1,2 s après ajout ; gris bloc si épuisé).
6. **Comment ça marche `#cours`** (bande blanche) : 3 cartes crème « 01 Choisissez vos plats / 02 Passez la commande / 03 Confirmez sur WhatsApp » (numéro sur carré vert).
7. **CTA final `#contact`** : bande arrondie 32px dégradé vert, « Une petite faim ? », « Voir le menu » + « Commander sur WhatsApp ».
8. **Footer** (`components/SiteFooter.tsx`) : fond `forest-dark` ; 3 colonnes (Présentation logo+nom+texte / Contact : WhatsApp + « Ouvert tous les jours » / Navigation : Le menu, Comment ça marche, **Espace marchand** → `/admin`) ; barre basse « © Année Nom » + « Propulsé par Master Commerce · Commandes par WhatsApp ».

Fonctionnel : données rechargées toutes les 30 s ; filtre par catégorie via `?cat=` ; produit à stock 0 masqué (hors « Épuisé »).

---

### 02 · Tiroir panier — `components/CartDrawer.tsx`
Overlay latéral droite (fond sombre flouté, clic extérieur / Échap / ✕ pour fermer).
- **Header** : carré vert icône `shopping_bag`, « Votre panier », badge coral (nb articles), bouton ✕.
- **Liste** : vignette 64px (image ou emoji 🍽️), nom, poubelle, **stepper** `− n +` (pilule crème/bordure, boutons ronds blancs), prix ligne (gras vert).
- **Footer** : « Total à régler » + total, bouton coral plein **« Passer la commande »** → `/checkout`, lien « Continuer mes achats ».
- **État vide** : icône `shopping_bag`, « Votre panier est vide », bouton vert « Voir le menu ».

---

### 03 · Page panier — `app/[slug]/cart/page.tsx`
- Entête : icône sac vert, H1 « Votre panier », sous-titre `X article(s) · {boutique}`.
- **Grille 2 colonnes** : à gauche la liste des articles (mêmes contrôles quantité/poubelle, vignettes 80px) ; à droite **récap sticky** : Sous-total, Livraison « Calculée au checkout », Total (gras vert), bouton coral « Passer la commande », note « Sans compte · Confirmation simple sur WhatsApp ».
- **État vide** : encadré blanc centré « Votre panier est vide » + bouton coral « Explorer le menu ».

---

### 04 · Checkout — `app/[slug]/checkout/page.tsx`
- H1 « **Vérifiez votre commande** », sous-titre « Vous pouvez encore tout modifier. »
- **Colonne gauche** :
  - **Vos délices** : badge `X articles`, lignes `qty` (pastille verte) + nom + prix ligne.
  - **Mode de réception** : 2 cartes `🏃 Retrait sur place (Gratuit)` / `🚚 Livraison (Frais selon zone)` — sélectionnée = bordure + fond vert pâle ; si Livraison → **sélecteur de zone** (`{nom} — {frais}`, défaut 1ʳᵉ zone).
  - **Vos coordonnées** : champs « Nom complet » (min 2), « Téléphone (+228…) » (min 8, type tel) ; mention « Pas besoin de compte — votre commande sera confirmée sur WhatsApp. »
- **Colonne droite (synthèse sticky)** : Sous-total, « Retrait sur place » ou « Livraison ({zone}) » + frais ou « Gratuit », trait, « **Total à payer** » (gros prix vert), bouton coral **« Je confirme la commande »** (spinner « Enregistrement… »), note « Règlement à la livraison · Annulation gratuite avant paiement », encart d'**erreur rouge** si échec.
- Succès → redirection vers le ticket `/{slug}/order/{ref}` + panier vidé.

---

### 05 · Ticket de commande — `components/OrderTicket.tsx` + `app/[slug]/order/[ref]/page.tsx`
- **Bandeau succès** (dégradé vert arrondi) : pastille « check », « **Commande reçue !** », texte selon mode (« Récupérez votre commande au comptoir… » / « L'équipe prépare votre commande… Confirmez sur WhatsApp »), pilule `receipt` avec la **réf** `MC-…`.
- **Ticket** (carte blanche, séparateurs pointillés) :
  * En-tête centré : nom boutique + date/heure FR complète.
  * Ligne client : icône `badge` + nom · icône `call` + téléphone.
  * Ligne réception : icône `storefront`/`local_shipping` + « Retrait sur place » / « Livraison — {zone} », chip verte « Gratuit » ou frais.
  * Liste articles : pastilles `qty` + nom · prix ligne.
  * Totaux : Sous-total, Livraison, « **Total à payer** » (gras vert).
  * Pied centré : « MASTER COMMERCE · {réf} ».
- **Actions** : bouton coral **« Confirmer sur WhatsApp »** (lien `wa.me` pré-rempli avec le détail) + bouton blanc bordure « Retour au menu » (ancre icône `arrow_back`).

---

### 06 · Mes commandes — `app/[slug]/commandes/page.tsx`
- H1 « Mes commandes ».
- Recharge la dernière réf du localStorage (`mc_last_order`) → affiche le **ticket** dans une carte blanche.
- **États** : chargement (icône sync pulsante) / ticket / **vide** (« Aucune commande enregistrée », « Votre dernier ticket apparaîtra ici après une commande. », bouton coral « Découvrir le menu »).

---

### 07 · Login — `app/admin/login/page.tsx`
- Carte centrée `max-w-sm` : emoji 🛍️, H1 « Master Commerce », « Connectez-vous à votre espace ».
- Champs Email / Mot de passe ; erreur rouge (encadré `red-50`) ; bouton plein vert émeraude « Se connecter » (spinner « Connexion… ») ; « Pas de compte ? **Créer un compte** » → `/admin/register`.
- **Note visuelle** : cet écran est dans la palette Tailwind neutre (emerald), à harmoniser avec la direction cible.

---

### 08 · Inscription — `app/admin/register/page.tsx`
- Même gabarit : emoji 🛍️, « Créer votre compte », « Lancez votre boutique en 2 minutes ».
- Champ Email, « Mot de passe (8 caractères min.) » ; erreurs (email déjà utilisé / mot de passe trop court) ; bouton « Créer mon compte » (spinner « Création… ») ; « Déjà inscrit ? **Se connecter** ».
- À l'inscription : **connexion automatique** → `/admin`.

---

### 09 · Mes boutiques — `app/admin/page.tsx` (route `/admin`)
- **Header sticky** (fond `#fff8f4`/blur) : eyebrow « VUE MARCHAND AGRÉÉ », H1 « 🛍️ Mes boutiques », pilule « 🛡️ Plateforme » (uniquement rôle owner), bouton « Déconnexion ».
- **Cartes boutique** : icône `storefront` sur carré vert clair, nom, `/slug · {numéro}` (mono), badge **« En ligne » (vert clair) / « Hors ligne » (gris)** ; rangée de boutons : « 📊 Tableau de bord » (vert plein) · « 🛒 Commandes » · « 📦 Produits » · « 👁️ Aperçu » (nouvel onglet) · « 🔗 Copier » (copie le lien public + alerte).
- **« ➕ Nouvelle boutique »** (carte) : Nom + Numéro WhatsApp → bouton « Créer la boutique ✨ » ; erreur en rouge.
- **État vide** : « Créez votre première boutique ci-dessous 👇 ».

---

### 10 · Dashboard « Ma journée » — `app/admin/shops/[shopId]/page.tsx`
- **Entête** : lien « ← Mes boutiques », **5 onglets pills** `📊 Bord · 🛒 Commandes · 📦 Produits · 📣 Posts · ⚙️ Réglages` (actif = vert plein).
- Sous-titre eyebrow « VUE MARCHAND AGRÉÉ · ACTUALISÉ À L'INSTANT », H1 « 📊 Ma journée ».
- **3 cartes KPI** :
  1. **« 💰 Encaissé aujourd'hui »** (icône `payments` vert clair) : CA du jour (gros) + « Total confirmé/livré » + ligne « CA cumulé ».
  2. **« 🧾 Commandes reçues »** (icône `receipt` gris) : nombre + chip « X livrées », « Panier moyen », **barre % livrées** (vert).
  3. **« 📦 À préparer maintenant »** (carte orange) : point pulsant + badge **« URGENT »**, « X tickets en cuisine », prénoms des 2 premiers clients, bouton « Traiter les commandes », « X en attente » ; état vide « Tout est servi. 🔥 ».
- **« 📈 Top produits du jour »** (2/3 largeur) : barres verticales de volume (top 3), rang + nom + `{qty} cmds` + CA.
- **« 🕓 Dernières commandes »** (1/3) : heure, client, mode + zone, total, chip de statut ; lien « Voir tout ».
- **« ⚠️ Alertes & Stock bas »** : cartes **Épuisé** (fond rouge pâle, « Rupture — masqué de la vitrine. ») et **Reste X** (orange, « Stock critique pour le service du soir. ») ; lien « Gérer les stocks → ».

---

### 11 · Commandes — `app/admin/shops/[shopId]/orders/page.tsx`
- Eyebrow « CUISINE & LIVRAISON », H1 « 🛒 Commandes » + **badge `X à traiter`** (rose `#ff8d9c`).
- **Pills de filtre avec compteurs** : Toutes / ⏳ En attente / ✅ Confirmées / 🚚 Livrées / ❌ Annulées.
- **Cartes commande** : réf `#MC-…` (mono vert), `{client} · 📞 {téléphone}`, `Retrait sur place | 🚚 Livraison — {zone} · {date FR}` ; **chip statut** colorée ; encart articles (`qty × nom`, ligne « Livraison », ligne « Total » sur filet).
  - Chips : `pending` rouge/white « ⏳ En attente » · `confirmed` vert clair/vert foncé « ✅ Confirmée » · `delivered` saumon/vert-bouteille « 🚚 Livrée » · `cancelled` gris « ❌ Annulée ».
- **Actions par statut** (boutons ronds) :
  - En attente : « ✓ Confirmer » (vert plein) + « ✕ Annuler » (rose, texte rouge).
  - Confirmée : « 🚚 Marquer livrée » (vert plein) + « ✕ Annuler ».
  - Livrée / Annulée : aucune action.
- États vide selon filtre : « Aucune commande … Partagez votre lien ! »

---

### 12 · Produits & Stocks — `app/admin/shops/[shopId]/produits/page.tsx` (le + complet)
- Eyebrow « CARTE & STOCKS », H1 « 📦 Gestion Menu & Stocks », **3 badges** `X actifs` (vert clair) / `X alarmes stock` (orange pâle) / `X épuisés` (rouge pâle), bouton **« Nouveau plat »** (+ icône `add`).
- **Pills** : Tous les plats / 🔥 Promo / ⚠️ Alerte stock / 🚫 Épuisés (compteurs).
- **Table** (en-tête desktop : Plat & catégorie · Prix · Stock · Disponibilité · Actions) avec **lignes/cartes** :
  * Visuel 56px (image ou placeholder `restaurant` gris), nom + **badge promo `-X%`** rose, catégorie (« Non classé » si aucune).
  * **Prix** + ancien prix barré si promo (note : le barré affiche le tarif promo, le prix courant est le prix de base — à conserver tel quel dans le rendu).
  * **Stock (stepper)** : `∞ Toujours actif` (pilule vert) OU stepper `− n +` (+ bouton **« Réappro +10 »** orange si stock ≤ 5 ; « Épuisé » rouge si 0).
  * **Disponibilité (toggle)** : « ✓ Disponible » (vert) / « Indisponible » (gris) / « Fini aujourd'hui » (rouge, non cliquable si stock 0).
  * **Actions** : poubelle (`delete`, confirmation native).
- **Modale « Ajouter un nouveau plat 🍲 »** (bottom-sheet/mobile, centré desktop, fond flouté) : Nom du plat * · Description (textarea) · Prix * / Prix promo · Stock (vide = ∞) / Catégorie (select, « — non classé — ») · **Photo du plat** (fichier image) · bouton « Ajouter au menu ✨ » (désactivé si vide/invalide).
- État vide : encadré blanc centré « Aucun plat dans cette vue ».
- Pied : astuce du ∞.

---

### 13 · Publications — `app/admin/shops/[shopId]/publications/page.tsx`
- Header blanc neutre : « ← Produits », « 📣 Agent Publications », « Copiez-collez dans vos statuts WhatsApp / Facebook ».
- **« 🏪 Post vitrine boutique »** : carte blanche, texte pré-généré (block `pre` sur fond gris), bouton « Copier » → « ✅ Copié ! ».
- **Un post par produit** (« PROMO SPÉCIALE » / « NOUVEAUTÉ », urgence, CTA WhatsApp) : même carte + bouton « Copier ».
- État vide : « Ajoutez des produits pour générer des posts. »
- *Style actuel : palette Tailwind neutre — à harmoniser dans la direction cible.*

---

### 14 · Réglages boutique — `app/admin/shops/[shopId]/settings/page.tsx`
- Header : « ← Produits », « ⚙️ Réglages boutique ».
- **Formulaire** : Nom · Description (textarea, « affichée en haut du catalogue ») · Numéro WhatsApp · Devise `FCFA` → bouton « Enregistrer » → « ✅ Enregistré ! » (1,5 s).
- **« 🔗 QR code de votre boutique »** : image 200×200 (API `qrserver.com`) pointant vers `{origin}/{slug}` + explication.

---

### 15 · Plateforme (owner) — `app/admin/plateforme/page.tsx`
- Header blanc : « ← Boutiques », « 🛡️ Plateauforme Master Commerce », « Déconnexion ».
- **Grille KPI 7 cartes** (2→4 colonnes) : Boutiques / Marchands / Commandes / À traiter (ambre) / Chiffres d'affaires / Commissions (indigo) / Frais création.
- **« 🏗️ Créer une boutique à façon (monétisation) »** : Email du marchand (doit déjà être inscrit), Nom, WhatsApp, **Commission %**, **Setup (FCFA)** → bouton indigo « Créer la boutique pour le marchand » ; bannières succès (vert) / erreur (rouge).
- **« 🏪 Toutes les boutiques »** : nom `/slug`, `{email marchand} · WhatsApp {num}`, ligne stats (`X cmd(s) · CA … · commission {n}% ({montant}) · setup …`), **toggle « En ligne / Hors ligne »**.
- **« 🕘 Dernières commandes du réseau »** : boutique, `réf · date`, total + chip statut.

---

### 16 · Footer détaillé — `components/SiteFooter.tsx`
Cf. écran 01, point 8. Voir aussi le pic sur la vitrine.

---

## 4. Checklist des captures attendues (dossier `screens/`)

```
01-catalogue.png
02-tiroir-panier.png
03-panier.png
04-checkout.png
05-ticket.png
06-mes-commandes.png
07-login.png
08-inscription.png
09-mes-boutiques.png
10-dashboard.png
11-commandes.png
12-produits.png
13-publications.png
14-reglages.png
15-plateforme.png
16-footer.png
```

Ordre conseillé de travail : **vitrine d'abord (01 à 06), admin ensuite (07 à 15)**.

---

## 5. Synthèse des écarts à respecter absolument

| Zone | Version actuelle (source de vérité = le code) | Éléments à ne JAMAIS perdre |
|---|---|---|
| Vitrine | Header sticky + hero à collage + bande + menu filtré + étapes + CTA + footer | badge `-X%`, prix barré, Épuisé, stepper panier, mode réception, erreur checkout, ticket WhatsApp |
| Admin | Palette `#fff8f4` / vert `#006b2c` / vert clair `#7fc97` | 5 onglets pills, chips statut, steppers stock, toggle dispo, modale plat, filtres compteurs, QR |
| Owner | Palette neutre Tailwind + `Platforme` | KPI 7, création à façon (commission/setup), toggle activer |

Fin — pour toute question, le client tranche.