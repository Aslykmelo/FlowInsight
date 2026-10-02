from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class ReporteGenerar(BaseModel):
    tipo: str    # "ventas" | "clientes" | "riesgo" | "predicciones"
    formato: Literal["xlsx", "pdf"] = "xlsx"   # NUEVO: ahora acepta pdf también


class ReporteOut(BaseModel):
    id_reporte: int
    nombre: str | None
    tipo: str | None
    formato: str | None
    estado: str | None
    fecha: datetime | None

    class Config:
        from_attributes = True