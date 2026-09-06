import os
from PIL import Image
from fastapi import HTTPException, UploadFile
from app.core.config import settings

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_SIZE = 5 * 1024 * 1024


def validate_and_save_image(file: UploadFile, shop_id: int, product_id: int) -> str:
    if file.content_type not in ALLOWED:
        raise HTTPException(415, "Format non supporté (JPEG, PNG, WebP uniquement)")
    data = file.file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image trop lourde (max 5 Mo)")
    try:
        img = Image.open(file.file)
        img.verify()
        img = Image.open(file.file).convert("RGB")
    except Exception:
        raise HTTPException(415, "Fichier image corrompu")
    img.thumbnail((1024, 1024))
    rel = f"shop_{shop_id}/product_{product_id}{ALLOWED[file.content_type]}"
    abs_path = os.path.join(settings.UPLOAD_DIR, rel)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    if abs_path.endswith(".jpg"):
        img.save(abs_path, "JPEG", quality=85)
    else:
        img.save(abs_path)
    return f"/uploads/{rel}"
