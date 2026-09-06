from pydantic import BaseModel
from typing import Optional


class ClientePromocion(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: Optional[str] = None
    dias_sin_comprar: int
    categoria: str  # "activo" | "ocasional" | "en_riesgo"
    producto_favorito: Optional[str] = None


class MensajePromocionOut(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: Optional[str] = None
    categoria: str
    dias_sin_comprar: int
    producto_favorito: Optional[str] = None
    mensaje: str
    link_whatsapp: Optional[str] = None
