"""Envia un correo de verificacion de ejemplo para comprobar que el proveedor de correo funciona.

Uso (desde la carpeta backend, con el entorno virtual activo):
    python enviar_correo_prueba.py destino@ejemplo.com

Lee la misma configuracion del .env que usa el servidor (EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY o
SMTP_*). No inventa nada: si falta algo, lo dice.
"""
import logging
import sys

from app.core.config import settings
from app.core.correo import correo_real_disponible, enviar_correo
from app.core.plantillas_correo import correo_codigo

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> int:
    if len(sys.argv) != 2 or "@" not in sys.argv[1]:
        print("Uso: python enviar_correo_prueba.py destino@ejemplo.com")
        return 2
    destino = sys.argv[1].strip()
    print(f"Proveedor: {settings.email_provider} | Remitente: {settings.email_from}")
    if not correo_real_disponible():
        print("EMAIL_PROVIDER esta en 'consola': el correo NO saldra de verdad. Configure 'resend' o 'smtp' en .env.")
    asunto, html, texto = correo_codigo("Equipo FlowInsight", "482915", settings.recovery_code_minutes, correo=destino)
    ok = enviar_correo(destino, asunto, html, texto)
    print("Enviado: el proveedor lo acepto." if ok else "FALLO: revise las variables y el mensaje de error de arriba.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
