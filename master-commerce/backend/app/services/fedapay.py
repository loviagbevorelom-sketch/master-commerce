import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("fedapay")


def create_fedapay_transaction(
    order_ref: str,
    amount: float,
    shop_name: str,
    customer_name: str,
    customer_phone: str,
    currency: str = "FCFA",
) -> dict:
    """Création d'une transaction FedaPay Sandbox.
    Retourne un dictionnaire avec 'transaction_id' et 'payment_url'.
    """
    int_amount = int(round(amount))
    callback_url = f"http://localhost:8000/api/public/fedapay/callback?ref={order_ref}"

    headers = {
        "Authorization": f"Bearer {settings.FEDAPAY_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "description": f"Commande {order_ref} - {shop_name}",
        "amount": int_amount,
        "currency": {"iso": "XOF"},
        "callback_url": callback_url,
        "customer": {
            "firstname": customer_name,
            "lastname": "Client",
            "phone_number": {
                "number": customer_phone if customer_phone.startswith("+") else f"+228{customer_phone.lstrip('0')}",
                "country": "tg",
            },
        },
    }

    try:
        url = f"{settings.FEDAPAY_API_BASE.rstrip('/')}/transactions"
        with httpx.Client(timeout=8.0) as client:
            response = client.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201):
                data = response.json()
                t_obj = data.get("v1/transaction", data.get("transaction", data))
                trans_id = str(t_obj.get("id", f"sandbox_{order_ref}"))
                
                # Récupérer ou générer le token de paiement FedaPay
                payment_url = t_obj.get("payment_url")
                if not payment_url and t_obj.get("id"):
                    # Demander un token de guichet
                    tok_res = client.post(f"{url}/{t_obj['id']}/token", headers=headers)
                    if tok_res.status_code in (200, 201):
                        tok_data = tok_res.json()
                        token_str = tok_data.get("token") or tok_data.get("url")
                        if token_str:
                            payment_url = f"https://sandbox-checkout.fedapay.com/{token_str}"

                if not payment_url:
                    payment_url = f"https://sandbox-checkout.fedapay.com/pay/{trans_id}"

                return {
                    "transaction_id": trans_id,
                    "payment_url": payment_url,
                    "status": "pending",
                }
    except Exception as e:
        logger.warning(f"FedaPay Sandbox API exception: {e}. Utilisation du simulateur Sandbox local.")

    # Fallback / Simulation Sandbox active pour les démos & tests sans connexion FedaPay live
    fallback_trans_id = f"fedapay_sbx_{order_ref}"
    fallback_url = f"http://localhost:8000/api/public/fedapay/sandbox-pay-page?ref={order_ref}&amount={int_amount}"
    return {
        "transaction_id": fallback_trans_id,
        "payment_url": fallback_url,
        "status": "pending",
    }


def verify_fedapay_transaction(transaction_id: str) -> dict:
    """Vérification de l'état d'une transaction sur FedaPay."""
    if transaction_id.startswith("fedapay_sbx_"):
        return {"status": "approved", "id": transaction_id}

    headers = {
        "Authorization": f"Bearer {settings.FEDAPAY_SECRET_KEY}",
    }
    try:
        url = f"{settings.FEDAPAY_API_BASE.rstrip('/')}/transactions/{transaction_id}"
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                t_obj = data.get("v1/transaction", data.get("transaction", data))
                return {
                    "status": t_obj.get("status"),
                    "id": str(t_obj.get("id")),
                }
    except Exception as e:
        logger.error(f"FedaPay transaction verification failed: {e}")

    return {"status": "pending", "id": transaction_id}
