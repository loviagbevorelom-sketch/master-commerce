# 🚀 Guide de Déploiement sur Render — Master Commerce & Kubafoodies

Ce guide détaille pas-à-pas la mise en production de **Master Commerce** et de sa boutique officielle **Kubafoodies** sur [Render.com](https://render.com).

---

## 📋 Architecture Déployée

| Composant | Type Render | Technologie | Rôle |
| :--- | :--- | :--- | :--- |
| **`master-commerce-db`** | PostgreSQL Database | PostgreSQL 16 | Base relationnelle managée |
| **`master-commerce-api`** | Web Service | FastAPI / Python 3.11 | API REST, Auth JWT, Commandes, FedaPay, QR Codes |
| **`master-commerce-web`** | Web Service | Next.js 14 / Node 20 | Vitrine Kubafoodies, Panier, Checkout, Admin Marchand |

---

## ⚡ Méthode 1 : Déploiement Automatique via Blueprint (Recommandée)

Grâce au fichier [`render.yaml`](./render.yaml) situé à la racine du projet, vous pouvez déployer l'intégralité de la stack en **1 clic**.

### Étapes :
1. **Pousser votre code sur GitHub** :
   ```bash
   git init
   git add .
   git commit -m "feat: setup Kubafoodies and Render deployment"
   git branch -M main
   git remote add origin https://github.com/VOTRE_UTILISATEUR/VOTRE_REPO.git
   git push -u origin main
   ```

2. **Créer le Blueprint sur Render** :
   - Connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
   - Cliquez sur **New +** en haut à droite, puis sélectionnez **Blueprint**.
   - Connectez votre dépôt GitHub.
   - Render lira automatiquement `render.yaml` et affichera les 3 services à provisionner (`master-commerce-db`, `master-commerce-api`, `master-commerce-web`).
   - Cliquez sur **Apply**.

3. **Laisser Render construire et déployer** :
   - La base de données PostgreSQL sera initialisée.
   - Le backend FastAPI se lancera et exécutera automatiquement le **seeder automatique** pour créer la boutique **Kubafoodies**, ses catégories, ses plats et ses zones de livraison à Lomé.
   - Le frontend Next.js compilera et se connectera automatiquement à l'URL du backend.

---

## 🛠️ Méthode 2 : Configuration Manuelle des Services

Si vous préférez créer chaque service manuellement dans la console Render :

### 1. Créer la Base de Données PostgreSQL
- **New +** ➡️ **PostgreSQL**
- **Name** : `master-commerce-db`
- **Database** : `mastercommerce`
- **User** : `mastercommerce_user`
- **Region** : Frankfurt (ou Ohio)
- Cliquez sur **Create Database**.
- Une fois créée, copiez la valeur de **Internal Database URL** (`postgres://...`).

---

### 2. Créer le Service Backend (FastAPI)
- **New +** ➡️ **Web Service**
- Connectez votre dépôt GitHub.
- **Paramètres de configuration** :
  - **Name** : `master-commerce-api`
  - **Runtime** : `Python 3`
  - **Root Directory** : `master-commerce/backend`
  - **Build Command** : `pip install --upgrade pip && pip install -r requirements.txt`
  - **Start Command** : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - **Health Check Path** : `/health`
- **Variables d'Environnement (Environment Variables)** :
  | Clé | Valeur | Description |
  | :--- | :--- | :--- |
  | `DATABASE_URL` | *L'Internal Database URL copiée* | Connexion PostgreSQL |
  | `SECRET_KEY` | *(Cliquez sur Generate)* | Clé de signature JWT |
  | `ENVIRONMENT` | `production` | Active le mode production |
  | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Durée validité tokens |
  | `CORS_ORIGINS` | `https://*.onrender.com,http://localhost:3000` | Autorisation requêtes frontend |
  | `FEDAPAY_ENVIRONMENT` | `sandbox` (ou `live`) | Mode de paiement FedaPay |
  | `FEDAPAY_SECRET_KEY` | `sk_sandbox_...` | Clé secrète FedaPay Marchand |
  | `FEDAPAY_PUBLIC_KEY` | `pk_sandbox_...` | Clé publique FedaPay |

---

### 3. Créer le Service Frontend (Next.js)
- **New +** ➡️ **Web Service**
- Connectez votre dépôt GitHub.
- **Paramètres de configuration** :
  - **Name** : `master-commerce-web`
  - **Runtime** : `Node`
  - **Root Directory** : `master-commerce/frontend`
  - **Build Command** : `npm install && npm run build`
  - **Start Command** : `npm run start`
- **Variables d'Environnement** :
  | Clé | Valeur | Description |
  | :--- | :--- | :--- |
  | `NODE_VERSION` | `20.17.0` | Version Node.js |
  | `NEXT_PUBLIC_API_URL` | `https://master-commerce-api.onrender.com` | URL publique de votre API FastAPI |

---

## 🔑 Comptes Pré-configurés par le Seeder Automatique

Au premier démarrage sur PostgreSQL Render, la base sera automatiquement peuplée :

### 1. Compte Marchand Démo
- **Email** : `demo@mastercommerce.app`
- **Mot de passe** : `demo123456`
- **Boutique assignée** : **Kubafoodies — Service Traiteur** (`slug: kubafoodies`)

### 2. Compte Propriétaire (Owner / SuperAdmin)
- **Email** : `owner@mastercommerce.app`
- **Mot de passe** : `owner-mc-admin123`
- **Accès** : Dashboard SuperAdmin Réseau (`/admin/plateforme`)

---

## ✅ Vérification Post-Déploiement

Une fois le déploiement terminé sur Render :

1. **Test Santé API** : Ouvrez `https://votre-api.onrender.com/health` (doit renvoyer `{"status": "ok"}`).
2. **Documentation Swagger** : Ouvrez `https://votre-api.onrender.com/docs`.
3. **Vitrine Kubafoodies** : Ouvrez `https://votre-web.onrender.com/kubafoodies`.
4. **Test Panier & Commande** :
   - Ajoutez des plats au panier.
   - Rendez-vous sur `https://votre-web.onrender.com/kubafoodies/checkout`.
   - Testez une commande en Paiement à la livraison (Ticket WhatsApp généré instantanément).
   - Testez une commande avec FedaPay Sandbox.
5. **Espace Marchand & QR Code** :
   - Connectez-vous sur `https://votre-web.onrender.com/admin/login`.
   - Rendez-vous dans **Réglages & QR Code** (`/admin/shops/[id]/settings`).
   - Vérifiez que le QR Code s'affiche et cliquez sur **📥 Télécharger le QR Code** pour tester l'export PNG.

---

## 💡 Conseils & Astuces Render

> [!TIP]
> **Plan Gratuit & Mise en Veille (Spin Down)** :
> Sur le plan gratuit Render, les services web se mettent en veille après 15 minutes d'inactivité. La première requête de réveil peut prendre ~30-45 secondes.
> Pour une boutique en production 24h/24 sans latence, passez les services en plan **Starter** ($7/mois).

> [!NOTE]
> **HTTPS Automatique** :
> Render fournit et renouvelle automatiquement un certificat SSL Let's Encrypt pour vos sous-domaines `*.onrender.com` et vos noms de domaine personnalisés.
