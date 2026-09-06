from pydantic import BaseModel


class CeldaCuboOlap(BaseModel):
    producto: str
    mes: str
    segmento: str
    ingresos: float
    cantidad: int


class CuboOlapOut(BaseModel):
    productos: list[str]
    meses: list[str]
    segmentos: list[str]
    celdas: list[CeldaCuboOlap]
