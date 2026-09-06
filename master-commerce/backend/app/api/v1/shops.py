import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models import MerchantUser, Order, OrderItem, Product, Shop
from app.schemas import OrderUpdateIn, ShopIn, ShopOut, ShopUpdate

router = APIRouter(prefix="/shops", tags=["shops"])


ALLOWED_TRANSITIONS = {
    "pending": {"confirmed", "delivered", "cancelled"},
    "confirmed": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


def _apply_stock(db: Session, order: Order, delta: int):
    """Décrémente (+delta négatif) ou restitue (+delta) le stock des produits."""
    lines = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for it in lines:
        prod = db.query(Product).filter(Product.id == it.product_id).first()
        if prod and prod.stock is not None:
            prod.stock = max(0, (prod.stock or 0) + delta * it.qty)


def _order_dict(db: Session, o: Order) -> dict:
    items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
    return {
        "id": o.id,
        "ref": o.ref,
        "customer_name": o.customer_name,
        "customer_phone": o.customer_phone,
        "reception_mode": o.reception_mode,
        "delivery_zone_name": o.delivery_zone_name,
        "subtotal": float(o.subtotal),
        "delivery_fee": float(o.delivery_fee),
        "total": float(o.total),
        "currency": o.currency,
        "status": o.status,
        "created_at": o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else "",
        "items": [
            {
                "product_id": i.product_id,
                "product_name": i.product_name,
                "unit_price": float(i.unit_price),
                "qty": i.qty,
            }
            for i in items
        ],
    }


def _slugify(text: str) -> str:
    text = text.lower().strip()
    for a, b in (("é", "e"), ("è", "e"), ("ê", "e"), ("à", "a"), ("â", "a"),
                  ("î", "i"), ("ô", "o"), ("û", "u"), ("ç", "c")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "boutique"


def _unique_slug(db: Session, base: str) -> str:
    slug, i = base, 2
    while db.query(Shop).filter(Shop.slug == slug).first():
        slug = f"{base}-{i}"
        i += 1
    return slug


@router.post("", response_model=ShopOut, status_code=201)
def create_shop(
    payload: ShopIn,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = Shop(
        merchant_id=merchant.id,
        name=payload.name,
        slug=_unique_slug(db, _slugify(payload.name)),
        description=payload.description,
        whatsapp_number=payload.whatsapp_number,
        currency=payload.currency,
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


@router.get("", response_model=list[ShopOut])
def list_shops(
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    return db.query(Shop).filter(Shop.merchant_id == merchant.id).all()


@router.patch("/{shop_id}", response_model=ShopOut)
def update_shop(
    shop_id: int,
    payload: ShopUpdate,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(shop, f, v)
    db.commit()
    db.refresh(shop)
    return shop


@router.delete("/{shop_id}", status_code=204)
def delete_shop(
    shop_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    db.delete(shop)
    db.commit()


@router.get("/{shop_id}/orders")
def list_orders(
    shop_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    rows = (
        db.query(Order)
        .filter(Order.shop_id == shop.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_dict(db, o) for o in rows]


@router.patch("/{shop_id}/orders/{order_id}/status")
def update_order_status(
    shop_id: int,
    order_id: int,
    payload: OrderUpdateIn,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    """Confirmer, livrer ou annuler une commande (Phase 1 — statuts marchand)."""
    shop = get_owned_shop(shop_id, merchant, db)
    order = db.query(Order).filter(
        Order.id == order_id, Order.shop_id == shop.id
    ).first()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable")

    if payload.status not in ALLOWED_TRANSITIONS.get(order.status, set()):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Transition refusée : « {order.status} » -> « {payload.status} »",
        )

    prev = order.status
    if prev == "pending" and payload.status in ("confirmed", "delivered"):
        _apply_stock(db, order, -1)
    if prev in ("confirmed", "delivered") and payload.status == "cancelled":
        _apply_stock(db, order, +1)

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _order_dict(db, order)
