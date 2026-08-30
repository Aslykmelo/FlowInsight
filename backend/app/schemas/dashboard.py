from datetime import date
from pydantic import BaseModel


class KPIsOut(BaseModel):
    total_pedidos: int
    total_clientes: int
    ingresos_totales: float
    ticket_promedio: float
    clientes_activos: int


class VentaDiaria(BaseModel):
    fecha: date
    total_pedidos: int
    ingresos: float