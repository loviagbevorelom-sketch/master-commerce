from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-changez-moi"
    DATABASE_URL: str = "sqlite:///./dev.db"
    UPLOAD_DIR: str = "./uploads"
    DEBUG: bool = True
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    PLATFORM_OWNER_EMAIL: str = "owner@mastercommerce.app"
    PLATFORM_OWNER_PASSWORD: str = "owner-mc-admin123"

    # FedaPay Sandbox Configuration
    FEDAPAY_SECRET_KEY: str = "sk_sandbox_secret_key_demo"
    FEDAPAY_PUBLIC_KEY: str = "pk_sandbox_public_key_demo"
    FEDAPAY_ENVIRONMENT: str = "sandbox"
    FEDAPAY_API_BASE: str = "https://sandbox-api.fedapay.com/v1"

    class Config:
        env_file = ".env"


settings = Settings()

