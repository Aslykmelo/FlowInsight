"""Plantillas de correo de FlowInsight.

HTML con tablas y estilos en linea (compatible con Gmail y Outlook) mas version de texto plano.
Tono ejecutivo y sobrio: sin emojis, sin enlaces en los correos de seguridad, identidad clara del
remitente y una indicacion de que hacer si el mensaje no fue solicitado. Es lo que distingue un
correo corporativo de uno que parece phishing.
"""
from datetime import datetime, timedelta, timezone
from html import escape

from app.core.config import settings

AZUL = "#1e40af"
TINTA = "#0f172a"
TEXTO = "#334155"
APAGADO = "#64748b"
LINEA = "#e2e8f0"
FONDO = "#f1f5f9"
FUENTE = "Arial,Helvetica,sans-serif"
HORA_COLOMBIA = timezone(timedelta(hours=-5))  # Colombia no cambia de hora en el ano


def _hora_colombia(momento: datetime | None) -> str:
    momento = momento or datetime.now(timezone.utc)
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=timezone.utc)
    local = momento.astimezone(HORA_COLOMBIA)
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
             "octubre", "noviembre", "diciembre"]
    return f"{local.day} de {meses[local.month - 1]} de {local.year}, {local:%H:%M} (hora de Colombia)"


def _boton(etiqueta: str, url: str, principal: bool = True) -> str:
    fondo = AZUL if principal else "#ffffff"
    color = "#ffffff" if principal else AZUL
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 8px 6px 0;'
        f'display:inline-block"><tr><td style="background:{fondo};border:1px solid {AZUL};border-radius:6px">'
        f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener" style="display:inline-block;'
        f'padding:12px 22px;font-family:{FUENTE};font-size:15px;font-weight:bold;'
        f'color:{color};text-decoration:none">{escape(etiqueta)}</a></td></tr></table>'
    )


def _marco(preheader: str, titulo: str, contenido: str, pie: str) -> str:
    empresa = escape(settings.empresa_nombre)
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>{escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:{FONDO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{FONDO}">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{FONDO}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="width:100%;max-width:600px;background:#ffffff;border:1px solid {LINEA};border-radius:8px;
                border-top:4px solid {AZUL}">
    <tr><td style="padding:24px 32px 18px;border-bottom:1px solid {LINEA};font-family:{FUENTE}">
      <div style="font-size:18px;font-weight:bold;color:{TINTA};letter-spacing:-0.01em">FlowInsight</div>
      <div style="font-size:13px;color:{APAGADO};margin-top:2px">Análisis de clientes · {empresa}</div>
    </td></tr>
    <tr><td style="padding:28px 32px 8px;font-family:{FUENTE};color:{TEXTO}">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:bold;color:{TINTA}">{escape(titulo)}</h1>
      {contenido}
    </td></tr>
    <tr><td style="padding:18px 32px 28px;font-family:{FUENTE};font-size:12px;line-height:1.6;color:{APAGADO};
                   border-top:1px solid {LINEA}">
      {pie}<br>{empresa} · Bogotá, Colombia
    </td></tr>
  </table>
</td></tr></table></body></html>"""


def _fila(etiqueta: str, valor: str) -> str:
    return (
        f'<tr><td style="padding:8px 0;font-size:13px;color:{APAGADO};width:110px;vertical-align:top">{etiqueta}</td>'
        f'<td style="padding:8px 0;font-size:14px;color:{TINTA}">{valor}</td></tr>'
    )


def correo_codigo(
    nombre: str, codigo: str, minutos: int, correo: str | None = None, solicitado: datetime | None = None,
) -> tuple[str, str, str]:
    """Correo con el codigo para restablecer la contrasena. Devuelve (asunto, html, texto)."""
    asunto = f"Código de verificación de FlowInsight: {codigo}"
    cuando = _hora_colombia(solicitado)
    filas = _fila("Solicitud", escape(cuando))
    if correo:
        filas = _fila("Cuenta", escape(correo)) + filas
    filas += _fila("Vigencia", f"{minutos} minutos, de un solo uso")

    cuerpo = f"""
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Estimado(a) {escape(nombre)}:</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">Recibimos una solicitud para restablecer la contraseña
      de su cuenta en FlowInsight. Para continuar, ingrese el siguiente código de verificación en la pantalla de
      recuperación:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">
        <tr><td align="center" style="padding:20px 12px;background:{FONDO};border:1px solid #cbd5e1;border-radius:6px;
            font-family:Consolas,'Courier New',monospace;font-size:34px;font-weight:bold;letter-spacing:8px;
            color:{TINTA}">{escape(codigo)}</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:0 0 22px;border-top:1px solid {LINEA};border-bottom:1px solid {LINEA}">{filas}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px">
        <tr><td style="padding:14px 16px;background:#f8fafc;border:1px solid {LINEA};border-radius:6px;
            font-size:13px;line-height:1.6;color:{TEXTO}">
          <strong style="color:{TINTA}">¿No solicitó este cambio?</strong> Ignore este mensaje: su contraseña seguirá
          igual y el código vencerá solo. Por su seguridad, FlowInsight nunca le pedirá este código por teléfono,
          WhatsApp ni correo.
        </td></tr>
      </table>"""
    pie = "Mensaje automático de seguridad. Por favor no responda a este correo."
    texto = (
        f"Estimado(a) {nombre}:\n\n"
        "Recibimos una solicitud para restablecer la contraseña de su cuenta en FlowInsight.\n\n"
        f"Su código de verificación es {codigo}. Vence en {minutos} minutos y solo puede usarse una vez.\n\n"
        f"Cuenta: {correo or '—'}\nSolicitud: {cuando}\n\n"
        "¿No solicitó este cambio? Ignore este mensaje: su contraseña seguirá igual. FlowInsight nunca le pedirá "
        "este código por teléfono, WhatsApp ni correo.\n\n"
        f"{settings.empresa_nombre} · FlowInsight · Mensaje automático, no responda a este correo."
    )
    return asunto, _marco(f"Su código de verificación es {codigo}", "Código de verificación", cuerpo, pie), texto


def correo_promocion(
    nombre_cliente: str,
    mensaje: str,
    botones: list[dict],
    producto_favorito: str | None,
) -> tuple[str, str, str]:
    asunto = f"{nombre_cliente}, una propuesta para su próximo pedido"
    parrafos = "".join(
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6">{escape(linea)}</p>'
        for linea in mensaje.split("\n") if linea.strip()
    )
    favorito = (
        f'<p style="margin:0 0 18px;padding:12px 14px;background:#f8fafc;border:1px solid {LINEA};border-radius:6px;'
        f'font-size:14px;color:{TINTA}">Su producto habitual: <strong>{escape(producto_favorito)}</strong></p>'
        if producto_favorito else ""
    )
    html_botones = "".join(_boton(b["etiqueta"], b["url"], principal=(i == 0)) for i, b in enumerate(botones))
    cuerpo = f"""
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Estimado(a) {escape(nombre_cliente)}:</p>
      {parrafos}{favorito}
      <div style="margin:6px 0 18px">{html_botones}</div>"""
    pie = (f"Recibe este mensaje porque es cliente de {escape(settings.empresa_nombre)} y autorizó el "
           "tratamiento de sus datos. Si prefiere no recibir más mensajes, indíqueselo a su asesor comercial.")
    lineas_botones = "\n".join(f"- {b['etiqueta']}: {b['url']}" for b in botones)
    texto = f"Estimado(a) {nombre_cliente}:\n\n{mensaje}\n\n{lineas_botones}\n\n{settings.empresa_nombre}"
    return asunto, _marco(mensaje.split(".")[0][:90], "Una propuesta para usted", cuerpo, pie), texto
