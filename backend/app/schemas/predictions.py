from pydantic import BaseModel


class PrediccionClienteOut(BaseModel):
    id_cliente: int
    cliente: str
    ultima_compra: str
    intervalo_dias: int
    proxima_compra_estimada: str
    probabilidad_recompra: float
    riesgo_abandono: float
    riesgo: str
