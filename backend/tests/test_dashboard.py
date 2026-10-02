"""RF13/RF14 (dashboard y KPIs) y los modulos agregados: mapa de Bogota, OLAP."""


def test_kpis_requiere_autenticacion(client_sin_transaccion):
    res = client_sin_transaccion.get("/dashboard/kpis")
    assert res.status_code == 401


def test_kpis_devuelve_datos_reales_coherentes(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/kpis", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["total_clientes"] > 0
    assert cuerpo["total_pedidos"] > 0
    assert cuerpo["ingresos_totales"] > 0
    # El ticket promedio debe ser coherente con ingresos/pedidos, no un numero suelto.
    esperado = cuerpo["ingresos_totales"] / cuerpo["total_pedidos"]
    assert abs(cuerpo["ticket_promedio"] - esperado) < 1


def test_sales_devuelve_serie_mensual_ordenada(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/sales", headers=headers_admin)
    assert res.status_code == 200
    meses = [fila["fecha"] for fila in res.json()]
    assert meses == sorted(meses)
    assert len(meses) > 0


def test_churn_risk_los_tres_buckets_suman_clientes_con_prediccion(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/churn-risk", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    total = cuerpo["bajo_riesgo"] + cuerpo["riesgo_medio"] + cuerpo["alto_riesgo"]
    # El modelo de IA (entrenado el 10 sep 2026) dejo prediccion para 385
    # clientes; si este numero llega a 0 es la señal de que el modelo dejo
    # de estar poblado en prediccion_cliente.
    assert total > 0


def test_top_productos_respeta_el_limite(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/top-productos?limite=3", headers=headers_admin)
    assert res.status_code == 200
    assert len(res.json()) <= 3


def test_ventas_por_canal_no_vacio(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/ventas-por-canal", headers=headers_admin)
    assert res.status_code == 200
    assert len(res.json()) > 0


def test_ventas_por_localidad_usa_coordenadas_reales_de_bogota(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/dashboard/ventas-por-localidad", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    assert len(cuerpo) > 0
    for fila in cuerpo:
        # Bogota: latitud ~4.5-4.8, longitud ~ -74.0 a -74.2
        assert 4.3 < fila["lat"] < 4.9
        assert -74.3 < fila["lng"] < -73.9
        assert fila["ingresos"] >= 0


def test_cubo_olap_tiene_las_tres_dimensiones(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/olap/cubo", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    assert len(cuerpo["productos"]) == 12
    assert set(cuerpo["segmentos"]) == {"activo", "ocasional", "en_riesgo"}
    assert len(cuerpo["meses"]) > 0
    assert len(cuerpo["celdas"]) > 0
