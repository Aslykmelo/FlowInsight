import io

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Pedido, Cliente, DetallePedido, Producto, PrediccionCliente, ReporteGenerado
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reportes"])

TIPOS_VALIDOS = {"ventas-mensuales", "clientes", "riesgo-abandono"}


def construir_dataframe(tipo: str, db: Session) -> pd.DataFrame:
    if tipo == "ventas-mensuales":
        filas = (
            db.query(Pedido, Cliente.nombre_cliente)
            .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
            .all()
        )
        return pd.DataFrame([
            {
                "id_pedido": p.id_pedido,
                "cliente": nombre,
                "fecha": p.fecha_pedido,
                "canal": p.canal,
                "estado": p.estado_pedido,
                "total": float(p.total),
            }
            for p, nombre in filas
        ])

    if tipo == "clientes":
        clientes = db.query(Cliente).all()
        return pd.DataFrame([
            {
                "id_cliente": c.id_cliente,
                "nombre": c.nombre_cliente,
                "correo": c.correo,
                "telefono": c.telefono,
                "fecha_registro": c.fecha_registro,
                "autorizacion_datos": c.autorizacion_datos,
            }
            for c in clientes
        ])

    if tipo == "riesgo-abandono":
        filas = (
            db.query(PrediccionCliente, Cliente.nombre_cliente)
            .join(Cliente, PrediccionCliente.id_cliente == Cliente.id_cliente)
            .all()
        )
        return pd.DataFrame([
            {
                "cliente": nombre,
                "probabilidad_recompra": float(pr.probabilidad_recompra or 0),
                "riesgo_abandono": float(pr.riesgo_abandono or 0),
                "fecha_prediccion": pr.fecha_prediccion,
            }
            for pr, nombre in filas
        ])

    raise HTTPException(status_code=404, detail=f"Tipo de reporte desconocido: {tipo}")


@router.get("/{tipo}/download")
def descargar_reporte(
    tipo: str,
    format: str = "xlsx",
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=404,
            detail=f"Tipo de reporte invalido. Usa uno de: {', '.join(TIPOS_VALIDOS)}",
        )

    if format != "xlsx":
        raise HTTPException(status_code=400, detail="Por ahora solo se soporta formato xlsx")

    df = construir_dataframe(tipo, db)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=tipo[:31])
    buffer.seek(0)

    log = ReporteGenerado(
        id_usuario=usuario_actual.id_usuario,
        formato="xlsx",
        estado="generado",
    )
    db.add(log)
    db.commit()

    nombre_archivo = f"{tipo}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )
