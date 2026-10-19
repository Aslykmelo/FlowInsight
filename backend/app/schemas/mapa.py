from typing import Optional

from pydantic import BaseModel


class VentaLocalidad(BaseModel):
    localidad: str
    lat: float
    lng: float
    total_clientes: int
    total_pedidos: int
    ingresos: float


class ProductoCliente(BaseModel):
    nombre: str
    cantidad: int
    ingresos: float


class PuntoCliente(BaseModel):
    id_cliente: int
    nombre_cliente: str
    localidad: str
    direccion: Optional[str] = None
    lat: float
    lng: float
    ubicacion_aproximada: bool = True
    pedidos: int
    ingresos: float
    dias_sin_comprar: int
    producto_principal: Optional[str] = None
    productos: list[ProductoCliente] = []


class MapaClientesOut(BaseModel):
    productos_disponibles: list[str]
    clientes: list[PuntoCliente]
    clientes_sin_autorizacion: int
