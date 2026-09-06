import os
from datetime import datetime

import openpyxl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    ReporteGenerado,
    Pedido,
    Cliente,
    PrediccionCliente,
)
from app.schemas.reportes import ReporteGenerar, ReporteOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

# Carpeta donde se guardan los archivos generados
CARPETA_REPORTES = "generated_reports"
os.makedirs(CARPETA_REPORTES, exist_ok=True)

TIPOS_VALIDOS = {"ventas", "clientes", "riesgo", "predicciones"}

NOMBRES_TIPO = {
    "ventas": "Ventas mensuales",
    "clientes": "Historial de clientes",
    "riesgo": "Riesgo de abandono",
    "predicciones": "Predicciones ML",
}


# ============================================================
# CONSTRUCTORES DE CADA TIPO DE REPORTE
# ============================================================

def construir_reporte_ventas(db: Session, wb: openpyxl.Workbook):
    from sqlalchemy import func

    ws = wb.active
    ws.title = "Ventas mensuales"
    ws.append(["Mes", "Total pedidos", "Ingresos"])

    filas = (
        db.query(
            func.to_char(Pedido.fecha_pedido, "YYYY-MM").label("mes"),
            func.count(Pedido.id_pedido).label("pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .group_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .order_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .all()
    )

    for fila in filas:
        ws.append([fila.mes, fila.pedidos, float(fila.ingresos or 0)])

    from sqlalchemy import func

    filas = (
        db.query(
            func.to_char(Pedido.fecha_pedido, "YYYY-MM").label("mes"),
            func.count(Pedido.id_pedido).label("pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .group_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .order_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .all()
    )

    for fila in filas:
        ws.append([fila.mes, fila.pedidos, float(fila.ingresos or 0)])


def construir_reporte_clientes(db: Session, wb: openpyxl.Workbook):
    ws = wb.active
    ws.title = "Clientes"
    ws.append(["Nombre", "Teléfono", "Correo", "Ciudad", "Total pedidos", "Monto total"])

    clientes = db.query(Cliente).all()

    for cliente in clientes:
        pedidos = [p for p in cliente.pedidos]
        total_pedidos = len(pedidos)
        monto_total = sum(float(p.total or 0) for p in pedidos)

        ws.append([
            cliente.nombre_cliente,
            cliente.telefono or "",
            cliente.correo or "",
            cliente.ciudad or "",
            total_pedidos,
            monto_total,
        ])


def construir_reporte_riesgo(db: Session, wb: openpyxl.Workbook):
    ws = wb.active
    ws.title = "Riesgo de abandono"
    ws.append(["Cliente", "Riesgo de abandono", "Categoría"])

    predicciones = (
        db.query(PrediccionCliente, Cliente)
        .join(Cliente, Cliente.id_cliente == PrediccionCliente.id_cliente)
        .all()
    )

    for prediccion, cliente in predicciones:
        riesgo = float(prediccion.riesgo_abandono or 0)
        if riesgo <= 0.30:
            categoria = "Bajo"
        elif riesgo <= 0.60:
            categoria = "Medio"
        else:
            categoria = "Alto"

        ws.append([cliente.nombre_cliente, riesgo, categoria])


def construir_reporte_predicciones(db: Session, wb: openpyxl.Workbook):
    ws = wb.active
    ws.title = "Predicciones ML"
    ws.append(["Cliente", "Probabilidad de recompra", "Riesgo de abandono", "Fecha de predicción"])

    predicciones = (
        db.query(PrediccionCliente, Cliente)
        .join(Cliente, Cliente.id_cliente == PrediccionCliente.id_cliente)
        .all()
    )

    for prediccion, cliente in predicciones:
        ws.append([
            cliente.nombre_cliente,
            float(prediccion.probabilidad_recompra or 0),
            float(prediccion.riesgo_abandono or 0),
            prediccion.fecha_prediccion.strftime("%Y-%m-%d") if prediccion.fecha_prediccion else "",
        ])


CONSTRUCTORES = {
    "ventas": construir_reporte_ventas,
    "clientes": construir_reporte_clientes,
    "riesgo": construir_reporte_riesgo,
    "predicciones": construir_reporte_predicciones,
}


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("", response_model=list[ReporteOut])
def listar_reportes(
    db: Session = Depends(get_db),
    usuario: dict = Depends(get_current_user),
):
    return (
        db.query(ReporteGenerado)
        .order_by(ReporteGenerado.fecha.desc())
        .all()
    )


@router.post("/generate", response_model=ReporteOut)
def generar_reporte(
    datos: ReporteGenerar,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    if datos.tipo not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de reporte inválido. Usa uno de: {', '.join(TIPOS_VALIDOS)}",
        )

    wb = openpyxl.Workbook()

    try:
        CONSTRUCTORES[datos.tipo](db, wb)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al construir el reporte: {str(e)}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"{datos.tipo}_{timestamp}.xlsx"
    ruta_archivo = os.path.join(CARPETA_REPORTES, nombre_archivo)
    wb.save(ruta_archivo)

    nombre_visible = f"{NOMBRES_TIPO[datos.tipo]} - {datetime.now().strftime('%d/%m/%Y')}"

    reporte = ReporteGenerado(
        id_usuario=usuario.id_usuario,
        fecha=datetime.now(),
        formato="xlsx",
        estado="listo",
        nombre=nombre_visible,
        tipo=datos.tipo,
        archivo_path=ruta_archivo,
    )

    db.add(reporte)
    db.commit()
    db.refresh(reporte)

    return reporte


@router.get("/{id_reporte}/download")
def descargar_reporte(
    id_reporte: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    reporte = (
        db.query(ReporteGenerado)
        .filter(ReporteGenerado.id_reporte == id_reporte)
        .first()
    )

@router.delete("/{id_reporte}")
def eliminar_reporte(
    id_reporte: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    reporte = (
        db.query(ReporteGenerado)
        .filter(ReporteGenerado.id_reporte == id_reporte)
        .first()
    )

    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    # Borra el archivo físico si todavía existe
    if reporte.archivo_path and os.path.exists(reporte.archivo_path):
        os.remove(reporte.archivo_path)

    db.delete(reporte)
    db.commit()

    return {"mensaje": "Reporte eliminado correctamente"}
    
    if not reporte or not reporte.archivo_path:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if not os.path.exists(reporte.archivo_path):
        raise HTTPException(status_code=404, detail="El archivo del reporte ya no existe")

    return FileResponse(
        path=reporte.archivo_path,
        filename=os.path.basename(reporte.archivo_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )