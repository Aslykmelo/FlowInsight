from pydantic import BaseModel


class KPIsOut(BaseModel):
    total_pedidos: int
    total_clientes: int
    ingresos_totales: float
    ticket_promedio: float
    clientes_activos: int


class VentaDiaria(BaseModel):
    fecha: str
    total_pedidos: int
    ingresos: float


class RiesgoAbandonoOut(BaseModel):
    bajo_riesgo: int
    riesgo_medio: int
    alto_riesgo: int