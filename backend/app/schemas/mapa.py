from pydantic import BaseModel


class VentaLocalidad(BaseModel):
    localidad: str
    lat: float
    lng: float
    total_clientes: int
    total_pedidos: int
    ingresos: float
