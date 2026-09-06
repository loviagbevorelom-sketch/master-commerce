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
    db.add(m)
    db.commit()
    return {"id": m.id, "email": m.email, "role": m.role}


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    m = db.query(MerchantUser).filter(MerchantUser.email == form.username).first()
    if not m or not verify_password(form.password, m.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email ou mot de passe incorrect")
    return TokenOut(access_token=create_token(m.email))


@router.get("/me")
def me(merchant: MerchantUser = Depends(get_current_merchant)):
    return {"id": merchant.id, "email": merchant.email, "role": merchant.role}
