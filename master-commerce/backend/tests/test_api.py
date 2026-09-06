import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _register_and_login(email="test@x.com", password="motdepasse123"):
    client.post("/api/auth/register", json={"email": email, "password": password})
    r = client.post("/api/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _make_shop(h, name="Ma Boutique"):
    r = client.post(
        "/api/shops", headers=h,
        json={"name": name, "whatsapp_number": "+22890000000"},
    )
    assert r.status_code == 201
    return r.json()


def _make_product(h, shop, name, price=1000, **kw):
    r = client.post(
        f"/api/shops/{shop['id']}/products", headers=h,
        json={"name": name, "price": price, **kw},
    )
    assert r.status_code == 201
    return r.json()


def test_register_et_login():
    h = _register_and_login("a@b.com")
    assert "access_token" in client.post(
        "/api/auth/login",
        data={"username": "a@b.com", "password": "motdepasse123"},
    ).json()


def test_shop_slug_unique():
    h = _register_and_login("s1@x.com")
    s1 = _make_shop(h, "Boutique Test")
    h2 = _register_and_login("s2@x.com")
    s2 = _make_shop(h2, "Boutique Test")
    assert s1["slug"] != s2["slug"]


def test_isolation_boutiques():
    h1 = _register_and_login("i@x.com")
    _make_shop(h1, "Boutique A")
    h2 = _register_and_login("j@x.com")
    s2 = _make_shop(h2, "Boutique B")
    r = client.patch(f"/api/shops/{s2['id']}", headers=h1, json={"name": "Piraté"})
    assert r.status_code == 404


def test_checkout_recalcule_le_total():
    h = _register_and_login("ck@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Pagne", 10000, promo_price=8000)
    zones = client.get(f"/api/public/shops/{shop['slug']}/delivery-zones").json()
    assert len(zones) > 0
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": p["id"], "qty": 2}],
        "customer_name": "Koffi", "customer_phone": "90000000",
        "reception_mode": "delivery",
        "delivery_zone_id": zones[0]["id"],
    })
    assert r.status_code == 200
    data = r.json()
    expected_total = 16000 + zones[0]["fee"]
    assert data["total"] == expected_total
    assert data["order_ref"].startswith("MC-")
    assert "wa.me/22890000000" in data["whatsapp_link"]
    assert "Pagne" in data["whatsapp_link"]
    assert {z["name"] for z in zones} == {
        "Adidogomé", "Bè-Kpota", "Tokoin", "Agoè-Nyivé", "Nyékonakpoè"}


def test_checkout_retrait_sans_frais():
    h = _register_and_login("pk@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Alloco", 500)
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": p["id"], "qty": 1}],
        "customer_name": "Koffi", "customer_phone": "90000000",
        "reception_mode": "pickup",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 500
    assert "sur%20place" in data["whatsapp_link"].lower()


def test_checkout_commande_stockee_et_consultable():
    h = _register_and_login("stk@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Thé vert", 2500)
    zones = client.get(f"/api/public/shops/{shop['slug']}/delivery-zones").json()
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": p["id"], "qty": 2}],
        "customer_name": "Akouvi", "customer_phone": "90123456",
        "reception_mode": "delivery", "delivery_zone_id": zones[0]["id"],
    })
    ref = r.json()["order_ref"]
    o = client.get(f"/api/public/orders/{ref}")
    assert o.status_code == 200
    data = o.json()
    assert data["ref"] == ref
    assert data["customer_name"] == "Akouvi"
    assert len(data["items"]) == 1
    assert data["items"][0]["product_name"] == "Thé vert"
    assert data["items"][0]["qty"] == 2
    assert data["total"] == 5000 + zones[0]["fee"]

    listed = client.get(f"/api/shops/{shop['id']}/orders", headers=h).json()
    assert listed[0]["ref"] == ref


def test_checkout_zone_inconnue_refusee():
    h = _register_and_login("zn@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Plat", 1000)
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": p["id"], "qty": 1}],
        "customer_name": "Xylo", "customer_phone": "90000000",
        "reception_mode": "delivery", "delivery_zone_id": 99999,
    })
    assert r.status_code == 404


def test_checkout_produit_autre_boutique_refuse():
    h1 = _register_and_login("iso1@x.com")
    h2 = _register_and_login("iso2@x.com")
    _make_shop(h1, "Shop Uno")
    shop2 = _make_shop(h2, "Shop Dos")
    r = client.post(f"/api/public/shops/{shop2['slug']}/checkout", json={
        "items": [{"product_id": 999, "qty": 1}],
        "customer_name": "Xylo", "customer_phone": "90000000",
        "reception_mode": "delivery",
    })
    assert r.status_code == 404


def test_catalogue_public_masque_inactifs():
    h = _register_and_login("cat@x.com")
    shop = _make_shop(h)
    client.post(
        f"/api/shops/{shop['id']}/products", headers=h,
        json={"name": "Visible", "price": 100, "is_active": True},
    )
    client.post(
        f"/api/shops/{shop['id']}/products", headers=h,
        json={"name": "Caché", "price": 100, "is_active": False},
    )
    r = client.get(f"/api/public/shops/{shop['slug']}/products")
    names = [p["name"] for p in r.json()]
    assert "Visible" in names and "Caché" not in names


def test_boutique_inactive_404():
    h = _register_and_login("off@x.com")
    shop = _make_shop(h)
    client.patch(f"/api/shops/{shop['id']}", headers=h, json={"is_active": False})
    assert client.get(f"/api/public/shops/{shop['slug']}").status_code == 404


# ── Phase 1 : statuts de commande marchand ──────────────────────────────


def _checkout(h, shop, product, qty=1, phone="90123456"):
    r = client.post(f"/api/public/shops/{shop['slug']}/checkout", json={
        "items": [{"product_id": product["id"], "qty": qty}],
        "customer_name": "Koffi", "customer_phone": phone,
        "reception_mode": "pickup",
    })
    assert r.status_code == 200
    listed = client.get(f"/api/shops/{shop['id']}/orders", headers=h).json()
    return listed[0]


def test_confirmation_commande_decremente_stock():
    h = _register_and_login("st1@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Thé", 1000, stock=5)
    order = _checkout(h, shop, p, qty=2)

    r = client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "confirmed"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"

    prods = client.get(f"/api/shops/{shop['id']}/products", headers=h).json()
    assert next(x["stock"] for x in prods if x["id"] == p["id"]) == 3


def test_annulation_confirmee_restaure_stock():
    h = _register_and_login("st2@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Café", 1200, stock=4)
    order = _checkout(h, shop, p, qty=3)

    client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "confirmed"},
    )
    r = client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "cancelled"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"

    prods = client.get(f"/api/shops/{shop['id']}/products", headers=h).json()
    assert next(x["stock"] for x in prods if x["id"] == p["id"]) == 4


def test_transition_statut_invalide_refusee():
    h = _register_and_login("st3@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Jus", 800)
    order = _checkout(h, shop, p)

    r = client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "delivered"},
    )
    assert r.status_code == 200

    r = client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "confirmed"},
    )
    assert r.status_code == 409


# ── Phase 2 : panneau plateforme propriétaire ───────────────────────────


def _owner_headers():
    from app.core.config import settings
    r = client.post("/api/auth/login", data={
        "username": settings.PLATFORM_OWNER_EMAIL,
        "password": settings.PLATFORM_OWNER_PASSWORD,
    })
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_plateforme_reservee_au_owner():
    h = _register_and_login("mer1@x.com")
    r = client.get("/api/platform/overview", headers=h)
    assert r.status_code == 403


def test_owner_overview_et_boutique_a_facon():
    owner = _owner_headers()
    h = _register_and_login("a-facon@x.com")
    shop = _make_shop(h)
    p = _make_product(h, shop, "Poulet braisé", 15000, stock=10)
    order = _checkout(h, shop, p, qty=2)
    client.patch(
        f"/api/shops/{shop['id']}/orders/{order['id']}/status",
        headers=h, json={"status": "confirmed"},
    )

    r = client.post("/api/platform/shops", headers=owner, json={
        "merchant_email": "a-facon@x.com",
        "name": "Boutique À Façon",
        "whatsapp_number": "+22891234567",
        "commission_rate": 0.15,
        "setup_fee": 25000,
    })
    assert r.status_code == 201
    shop2 = r.json()
    assert shop2["commission_rate"] == 0.15
    assert shop2["setup_fee"] == 25000
    assert shop2["merchant_email"] == "a-facon@x.com"

    r = client.post("/api/platform/shops", headers=owner, json={
        "merchant_email": "inconnu@x.com",
        "name": "Fantôme",
        "whatsapp_number": "+22890000000",
    })
    assert r.status_code == 404

    ov = client.get("/api/platform/overview", headers=owner).json()
    assert ov["setup_revenue"] >= 25000
    assert ov["orders_total"] >= 1
    assert ov["revenue"] >= 30000
    assert ov["commission"] >= 3000

    listed = client.get("/api/platform/shops", headers=owner).json()
    row = next(x for x in listed if x["id"] == shop["id"])
    assert row["merchant_email"] == "a-facon@x.com"
    assert row["revenue"] == 30000
    assert row["commission"] == 3000

    r = client.patch(f"/api/platform/shops/{shop2['id']}", headers=owner,
                     json={"commission_rate": 0.20, "is_active": False})
    assert r.status_code == 200
    assert r.json()["commission_rate"] == 0.20
    assert r.json()["is_active"] is False

    r = client.get("/api/platform/delivery-zones", headers=owner)
    assert {z["name"] for z in r.json()} == {
        "Adidogomé", "Bè-Kpota", "Tokoin", "Agoè-Nyivé", "Nyékonakpoè"}
