from datetime import datetime

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id_usuario: int
    nombre_usuario: str
    correo: str
    rol: str
    telefono: str | None = None
    estado: str | None = None
    ultima_sesion: datetime | None = None

    class Config:
        from_attributes = True


class PerfilUpdate(BaseModel):
    nombre_usuario: str | None = Field(default=None, min_length=2, max_length=100)
    telefono: str | None = None


class CambiarContrasenaIn(BaseModel):
    contrasena_actual: str
    nueva_contrasena: str = Field(min_length=8, max_length=128)


class ForgotPasswordIn(BaseModel):
    correo: str


class ResetPasswordIn(BaseModel):
    correo: str
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    nueva_contrasena: str = Field(min_length=8, max_length=128)


class MensajeOut(BaseModel):
    mensaje: str


class ReporteReciente(BaseModel):
    id_reporte: int
    nombre: str | None = None
    tipo: str | None = None
    formato: str | None = None
    fecha: datetime | None = None


class ActividadOut(BaseModel):
    reportes_generados: int
    reportes_por_formato: dict[str, int]
    reportes_recientes: list[ReporteReciente]
    ultima_sesion: datetime | None = None
