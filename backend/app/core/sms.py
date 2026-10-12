import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("flowinsight.sms")


def enviar_sms(telefono: str, mensaje: str) -> bool:
    """Envia un SMS. Devuelve True si el proveedor lo acepto.

    Con sms_provider="consola" (valor por defecto) no sale ningun mensaje real: el texto
    se escribe en el log del servidor, solo para desarrollo y demostracion.
    """
    if settings.sms_provider == "twilio":
        return _enviar_twilio(telefono, mensaje)

    logger.warning("[SMS modo consola] para %s: %s", telefono, mensaje)
    return True


def _enviar_twilio(telefono: str, mensaje: str) -> bool:
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from):
        logger.error("sms_provider=twilio pero faltan variables twilio_* en la configuracion")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        respuesta = httpx.post(
            url,
            data={"To": telefono, "From": settings.twilio_from, "Body": mensaje},
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=10,
        )
    except httpx.HTTPError:
        logger.exception("No se pudo contactar a Twilio")
        return False

    if respuesta.status_code not in (200, 201):
        logger.error("Twilio rechazo el envio: HTTP %s", respuesta.status_code)
        return False
    return True
