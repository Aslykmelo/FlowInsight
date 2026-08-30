from pydantic import BaseModel


class ProductoCreate(BaseModel):
    nombre_producto: str
    categoria: str | None = None
    precio: float
    stock: int = 0


class ProductoOut(BaseModel):
    id_producto: int
    nombre_producto: str
    categoria: str | None
    precio: float
    stock: int

    class Config:
        from_attributes = True