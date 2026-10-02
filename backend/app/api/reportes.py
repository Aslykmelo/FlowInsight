import os
from datetime import datetime

import openpyxl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

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
# CONSTRUCTORES DE ARCHIVO — reciben (encabezados, filas) ya
# listos y solo se encargan del formato de salida.
# ============================================================

def construir_excel(ruta: str, titulo: str, headers: list[str], filas: list[list]):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = titulo[:31]  # Excel limita el nombre de hoja a 31 caracteres

    ws.append(headers)
    for fila in filas:
        ws.append(fila)

    wb.save(ruta)


def construir_pdf(ruta: str, titulo: str, headers: list[str], filas: list[list]):
    doc = SimpleDocTemplate(
        ruta,
        pagesize=landscape(letter),
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )

    estilos = getSampleStyleSheet()
    elementos = [
        Paragraph(titulo, estilos["Title"]),
        Paragraph(f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}", estilos["Normal"]),
        Spacer(1, 16),
    ]

    if not filas:
        elementos.append(Paragraph("No hay datos disponibles para este reporte.", estilos["Normal"]))
    else:
        # Convierte todo a texto para que la tabla de reportlab no falle con tipos numéricos
        tabla_datos = [headers] + [[str(celda) for celda in fila] for fila in filas]

        tabla = Table(tabla_datos, repeatRows=1)
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#534AB7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla)

    doc.build(elementos)


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

    titulo = NOMBRES_TIPO[datos.tipo]

    try:
        headers, filas = DATOS_POR_TIPO[datos.tipo](db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los datos del reporte: {str(e)}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"{datos.tipo}_{timestamp}.{datos.formato}"
    ruta_archivo = os.path.join(CARPETA_REPORTES, nombre_archivo)

    try:
        if datos.formato == "pdf":
            construir_pdf(ruta_archivo, titulo, headers, filas)
        else:
            construir_excel(ruta_archivo, titulo, headers, filas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al construir el archivo: {str(e)}")

    nombre_visible = f"{titulo} - {datetime.now().strftime('%d/%m/%Y')}"

    reporte = ReporteGenerado(
        id_usuario=usuario.id_usuario,
        fecha=datetime.now(),
        formato=datos.formato,
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

    if not reporte or not reporte.archivo_path:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if not os.path.exists(reporte.archivo_path):
        raise HTTPException(status_code=404, detail="El archivo del reporte ya no existe")

    media_type = (
        "application/pdf"
        if reporte.formato == "pdf"
        else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    return FileResponse(
        path=reporte.archivo_path,
        filename=os.path.basename(reporte.archivo_path),
        media_type=media_type,
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

    if reporte.archivo_path and os.path.exists(reporte.archivo_path):
        os.remove(reporte.archivo_path)

    db.delete(reporte)
    db.commit()

    return {"mensaje": "Reporte eliminado correctamente"}