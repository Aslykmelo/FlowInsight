import pandas as pd
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Producto, Pedido, DetallePedido
from app.schemas.upload import UploadResult
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/upload", tags=["upload"])


# Columnas obligatorias (sin ellas, no se puede procesar el archivo)
COLUMNAS_REQUERIDAS = {
    "cliente_nombre",
    "cliente_correo",
    "producto_nombre",
    "producto_precio",
    "cantidad",
}

# NUEVO: columnas opcionales — si no vienen en el Excel, simplemente se ignoran
COLUMNAS_OPCIONALES = {
    "cliente_telefono",
    "cliente_direccion",
    "cliente_autorizacion_datos",
    "producto_categoria",
    "producto_stock",
    "fecha_pedido",
}


# NUEVO: convierte el valor de la celda de fecha (texto, datetime o vacío) a un datetime real
def parsear_fecha(valor):
    if pd.isna(valor):
        return None
    if isinstance(valor, datetime):
        return valor
    try:
        return pd.to_datetime(valor).to_pydatetime()
    except Exception:
        return None


# NUEVO: convierte texto tipo "si"/"true"/"1" a booleano
def parsear_booleano(valor):
    if pd.isna(valor):
        return None
    texto = str(valor).strip().lower()
    return texto in ("si", "sí", "true", "1", "yes")


@router.post("", response_model=UploadResult)
async def cargar_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos .xlsx o .xls",
        )

    try:
        df = pd.read_excel(file.file)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="No se pudo leer el archivo Excel",
        )

    faltantes = COLUMNAS_REQUERIDAS - set(df.columns)

    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan columnas obligatorias: {', '.join(faltantes)}",
        )

    # NUEVO: qué columnas opcionales sí vinieron en este archivo
    columnas_presentes = COLUMNAS_OPCIONALES & set(df.columns)

    errores = []
    clientes_creados = 0
    productos_creados = 0
    pedidos_creados = 0
    filas_procesadas = 0

    for i, fila in df.iterrows():
        try:
            if (
                pd.isna(fila["cliente_correo"])
                or pd.isna(fila["producto_nombre"])
            ):
                errores.append(
                    f"Fila {i + 2}: faltan datos obligatorios"
                )
                continue

            cliente = (
                db.query(Cliente)
                .filter(Cliente.correo == fila["cliente_correo"])
                .first()
            )

            if not cliente:
                cliente = Cliente(
                    nombre_cliente=str(fila["cliente_nombre"]),
                    correo=str(fila["cliente_correo"]),
                    # NUEVO: campos opcionales del cliente, solo si vinieron en el archivo
                    telefono=(
                        str(fila["cliente_telefono"])
                        if "cliente_telefono" in columnas_presentes
                        and not pd.isna(fila["cliente_telefono"])
                        else None
                    ),
                    direccion=(
                        str(fila["cliente_direccion"])
                        if "cliente_direccion" in columnas_presentes
                        and not pd.isna(fila["cliente_direccion"])
                        else None
                    ),
                    autorizacion_datos=(
                        parsear_booleano(fila["cliente_autorizacion_datos"])
                        if "cliente_autorizacion_datos" in columnas_presentes
                        else None
                    ),
                    fecha_registro=datetime.now(),
                )

                db.add(cliente)
                db.flush()

                clientes_creados += 1

            producto = (
                db.query(Producto)
                .filter(
                    Producto.nombre_producto
                    == fila["producto_nombre"]
                )
                .first()
            )

            if not producto:
                producto = Producto(
                    nombre_producto=str(fila["producto_nombre"]),
                    precio=float(fila["producto_precio"]),
                    # NUEVO: campos opcionales del producto
                    categoria=(
                        str(fila["producto_categoria"])
                        if "producto_categoria" in columnas_presentes
                        and not pd.isna(fila["producto_categoria"])
                        else None
                    ),
                    stock=(
                        int(fila["producto_stock"])
                        if "producto_stock" in columnas_presentes
                        and not pd.isna(fila["producto_stock"])
                        else None
                    ),
                )

                db.add(producto)
                db.flush()

                productos_creados += 1

            cantidad = int(fila["cantidad"])
            subtotal = float(producto.precio) * cantidad

            # NUEVO: usa la fecha real del Excel si vino; si no, usa la fecha actual
            fecha_pedido = (
                parsear_fecha(fila["fecha_pedido"])
                if "fecha_pedido" in columnas_presentes
                else None
            ) or datetime.now()

            pedido = Pedido(
                id_cliente=cliente.id_cliente,
                canal="excel",
                estado_pedido="pendiente",
                total=subtotal,
                fecha_pedido=fecha_pedido,  # NUEVO
            )

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
            errores.append(
                f"Fila {i + 2}: {str(e)}"
            )

    db.commit()

    return UploadResult(
        filas_procesadas=filas_procesadas,
        filas_con_error=len(errores),
        clientes_creados=clientes_creados,
        productos_creados=productos_creados,
        pedidos_creados=pedidos_creados,
        errores=errores[:20],
    )