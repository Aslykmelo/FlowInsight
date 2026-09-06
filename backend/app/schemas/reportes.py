from datetime import datetime
from pydantic import BaseModel


class ReporteGenerar(BaseModel):
    tipo: str   
    formato: str = "xlsx"


class ReporteOut(BaseModel):
    id_reporte: int
    nombre: str | None
    tipo: str | None
    formato: str | None
    estado: str | None
    fecha: datetime | None

    class Config:
        from_attributes = True