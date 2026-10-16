from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60

    # Origenes del frontend que pueden llamar a la API, separados por coma.
    # Ejemplo en Railway: FRONTEND_URL=https://flowinsight.vercel.app
    frontend_url: str = ""

    # Recuperacion de contrasena por SMS.
    # sms_provider="consola": el codigo solo se escribe en el log del servidor (desarrollo).
    # sms_provider="twilio": envia un SMS real; requiere las tres variables twilio_*.
    sms_provider: str = "consola"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from: str = ""
    recovery_code_minutes: int = 10
    recovery_code_max_attempts: int = 5
    recovery_code_resend_seconds: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
