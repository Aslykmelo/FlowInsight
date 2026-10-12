"""Re-anclaje de fechas del dataset simulado (para demostraciones)."""
from datetime import date

import pandas as pd
import pytest
from sqlalchemy import text

import reanclar_fechas as ra
import train_model as tm
from app.models.models import Cliente, Pedido, PrediccionCliente, ModeloPrediccion

OBJETIVO = date(2026, 11, 6)


def _fechas_pedidos(db):
    return {i: f for i, f in db.query(Pedido.id_pedido, Pedido.fecha_pedido).all()}


def _intervalos_por_cliente(db):
    filas = db.query(Pedido.id_cliente, Pedido.fecha_pedido).order_by(Pedido.id_cliente, Pedido.fecha_pedido).all()
    out: dict = {}
    for cid, f in filas:
        out.setdefault(cid, []).append(f)
    return {c: [(b - a).days for a, b in zip(v, v[1:])] for c, v in out.items()}


def test_vista_previa_no_modifica_nada(db_session):
    antes = _fechas_pedidos(db_session)
    r = ra.ejecutar(db_session, OBJETIVO, aplicar=False)
    assert r["aplicado"] is False
    assert r["dias_desplazamiento"] == (OBJETIVO - date(2026, 8, 29)).days
    assert _fechas_pedidos(db_session) == antes


def test_el_ultimo_pedido_queda_en_la_fecha_pedida_y_el_desplazamiento_es_uniforme(db_session):
    antes = _fechas_pedidos(db_session)
    r = ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    despues = _fechas_pedidos(db_session)

    assert r["aplicado"] and r["pedidos"] == len(antes)
    assert ra.fecha_maxima(db_session) == OBJETIVO
    desplazamientos = {(despues[i] - antes[i]).days for i in antes}
    assert desplazamientos == {r["dias_desplazamiento"]}


def test_los_intervalos_entre_compras_no_cambian(db_session):
    antes = _intervalos_por_cliente(db_session)
    ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    assert _intervalos_por_cliente(db_session) == antes


def test_la_fecha_de_registro_se_desplaza_igual(db_session):
    antes = {c.id_cliente: c.fecha_registro for c in db_session.query(Cliente).all()}
    r = ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    db_session.expire_all()
    despues = {c.id_cliente: c.fecha_registro for c in db_session.query(Cliente).all()}
    assert {(despues[i] - antes[i]).days for i in antes if antes[i]} == {r["dias_desplazamiento"]}


def test_es_idempotente(db_session):
    ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    estado = _fechas_pedidos(db_session)
    r2 = ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    assert r2["dias_desplazamiento"] == 0 and r2["aplicado"] is False
    assert _fechas_pedidos(db_session) == estado


def test_se_puede_revertir_al_estado_original(db_session):
    antes = _fechas_pedidos(db_session)
    original = ra.fecha_maxima(db_session)
    ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    ra.ejecutar(db_session, original, aplicar=True, refrescar=False)
    assert _fechas_pedidos(db_session) == antes


def test_las_variables_de_entrenamiento_no_cambian(db_session):
    """Si los snapshots RFM son identicos, R2 y F1 (modelos con semilla fija) tambien lo son."""
    def dataset():
        clientes, pedidos = tm.cargar_datos(db_session)
        muestra = sorted(clientes["id_cliente"])[:60]  # basta una muestra: la propiedad es por cliente
        clientes = clientes[clientes["id_cliente"].isin(muestra)]
        pedidos = pedidos[pedidos["id_cliente"].isin(muestra)]
        df = tm.construir_snapshots(clientes, pedidos)
        return df[tm.FEATURES + ["abandono_label", "dias_hasta_proxima"]].reset_index(drop=True)

    antes = dataset()
    ra.ejecutar(db_session, OBJETIVO, aplicar=True, refrescar=False)
    despues = dataset()
    pd.testing.assert_frame_equal(antes, despues)


def test_refrescar_predicciones_reemplaza_las_del_ultimo_modelo(db_session):
    modelo = db_session.query(ModeloPrediccion).order_by(ModeloPrediccion.id_modelo.desc()).first()
    total_antes = db_session.query(PrediccionCliente).filter_by(id_modelo=modelo.id_modelo).count()
    n = ra.refrescar_predicciones(db_session, date(2026, 11, 10))
    total_despues = db_session.query(PrediccionCliente).filter_by(id_modelo=modelo.id_modelo).count()
    assert n == total_antes == total_despues
