"""Panneau plateforme (R10) — réservé au propriétaire de Master Commerce :
KPIs / revenus / commissions, et création de boutiques « à façon » pour les marchands."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_owner
from app.db.session import get_db
from app.models import DeliveryZone, MerchantUser, Order, Shop
from app.schemas import PlatformShopIn, PlatformShopPatch
from app.api.v1.shops import _order_dict, _slugify, _unique_slug

router = APIRouter(prefix="/platform", tags=["platform"])

REVENUE_STATUSES = ("confirmed", "delivered")


def _shop_row(db: Session, s: Shop) -> dict:
    revenue = (
        db.query(func.coalesce(func.sum(Order.total), 0))
        .filter(Order.shop_id == s.id, Order.status.in_(REVENUE_STATUSES))
        .scalar()
    )
    order_count = db.query(Order).filter(Order.shop_id == s.id).count()
    commission = float(revenue or 0) * float(s.commission_rate or 0)
    merchant = db.query(MerchantUser).filter(MerchantUser.id == s.merchant_id).first()
    return {
        "id": s.id,
        "name": s.name,
        "slug": s.slug,
        "description": s.description,
        "whatsapp_number": s.whatsapp_number,
        "currency": s.currency,
        "is_active": s.is_active,
        "merchant_email": merchant.email if merchant else None,
        "commission_rate": float(s.commission_rate),
        "setup_fee": float(s.setup_fee),
        "orders_count": order_count,
        "revenue": float(revenue or 0),
        "commission": round(commission, 2),
        "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else "",
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db), owner: MerchantUser = Depends(get_current_owner)):
    merchants = db.query(MerchantUser).filter(MerchantUser.role == "merchant").count()
    shops_total = db.query(Shop).count()
    orders_total = db.query(Order).count()
    pending = db.query(Order).filter(Order.status == "pending").count()

    sold = (
        db.query(func.sum(Order.total), func.sum(Order.total * Shop.commission_rate))
        .join(Shop, Shop.id == Order.shop_id)
        .filter(Order.status.in_(REVENUE_STATUSES))
        .first()
    )
    revenue = float(sold[0] or 0) if sold else 0.0
    commission = float(sold[1] or 0) if sold else 0.0
    setup_revenue = float(
        db.query(func.coalesce(func.sum(Shop.setup_fee), 0)).scalar()
    )

    recent = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(8)
        .all()
    )
    return {
        "merchants_total": merchants,
        "shops_total": shops_total,
        "orders_total": orders_total,
        "pending_orders": pending,
        "revenue": round(revenue, 2),
        "commission": round(commission, 2),
        "setup_revenue": round(setup_revenue, 2),
        "recent_orders": [
            {
                "ref": o.ref,
                "shop_name": shop.name if (shop := db.query(Shop).filter(Shop.id == o.shop_id).first()) else "—",
                "total": float(o.total),
                "currency": o.currency,
                "status": o.status,
                "created_at": o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else "",
            }
            for o in recent
        ],
    }


@router.get("/shops")
def list_all_shops(
    db: Session = Depends(get_db), owner: MerchantUser = Depends(get_current_owner)
):
    shops = db.query(Shop).order_by(Shop.created_at.desc()).all()
    return [_shop_row(db, s) for s in shops]


@router.post("/shops", status_code=201)
def create_shop_for_merchant(
    payload: PlatformShopIn,
    db: Session = Depends(get_db),
    owner: MerchantUser = Depends(get_current_owner),
):
    """Création « à façon » : le propriétaire monte la boutique d'un marchand existant
    et pose sa commission + frais de setup (monétisation)."""
    merchant = (
        db.query(MerchantUser).filter(MerchantUser.email == payload.merchant_email).first()
    )
    if not merchant:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Marchand introuvable — enregistrez d'abord son compte (admin/register)",
        )
    shop = Shop(
        merchant_id=merchant.id,
        name=payload.name,
        slug=_unique_slug(db, _slugify(payload.name)),
        description=payload.description,
        whatsapp_number=payload.whatsapp_number,
        currency=payload.currency,
        commission_rate=payload.commission_rate,
        setup_fee=payload.setup_fee,
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return _shop_row(db, shop)


@router.patch("/shops/{shop_id}")
def update_platform_shop(
    shop_id: int,
    payload: PlatformShopPatch,
    db: Session = Depends(get_db),
    owner: MerchantUser = Depends(get_current_owner),
):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    for f, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(shop, f, v)
    db.commit()
    db.refresh(shop)
    return _shop_row(db, shop)


@router.get("/shops/{shop_id}")
def one_platform_shop(
    shop_id: int,
    db: Session = Depends(get_db),
    owner: MerchantUser = Depends(get_current_owner),
):
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    return _shop_row(db, shop)


@router.get("/delivery-zones")
def platform_delivery_zones(
    db: Session = Depends(get_db), owner: MerchantUser = Depends(get_current_owner)
):
    zones = db.query(DeliveryZone).order_by(DeliveryZone.sort_order).all()
    return [
        {"id": z.id, "city": z.city, "name": z.name, "fee": float(z.fee)}
        for z in zones
    ]