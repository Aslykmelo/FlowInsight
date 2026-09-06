from datetime import datetime
from pydantic import BaseModel

class ClienteCreate(BaseModel):
    nombre_cliente: str
    telefono: str | None = None
    correo: str | None = None
    direccion: str | None = None
    ciudad: str | None = None
    localidad: str | None = None
    autorizacion_datos: bool = False


class ClienteOut(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: str | None
    correo: str | None
    direccion: str | None
    ciudad: str | None
    localidad: str | None
    fecha_registro: datetime | None
    autorizacion_datos: bool

    class Config:
        from_attributes = True


class ClienteResumen(BaseModel):
    id_cliente: int
    nombre_cliente: str
    telefono: str | None
    correo: str | None
    direccion: str | None
    ciudad: str | None
    localidad: str | None
    total_pedidos: int
    monto_total: float
    ultima_compra: datetime | None
    intervalo_promedio: int | None
    estado: str

    class Config:
        from_attributes = True