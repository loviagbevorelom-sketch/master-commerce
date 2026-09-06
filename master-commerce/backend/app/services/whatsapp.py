import re
from urllib.parse import quote


def build_checkout_link(
    shop_name: str,
    whatsapp_number: str,
    currency: str,
    lines: list,
    customer_name: str,
    customer_phone: str,
    customer_zone: str,
    *,
    reception_mode: str = "delivery",
    delivery_fee: float = 0.0,
    order_ref: str | None = None,
) -> str:
    clean_number = re.sub(r"[^\d]", "", whatsapp_number or "")
    if clean_number.startswith("00"):
        clean_number = clean_number[2:]
    if len(clean_number) == 8:
        clean_number = f"228{clean_number}"

    lines_txt = "\n".join(
        f"• {p.name} x{qty} — {unit:,.0f} {currency}".replace(",", " ")
        for p, qty, unit in lines
    )
    subtotal = sum(unit * qty for _, qty, unit in lines)
    total = subtotal + delivery_fee
    total_txt = f"{total:,.0f} {currency}".replace(",", " ")

    parts = [
        f"🛒 *Nouvelle commande — {shop_name}*",
    ]
    if order_ref:
        parts.append(f"📋 *Réf :* {order_ref}")

    parts.extend(["", "*Articles :*", lines_txt, ""])
    parts.append(f"*Sous-total :* {subtotal:,.0f} {currency}".replace(",", " "))

    if reception_mode == "pickup":
        parts.append("🛍️ *Mode :* Retrait sur place (gratuit)")
    else:
        parts.append(
            f"🚚 *Livraison ({customer_zone}) :* {delivery_fee:,.0f} {currency}".replace(",", " ")
        )

    parts.extend([
        "",
        f"💰 *Total à payer : {total_txt}*",
        "",
        f"👤 *Client :* {customer_name}",
        f"📞 *Tél :* {customer_phone}",
        "",
        "Merci de confirmer ma commande ! 🙏",
    ])

    message = "\n".join(parts)
    return f"https://wa.me/{clean_number}?text={quote(message)}"