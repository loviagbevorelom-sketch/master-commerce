"""Phase 2a — Agent Publications : génération de posts promo propres et professionnels."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models import MerchantUser, Product

router = APIRouter(prefix="/shops/{shop_id}", tags=["publications"])


def _fmt(n: float, currency: str) -> str:
    return f"{n:,.0f}".replace(",", " ") + f" {currency}"


@router.get("/publications")
def publications(
    shop_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    products = (
        db.query(Product)
        .filter(Product.shop_id == shop.id, Product.is_active.is_(True))
        .all()
    )
    posts = []
    for p in products:
        promo = p.promo_price is not None
        price_txt = (
            _fmt(float(p.promo_price), shop.currency)
            if promo
            else _fmt(float(p.price), shop.currency)
        )
        text = f"📍 {shop.name}\n\n"
        text += f"🍽️ {p.name}\n"
        if promo:
            text += f"💰 Tarif spécial : {price_txt} (au lieu de {_fmt(float(p.price), shop.currency)})\n\n"
        else:
            text += f"💰 Prix : {price_txt}\n\n"
        if p.description:
            text += f"{p.description}\n\n"
        text += (
            f"📲 Commandez directement sur notre catalogue en ligne :\n"
            f"👉 https://mastercommerce.app/{shop.slug}\n\n"
            f"Livraison rapide ou retrait sur place."
        )
        posts.append({"product_id": p.id, "product_name": p.name, "text": text})

    lines = "\n".join(
        f"• {p.name} — {_fmt(float(p.promo_price or p.price), shop.currency)}"
        for p in products
    )
    
    # Post Statut WhatsApp
    shop_post = (
        f"🍽️ *{shop.name}* — Menu & Commandes\n\n"
        f"Commandez vos repas en quelques secondes (Retrait ou Livraison) :\n"
        f"👉 https://mastercommerce.app/{shop.slug}\n\n"
        + (f"📋 *À la carte :*\n{lines}\n\n" if lines else "")
        + f"📞 Service client & commandes : {shop.whatsapp_number or 'WhatsApp'}\n"
        f"🚚 Livraison à domicile ou retrait sur place."
    )

    # Post TikTok / Instagram
    social_post = (
        f"Commandez vos plats préférés chez {shop.name} ! 🥘✨\n\n"
        f"📍 Service sur place, à emporter et livraison.\n"
        f"🔗 Lien direct pour commander dans notre bio : mastercommerce.app/{shop.slug}\n"
        f"📲 Ou écrivez-nous sur WhatsApp : {shop.whatsapp_number or ''}"
    )

    return {"posts": posts, "shop_post": shop_post, "social_post": social_post}

