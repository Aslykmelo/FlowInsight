"""RF03/RF04 (carga ETL desde Excel) y deduplicacion por huella hash."""
import io

import pandas as pd

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _excel(filas: list[dict]) -> bytes:
    buffer = io.BytesIO()
    pd.DataFrame(filas).to_excel(buffer, index=False)
    return buffer.getvalue()


def _fila(**cambios):
    base = {
        "cliente_nombre": "Cliente Carga Prueba",
        "cliente_correo": "carga.prueba@example.com",
        "producto_nombre": "Producto Carga Prueba",
        "producto_precio": 1000,
        "cantidad": 2,
        "fecha_pedido": "2026-01-15",
    }
    base.update(cambios)
    return base


def _subir(client, headers, contenido: bytes, nombre="datos.xlsx"):
    return client.post(
        "/upload",
        files={"file": (nombre, contenido, XLSX)},
        headers=headers,
    )


def test_upload_requiere_autenticacion(client_sin_transaccion):
    res = client_sin_transaccion.post(
        "/upload",
        files={"file": ("datos.xlsx", _excel([_fila()]), XLSX)},
    )
    assert res.status_code == 401


def test_upload_rechaza_extension_no_soportada(client, headers_admin):
    res = _subir(client, headers_admin, b"a,b\n1,2", nombre="datos.txt")
    assert res.status_code == 400


def test_upload_rechaza_archivo_sin_columnas_obligatorias(client, headers_admin):
    contenido = _excel([{"cliente_nombre": "Solo nombre"}])
    res = _subir(client, headers_admin, contenido)
    assert res.status_code == 400
    assert "Faltan columnas obligatorias" in res.json()["detail"]


def test_upload_procesa_filas_validas_y_reporta_las_incompletas(client, headers_admin):
    contenido = _excel([
        _fila(),
        _fila(cliente_correo=None, cliente_nombre="Sin correo"),
    ])
    res = _subir(client, headers_admin, contenido)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["filas_procesadas"] == 1
    assert cuerpo["filas_con_error"] == 1
    assert cuerpo["pedidos_creados"] == 1


def test_upload_detecta_duplicado_dentro_del_mismo_archivo(client, headers_admin):
    contenido = _excel([_fila(), _fila()])
    res = _subir(client, headers_admin, contenido)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["filas_procesadas"] == 1
    assert cuerpo["filas_duplicadas"] == 1
    assert cuerpo["pedidos_creados"] == 1


def test_upload_detecta_duplicado_entre_cargas_distintas(client, headers_admin):
    contenido = _excel([_fila()])
    primera = _subir(client, headers_admin, contenido).json()
    segunda = _subir(client, headers_admin, contenido).json()
    assert primera["pedidos_creados"] == 1
    assert segunda["pedidos_creados"] == 0
    assert segunda["filas_duplicadas"] == 1


def test_upload_rechaza_archivos_de_mas_de_10_mb(client, headers_admin):
    contenido = b"0" * (10 * 1024 * 1024 + 1)
    res = _subir(client, headers_admin, contenido)
    assert res.status_code == 413
    assert "10 MB" in res.json()["detail"]
