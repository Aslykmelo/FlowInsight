"""Categorias de cliente por recencia (dias desde su ultima compra).

Es la unica definicion: la usan Clientes, Promociones, el cubo OLAP y el mapa, para que una misma
persona no aparezca "activa" en una pantalla y "en riesgo" en otra. Los umbrales calcan los perfiles
con que se genero el dataset: activo = compro en los ultimos 30 dias, ocasional = hasta 90 dias,
en_riesgo = mas de 90 dias sin comprar. Mientras no exista un modelo entrenado con datos reales, esta
es la senal directa y confiable; el riesgo que calcula el modelo de IA es otra cosa (ver Predicciones).
"""
from datetime import datetime
from typing import Optional

UMBRAL_ACTIVO = 30
UMBRAL_OCASIONAL = 90

CATEGORIAS = ("activo", "ocasional", "en_riesgo")


def categorizar(dias_sin_comprar: int) -> str:
    if dias_sin_comprar <= UMBRAL_ACTIVO:
        return "activo"
    if dias_sin_comprar <= UMBRAL_OCASIONAL:
        return "ocasional"
    return "en_riesgo"


def dias_sin_comprar_de(ultima_compra: Optional[datetime]) -> Optional[int]:
    """Dias completos desde la ultima compra hasta hoy (UTC); None si el cliente nunca compro."""
    if ultima_compra is None:
        return None
    return (datetime.utcnow() - ultima_compra).days
