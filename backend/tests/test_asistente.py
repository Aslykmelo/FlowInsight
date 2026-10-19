"""Apoyo a la decision sobre clientes (asistente)."""
from datetime import datetime, timedelta

from app.core.decision_cliente import Perfil, decidir, estadisticas, percentil, puntuar


def _perfil(**kw):
    base = dict(
        nombre="Panaderia Prueba", autorizado=True, pedidos=10, monto_total=5_000_000,
        ultima_compra=datetime.utcnow() - timedelta(days=10), dias_sin_comprar=10,
        intervalo_promedio=14, tendencia="estable", percentil_valor=50,
    )
    base.update(kw)
    return Perfil(**base)


# ------------------------------------------------------------------ reglas puras
def test_intervalo_y_tendencia():
    base = datetime(2026, 1, 1)
    estables = [base + timedelta(days=10 * i) for i in range(7)]
    assert estadisticas(estables) == (10, "estable")
    espaciadas = [base + timedelta(days=d) for d in (0, 10, 20, 30, 50, 80, 120)]
    intervalo, tendencia = estadisticas(espaciadas)
    assert tendencia == "se_espacia" and intervalo > 15
    assert estadisticas([base]) == (None, None)


def test_percentil_de_valor():
    assert percentil(100, [10, 20, 30, 100]) == 75
    assert percentil(5, [10, 20]) == 0
    assert percentil(5, []) == 0


def test_cliente_activo_al_dia_no_es_urgente():
    d = decidir(_perfil())
    assert d.prioridad == "baja" and "no requiere gestión urgente" in d.titulo


def test_cliente_en_riesgo_de_alto_valor_es_prioridad_alta():
    p = _perfil(dias_sin_comprar=200, intervalo_promedio=30, percentil_valor=95)
    d = decidir(p)
    assert d.prioridad == "alta" and d.puntaje >= 70
    assert "de inmediato" in d.titulo
    assert any("no la prometa" in paso for paso in d.pasos)  # no inventa descuentos


def test_el_valor_sube_la_prioridad_entre_dos_clientes_igual_de_inactivos():
    bajo = puntuar(_perfil(dias_sin_comprar=120, intervalo_promedio=30, percentil_valor=10))
    alto = puntuar(_perfil(dias_sin_comprar=120, intervalo_promedio=30, percentil_valor=90))
    assert alto > bajo


def test_sin_autorizacion_no_se_recomienda_contactar():
    d = decidir(_perfil(autorizado=False, dias_sin_comprar=200))
    assert d.prioridad == "no_contactar" and "Ley 1581" in " ".join(d.pasos)


def test_sin_pedidos_no_inventa_nada():
    d = decidir(_perfil(pedidos=0, dias_sin_comprar=None, ultima_compra=None, intervalo_promedio=None))
    assert d.prioridad == "baja" and d.puntaje == 0 and d.confianza == "baja"


def test_poco_historial_baja_la_confianza_y_lo_dice():
    d = decidir(_perfil(pedidos=2))
    assert d.confianza == "baja" and "poco fiable" in d.aviso


def test_las_senales_citan_cifras_del_perfil():
    d = decidir(_perfil(dias_sin_comprar=95, intervalo_promedio=30, riesgo_modelo=0.72, producto_favorito="Huevos AA x30"))
    texto = " ".join(s.texto for s in d.senales)
    assert "95 días" in texto and "cada 30 días" in texto and "72 %" in texto and "Huevos AA x30" in texto
    assert "no alcanza las metas" in texto  # advierte la confiabilidad del modelo


# ------------------------------------------------------------------ endpoints
def test_endpoints_requieren_sesion(client_sin_transaccion):
    assert client_sin_transaccion.get("/asistente/clientes").status_code == 401
    assert client_sin_transaccion.get("/asistente/prioridades").status_code == 401


def test_listado_de_clientes_para_reconocer_nombres(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/asistente/clientes", headers=headers_admin)
    assert res.status_code == 200 and len(res.json()) >= 390
    assert {"id_cliente", "nombre_cliente"} <= set(res.json()[0])


def test_analisis_de_un_cliente_coincide_con_su_categoria(client_sin_transaccion, headers_admin):
    lista = client_sin_transaccion.get("/promociones/clientes?categoria=en_riesgo", headers=headers_admin).json()
    elegido = lista[0]
    res = client_sin_transaccion.get(f"/asistente/cliente/{elegido['id_cliente']}", headers=headers_admin)
    assert res.status_code == 200
    a = res.json()
    assert a["categoria"] == "en_riesgo" and a["dias_sin_comprar"] == elegido["dias_sin_comprar"]
    assert a["senales"] and a["pasos"] and a["recomendacion"] and a["aviso"]
    assert a["puede_contactar"] is True


def test_cliente_inexistente(client_sin_transaccion, headers_admin):
    assert client_sin_transaccion.get("/asistente/cliente/99999999", headers=headers_admin).status_code == 404


def test_prioridades_solo_incluye_clientes_autorizados_y_viene_ordenado(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/asistente/prioridades?limite=8", headers=headers_admin)
    assert res.status_code == 200
    filas = res.json()
    assert 0 < len(filas) <= 8
    puntajes = [f["puntaje"] for f in filas]
    assert puntajes == sorted(puntajes, reverse=True)
    autorizados = {c["id_cliente"] for c in client_sin_transaccion.get("/promociones/clientes", headers=headers_admin).json()}
    assert all(f["id_cliente"] in autorizados for f in filas)


def test_si_el_modelo_contradice_los_datos_lo_dice_en_vez_de_mostrar_dos_verdades():
    d = decidir(_perfil(dias_sin_comprar=127, intervalo_promedio=14, riesgo_modelo=0.06, percentil_valor=90))
    texto = " ".join(s.texto for s in d.senales)
    assert "no coincide" in texto and "días sin comprar" in texto
    d2 = decidir(_perfil(dias_sin_comprar=5, riesgo_modelo=0.9))
    assert "aunque compró hace poco" in " ".join(s.texto for s in d2.senales)
