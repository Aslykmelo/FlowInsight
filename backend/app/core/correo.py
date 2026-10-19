import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger("flowinsight.correo")


def enviar_correo(destino: str, asunto: str, html: str, texto: str) -> bool:
    """Envia un correo con version HTML y version de texto plano. Devuelve True si el proveedor lo acepto.

    Con email_provider="consola" (valor por defecto) no sale ningun mensaje real: el texto se
    escribe en el log del servidor, solo para desarrollo.
    """
    if settings.email_provider == "resend":
        return _enviar_resend(destino, asunto, html, texto)
    if settings.email_provider == "smtp":
        return _enviar_smtp(destino, asunto, html, texto)

    logger.warning("[Correo modo consola] para %s | %s | %s", destino, asunto, texto.replace("\n", " "))
    return True


def correo_real_disponible() -> bool:
    return settings.email_provider in ("resend", "smtp")


def _enviar_resend(destino: str, asunto: str, html: str, texto: str) -> bool:
    if not settings.resend_api_key:
        logger.error("email_provider=resend pero falta resend_api_key")
        return False
    try:
        respuesta = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [destino], "subject": asunto, "html": html, "text": texto},
            timeout=15,
        )
    except httpx.HTTPError:
        logger.exception("No se pudo contactar a Resend")
        return False
    if respuesta.status_code not in (200, 201, 202):
        logger.error("Resend rechazo el envio: HTTP %s", respuesta.status_code)
        return False
    return True


def _enviar_smtp(destino: str, asunto: str, html: str, texto: str) -> bool:
    if not settings.smtp_host:
        logger.error("email_provider=smtp pero falta smtp_host")
        return False
    mensaje = EmailMessage()
    mensaje["From"] = settings.email_from
    mensaje["To"] = destino
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    mensaje.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as servidor:
            servidor.starttls()
            if settings.smtp_user:
                servidor.login(settings.smtp_user, settings.smtp_password)
            servidor.send_message(mensaje)
    except (smtplib.SMTPException, OSError):
        logger.exception("No se pudo enviar por SMTP")
        return False
    return True
