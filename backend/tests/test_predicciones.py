"""
RF31 (prediccion de riesgo de abandono y proxima compra).

Estas pruebas verifican, sobre todo, que /predicciones este realmente
leyendo el modelo de IA entrenado (RandomForestRegressor +
GradientBoostingClassifier, ver backend/train_model.py) y no solo la
formula heuristica de respaldo -- ese fue justamente el bug que se
encontro y corrigio el 1 de octubre de 2026 al fusionar el trabajo del
equipo.
"""


def test_predicciones_requiere_autenticacion(client_sin_transaccion):
    res = client_sin_transaccion.get("/predicciones")
    assert res.status_code == 401


def test_predicciones_tiene_forma_valida(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/predicciones", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    assert len(cuerpo) > 0
    for c in cuerpo[:5]:
        assert c["riesgo"] in ("bajo", "medio", "alto")
        assert 0 <= c["probabilidad"] <= 100
        assert isinstance(c["historial"], list)


def test_predicciones_usa_el_modelo_de_ml_entrenado_no_solo_la_formula(
    client_sin_transaccion, headers_admin, db_session
):
    from app.models.models import ModeloPrediccion, PrediccionCliente

    ultimo_modelo = (
        db_session.query(ModeloPrediccion)
        .order_by(ModeloPrediccion.id_modelo.desc())
        .first()
    )
    assert ultimo_modelo is not None, (
        "No hay ningun modelo entrenado en modelo_prediccion -- "
        "correr backend/train_model.py antes de esta prueba."
    )

    prediccion_ml = (
        db_session.query(PrediccionCliente)
        .filter(PrediccionCliente.id_modelo == ultimo_modelo.id_modelo)
        .first()
    )
    assert prediccion_ml is not None

    res = client_sin_transaccion.get("/predicciones", headers=headers_admin)
    cuerpo = res.json()
    fila = next((c for c in cuerpo if int(c["id"]) == prediccion_ml.id_cliente), None)
    assert fila is not None, "El cliente con prediccion ML no aparece en /predicciones"

    probabilidad_esperada = round(float(prediccion_ml.probabilidad_recompra) * 100)
    assert fila["probabilidad"] == probabilidad_esperada, (
        "La probabilidad que devuelve /predicciones no coincide con "
        "prediccion_cliente -- parece estar usando la formula heuristica "
        "de respaldo en vez del modelo real."
    )


def test_predicciones_respeta_autorizacion_de_datos(client_sin_transaccion, headers_admin, db_session):
    from app.models.models import Cliente

    sin_autorizacion = (
        db_session.query(Cliente)
        .filter(Cliente.autorizacion_datos == False)  # noqa: E712
        .first()
    )
    if sin_autorizacion is None:
        import pytest
        pytest.skip("No hay clientes sin autorizacion_datos en el dataset actual")

    res = client_sin_transaccion.get("/predicciones", headers=headers_admin)
    ids_devueltos = {int(c["id"]) for c in res.json()}
    assert sin_autorizacion.id_cliente not in ids_devueltos
