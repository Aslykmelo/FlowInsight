from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Pedido, DetallePedido, Producto, Usuario
from app.schemas.olap import CuboOlapOut
from app.core.dependencies import get_current_user
from app.api.promociones import categorizar

router = APIRouter(prefix="/olap", tags=["olap"])

SEGMENTOS = ["activo", "ocasional", "en_riesgo"]


# ============================================================
# CUBO OLAP: Producto x Mes x Segmento RFM
# El segmento RFM usa la misma categorizacion por recencia que
# el modulo de promociones (activo/ocasional/en_riesgo), aplicada
# al segmento ACTUAL de cada cliente sobre todo su historial de
# pedidos. Mientras no exista un modelo de IA entrenado, esta es
# la senal real disponible; el dia que PrediccionCliente tenga
# datos, se puede sustituir sin cambiar la forma del cubo.
#
# IMPORTANTE: se filtra por Cliente.autorizacion_datos == True,
# para respetar la Ley 1581 de 2012. No quitar este filtro sin
# agregar uno equivalente.
# ============================================================

@router.get("/cubo", response_model=CuboOlapOut)
def cubo_olap(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ultima_compra = (
        db.query(
            Pedido.id_cliente,
            func.max(Pedido.fecha_pedido).label("ultima_fecha"),
        )
        .group_by(Pedido.id_cliente)
        .subquery()
    )

    filas = (
        db.query(
            Producto.nombre_producto,
            func.to_char(Pedido.fecha_pedido, "YYYY-MM").label("mes"),
            ultima_compra.c.ultima_fecha,
            DetallePedido.cantidad,
            DetallePedido.subtotal,
        )
        .join(DetallePedido, DetallePedido.id_producto == Producto.id_producto)
        .join(Pedido, Pedido.id_pedido == DetallePedido.id_pedido)
        .join(ultima_compra, ultima_compra.c.id_cliente == Pedido.id_cliente)
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    ahora = datetime.utcnow()
    acumulado = defaultdict(lambda: {"ingresos": 0.0, "cantidad": 0})
    productos = set()
    meses = set()

    for nombre_producto, mes, ultima_fecha, cantidad, subtotal in filas:
        dias = (ahora - ultima_fecha).days
        segmento = categorizar(dias)
        clave = (nombre_producto, mes, segmento)
        acumulado[clave]["ingresos"] += float(subtotal or 0)
        acumulado[clave]["cantidad"] += int(cantidad or 0)
        productos.add(nombre_producto)
        meses.add(mes)

    celdas = [
        {
            "producto": producto,
            "mes": mes,
            "segmento": segmento,
            "ingresos": round(valores["ingresos"], 2),
            "cantidad": valores["cantidad"],
        }
        for (producto, mes, segmento), valores in acumulado.items()
    ]

    return {
        "productos": sorted(productos),
        "meses": sorted(meses),
        "segmentos": SEGMENTOS,
        "celdas": celdas,
    }