from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id_usuario: int
    nombre_usuario: str
    correo: str
    rol: str

    class Config:
        from_attributes = True