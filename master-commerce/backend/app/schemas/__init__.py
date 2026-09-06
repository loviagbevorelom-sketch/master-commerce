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
    whatsapp_number: str = Field(min_length=8, max_length=30)
    currency: str = Field(default="FCFA", max_length=10)

    @field_validator("whatsapp_number")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not cleaned.lstrip("+").isdigit():
            raise ValueError("Numéro WhatsApp invalide")
        return cleaned


class ShopUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    whatsapp_number: str | None = None
    currency: str | None = None
    is_active: bool | None = None


class ShopOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    whatsapp_number: str
    currency: str
    is_active: bool
    model_config = {"from_attributes": True}


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    sort_order: int = 0


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    price: float = Field(gt=0)
    promo_price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    is_active: bool = True

    @field_validator("promo_price")
    @classmethod
    def promo_cheaper(cls, v, info):
        if v is not None and v >= info.data.get("price", float("inf")):
            raise ValueError("Le prix promo doit être inf au prix normal")
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
    id: int
    name: str
    slug: str
    description: str | None
    price: float
    promo_price: float | None
    stock: int | None
    image_path: str | None
    category_id: int | None
    is_active: bool
    model_config = {"from_attributes": True}


class CheckoutItem(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=99)


class CheckoutIn(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1)
    customer_name: str = Field(min_length=2, max_length=120)
    customer_phone: str = Field(min_length=8, max_length=30)
    reception_mode: str = Field(default="delivery", pattern="^(delivery|pickup)$")
    delivery_zone_id: int | None = None
    payment_method: str = Field(default="cod", pattern="^(cod|fedapay)$")


class CheckoutOut(BaseModel):
    order_ref: str
    whatsapp_link: str
    total: float
    payment_method: str = "cod"
    payment_status: str = "pending"
    payment_url: str | None = None


class DeliveryZoneOut(BaseModel):
    id: int
    city: str
    name: str
    fee: float
    model_config = {"from_attributes": True}


class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    unit_price: float
    qty: int


class OrderUpdateIn(BaseModel):
    status: str = Field(pattern="^(confirmed|delivered|cancelled)$")


class PlatformShopIn(BaseModel):
    merchant_email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    whatsapp_number: str = Field(min_length=8, max_length=30)
    currency: str = Field(default="FCFA", max_length=10)
    commission_rate: float = Field(default=0.10, ge=0, le=0.99)
    setup_fee: float = Field(default=0, ge=0)


class PlatformShopPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    whatsapp_number: str | None = None
    is_active: bool | None = None
    commission_rate: float | None = Field(default=None, ge=0, le=0.99)
    setup_fee: float | None = Field(default=None, ge=0)


class OrderOut(BaseModel):
    ref: str
    shop_name: str
    currency: str
    customer_name: str
    customer_phone: str
    reception_mode: str
    delivery_zone_name: str | None
    delivery_fee: float
    subtotal: float
    total: float
    status: str
    payment_method: str = "cod"
    payment_status: str = "pending"
    payment_url: str | None = None
    whatsapp_link: str | None
    created_at: str
    items: list[OrderItemOut]

