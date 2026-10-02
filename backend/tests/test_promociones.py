"""RF31 (mensajes de promocion basados en riesgo de abandono)."""


def test_listar_clientes_promocion_categoriza_correctamente(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/promociones/clientes", headers=headers_admin)
    assert res.status_code == 200
    clientes = res.json()
    assert len(clientes) > 0
    for c in clientes:
        assert c["categoria"] in ("activo", "ocasional", "en_riesgo")
        if c["categoria"] == "activo":
            assert c["dias_sin_comprar"] <= 30
        elif c["categoria"] == "ocasional":
            assert 30 < c["dias_sin_comprar"] <= 90
        else:
            assert c["dias_sin_comprar"] > 90


def test_filtro_por_categoria_devuelve_solo_esa_categoria(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get(
        "/promociones/clientes?categoria=en_riesgo", headers=headers_admin
    )
    assert res.status_code == 200
    clientes = res.json()
    assert len(clientes) > 0
    assert all(c["categoria"] == "en_riesgo" for c in clientes)


def test_mensaje_generado_contiene_el_nombre_del_cliente_y_enlace_whatsapp(
    client_sin_transaccion, headers_admin
):
    lista = client_sin_transaccion.get(
        "/promociones/clientes", headers=headers_admin
    ).json()
    primero = lista[0]

    res = client_sin_transaccion.get(
        f"/promociones/mensaje/{primero['id_cliente']}", headers=headers_admin
    )
    assert res.status_code == 200
    cuerpo = res.json()
    assert primero["nombre_cliente"] in cuerpo["mensaje"]
    # No debe usarse ninguna API de WhatsApp Business: el enlace debe ser
    # un wa.me normal que el usuario abre y envia el mismo manualmente.
    if cuerpo["link_whatsapp"]:
        assert cuerpo["link_whatsapp"].startswith("https://wa.me/")


def test_mensaje_de_cliente_inexistente_devuelve_404(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/promociones/mensaje/999999", headers=headers_admin)
    assert res.status_code == 404
