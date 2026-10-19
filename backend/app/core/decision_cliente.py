"""Apoyo a la decision sobre un cliente.

Convierte el historial de compras de un cliente (y, si existe, la prediccion del modelo) en una lectura
clara para el personal comercial: que senales hay, que tan urgente es y que conviene hacer.

Es un sistema de reglas transparentes sobre datos reales, no una red neuronal ni un modelo de lenguaje:
cada frase que produce sale de una cifra que se puede comprobar en el historial. No inventa descuentos,
precios ni promesas comerciales; esas condiciones las define la empresa.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.core.segmentos import categorizar

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
         "noviembre", "diciembre"]


@dataclass
class Perfil:
    nombre: str
    autorizado: bool
    pedidos: int
    monto_total: float
    ultima_compra: Optional[datetime]
    dias_sin_comprar: Optional[int]
    intervalo_promedio: Optional[int]
    tendencia: Optional[str]  # "se_espacia" | "se_acerca" | "estable" | None
    percentil_valor: int  # 0-100: a cuantos clientes supera en monto comprado
    riesgo_modelo: Optional[float] = None  # 0-1, del modelo de abandono
    producto_favorito: Optional[str] = None

    @property
    def categoria(self) -> Optional[str]:
        return None if self.dias_sin_comprar is None else categorizar(self.dias_sin_comprar)

    @property
    def ratio_ritmo(self) -> Optional[float]:
        if self.dias_sin_comprar is None or not self.intervalo_promedio:
            return None
        return self.dias_sin_comprar / self.intervalo_promedio


@dataclass
class Senal:
    texto: str
    tono: str  # ok | info | atencion | alerta


@dataclass
class Decision:
    prioridad: str  # alta | media | baja | no_contactar
    puntaje: int
    titulo: str
    recomendacion: str
    pasos: list[str] = field(default_factory=list)
    senales: list[Senal] = field(default_factory=list)
    confianza: str = "media"
    aviso: str = ""


def estadisticas(fechas: list[datetime]) -> tuple[Optional[int], Optional[str]]:
    """(intervalo promedio en dias, tendencia) a partir de las fechas de pedido ordenadas."""
    if len(fechas) < 2:
        return None, None
    intervalos = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
    promedio = round(sum(intervalos) / len(intervalos))
    tendencia = "estable"
    if len(intervalos) >= 4:
        mitad = len(intervalos) // 2
        antes = sum(intervalos[:mitad]) / mitad
        despues = sum(intervalos[mitad:]) / (len(intervalos) - mitad)
        if despues > antes * 1.3 and despues - antes >= 7:
            tendencia = "se_espacia"
        elif despues < antes * 0.7 and antes - despues >= 7:
            tendencia = "se_acerca"
    else:
        tendencia = None
    return max(promedio, 1), tendencia


def percentil(valor: float, todos: list[float]) -> int:
    if not todos:
        return 0
    return round(100 * sum(1 for t in todos if t < valor) / len(todos))


def _plata(v: float) -> str:
    return "$ " + f"{round(v):,}".replace(",", ".")


def _fecha(d: datetime) -> str:
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def puntuar(p: Perfil) -> int:
    """0-100: urgencia de contacto (hasta 60) mas valor del cliente (hasta 40)."""
    if p.dias_sin_comprar is None:
        return 0
    urgencia = {"activo": 0, "ocasional": 25, "en_riesgo": 45}[p.categoria or "activo"]
    ratio = p.ratio_ritmo
    if ratio is not None:
        urgencia += 15 if ratio >= 2 else 8 if ratio >= 1.2 else 0
    return min(60, urgencia) + round(p.percentil_valor * 0.4)


def decidir(p: Perfil) -> Decision:
    puntaje = puntuar(p)
    confianza = "alta" if p.pedidos >= 8 else "media" if p.pedidos >= 4 else "baja"
    aviso = (
        "Es una recomendación de apoyo basada en el historial de compras; la decisión final es de quien conoce "
        "al cliente."
    )
    if p.pedidos < 4:
        aviso += f" Con solo {p.pedidos} pedido(s) de historial la lectura es poco fiable."

    if p.dias_sin_comprar is None:
        return Decision(
            "baja", 0, "Sin historial de compras",
            "Este cliente no tiene pedidos registrados, así que no hay datos para evaluar su comportamiento.",
            ["Confirme sus datos de contacto.", "Ofrézcale el catálogo para lograr una primera compra."],
            [Senal("No hay pedidos registrados.", "info")], "baja", aviso,
        )

    senales: list[Senal] = []
    cat = p.categoria
    tono_cat = {"activo": "ok", "ocasional": "atencion", "en_riesgo": "alerta"}[cat]
    ultima = f" ({_fecha(p.ultima_compra)})" if p.ultima_compra else ""
    senales.append(Senal(f"Su última compra fue hace {p.dias_sin_comprar} días{ultima}.", tono_cat))

    ratio = p.ratio_ritmo
    if ratio is not None:
        tono = "ok" if ratio <= 1.2 else "atencion" if ratio <= 2 else "alerta"
        senales.append(Senal(
            f"Suele comprar cada {p.intervalo_promedio} días y lleva {ratio:.1f} veces ese tiempo sin pedir.", tono))
    if p.tendencia == "se_espacia":
        senales.append(Senal("Sus últimas compras se han ido espaciando respecto a las primeras.", "atencion"))
    elif p.tendencia == "se_acerca":
        senales.append(Senal("Sus últimas compras son más frecuentes que las primeras.", "ok"))

    ticket = p.monto_total / p.pedidos if p.pedidos else 0
    valor = (
        f"Ha comprado {_plata(p.monto_total)} en {p.pedidos} pedidos (ticket promedio {_plata(ticket)}); "
        f"compra más que el {p.percentil_valor} % de los clientes."
    )
    senales.append(Senal(valor, "info"))
    if p.producto_favorito:
        senales.append(Senal(f"Su producto más comprado es {p.producto_favorito}.", "info"))
    if p.riesgo_modelo is not None:
        riesgo = round(p.riesgo_modelo * 100)
        if cat == "en_riesgo" and p.riesgo_modelo < 0.3:
            senales.append(Senal(
                f"El modelo estima solo {riesgo} % de riesgo, pero eso no coincide con lo que muestran sus compras "
                "(mucho tiempo sin pedir). El modelo hoy no alcanza las metas de precisión: en este caso conviene "
                "confiar más en los días sin comprar.", "atencion"))
        elif cat == "activo" and p.riesgo_modelo > 0.6:
            senales.append(Senal(
                f"El modelo marca {riesgo} % de riesgo aunque compró hace poco. El modelo hoy no alcanza las metas "
                "de precisión; revise su ritmo de compra antes de actuar.", "atencion"))
        else:
            senales.append(Senal(
                f"El modelo estima un {riesgo} % de riesgo de que deje de comprar "
                "(señal de apoyo: hoy el modelo no alcanza las metas de precisión del proyecto).", "info"))

    alto_valor = p.percentil_valor >= 75
    favorito = p.producto_favorito or "sus productos habituales"

    if not p.autorizado:
        return Decision(
            "no_contactar", puntaje, "No contactar: falta su autorización de datos",
            "Este cliente no ha autorizado el uso de sus datos, por lo que no debe recibir mensajes de promoción. "
            "Puede consultar su historial para uso interno.",
            ["Si el cliente quiere recibir información, pídale primero su autorización (Ley 1581 de 2012)."],
            senales, confianza, aviso,
        )

    if cat == "activo":
        lento = ratio is not None and ratio > 1.3
        titulo = "Va más lento de lo habitual: haga un seguimiento" if lento else "Cliente al día: no requiere gestión urgente"
        rec = (
            "Está comprando, pero algo más espaciado que su ritmo normal; un contacto breve ayuda a no perderlo."
            if lento else
            "Compró hace poco y va a su ritmo. Basta un contacto de rutina cuando se acerque su próxima compra."
        )
        if alto_valor:
            rec = "Es un cliente de alto valor. " + rec
        pasos = ["Confirme su próximo pedido cerca de la fecha en que suele comprar."]
        if alto_valor:
            pasos.append("Asígnele un seguimiento periódico: es de los que más aportan.")
        prioridad = "media" if (lento and alto_valor) else "baja"
    elif cat == "ocasional":
        titulo = "Contáctelo esta semana"
        rec = (
            f"Lleva {p.dias_sin_comprar} días sin comprar" +
            (f", {ratio:.1f} veces su ritmo habitual" if ratio is not None else "") +
            ". Todavía está a tiempo de retomar la relación con un contacto cercano."
        )
        if alto_valor:
            rec = "Es un cliente de alto valor. " + rec
        pasos = [
            f"Escríbale por WhatsApp o llámelo y ofrézcale {favorito}.",
            "Pregunte si tuvo algún inconveniente con su último pedido.",
            "Anote su respuesta para saber si vuelve a comprar.",
        ]
        prioridad = "alta" if puntaje >= 70 else "media"
    else:
        titulo = "Contáctelo de inmediato" if puntaje >= 70 else "Intente recuperarlo"
        rec = (
            f"Lleva {p.dias_sin_comprar} días sin comprar" +
            (f", {ratio:.1f} veces su ritmo habitual" if ratio is not None else "") +
            ". Está en el grupo con más probabilidad de haberse perdido."
        )
        if alto_valor:
            rec = "Es un cliente de alto valor y vale la pena el esfuerzo. " + rec
        pasos = [
            "Llámelo personalmente en vez de enviar solo un mensaje.",
            "Pregunte el motivo de la pausa: precio, servicio u otro proveedor.",
            f"Ofrezca {favorito}. Si la empresa autoriza una condición comercial, úsela; no la prometa sin confirmarla.",
            "Registre lo que responda: sirve para decidir si seguir insistiendo.",
        ]
        prioridad = "alta" if puntaje >= 70 else "media" if puntaje >= 40 else "baja"

    return Decision(prioridad, puntaje, titulo, rec, pasos, senales, confianza, aviso)
