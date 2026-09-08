from pydantic import BaseModel


class UploadResult(BaseModel):
    filas_procesadas: int
    filas_con_error: int
    filas_duplicadas: int 
    clientes_creados: int
    productos_creados: int
    pedidos_creados: int
    errores: list[str]