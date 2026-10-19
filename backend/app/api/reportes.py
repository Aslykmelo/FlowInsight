import io
from datetime import datetime

import openpyxl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
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
from app.core.pdf_reportes import construir_pdf

router = APIRouter(prefix="/reports", tags=["reports"])

TIPOS_VALIDOS = {"ventas", "clientes", "riesgo", "predicciones"}

NOMBRES_TIPO = {
    "ventas": "Ventas mensuales",
    "clientes": "Historial de clientes",
    "riesgo": "Riesgo de abandono",
    "predicciones": "Predicciones ML",
}


# ============================================================
# OBTENCIÓN DE DATOS — una sola fuente de verdad por tipo de
# reporte. Tanto el Excel como el PDF usan exactamente estas
# mismas funciones, para que nunca se desincronicen entre sí.
# Cada una devuelve (encabezados, filas).
#
# IMPORTANTE: las 4 funciones filtran por
# Cliente.autorizacion_datos == True, para respetar la Ley 1581
# de 2012. No quitar este filtro sin agregar uno equivalente.
# ============================================================

def datos_ventas(db: Session):
    from sqlalchemy import func

    filas_db = (
        db.query(
            func.to_char(Pedido.fecha_pedido, "YYYY-MM").label("mes"),
            func.count(Pedido.id_pedido).label("pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .group_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .order_by(func.to_char(Pedido.fecha_pedido, "YYYY-MM"))
        .all()
    )

    headers = ["Mes", "Total pedidos", "Ingresos"]
    filas = [[f.mes, f.pedidos, float(f.ingresos or 0)] for f in filas_db]
    return headers, filas


def datos_clientes(db: Session):
    clientes = (
        db.query(Cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    headers = ["Nombre", "Teléfono", "Correo", "Ciudad", "Total pedidos", "Monto total"]
    filas = []

    for cliente in clientes:
        pedidos = [p for p in cliente.pedidos]
        total_pedidos = len(pedidos)
        monto_total = sum(float(p.total or 0) for p in pedidos)

        filas.append([
            cliente.nombre_cliente,
            cliente.telefono or "",
            cliente.correo or "",
            cliente.ciudad or "",
            total_pedidos,
            monto_total,
        ])

    return headers, filas


def datos_riesgo(db: Session):
    clientes = (
        db.query(Cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    headers = ["Cliente", "Días sin comprar", "Intervalo habitual (días)", "Categoría"]
    filas = []

    for cliente in clientes:
        pedidos = (
            db.query(Pedido)
            .filter(Pedido.id_cliente == cliente.id_cliente)
            .order_by(Pedido.fecha_pedido)
            .all()
        )

        if not pedidos:
            continue

        fechas = [p.fecha_pedido for p in pedidos if p.fecha_pedido]
        if not fechas:
            continue

        ultima_compra = fechas[-1]

        if len(fechas) >= 2:
            diffs = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
            intervalo = round(sum(diffs) / len(diffs)) if diffs else 30
        else:
            intervalo = 30

        intervalo = max(intervalo, 1)
        dias_sin_comprar = (datetime.now() - ultima_compra).days
        ratio = dias_sin_comprar / intervalo

        if ratio <= 1.2:
            categoria = "Bajo"
        elif ratio <= 2:
            categoria = "Medio"
        else:
            categoria = "Alto"

        filas.append([cliente.nombre_cliente, dias_sin_comprar, intervalo, categoria])

    return headers, filas


def datos_predicciones(db: Session):
    from app.api.predicciones import listar_predicciones

    predicciones = listar_predicciones(db=db, usuario=None)

    headers = ["Cliente", "Días sin comprar", "Próxima compra estimada", "Riesgo", "Probabilidad de retención"]
    filas = [
        [p.cliente, p.dias_sin_comprar, p.proxima_compra or "", p.riesgo, p.probabilidad]
        for p in predicciones
    ]

    return headers, filas


DATOS_POR_TIPO = {
    "ventas": datos_ventas,
    "clientes": datos_clientes,
    "riesgo": datos_riesgo,
    "predicciones": datos_predicciones,
}


# ============================================================
# CONSTRUCTORES DE ARCHIVO — generan el contenido en memoria. No se
# guarda nada en disco: el servidor (Railway) tiene un sistema de
# archivos temporal que se borra en cada despliegue, asi que cada
# descarga vuelve a construir el archivo con los datos actuales.
# ============================================================

def construir_excel(titulo: str, headers: list[str], filas: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = titulo[:31]  # Excel limita el nombre de hoja a 31 caracteres

    ws.append(headers)
    for fila in filas:
        ws.append(fila)

    relleno = PatternFill("solid", fgColor="534AB7")
    for celda in ws[1]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = relleno
        celda.alignment = Alignment(horizontal="center", vertical="center")
    ws.freeze_panes = "A2"
    if filas:
        ws.auto_filter.ref = ws.dimensions
    for i, _ in enumerate(headers, start=1):
        ancho = max(len(str(c.value)) if c.value is not None else 0 for c in ws[get_column_letter(i)])
        ws.column_dimensions[get_column_letter(i)].width = min(max(ancho + 3, 12), 48)
        for c in ws[get_column_letter(i)][1:]:
            if isinstance(c.value, float):
                c.number_format = "#,##0.00"

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def construir_archivo(db: Session, tipo: str, formato: str, usuario) -> bytes:
    titulo = NOMBRES_TIPO[tipo]
    headers, filas = DATOS_POR_TIPO[tipo](db)
    if formato == "pdf":
        return construir_pdf(tipo, titulo, headers, filas, getattr(usuario, "nombre_usuario", "FlowInsight"))
    return construir_excel(titulo, headers, filas)


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

    # Se construye una vez para confirmar que el reporte se puede generar antes de registrarlo.
    try:
        construir_archivo(db, datos.tipo, datos.formato, usuario)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al construir el reporte: {str(e)}")

    titulo = NOMBRES_TIPO[datos.tipo]
    reporte = ReporteGenerado(
        id_usuario=usuario.id_usuario,
        fecha=datetime.now(),
        formato=datos.formato,
        estado="listo",
        nombre=f"{titulo} - {datetime.now().strftime('%d-%m-%Y')}",
        tipo=datos.tipo,
        archivo_path=None,
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

    if not reporte or reporte.tipo not in TIPOS_VALIDOS or reporte.formato not in ("pdf", "xlsx"):
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    try:
        contenido = construir_archivo(db, reporte.tipo, reporte.formato, usuario)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al construir el reporte: {str(e)}")

    media_type = (
        "application/pdf"
        if reporte.formato == "pdf"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    nombre = f"FlowInsight_{reporte.tipo}_{reporte.fecha.strftime('%Y%m%d')}.{reporte.formato}"

    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
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

    db.delete(reporte)
    db.commit()
    return {"ok": True}
