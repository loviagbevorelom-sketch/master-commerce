#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  MASTER COMMERCE — Script d'installation tout-en-un
#  Usage : bash setup.sh && cd master-commerce
# ═══════════════════════════════════════════════════════════════
set -e
ROOT="master-commerce"
mkdir -p ROOT && cdROOT
mkdir -p backend/app/{core,db,models,schemas,api/v1,services} backend/tests backend/alembic/versions backend/uploads
mkdir -p frontend/app/{admin/login,admin/register,admin/shops/\[shopId\]/publications,admin/shops/\[shopId\]/settings} \
         "frontend/app/[]/cart" "frontend/app/[slug]/checkout/[productId]" \
         frontend/components frontend/lib frontend/public

echo "── Création du backend ──"

cat > README.md <<'EOF'
# Master Commerce
Voir GUIDE_AGENT.md — instructions complètes pour l'agent de code.
Lancement : backend (uvicorn) + frontend (npm run dev). Prod : docker compose up -d --build
EOF

# ─────────── GUIDE AGENT ───────────
cat > GUIDE_AGENT.md <<'EOF'
# 🛍️ MASTER COMMERCE — Guide technique (À LIRE AVANT TOUTE MODIFICATION)

## 1. Le projet
SaaS e-commerce multi-boutiques pour commerçants d'Afrique de l'Ouest qui
vendent via WhatsApp. Flux : commerçant crée boutique+produits → partage le
lien /{slug} → client parcourt, ajoute au panier, remplit nom/tél/zone →
le serveur calcule le total et génère un lien wa.me pré-rempli → commande
arrive sur WhatsApp du commerçant. AUCUNE commande stockée en base,
AUCUN paiement en ligne. Bonus : Agent Publications (posts promo générés,
copie 1 clic pour statuts WhatsApp).

## 2. Règles STRICTES (R1-R8)
- R1 : analyser l'existant avant toute modification
- R2 modèles = MerchantUser, Shop, Category, Product UNIQUEMENT (pas de table Order)
- R3 : back-office complet (auth, CRUD, upload, réglages, QR)
- R4 : ne rien inventer hors périmètre (pas de paiement, pas de comptes clients)
- R5 : lien WhatsApp généré UNIQUEMENT dans app/services/whatsapp.py
- R6 : isolation multi-boutiques stricte (get_owned_shop dans chaque route merchant)
- R7 : total checkout TOUJOURS recalculé serveur
- R8 : code 100% fonctionnel, aucun stub/TODO

## 3. Architecture
backend/  FastAPI + SQLAlchemy + Alembic + JWT + Pillow
  app/main.py (app, CORS, routers, /uploads) · core/{config,security}.py
  db/session.py · models/__init__.py · schemas/__init__.py
  api/deps.py (get_current_merchant, get_owned_shop)
  api/v1/{auth,shops,products,public,publications}.py
  services/{whatsapp,publications,images}.py · tests/
frontend/ Next.js14 App Router + TS + Tailwind + PWA
  app/layout.tsx (CartProvider) · app/manifest.ts · app/[slug]/ (catalogue,
  cart, checkout) · app/admin/** · components/ · lib/{api,admin,cart,types,format}.ts
  public/sw.js (network-first)

## 4. Endpoints clés
Publics : GET /api/public/shops/{slug}[/categories|/products]
         /api/public/shops/{slug}/checkout
         body: {items:[{product_id,qty}], customer_name, customer_phone, delivery_zone}
         → {whatsapp_link, total}
Merchant: POST /api/auth/register {email,password} · POST /api/auth/login (form OAuth2)
         CRUD /api/shops, /api/shops/{sid}/products(+/{pid}/image multipart),
         /api/shops/{sid}/categories, GET /api/shops/{sid}/publications

## 5. Environnement
backend: DATABASE_URL (sqlite:///./dev.db en dev), SECRET_KEY, UPLOAD_DIR
frontend: NEXT_PUBLIC_API_URL=http://localhost:8000/api (gravée au build !)

## 6. TA MISSION
1. Lis le code, ne modifie rien d'abord (R1)
2 Vérifie la cohérence des imports (main.py ↔ api/v1/*)
3. Migration Alembic (ou Base.metadata.create_all en SQLite dev)
4. pytest -v → zéro échec
5. Lance les 2 serveurs, valide : register → boutique → produit → catalogue
   → panier → checkout → lien wa.me correct (articles + total serveur)
6. Signale toute incohérence ; n'invente qu'en dernier recours, documente.

## 7. Lancement
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && alembic upgrade head
uvicorn app.main:app --reload     # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:3000
EOF

# ─────────── BACKEND ───────────
cat > backend/requirements.txt <<'EOF'
fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy==2.0.*
alembic==1.14.*
pydantic==2.*
pydantic-settings==2.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
pillow==11.*
psycopg2-binary==2.9.*
api==0.1.*
pytest==8.*
httpx==0.28.*
email-validator
EOF

touch backend/app/__init__.py backend/app/{core,db,models,schemas,api,services}/__init__.py backend/app/api/v1/__init__.py backend/tests/__init__.py

cat > backend/app/core/config.py <<'EOF'
from pyd_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-changez-moi"
    DATABASE_URL: str = "sqlite:///./dev.db"
    UPLOAD_DIR: str = "./uploads"
    DEBUG: bool = True
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    class Config:
        env_file = ".env"

settings = Settings()
EOF

cat > backend/app/core/security.py <<'EOF'
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGO = "HS256"

def hash_password(p: str) -> str: return pwd_ctx.hash(p)
def verify_password(p: str, h: str) -> bool: return pwd_ctx.verify(p, h)

def create_token(email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": exp}, settings.SECRET_KEY, algorithm=ALGO)

def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO]).get("sub")
    except Exception:
        return None
EOF

cat > backend/app/db/session.py <<'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

cat > backend/app/models/__init__.py <<'EOF'
from sqlalchemy import (Column, Integer,, Boolean, Numeric, ForeignKey,
                        Text, DateTime, UniqueConstraint, func)
from app.db.session import Base

class MerchantUser(Base):
    __tablename__ = "merchants"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class Shop(Base):
    __tablename__ = "shops"
    id = Column(Integer, primary_key=True)
    merchant_id = Column(Integer, ForeignKey("mer.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(140), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    whatsapp_number = Column(String(30), nullable=False)
    currency = Column(String(10), default="FCFA")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("shop_id", "slug", name="uq_cat_shop_slug"),)
    id = Column(Integer, primary_key=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    slug = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(160), nullable=False)
    slug = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    promo_price = Column(Numeric(12, 2), nullable=True)
    stock = Column(Integer, nullable=True)
    image_path = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
EOF

cat > backend/app/schemas/__init__.py <<'EOF'
from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ShopIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
   _number: str = Field(min_length=8, max_length=30)
    currency: str = Field(default="FCFA", max_length=10)

    @field_validator("whatsapp_number")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not cleaned.l("+").isdigit():
            raise ValueError("Numéro WhatsApp invalide")
        return cleaned

class ShopUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    whatsapp_number: str | None = None
    currency: str | None = None
    is_active: bool | None = None

class ShopOut(BaseModel):
    id: int; name: str; slug: str; description: str | None
    whatsapp_number: str; currency: str; is_active: bool
    model_config = {"from_attributes": True}

class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    sort_order: int = 0

class ProductIn(BaseModel):
    name str = Field(min_length=1, max_length=160)
    description: str | None = None
    price: float = Field(gt=0)
    promo_price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    is_active: bool = True

    @field_validator("promo_price")
    @classmethod
    def promo_cheaper(cls, v, info):
        if v is not None and v >= info.data.get("price", float("inf"))            raise ValueError("Le prix promo doit être inf au prix normal")
        return v

class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    promo_price: float | None = None
    stock: int | None = None
    category_id: int | None = None
    is_active: bool | None = None

class ProductOut(BaseModel):
    id: int; name: str; slug: str; description: str | None
    price: float; promo_price: float | None; stock: int | None
    image_path: str | None; category_id: int | None; is_active: bool
    model_config = {"from_attributes": True}

class CheckoutItem(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=99)

class CheckoutIn(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=8, max_length=30)
    delivery_zone: str = Field(min_length=2, max_length=120)

class CheckoutOut(BaseModel):
    whatsapp_link: str
    total: float
EOF

cat > backend/app/api/deps.py <<'EOF'
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import MerchantUser, Shop

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_merchant(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> MerchantUser:
    email = decode_token(token)
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalide ou expiré")
    merchant = db.query(MerchantUser).filter(MerchantUser.email == email).first()
    if not merchant or not merchant.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte introuvable ou désactivé")
    return merchant

def get_owned_shop(shop_id: int, merchant: MerchantUser, db: Session -> Shop:
    """Isolation multi-boutiques (R6)."""
    shop = db.query(Shop).filter(Shop.id == shop_id, Shop.merchant_id == merchant.id).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    return shop
EOF

cat > backend/app/services/whatsapp.py <<'EOF'
"""⭐ SEUL endroit du projet où un lien WhatsApp est construit (R5)."""
from urllib.parse import quote


def build_checkout_link(shop_name: str, whatsapp_number: str, currency: str,
                        lines: list, customer_name: str, customer_phone: str,
                        delivery_zone: str) -> str:
    number = whatsapp_number.lstrip("+")
    lines_txt = "\n".join(
        f"• {p.name} x{qty} — {unit:,.0f} {currency}".replace(",", " ")
        for p, qty, unit in lines
    )
    total = sum(unit * qty for _, qty, unit in lines)
    total_txt = f"{total:,.0f} {currency}".replace(",", " ")
    message = (
        f"🛍️ *Nouvelle commande — {shop_name}*\n\n"
        f"{lines_txt}\n\n*Total : {total_txt}*\n\n"
        f"👤 {customer_name}\n📞 {customer_phone}\n📍 {delivery_zone}\n\n"
        f"Merci de confirmer ma commande 🙏"
    )
    return f"https://wa.me/{number}?text={quote(message)}"
EOF

cat > backend/app/services/images.py <<'EOF'
import os
from PIL import Image
from fastapi import HTTPException, UploadFile
from app.core.config import settings

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_SIZE = 5 * 1024 * 1024

def validate_and_save_image(file: UploadFile, shop_id: int, product_id: int) -> str:
    if file.content_type not in ALLOWED:
        raise HTTPException(415, "Format non supporté (JPEG, PNG, WebP uniquement)")
    data = file.file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image trop lourde (max 5 Mo)")
    try:
        img = Image.open(file.file); img.verify()
        img = Image.open(file.file).convert("RGB")
    except Exception:
        raise HTTPException(415, "Fichier image corrompu")
    img.thumbnail((1024, 1024))
    rel = f"shop_{shop_id}/product_{product_id}{ALLOWED[file.content_type]}"
    abs_path = os.path.join(settings.UPLOAD_DIR, rel)
    os.makedirs(os.dirname(abs_path), exist_ok=True)
    img.save(abs_path, "JPEG", quality=85) if abs_path.endswith(".jpg") else img.save(abs_path)
    return f"/uploads/{rel}"
EOF

cat > backend/app/api/v1/auth.py <<'EOF'
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.security import create_token, hash_password, verify_password
from app.db.session import get_db
from app.models import MerchantUser
from app.schemas import RegisterIn, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(MerchantUser).filter(MerchantUser.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email déjà enregistré")
    m = MerchantUser(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(m); db.commit()
    return {"id": m.id, "email": m.email}

@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    m = db.query(MerchantUser).filter(MerchantUser.email == form.username).first()
    if not m or not verify_password(form.password, m.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou mot de passe incorrect")
    return TokenOut(access_token=create_token(m.email))

@router.get("/me")
def me(merchant: MerchantUser = Depends(get_current_merchant)):
    return {"id": merchant.id, "email": merchant.email}
EOF

cat > backend/app/api/v1/shops.py <<'EOF'
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models import MerchantUser, Shop
from app.schemas import ShopIn, ShopOut, ShopUpdate

router = APIRouter(prefix="/shops", tags=["shops"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    for a, b in (("é","e"),("è","e"),("ê","e"),("à","a"),("â","a"),("î","i"),("ô","o"),("û","u"),("ç","c")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "boutique"


def _unique_slug(db: Session, base: str) -> str:
    slug, i = base, 2
    while db.query(Shop).filter(Shop.slug == slug).first():
        slug = f"{base}-{i}"; i += 1
    return slug


@router.post("", response_model=ShopOut, status_code=201)
def create_shop(payload: ShopIn, db: Session = Depends(get_db),
                merchant: MerchantUser = Depends(get_current_merchant)):
    shop = Shop(merchant_id=merchant.id, nameayload.name,
                slug=_unique_slug(db, _slugify(payload.name)),
                description=payload.description,
                whatsapp_number=payload.whatsapp_number, currency=payload.currency)
    db.add(shop); db.commit(); db.refresh(shop)
    return shop


@router.get("", response_model=list[ShopOut])
def list_shops(db: Session = Depends(get_db),
                  merchant: MerchantUser Depends(get_current_merchant)):
    return db.query(Shop).filter(Shop.merchant_id == merchant.id).all()


@router.patch("/{shop_id}", response_model=ShopOut)
def update_shop(shop_id: int, payload: ShopUpdate, db: Session = Depends(get_db),
                merchant MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    for f, v in payload.model_dump(ex_unset=True).items():
        setattr(shop, f, v)
    db.commit(); db.refresh(shop)
    return shop


@router.delete("/{shop_id}", status_code=204)
def delete_shop(shop_id: int, db: Session = Depends(get_db),
                merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    db.delete(shop); db.commit()
EOF

cat > backend/app/api/v1/products.py <<'EOF'
import re
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models Category, MerchantUser, Product
from app.schemas import CategoryIn, ProductIn, ProductOut, ProductUpdate
from app.services.images import validate_and_save_image

router = APIRouter(prefix="/shops/{shop_id}", tags=["products"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    for a, b in (("é","e"),("","e"),("ê","e"),("à","a"),("â","a"),("î","i"),("ô","o"),("û","u"),("ç","c")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "produit"


@router.get("/products", response_model=list[ProductOut])
def list_products(shop_id: int, db: Session = Depends(get_db),
                  merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    return db.query(Product).filter(Product.shop_id == shop.id).order_by(Product.created_at.desc()).all()


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(shop_id: int, payload: ProductIn, db: Session = Depends(get_db),
                   merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    if payload.category_id and not db.query(Category).filter(
            Category.id == payload.category_id, Category.shop_id == shop.id).first():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Catégorie introuvable")
    p = Product(shop_id=shop.id, slug=_slugify(payload.name), **payload.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return p


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(shop_id: int, product_id: int, payload: ProductUpdate,
                   db: Session = Depends(get_db),
                   merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    p = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, f, v)
    db.commit(); db.refresh(p)
    return p


@router.delete("/products/{product_id}", status_code=204)
def delete_product(shop_id: int, product_id:, db: Session = Depends(get_db),
                   merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    p = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not p:
        raise HTTPException(status.HTTP_404_FOUND, "Produit introuvable")
    db.delete(p); db.commit()


@router.post("/products/{product_id}/image", response_model=ProductOut)
def upload_image(shop_id: int, product_id: int, file: UploadFile = File(...),
                 db: Session = Depends(get_db),
                 merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop, merchant, db)
    p = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    p.image_path = validate_and_save_image(file, shop.id, p.id)
    db.commit(); db.refresh(p)
    return p


@router.get("/categories")
def list_categories(shop_id: int, db: Session = Depends(get_db),
                    merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    return db.query(Category).filter(Category.shop_id == shop.id).order_by(Category.sort_order).all()


@router.post("/categories", status_code=201)
def create_category(shop_id: int, payload: CategoryIn, db: Session = Depends(get_db),
                    merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    c = Category(shop_id=shop.id, name=payload.name,
                 slug=_slugify(payload.name), sort_order=payload.sort_order)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "slug": c.slug, "sort_order": c.sort_order}


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(shop_id: int, category_id: int, db: Session = Depends(get_db),
                    merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    c = db.query(Category).filter(Category.id == category_id, Category.shop_id == shop.id).first()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Catégorie introuvable")
    db.query(Product).filter(Product.category_id == c.id).update({Product.category_id None})
    db.delete(c); db.commit()
EOF

cat > backend/app/api/v1/public.py <<'EOF'
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from.models import Category, Product, Shop
from app.schemas import CheckoutIn, CheckoutOut
from app.services.whatsapp import build_checkout_link

router = APIRouter(prefix="/public/shops", tags=["public"])


def _active_shop(slug: str, db: Session) -> Shop:
    shop = db.query(Shop).filter(Shop.slug == slug, Shop.is_active.is_(True)).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    return shop


@router.get("/{slug}")
def get_shop(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return {"name": s.name, "slug": s.slug, "description": s.description, "currency": s.currency}


@router.get("/{slug}/categories")
def list_categories(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return [{"id": c.id, "name": c.name, "slug": c.slug, "sort_order": c.sort_order}
            for c in db.query(Category).filter(Category.shop_id == s.id).order_by(Category.sort_order)]


@router.get("/{slug}/products")
def list_products(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return [{"id": p.id, "name": p.name, "slug": p.slug, "description": p.description,
             "price": float(p.price),
             "promo_price": float(p.promo_price) if p.promo_price else None,
             "stock": p.stock, "image_path": p.image_path,
             "category_id": p.category_id, "is_active": p.is_active}
            for p in db.query(Product).filter(Product.shop_id == s.id,
                                              Product.is_active.is_(True))
                       .order_by(Product.created_at.desc())]


@router.post("/{slug}/checkout", response_model=CheckoutOut)
def checkout(slug: str, payload: CheckoutIn, db: Session = Depends(get_db)):
    """Total TOUJOURS recalculé serveur (R7). Lien via service central (R5)."""
    shop = _active_shop(slug, db)
    lines, total = [], 0.0
    for item in payload.items:
        p = db.query(Product).filter(Product.id == item.product_id,
                                     Product.shop_id == shop.id,
                                     Product.is_active.is_(True)).first()
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND,
                                f"Produit {item.product_id} introuvable dans cette boutique")
        if p.stock is not None and p.stock < item.qty:
            raise HTTPException(status.HTTP_409_CONFLICT, f"Stock insuffisant pour «p.name} »")
        unit = float(p.promo_price if p.promo_price else p.price)
        lines.append((p, item.qty, unit))
        total += unit * item.qty
    link = build_checkout_link(shop.name, shop.whatsapp_number shop.currency, lines,
                               payload.customer_name, payload.customer_phone,
                               payload.delivery_zone)
    return CheckoutOut(whatsapp_link=link, total=round(total, 2))
EOF

cat > backend/app/api/v1/publications.py <<'EOF'
"""Phase 2a — Agent Publications : génération de posts promo (R5 : pas de lien wa.me ici,
uniquement du texte à copier-coller par le commerçant)."""
from fastapi importRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models import MerchantUser, Product

router = APIRouter(prefix="/shops/{shop_id}", tags=["publications"])


def _fmt(n: float, currency: str) -> str:
    return f"{n:,.0f}".replace(",", " ") + f" {currency}"


@router.get("/publications")
def publications(shop_id: int, db: Session = Depends(get_db),
                 merchant: MerchantUser = Depends(get_current_merchant)):
    shop = get_owned_shop(shop_id, merchant, db)
    products = db.query(Product).filter(Product.shop_id == shop.id,
                                        Product.is_active.is_(True)).all()
    posts = []
    for p in products:
        promo = p.promo_price is not None
        price_txt = (_fmt(float(p.promo_price), shop.currency) if promo
                     else _fmt(float(p.price), shop.currency))
        text = "🔥 PROMO SPÉCIALE 🔥\n\n" if promo else "✨ NOUVEAUTÉ ✨\n\n"
        text += f"{p.name}\n\n"
        if promo:
            text += f"❌ {_fmt(float(p.price), shop.currency)}\n✅ {price_txt} seulement !\n\n"
        else:
            text += f"💰 {price_txt}\n\n"
        if p.description:
            text += f"{p.description}\n\n"
        text += f"📦 Stock limité — commandez vite !\n📲 Envoyez-nous un message WhatsApp."
        posts.append({"product_id": p.id, "product_name": p.name, "text": text})

    lines = "\n".join(
        f"• {p.name} — {_fmt(float(p.promo_price or p.price), shop.currency)}" for p products
    )
    shop_post = (f"👋 Bienvenue chez {shop.name} !\n\n"
                 + (shop.description or "Votre boutique de quartier") + "\n\n"
                 + (lines + "\n\n" if lines else "")
                 + "📲 Commande simple en 1 message WhatsApp\n🚚 Livraison rapide dans votre quartier")
    return {"posts": posts, "shop_post": shop_post}
EOFcat > backend/app/main.py <<'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1 import auth, shops, products, public, publications

app = FastAPI(title="Master Commerce", debug=settings.DEBUG)

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth, shops, products, public, publications):
    app.include_router(r.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# DEV SQLite : création auto des tables. prod : alembic upgrade head.
if settings.DATABASE_URL.startswith("sqlite"):
    from app.db.session import Base, engine
    from app import models  # noqa
    Base.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}
EOF

cat > backend/tests/test_api.py <<'EOF'
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _register_and_login(email="test@x.com", password="motdepasse123"):
    client.post("/api/auth/register", json={"email": email, "password": password})
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _make_shop(h, name="Ma Boutique"):
    r = client.post("/api/shops", headers=h,
                    json={"name": name, "whatsapp_number": "+22890000000"})
    assert r.status_code == 201
    return r.json()


def test_register_et_login():
    h = _register_and_login("a@b.com")
    assert "access_token" in client.post("/api/auth/login",
        data={"username": "a@b.com", "password": "motdepasse123"}).json()


def test_shop_slug_unique():
    h = _register_and_login("s1@x.com")
    s1 = _make_shop(h, "Boutique Test")
    h2 = _register_and_login("s2@x.com")
    s2 = _make_shop(h2, "Boutique Test")
    assert s1["slug"] != s2["slug"]


def test_isolation_boutiques():
    h1 = _register_and_login

> ⚠️ The response reached the length limit. Reply **continue** to get the rest.
