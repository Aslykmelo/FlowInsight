import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Producto, Pedido, DetallePedido
from app.schemas.upload import UploadResult

router = APIRouter(prefix="/upload", tags=["upload"])

# OJO: nombres de columna asumidos - ajustar cuando haya un Excel real de la empresa
COLUMNAS_REQUERIDAS = {"cliente_nombre", "cliente_correo", "producto_nombre", "producto_precio", "cantidad"}


@router.post("", response_model=UploadResult)
async def cargar_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx o .xls")

    try:
        df = pd.read_excel(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el archivo Excel")

    faltantes = COLUMNAS_REQUERIDAS - set(df.columns)
    if faltantes:
        raise HTTPException(status_code=400, detail=f"Faltan columnas obligatorias: {', '.join(faltantes)}")

    errores = []
    clientes_creados = 0
    productos_creados = 0
    pedidos_creados = 0
    filas_procesadas = 0

    for i, fila in df.iterrows():
        try:
            if pd.isna(fila["cliente_correo"]) or pd.isna(fila["producto_nombre"]):
                errores.append(f"Fila {i + 2}: faltan datos obligatorios")
                continue

            cliente = db.query(Cliente).filter(Cliente.correo == fila["cliente_correo"]).first()
            if not cliente:
                cliente = Cliente(nombre_cliente=str(fila["cliente_nombre"]), correo=str(fila["cliente_correo"]))
                db.add(cliente)
                db.flush()
                clientes_creados += 1

            producto = db.query(Producto).filter(Producto.nombre_producto == fila["producto_nombre"]).first()
            if not producto:
                producto = Producto(nombre_producto=str(fila["producto_nombre"]), precio=float(fila["producto_precio"]))
                db.add(producto)
                db.flush()
                productos_creados += 1

            cantidad = int(fila["cantidad"])
            subtotal = float(producto.precio) * cantidad

            pedido = Pedido(id_cliente=cliente.id_cliente, canal="excel", estado_pedido="pendiente", total=subtotal)
            db.add(pedido)
            db.flush()

            detalle = DetallePedido(
                id_pedido=pedido.id_pedido,
                id_producto=producto.id_producto,
                cantidad=cantidad,
                precio_unitario=producto.precio,
                subtotal=subtotal,
            )
            db.add(detalle)

            pedidos_creados += 1
            filas_procesadas += 1

        except Exception as e:
            errores.append(f"Fila {i + 2}: {str(e)}")

    db.commit()

    return UploadResult(
        filas_procesadas=filas_procesadas,
        filas_con_error=len(errores),
        clientes_creados=clientes_creados,
        productos_creados=productos_creados,
        pedidos_creados=pedidos_creados,
        errores=errores[:20],
    )