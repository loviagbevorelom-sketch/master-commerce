import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1 import auth, shops, products, public, publications, platform

app = FastAPI(title="Master Commerce — API", debug=settings.DEBUG)

# Configuration CORS pour Localhost et Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, shops, products, public, publications, platform):
    app.include_router(r.router, prefix="/api")

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# Initialisation & Seeding automatique (SQLite ou PostgreSQL Render)
from app.db.session import Base, engine, SessionLocal
from app import models  # noqa
from sqlalchemy import text
from app.core.security import hash_password
from app.models import MerchantUser, Shop, Category, Product, DeliveryZone

Base.metadata.create_all(engine)

# Migration auto colonnes de paiement Order
with engine.connect() as conn:
    for col_def in [
        ("payment_method", "VARCHAR(20) DEFAULT 'cod' NOT NULL"),
        ("payment_status", "VARCHAR(20) DEFAULT 'pending' NOT NULL"),
        ("fedapay_transaction_id", "VARCHAR(100) NULL"),
        ("payment_url", "VARCHAR(500) NULL"),
    ]:
        col_name, col_type = col_def
        try:
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
            conn.commit()
        except Exception:
            pass

db = SessionLocal()
try:
    # 1. Compte Propriétaire SuperAdmin
    if not db.query(MerchantUser).filter(MerchantUser.email == settings.PLATFORM_OWNER_EMAIL).first():
        db.add(MerchantUser(
            email=settings.PLATFORM_OWNER_EMAIL,
            hashed_password=hash_password(settings.PLATFORM_OWNER_PASSWORD),
            role="owner",
        ))
        db.commit()

    # 2. Compte Marchand Démo
    demo_user = db.query(MerchantUser).filter(MerchantUser.email == "demo@mastercommerce.app").first()
    if not demo_user:
        demo_user = MerchantUser(
            email="demo@mastercommerce.app",
            hashed_password=hash_password("demo123456"),
            role="merchant",
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    # 3. Boutique Principale Kubafoodies
    kuba_shop = db.query(Shop).filter(Shop.slug == "kubafoodies").first()
    if not kuba_shop:
        kuba_shop = Shop(
            merchant_id=demo_user.id,
            name="Kubafoodies — Service Traiteur",
            slug="kubafoodies",
            description="Gastronomie ouest-africaine & service traiteur d'exception à Lomé.",
            whatsapp_number="+228 91 52 76 25",
            currency="FCFA",
            is_active=True,
        )
        db.add(kuba_shop)
        db.commit()
        db.refresh(kuba_shop)

    # 4. Catégories Kubafoodies
    cat_jour = db.query(Category).filter(Category.shop_id == kuba_shop.id, Category.name == "Plats du Jour").first()
    if not cat_jour:
        cat_jour = Category(shop_id=kuba_shop.id, name="Plats du Jour", slug="plats-du-jour", sort_order=1)
        db.add(cat_jour)

    cat_spe = db.query(Category).filter(Category.shop_id == kuba_shop.id, Category.name == "Spécialités Africaines").first()
    if not cat_spe:
        cat_spe = Category(shop_id=kuba_shop.id, name="Spécialités Africaines", slug="specialites-africaines", sort_order=2)
        db.add(cat_spe)

    cat_bois = db.query(Category).filter(Category.shop_id == kuba_shop.id, Category.name == "Boissons Fraîches").first()
    if not cat_bois:
        cat_bois = Category(shop_id=kuba_shop.id, name="Boissons Fraîches", slug="boissons-fraiches", sort_order=3)
        db.add(cat_bois)

    db.commit()
    db.refresh(cat_jour)
    db.refresh(cat_spe)
    db.refresh(cat_bois)

    # 5. Plats Kubafoodies
    dishes = [
        ("Tchiep Bou Dien au Poisson", "Riz rouge sénégalais parfumé, daurade royale braisée, chou, manioc et carottes.", 2500, None, 25, "/images/dishes/tchiep.jpg", cat_jour.id),
        ("Pinon Rouge avec Adokougbin", "Pâte rouge traditionnelle au maïs toasté, sauce tomate concentrée et crabe frais.", 3000, 2700, 15, "/images/dishes/pinon.jpg", cat_spe.id),
        ("Riz sauté aux épices & Poulet rôti", "Riz sauté aux petits légumes croquants accompagné d'une demi-cuisse de poulet rôti.", 2800, None, 20, "/images/dishes/poulet.jpg", cat_jour.id),
        ("Alloco & Poisson braisé", "Bananes plantains frites dorées, mérou braisé au feu de bois et piment vert maison.", 2000, None, 30, "/images/dishes/alloco.jpg", cat_spe.id),
        ("Jus de Bissap maison (1L)", "Infusion de fleurs d'hibiscus biologique, menthe fraîche et extrait naturel de vanille.", 1000, None, 50, "/images/dishes/bissap.jpg", cat_bois.id),
        ("Jus de Gingembre pur (1L)", "Gingembre frais pressé à froid, ananas du Togo et une pointe de citron vert.", 1000, None, 50, "/images/dishes/gingembre.jpg", cat_bois.id),
    ]

    for name, desc, price, promo, stock, img, cat_id in dishes:
        existing_p = db.query(Product).filter(Product.shop_id == kuba_shop.id, Product.name == name).first()
        if not existing_p:
            db.add(Product(
                shop_id=kuba_shop.id,
                name=name,
                slug=name.lower().replace(" ", "-").replace("&", "").replace("(", "").replace(")", ""),
                description=desc,
                price=price,
                promo_price=promo,
                stock=stock,
                image_path=img,
                category_id=cat_id,
                is_active=True,
            ))
        else:
            # Correction one-shot : produits seedés avec les anciens chemins /images/* (cassés)
            if existing_p.image_path and existing_p.image_path.startswith("/images/") and existing_p.image_path != img:
                existing_p.image_path = img
    db.commit()

    # 6. Zones de livraison (Lomé)
    if db.query(DeliveryZone).count() == 0:
        zones = [
            ("Adidogomé", 1000, 1),
            ("Bè-Kpota", 500, 2),
            ("Tokoin", 500, 3),
            ("Agoè-Nyivé", 1500, 4),
            ("Nyékonakpoè", 800, 5),
        ]
        db.add_all(DeliveryZone(city="Lomé", name=n, fee=f, sort_order=i) for n, f, i in zones)
        db.commit()

finally:
    db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": "Master Commerce API", "version": "1.0.0"}
