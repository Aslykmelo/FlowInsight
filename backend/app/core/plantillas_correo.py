"""Plantillas de correo de FlowInsight: HTML con tablas y estilos en linea (compatible con Gmail y
Outlook) y version de texto plano, con identidad de la empresa y sin lenguaje de promocion agresivo."""
from html import escape

from app.core.config import settings

MORADO = "#534AB7"
TINTA = "#1B2430"
APAGADO = "#5B6472"
FONDO = "#F3F4F8"


def _boton(etiqueta: str, url: str, principal: bool = True) -> str:
    fondo = MORADO if principal else "#FFFFFF"
    color = "#FFFFFF" if principal else MORADO
    borde = f"1px solid {MORADO}"
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 8px 6px 0;'
        f'display:inline-block"><tr><td style="background:{fondo};border:{borde};border-radius:8px">'
        f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener" style="display:inline-block;'
        f'padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;'
        f'color:{color};text-decoration:none">{escape(etiqueta)}</a></td></tr></table>'
    )


def _marco(preheader: str, titulo: str, contenido: str, pie: str) -> str:
    empresa = escape(settings.empresa_nombre)
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:{FONDO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{FONDO}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E3E6EC">
    <tr><td style="background:{MORADO};padding:22px 28px">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#FFFFFF">FlowInsight</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#D9D6F3;margin-top:2px">{empresa}</div>
    </td></tr>
    <tr><td style="padding:30px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:{TINTA}">
      <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:{TINTA}">{escape(titulo)}</h1>
      {contenido}
    </td></tr>
    <tr><td style="padding:18px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                   line-height:1.6;color:{APAGADO};border-top:1px solid #EEF0F4">
      {pie}<br>{empresa} · Bogotá, Colombia
    </td></tr>
  </table>
</td></tr></table></body></html>"""


def correo_codigo(nombre: str, codigo: str, minutos: int) -> tuple[str, str, str]:
    asunto = "Tu código de verificación de FlowInsight"
    cuerpo = f"""
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hola {escape(nombre)},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Recibimos una solicitud para restablecer la contraseña
      de tu cuenta. Usa este código en la pantalla de recuperación:</p>
      <div style="margin:0 0 18px;padding:18px;text-align:center;background:#F6F5FD;border:1px solid #DAD6F5;
                  border-radius:10px;font-family:Consolas,'Courier New',monospace;font-size:34px;font-weight:bold;
                  letter-spacing:8px;color:{MORADO}">{escape(codigo)}</div>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:{APAGADO}">El código vence en {minutos} minutos y
      solo puede usarse una vez.</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:{APAGADO}">Si no pediste este cambio, puedes ignorar
      este mensaje: tu contraseña seguirá igual. Nunca compartas este código con nadie.</p>"""
    pie = "Este es un mensaje automático de seguridad; no es necesario responderlo."
    texto = (
        f"Hola {nombre},\n\nTu código de verificación es {codigo}. Vence en {minutos} minutos y solo puede usarse "
        "una vez.\n\nSi no pediste este cambio, ignora este mensaje: tu contraseña seguirá igual. Nunca compartas "
        f"este código.\n\n{settings.empresa_nombre} · FlowInsight"
    )
    return asunto, _marco(f"Tu código es {codigo}", "Restablece tu contraseña", cuerpo, pie), texto


def correo_promocion(
    nombre_cliente: str,
    mensaje: str,
    botones: list[dict],
    producto_favorito: str | None,
) -> tuple[str, str, str]:
    asunto = f"{nombre_cliente}, tenemos una propuesta para tu próximo pedido"
    parrafos = "".join(
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6">{escape(linea)}</p>'
        for linea in mensaje.split("\n") if linea.strip()
    )
    favorito = (
        f'<p style="margin:0 0 18px;padding:12px 14px;background:#F6F5FD;border-radius:8px;font-size:14px;'
        f'color:{TINTA}">Tu producto de siempre: <strong>{escape(producto_favorito)}</strong></p>'
        if producto_favorito else ""
    )
    html_botones = "".join(_boton(b["etiqueta"], b["url"], principal=(i == 0)) for i, b in enumerate(botones))
    cuerpo = f"""
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hola {escape(nombre_cliente)},</p>
      {parrafos}{favorito}
      <div style="margin:6px 0 18px">{html_botones}</div>"""
    pie = (f"Recibes este mensaje porque eres cliente de {escape(settings.empresa_nombre)} y autorizaste el "
           "tratamiento de tus datos. Si prefieres no recibir más mensajes, responde a tu asesor comercial.")
    lineas_botones = "\n".join(f"- {b['etiqueta']}: {b['url']}" for b in botones)
    texto = f"Hola {nombre_cliente},\n\n{mensaje}\n\n{lineas_botones}\n\n{settings.empresa_nombre}"
    return asunto, _marco(mensaje.split(".")[0][:90], "Una propuesta para ti", cuerpo, pie), texto
