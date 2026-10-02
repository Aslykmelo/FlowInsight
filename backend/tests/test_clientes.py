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
