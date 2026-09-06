from sqlalchemy import (Column, Integer, Boolean, Numeric, ForeignKey,
                        String, Text, DateTime, UniqueConstraint, func)
from app.db.session import Base


class MerchantUser(Base):
    __tablename__ = "merchants"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="merchant")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Shop(Base):
    __tablename__ = "shops"
    id = Column(Integer, primary_key=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(140), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    whatsapp_number = Column(String(30), nullable=False)
    currency = Column(String(10), default="FCFA")
    commission_rate = Column(Numeric(4, 4), nullable=False, default=0.10)
    setup_fee = Column(Numeric(12, 2), nullable=False, default=0)
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


class DeliveryZone(Base):
    """Zone de livraison (frais fixes à Lomé pour l'instant, globales)."""
    __tablename__ = "delivery_zones"
    id = Column(Integer, primary_key=True)
    city = Column(String(60), nullable=False, default="Lomé")
    name = Column(String(80), nullable=False)
    fee = Column(Numeric(12, 2), nullable=False, default=0)
    sort_order = Column(Integer, default=0)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    ref = Column(String(40), unique=True, nullable=False, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    customer_name = Column(String(120), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    reception_mode = Column(String(20), nullable=False, default="delivery")
    delivery_zone_id = Column(Integer, ForeignKey("delivery_zones.id"), nullable=True)
    delivery_zone_name = Column(String(80), nullable=True)
    delivery_fee = Column(Numeric(12, 2), nullable=False, default=0)
    subtotal = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="FCFA")
    status = Column(String(30), nullable=False, default="pending")
    payment_method = Column(String(20), nullable=False, default="cod")  # "cod" | "fedapay"
    payment_status = Column(String(20), nullable=False, default="pending")  # "pending" | "paid" | "failed"
    fedapay_transaction_id = Column(String(100), nullable=True)
    payment_url = Column(String(500), nullable=True)
    whatsapp_link = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())



class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(160), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    qty = Column(Integer, nullable=False)
