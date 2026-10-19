"""RF01/RF02/RF06 (gestion de clientes)."""


def test_listar_clientes_requiere_autenticacion(client_sin_transaccion):
    res = client_sin_transaccion.get("/clientes/")
    assert res.status_code == 401


def test_listar_clientes_devuelve_el_dataset_real(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/clientes/", headers=headers_admin)
    assert res.status_code == 200
    assert len(res.json()) >= 390  # dataset sintetico: 400 clientes


def test_crear_cliente_y_que_aparezca_en_el_resumen(client, headers_admin):
    res = client.post(
        "/clientes/",
        json={
            "nombre_cliente": "Cliente de prueba automatizada",
            "telefono": "3001234567",
            "correo": "cliente.prueba@example.com",
            "direccion": "Calle falsa 123",
            "ciudad": "Bogota",
            "autorizacion_datos": True,
        },
        headers=headers_admin,
    )
    assert res.status_code == 200
    creado = res.json()
    assert creado["nombre_cliente"] == "Cliente de prueba automatizada"
    assert creado["id_cliente"] is not None

    listado = client.get("/clientes/", headers=headers_admin).json()
    assert any(c["id_cliente"] == creado["id_cliente"] for c in listado)


# ----------------------------------------------------------------- categorias unificadas
def test_categorias_por_dias_sin_comprar_en_los_limites():
    from app.core.segmentos import categorizar
    assert categorizar(0) == "activo"
    assert categorizar(30) == "activo"
    assert categorizar(31) == "ocasional"
    assert categorizar(90) == "ocasional"
    assert categorizar(91) == "en_riesgo"


def test_clientes_usa_las_mismas_categorias_que_promociones(client_sin_transaccion, headers_admin):
    clientes = client_sin_transaccion.get("/clientes/resumen", headers=headers_admin).json()
    permitidas = {"activo", "ocasional", "en_riesgo", "sin_pedidos"}
    assert {c["estado"] for c in clientes} <= permitidas

    promo = client_sin_transaccion.get("/promociones/clientes", headers=headers_admin).json()
    categoria_promo = {c["id_cliente"]: c["categoria"] for c in promo}
    comparados = 0
    for c in clientes:
        if c["id_cliente"] in categoria_promo:
            assert c["estado"] == categoria_promo[c["id_cliente"]], c["nombre_cliente"]
            comparados += 1
    assert comparados > 100


def test_clientes_informa_los_dias_sin_comprar(client_sin_transaccion, headers_admin):
    from app.core.segmentos import categorizar
    for c in client_sin_transaccion.get("/clientes/resumen", headers=headers_admin).json()[:50]:
        if c["estado"] == "sin_pedidos":
            assert c["dias_sin_comprar"] is None
        else:
            assert categorizar(c["dias_sin_comprar"]) == c["estado"]
