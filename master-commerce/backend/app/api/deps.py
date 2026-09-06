from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import MerchantUser, Shop

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_merchant(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> MerchantUser:
    email = decode_token(token)
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalide ou expiré")
    merchant = db.query(MerchantUser).filter(MerchantUser.email == email).first()
    if not merchant or not merchant.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte introuvable ou désactivé")
    return merchant


def get_owned_shop(shop_id: int, merchant: MerchantUser, db: Session) -> Shop:
    """Isolation multi-boutiques (R6)."""
    shop = db.query(Shop).filter(
        Shop.id == shop_id, Shop.merchant_id == merchant.id
    ).first()
    if not shop:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable")
    return shop


def get_current_owner(
    merchant: MerchantUser = Depends(get_current_merchant),
) -> MerchantUser:
    """Seul le propriétaire de la plateforme accède aux endpoints /platform (R10)."""
    if merchant.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès propriétaire requis")
    return merchant
