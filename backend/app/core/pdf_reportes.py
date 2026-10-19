"""PDF de reportes de FlowInsight: encabezado de marca, indicadores, hallazgos calculados con los datos,
graficos y tabla de detalle. Todo se genera en memoria."""
import io
from datetime import datetime
from statistics import median

from reportlab.graphics.charts.barcharts import HorizontalBarChart, VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

MORADO = colors.HexColor("#534AB7")
MORADO_CLARO = colors.HexColor("#EEEDFE")
TINTA = colors.HexColor("#1B2430")
APAGADO = colors.HexColor("#5B6472")
BORDE = colors.HexColor("#DCE0E6")
ROJO = colors.HexColor("#B3261E")
AMBAR = colors.HexColor("#C98A1B")
VERDE = colors.HexColor("#276B49")
COLOR_RIESGO = {"alto": ROJO, "medio": AMBAR, "bajo": VERDE}

_estilos = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=_estilos["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24,
                    textColor=TINTA, spaceAfter=4)
H2 = ParagraphStyle("H2", parent=_estilos["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16,
                    textColor=MORADO, spaceBefore=14, spaceAfter=6)
CUERPO = ParagraphStyle("Cuerpo", parent=_estilos["Normal"], fontName="Helvetica", fontSize=10, leading=14,
                        textColor=TINTA, alignment=TA_LEFT)
PEQUENO = ParagraphStyle("Pequeno", parent=CUERPO, fontSize=8.5, leading=11, textColor=APAGADO)
VIÑETA = ParagraphStyle("Vineta", parent=CUERPO, leftIndent=14, bulletIndent=2, spaceAfter=3)


def _num(valor, decimales=0) -> str:
    texto = f"{float(valor):,.{decimales}f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def _plata(valor) -> str:
    return "$ " + _num(valor)


class _LienzoNumerado(rl_canvas.Canvas):
    """Canvas que pone 'Pagina X de Y' en el pie de cada hoja."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._paginas = []

    def showPage(self):
        self._paginas.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._paginas)
        for estado in self._paginas:
            self.__dict__.update(estado)
            self._pie(total)
            super().showPage()
        super().save()

    def _pie(self, total):
        ancho, _ = letter
        self.setStrokeColor(BORDE)
        self.line(2 * cm, 1.6 * cm, ancho - 2 * cm, 1.6 * cm)
        self.setFont("Helvetica", 8)
        self.setFillColor(APAGADO)
        self.drawString(2 * cm, 1.1 * cm, "FlowInsight · W&T Food S.A.S.")
        self.drawRightString(ancho - 2 * cm, 1.1 * cm, f"Página {self._pageNumber} de {total}")


def _tarjetas(items: list[tuple[str, str]]) -> Table:
    """Fila de indicadores: [(etiqueta, valor), ...]."""
    celdas = [[Paragraph(f'<font size="8" color="#5B6472">{e.upper()}</font><br/>'
                         f'<font size="{14 if len(v) > 12 else 16}" color="#1B2430"><b>{v}</b></font>', CUERPO) for e, v in items]]
    t = Table(celdas, colWidths=[(letter[0] - 4 * cm) / len(items)] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MORADO_CLARO),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDE),
        ("INNERGRID", (0, 0), (-1, -1), 2, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def _hallazgos(lineas: list[str]) -> list:
    return [Paragraph("Hallazgos principales", H2)] + [Paragraph(l, VIÑETA, bulletText="•") for l in lineas]


def _grafico_barras(titulo: str, etiquetas: list[str], valores: list[float], horizontal=False,
                    alto=170, formato=lambda v: _num(v)) -> Drawing:
    ancho = letter[0] - 4 * cm
    d = Drawing(ancho, alto + 24)
    d.add(String(0, alto + 10, titulo, fontName="Helvetica-Bold", fontSize=10, fillColor=TINTA))
    chart = HorizontalBarChart() if horizontal else VerticalBarChart()
    chart.x, chart.y = (110 if horizontal else 38), 18
    chart.width = ancho - (130 if horizontal else 48)
    chart.height = alto - 12
    chart.data = [valores]
    chart.bars[0].fillColor = MORADO
    chart.bars.strokeColor = None
    chart.categoryAxis.categoryNames = etiquetas
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.strokeColor = BORDE
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labelTextFormat = lambda v: formato(v)
    chart.valueAxis.strokeColor = BORDE
    chart.valueAxis.gridStrokeColor = colors.HexColor("#ECEEF2")
    chart.valueAxis.visibleGrid = True
    chart.valueAxis.valueMin = 0
    if not horizontal and len(etiquetas) > 8:
        chart.categoryAxis.labels.angle = 45
        chart.categoryAxis.labels.dy = -14
        chart.categoryAxis.labels.boxAnchor = "ne"
    d.add(chart)
    return d


def _grafico_pastel(titulo: str, partes: list[tuple[str, float, colors.Color]]) -> Drawing:
    ancho = letter[0] - 4 * cm
    d = Drawing(ancho, 150)
    d.add(String(0, 138, titulo, fontName="Helvetica-Bold", fontSize=10, fillColor=TINTA))
    total = sum(v for _, v, _ in partes) or 1
    pie = Pie()
    pie.x, pie.y, pie.width, pie.height = 10, 8, 115, 115
    pie.data = [v for _, v, _ in partes]
    pie.labels = None
    pie.sideLabels = False
    pie.slices.strokeColor = colors.white
    pie.slices.strokeWidth = 1.5
    for i, (_, _, c) in enumerate(partes):
        pie.slices[i].fillColor = c
    d.add(pie)
    y = 105
    for nombre, valor, c in partes:
        d.add(String(160, y, f"■ {nombre}: {_num(valor)} ({valor / total * 100:.0f} %)",
                     fontName="Helvetica", fontSize=9, fillColor=c if c != colors.white else TINTA))
        y -= 18
    return d


def _tabla(headers: list[str], filas: list[list], columnas_numericas: set[int], anchos=None) -> Table:
    datos = [headers]
    for f in filas:
        datos.append([_num(c) if (i in columnas_numericas and isinstance(c, (int, float))) else str(c)
                      for i, c in enumerate(f)])
    t = Table(datos, repeatRows=1, colWidths=anchos)
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), MORADO), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F8FA")]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for c in columnas_numericas:
        estilo.append(("ALIGN", (c, 0), (c, -1), "RIGHT"))
    t.setStyle(TableStyle(estilo))
    return t


# ----------------------------------------------------------------------------- analisis por tipo
def _ventas(filas):
    meses = [f[0] for f in filas]
    pedidos = [f[1] for f in filas]
    ingresos = [f[2] for f in filas]
    if not filas:
        return [], [], []
    total, n_ped = sum(ingresos), sum(pedidos)
    i_max = max(range(len(ingresos)), key=ingresos.__getitem__)
    kpis = [("Ingresos totales", _plata(total)), ("Pedidos", _num(n_ped)),
            ("Mejor mes", f"{meses[i_max]}"), ("Promedio mensual", _plata(total / len(filas)))]
    hallazgos = [f"El mes con más ingresos fue <b>{meses[i_max]}</b>, con {_plata(ingresos[i_max])}."]
    if len(ingresos) >= 12:
        recientes, previos = sum(ingresos[-6:]), sum(ingresos[-12:-6])
        if previos:
            var = (recientes / previos - 1) * 100
            hallazgos.append(f"Los últimos 6 meses sumaron {_plata(recientes)}, "
                             f"{'un aumento' if var >= 0 else 'una disminución'} de {abs(var):.1f} % frente a los 6 meses previos.")
    hallazgos.append(f"El ticket promedio del periodo fue {_plata(total / n_ped)} por pedido." if n_ped else "")
    ult = filas[-18:]
    grafico = _grafico_barras("Ingresos por mes (últimos 18 meses)", [f[0] for f in ult], [f[2] for f in ult],
                              formato=lambda v: _num(v / 1_000_000, 0) + " M")
    return kpis, [h for h in hallazgos if h], [grafico]


def _clientes(filas):
    if not filas:
        return [], [], []
    monto_total = sum(f[5] for f in filas)
    ped_total = sum(f[4] for f in filas)
    orden = sorted(filas, key=lambda f: f[5], reverse=True)
    top = orden[:10]
    concentracion = sum(f[5] for f in top) / monto_total * 100 if monto_total else 0
    kpis = [("Clientes", _num(len(filas))), ("Pedidos", _num(ped_total)),
            ("Monto total", _plata(monto_total)), ("Monto por cliente", _plata(monto_total / len(filas)))]
    hallazgos = [
        f"Los 10 clientes con mayor compra concentran el <b>{concentracion:.1f} %</b> del monto total.",
        f"El cliente con mayor monto es <b>{orden[0][0]}</b>, con {_plata(orden[0][5])} en {orden[0][4]} pedidos.",
        f"La mediana de pedidos por cliente es {median(f[4] for f in filas):.0f}.",
    ]
    grafico = _grafico_barras("Top 10 clientes por monto comprado", [f[0][:20] for f in top][::-1],
                              [f[5] for f in top][::-1], horizontal=True, alto=220,
                              formato=lambda v: _num(v / 1_000_000, 0) + " M")
    return kpis, hallazgos, [grafico]


def _riesgo_por_nivel(filas, col):
    conteo = {"alto": 0, "medio": 0, "bajo": 0}
    for f in filas:
        conteo[str(f[col]).lower()] = conteo.get(str(f[col]).lower(), 0) + 1
    return conteo


def _riesgo(filas):
    if not filas:
        return [], [], []
    c = _riesgo_por_nivel(filas, 3)
    n = len(filas)
    dias = [f[1] for f in filas]
    kpis = [("Clientes analizados", _num(n)), ("Riesgo alto", _num(c["alto"])),
            ("Riesgo medio", _num(c["medio"])), ("Riesgo bajo", _num(c["bajo"]))]
    hallazgos = [
        f"<b>{c['alto'] / n * 100:.0f} %</b> de los clientes está en riesgo alto: llevan más del doble de su intervalo habitual sin comprar.",
        f"La mediana de días sin comprar es {median(dias):.0f}.",
        "Los clientes en riesgo alto deben priorizarse en las acciones de recuperación (módulo Promociones).",
    ]
    pastel = _grafico_pastel("Distribución por nivel de riesgo",
                             [("Alto", c["alto"], ROJO), ("Medio", c["medio"], AMBAR), ("Bajo", c["bajo"], VERDE)])
    return kpis, hallazgos, [pastel]


def _predicciones(filas):
    if not filas:
        return [], [], []
    c = _riesgo_por_nivel(filas, 3)
    n = len(filas)
    probs = [f[4] for f in filas]
    kpis = [("Clientes con predicción", _num(n)), ("Retención promedio", f"{sum(probs) / n:.0f} %"),
            ("Riesgo alto", _num(c["alto"])), ("Riesgo bajo", _num(c["bajo"]))]
    hallazgos = [
        f"La probabilidad de retención promedio estimada por el modelo es de <b>{sum(probs) / n:.0f} %</b>.",
        f"{c['alto']} clientes quedaron en riesgo alto de abandono y {c['medio']} en riesgo medio.",
        "El modelo es una señal de apoyo: su precisión actual es limitada (ver la pantalla Cómo funciona).",
    ]
    rangos = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 101)]
    cuentas = [sum(1 for p in probs if a <= p < b) for a, b in rangos]
    hist = _grafico_barras("Clientes por rango de probabilidad de retención", ["0-20 %", "20-40 %", "40-60 %", "60-80 %", "80-100 %"],
                           cuentas, alto=140)
    pastel = _grafico_pastel("Distribución por nivel de riesgo",
                             [("Alto", c["alto"], ROJO), ("Medio", c["medio"], AMBAR), ("Bajo", c["bajo"], VERDE)])
    return kpis, hallazgos, [pastel, hist]


ANALISIS = {"ventas": _ventas, "clientes": _clientes, "riesgo": _riesgo, "predicciones": _predicciones}
NUMERICAS = {"ventas": {1, 2}, "clientes": {4, 5}, "riesgo": {1, 2}, "predicciones": {1, 4}}
ANCHOS = {
    "clientes": [4.2 * cm, 2.6 * cm, 4.4 * cm, 1.9 * cm, 1.9 * cm, 2.0 * cm],
    "ventas": [5 * cm, 5 * cm, 6.5 * cm],
}


def construir_pdf(tipo: str, titulo: str, headers: list[str], filas: list[list], generado_por: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=1.8 * cm, bottomMargin=2.2 * cm, title=titulo, author="FlowInsight")
    ahora = datetime.now()

    banda = Table([[Paragraph('<font color="white" size="15"><b>FlowInsight</b></font><br/>'
                              '<font color="#D9D6F3" size="9">W&amp;T Food S.A.S. · Análisis de clientes</font>', CUERPO)]],
                  colWidths=[letter[0] - 4 * cm])
    banda.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), MORADO), ("LEFTPADDING", (0, 0), (-1, -1), 14),
                               ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))

    kpis, hallazgos, graficos = ANALISIS[tipo](filas)
    historia = [banda, Spacer(1, 16), Paragraph(titulo, H1),
                Paragraph(f"Generado por {generado_por} el {ahora.strftime('%d/%m/%Y a las %H:%M')}. "
                          "Incluye solo clientes con autorización de tratamiento de datos (Ley 1581 de 2012).", PEQUENO),
                Spacer(1, 12)]
    if filas:
        historia += [_tarjetas(kpis), *_hallazgos(hallazgos), Paragraph("Visualización", H2)]
        for g in graficos:
            historia += [KeepTogether([g]), Spacer(1, 6)]
        historia += [PageBreak(), Paragraph("Detalle", H2),
                     Paragraph(f"{_num(len(filas))} registros.", PEQUENO), Spacer(1, 6),
                     _tabla(headers, filas, NUMERICAS[tipo], ANCHOS.get(tipo))]
    else:
        historia.append(Paragraph("No hay datos disponibles para este reporte.", CUERPO))

    doc.build(historia, canvasmaker=_LienzoNumerado)
    return buffer.getvalue()
