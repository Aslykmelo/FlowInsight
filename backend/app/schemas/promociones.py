from pydantic import BaseModel
from typing import Literal, Optional


class ClientePromocion(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: Optional[str] = None
    dias_sin_comprar: int
    categoria: str  # "activo" | "ocasional" | "en_riesgo"
    producto_favorito: Optional[str] = None


class AccionPromocion(BaseModel):
    etiqueta: str
    url: str
    tipo: Literal["asesor", "pedido"]


class MensajePromocionOut(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: Optional[str] = None
    categoria: str
    dias_sin_comprar: int
    producto_favorito: Optional[str] = None
    mensaje: str
    link_whatsapp: Optional[str] = None
    acciones: list[AccionPromocion] = []


class EnvioCorreoIn(BaseModel):
    # "mi_correo": vista previa al correo del usuario; "cliente": al correo del cliente (si esta habilitado)
    destino: Literal["mi_correo", "cliente"] = "mi_correo"


class EnvioCorreoOut(BaseModel):
    ok: bool
    destino: str
    modo: Literal["real", "consola"]
