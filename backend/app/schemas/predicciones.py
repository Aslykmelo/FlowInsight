from pydantic import BaseModel


class CompraHistoricaOut(BaseModel):
    fecha: str
    monto: float


class PrediccionOut(BaseModel):
    id: str
    cliente: str
    ciudad: str | None
    ultima_compra: str | None
    dias_sin_comprar: int
    intervalo: int
    proxima_compra: str | None
    riesgo: str
    probabilidad: int
    historial: list[CompraHistoricaOut]