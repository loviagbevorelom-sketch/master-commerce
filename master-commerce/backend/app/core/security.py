import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings

ALGO = "HS256"


def hash_password(p: str) -> str:
    pwd_bytes = p.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    pwd_bytes = p.encode("utf-8")[:72]
    h_bytes = h.encode("utf-8")
    try:
        return bcrypt.checkpw(pwd_bytes, h_bytes)
    except Exception:
        return False


def create_token(email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": exp}, settings.SECRET_KEY, algorithm=ALGO)


def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO]).get("sub")
    except Exception:
        return None
