from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60

    # Origenes del frontend que pueden llamar a la API, separados por coma.
    # Ejemplo en Railway: FRONTEND_URL=https://flowinsight.vercel.app
    frontend_url: str = "https://flow-insight-sigma.vercel.app"

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

    # Correo saliente (recuperacion de contrasena y mensajes de promocion).
    # email_provider="consola": el correo solo se escribe en el log (desarrollo).
    # "resend": envia por la API HTTPS de Resend (recomendado en Railway, que suele bloquear SMTP).
    # "smtp": envia por un servidor SMTP propio (smtp_*).
    email_provider: str = "consola"
    resend_api_key: str = ""
    email_from: str = "FlowInsight <no-reply@flowinsight.app>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Datos de la empresa que aparecen en correos y mensajes de promocion.
    empresa_nombre: str = "W&T Food S.A.S."
    empresa_whatsapp: str = ""      # solo digitos con indicativo, p. ej. 573001234567
    empresa_pedido_url: str = ""    # catalogo o formulario de pedido; si esta vacio se usa WhatsApp
    # Por seguridad, los correos de promocion solo salen hacia clientes reales si esto es true.
    promo_envio_real: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
