import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Category, DeliveryZone, Order, OrderItem, Product, Shop
from app.schemas import (
    CheckoutIn,
    CheckoutOut,
    DeliveryZoneOut,
    OrderItemOut,
    OrderOut,
)
from app.services.whatsapp import build_checkout_link
from app.services.fedapay import create_fedapay_transaction, verify_fedapay_transaction

router = APIRouter(prefix="/public", tags=["public"])


def _active_shop(slug: str, db: Session) -> Shop:
    shop = db.query(Shop).filter(Shop.slug == slug, Shop.is_active.is_(True)).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    return shop


def _generate_ref() -> str:
    date = datetime.utcnow().strftime("%Y%m%d")
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"MC-{date}-{code}"


@router.get("/shops/{slug}")
def get_shop(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return {
        "name": s.name,
        "slug": s.slug,
        "description": s.description,
        "currency": s.currency,
        "whatsapp_number": s.whatsapp_number,
    }


@router.get("/shops/{slug}/categories")
def list_categories(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return [
        {"id": c.id, "name": c.name, "slug": c.slug, "sort_order": c.sort_order}
        for c in db.query(Category)
        .filter(Category.shop_id == s.id)
        .order_by(Category.sort_order)
    ]


@router.get("/shops/{slug}/products")
def list_products(slug: str, db: Session = Depends(get_db)):
    s = _active_shop(slug, db)
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "price": float(p.price),
            "promo_price": float(p.promo_price) if p.promo_price else None,
            "stock": p.stock,
            "image_path": p.image_path,
            "category_id": p.category_id,
            "is_active": p.is_active,
        }
        for p in db.query(Product)
        .filter(Product.shop_id == s.id, Product.is_active.is_(True))
        .order_by(Product.created_at.desc())
    ]


@router.get("/shops/{slug}/delivery-zones", response_model=list[DeliveryZoneOut])
def list_delivery_zones(slug: str, db: Session = Depends(get_db)):
    _active_shop(slug, db)
    return db.query(DeliveryZone).order_by(DeliveryZone.sort_order).all()


@router.post("/shops/{slug}/checkout", response_model=CheckoutOut)
def checkout(slug: str, payload: CheckoutIn, db: Session = Depends(get_db)):
    """Total TOUJOURS recalculé serveur (R7). Lien via service central (R5).
    Support de FedaPay Sandbox + Paiement à la livraison (COD)."""
    shop = _active_shop(slug, db)
    lines, subtotal = [], 0.0
    for item in payload.items:
        p = (
            db.query(Product)
            .filter(
                Product.id == item.product_id,
                Product.shop_id == shop.id,
                Product.is_active.is_(True),
            )
            .first()
        )
        if not p:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"Produit {item.product_id} introuvable dans cette boutique",
            )
        if p.stock is not None and p.stock < item.qty:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Stock insuffisant pour « {p.name} »",
            )
        unit = float(p.promo_price if p.promo_price else p.price)
        lines.append((p, item.qty, unit))
        subtotal += unit * item.qty

    delivery_fee = 0.0
    zone_name = None
    if payload.reception_mode == "delivery" and payload.delivery_zone_id:
        zone = (
            db.query(DeliveryZone)
            .filter(DeliveryZone.id == payload.delivery_zone_id)
            .first()
        )
        if not zone:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Zone de livraison introuvable")
        delivery_fee = float(zone.fee)
        zone_name = zone.name

    total = round(subtotal + delivery_fee, 2)
    ref = _generate_ref()

    link = build_checkout_link(
        shop.name,
        shop.whatsapp_number,
        shop.currency,
        lines,
        payload.customer_name,
        payload.customer_phone,
        zone_name or "Sur place",
        reception_mode=payload.reception_mode,
        delivery_fee=delivery_fee,
        order_ref=ref,
    )

    fedapay_trans_id = None
    payment_url = None
    payment_method = payload.payment_method or "cod"

    if payment_method == "fedapay":
        fedapay_res = create_fedapay_transaction(
            order_ref=ref,
            amount=total,
            shop_name=shop.name,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            currency=shop.currency,
        )
        fedapay_trans_id = fedapay_res["transaction_id"]
        payment_url = fedapay_res["payment_url"]

    order = Order(
        ref=ref,
        shop_id=shop.id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        reception_mode=payload.reception_mode,
        delivery_zone_id=payload.delivery_zone_id if payload.reception_mode == "delivery" else None,
        delivery_zone_name=zone_name,
        delivery_fee=delivery_fee,
        subtotal=round(subtotal, 2),
        total=total,
        currency=shop.currency,
        status="pending",
        payment_method=payment_method,
        payment_status="pending",
        fedapay_transaction_id=fedapay_trans_id,
        payment_url=payment_url,
        whatsapp_link=link,
    )
    db.add(order)
    db.flush()
    for p, qty, unit in lines:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                unit_price=unit,
                qty=qty,
            )
        )
    db.commit()

    return CheckoutOut(
        order_ref=ref,
        whatsapp_link=link,
        total=total,
        payment_method=payment_method,
        payment_status="pending",
        payment_url=payment_url,
    )


@router.get("/orders/{ref}", response_model=OrderOut)
def get_order(ref: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.ref == ref).first()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable")
    shop = db.query(Shop).filter(Shop.id == order.shop_id).first()
    items = (
        db.query(OrderItem)
        .filter(OrderItem.order_id == order.id)
        .order_by(OrderItem.id)
        .all()
    )
    return OrderOut(
        ref=order.ref,
        shop_name=shop.name if shop else "Boutique",
        currency=order.currency,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        reception_mode=order.reception_mode,
        delivery_zone_name=order.delivery_zone_name,
        delivery_fee=float(order.delivery_fee),
        subtotal=float(order.subtotal),
        total=float(order.total),
        status=order.status,
        payment_method=order.payment_method or "cod",
        payment_status=order.payment_status or "pending",
        payment_url=order.payment_url,
        whatsapp_link=order.whatsapp_link,
        created_at=order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else "",
        items=[
            OrderItemOut(
                product_id=i.product_id,
                product_name=i.product_name,
                unit_price=float(i.unit_price),
                qty=i.qty,
            )
            for i in items
        ],
    )


@router.get("/fedapay/callback")
def fedapay_callback(ref: str = "", id: str = "", db: Session = Depends(get_db)):
    """Callback de retour de guichet FedaPay Sandbox."""
    order = None
    if ref:
        order = db.query(Order).filter(Order.ref == ref).first()
    elif id:
        order = db.query(Order).filter(Order.fedapay_transaction_id == str(id)).first()

    if order:
        order.payment_status = "paid"
        order.status = "confirmed"
        db.commit()
        shop = db.query(Shop).filter(Shop.id == order.shop_id).first()
        slug = shop.slug if shop else "kubafoodies"
        return RedirectResponse(url=f"http://localhost:3000/{slug}/order/{order.ref}?paid=1", status_code=302)

    return RedirectResponse(url="http://localhost:3000/admin", status_code=302)


@router.post("/fedapay/webhook")
async def fedapay_webhook(payload: dict, db: Session = Depends(get_db)):
    """Webhook pour recevoir les événements FedaPay Sandbox."""
    entity = payload.get("entity", {}) or payload
    event = payload.get("event", "")
    trans_id = str(entity.get("id", ""))
    order_ref = entity.get("custom_metadata", {}).get("order_ref") or entity.get("reference")

    order = None
    if trans_id:
        order = db.query(Order).filter(Order.fedapay_transaction_id == trans_id).first()
    if not order and order_ref:
        order = db.query(Order).filter(Order.ref == order_ref).first()

    if order and (event in ("transaction.approved", "approved") or entity.get("status") == "approved"):
        order.payment_status = "paid"
        order.status = "confirmed"
        db.commit()

    return {"status": "ok"}


@router.post("/fedapay/simulate-success/{ref}")
def simulate_fedapay_success(ref: str, db: Session = Depends(get_db)):
    """Endpoint de simulation pour les démonstrations & tests instantanés FedaPay Sandbox."""
    order = db.query(Order).filter(Order.ref == ref).first()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable")

    order.payment_status = "paid"
    order.status = "confirmed"
    db.commit()

    return {
        "status": "success",
        "message": f"Paiement FedaPay Sandbox simulé avec succès pour {ref}",
        "order_ref": ref,
        "payment_status": "paid",
    }


@router.get("/fedapay/sandbox-pay-page", response_class=HTMLResponse)
def sandbox_pay_page(ref: str, amount: int = 0):
    """Guichet visuel interactif FedaPay Sandbox pour tests de démonstration."""
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FedaPay Sandbox Payment</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center space-y-6">
            <div class="flex items-center justify-center gap-2">
                <span class="text-3xl">💳</span>
                <h1 class="text-2xl font-bold text-blue-400">FedaPay Sandbox</h1>
            </div>
            <div class="bg-slate-900/80 rounded-2xl p-4 border border-slate-700 text-left space-y-2 text-sm font-mono">
                <div class="flex justify-between"><span class="text-slate-400">Commande :</span> <span class="font-bold text-white">{ref}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Montant :</span> <span class="font-bold text-emerald-400">{amount} FCFA</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Mode :</span> <span class="text-amber-400">Sandbox Test (Mobile Money)</span></div>
            </div>
            <p class="text-xs text-slate-400">
                Sélectionnez l'action de simulation FedaPay Mobile Money (T-Money / Flooz / Card) :
            </p>
            <div class="space-y-3">
                <a href="/api/public/fedapay/callback?ref={ref}" class="block w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm transition-all shadow-lg text-white">
                    ✅ Simuler Paiement Validé (Approved)
                </a>
                <a href="http://localhost:3000" class="block w-full py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-semibold text-xs text-slate-300 transition-all">
                    ❌ Annuler et retourner au site
                </a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)