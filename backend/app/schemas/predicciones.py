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

class ModeloInfoOut(BaseModel):
    version: str
    fecha_entrenamiento: str | None
    r2: float | None
    umbral_r2: float
    f1: float | None
    umbral_f1: float
    precision: float | None
    recall: float | None
    snapshots_total: int | None
    snapshots_entrenamiento: int | None
    snapshots_prueba: int | None
    variables: list[str]
    clientes_con_prediccion: int
    notas: str | None
