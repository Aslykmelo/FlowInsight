from datetime import datetime
from pydantic import BaseModel


class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    rol: str  # "Administrador" | "Analista"
    password: str


class UsuarioUpdate(BaseModel):
    nombre: str
    email: str
    rol: str
    password: str | None = None


class EstadoUpdate(BaseModel):
    estado: str  # "activo" | "inactivo"


class UsuarioOut(BaseModel):
    id_usuario: int
    nombre: str
    email: str
    rol: str
    estado: str
    ultima_sesion: datetime | None

    class Config:
        from_attributes = True