"""Generacion y descarga de reportes (Excel y PDF), sin depender del disco del servidor."""
import io

import openpyxl
import pytest

TIPOS = ["ventas", "clientes", "riesgo", "predicciones"]


@pytest.mark.parametrize("tipo", TIPOS)
@pytest.mark.parametrize("formato", ["xlsx", "pdf"])
def test_generar_y_descargar_reporte(client, headers_admin, tipo, formato):
    res = client.post("/reports/generate", json={"tipo": tipo, "formato": formato}, headers=headers_admin)
    assert res.status_code == 200
    reporte = res.json()
    assert reporte["estado"] == "listo"

    d = client.get(f"/reports/{reporte['id_reporte']}/download", headers=headers_admin)
    assert d.status_code == 200
    assert "attachment" in d.headers["content-disposition"]
    if formato == "pdf":
        assert d.content.startswith(b"%PDF-") and len(d.content) > 3000
    else:
        ws = openpyxl.load_workbook(io.BytesIO(d.content)).active
        assert ws.max_row > 1


def test_el_reporte_no_depende_de_un_archivo_en_disco(client, headers_admin, db_session):
    from app.models.models import ReporteGenerado

    res = client.post("/reports/generate", json={"tipo": "ventas", "formato": "pdf"}, headers=headers_admin)
    id_reporte = res.json()["id_reporte"]
    assert db_session.get(ReporteGenerado, id_reporte).archivo_path is None
    # Equivale a un reinicio de Railway: no hay ningun archivo y la descarga igual funciona.
    assert client.get(f"/reports/{id_reporte}/download", headers=headers_admin).status_code == 200


def test_el_pdf_trae_indicadores_graficos_y_detalle(client, headers_admin):
    pypdf = pytest.importorskip("pypdf")
    res = client.post("/reports/generate", json={"tipo": "ventas", "formato": "pdf"}, headers=headers_admin)
    d = client.get(f"/reports/{res.json()['id_reporte']}/download", headers=headers_admin)
    lector = pypdf.PdfReader(io.BytesIO(d.content))
    texto = "\n".join(p.extract_text() or "" for p in lector.pages)
    assert "Hallazgos principales" in texto and "Visualización" in texto and "Detalle" in texto
    assert len(lector.pages) >= 2


def test_reporte_inexistente_devuelve_404(client, headers_admin):
    assert client.get("/reports/99999999/download", headers=headers_admin).status_code == 404


def test_tipo_invalido_devuelve_400(client, headers_admin):
    res = client.post("/reports/generate", json={"tipo": "otro", "formato": "pdf"}, headers=headers_admin)
    assert res.status_code == 400
