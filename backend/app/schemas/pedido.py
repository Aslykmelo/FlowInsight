from datetime import datetime
from pydantic import BaseModel


class DetallePedidoCreate(BaseModel):
    id_producto: int
    cantidad: int


class DetallePedidoOut(BaseModel):
    id_detalle: int
    id_producto: int
    cantidad: int
    precio_unitario: float
    subtotal: float

    class Config:
        from_attributes = True


class PedidoCreate(BaseModel):
    id_cliente: int
    canal: str | None = None
    detalles: list[DetallePedidoCreate]


class PedidoOut(BaseModel):
    id_pedido: int
    id_cliente: int
    fecha_pedido: datetime | None
    total: float
    estado_pedido: str
    canal: str | None
    detalles: list[DetallePedidoOut]

    class Config:
        from_attributes = True