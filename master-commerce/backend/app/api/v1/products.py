import re
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant, get_owned_shop
from app.db.session import get_db
from app.models import Category, MerchantUser, Product
from app.schemas import CategoryIn, ProductIn, ProductOut, ProductUpdate
from app.services.images import validate_and_save_image

router = APIRouter(prefix="/shops/{shop_id}", tags=["products"])


def _slugify(text: str) -> str:
    text = text.lower().strip()
    for a, b in (("é", "e"), ("è", "e"), ("ê", "e"), ("à", "a"), ("â", "a"),
                  ("î", "i"), ("ô", "o"), ("û", "u"), ("ç", "c")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "produit"


@router.get("/products", response_model=list[ProductOut])
def list_products(
    shop_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    return (
        db.query(Product)
        .filter(Product.shop_id == shop.id)
        .order_by(Product.created_at.desc())
        .all()
    )


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    shop_id: int,
    payload: ProductIn,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    if payload.category_id and not (
        db.query(Category)
        .filter(Category.id == payload.category_id, Category.shop_id == shop.id)
        .first()
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Catégorie introuvable")
    p = Product(shop_id=shop.id, slug=_slugify(payload.name), **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    shop_id: int,
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    p = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == shop.id)
        .first()
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, f, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    shop_id: int,
    product_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    p = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == shop.id)
        .first()
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    db.delete(p)
    db.commit()


@router.post("/products/{product_id}/image", response_model=ProductOut)
def upload_image(
    shop_id: int,
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    p = (
        db.query(Product)
        .filter(Product.id == product_id, Product.shop_id == shop.id)
        .first()
    )
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    p.image_path = validate_and_save_image(file, shop.id, p.id)
    db.commit()
    db.refresh(p)
    return p


@router.get("/categories")
def list_categories(
    shop_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    return (
        db.query(Category)
        .filter(Category.shop_id == shop.id)
        .order_by(Category.sort_order)
        .all()
    )


@router.post("/categories", status_code=201)
def create_category(
    shop_id: int,
    payload: CategoryIn,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    c = Category(
        shop_id=shop.id,
        name=payload.name,
        slug=_slugify(payload.name),
        sort_order=payload.sort_order,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "slug": c.slug, "sort_order": c.sort_order}


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    shop_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    merchant: MerchantUser = Depends(get_current_merchant),
):
    shop = get_owned_shop(shop_id, merchant, db)
    c = (
        db.query(Category)
        .filter(Category.id == category_id, Category.shop_id == shop.id)
        .first()
    )
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Catégorie introuvable")
    db.query(Product).filter(Product.category_id == c.id).update(
        {Product.category_id: None}
    )
    db.delete(c)
    db.commit()
