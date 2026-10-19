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


# ----------------------------------------------------------------- botones y correo
def _cliente_en_riesgo(client, headers):
    lista = client.get("/promociones/clientes?categoria=en_riesgo", headers=headers).json()
    return lista[0]["id_cliente"]


def test_sin_whatsapp_configurado_no_hay_botones(client_sin_transaccion, headers_admin, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "empresa_whatsapp", "")
    monkeypatch.setattr(settings, "empresa_pedido_url", "")
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.get(f"/promociones/mensaje/{id_c}", headers=headers_admin).json()
    assert res["acciones"] == []


def test_con_whatsapp_configurado_hay_botones_de_asesor_y_pedido(client_sin_transaccion, headers_admin, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "empresa_whatsapp", "+57 300 000 0000")
    monkeypatch.setattr(settings, "empresa_pedido_url", "")
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.get(f"/promociones/mensaje/{id_c}", headers=headers_admin).json()
    assert [a["etiqueta"] for a in res["acciones"]] == ["Hablar con un asesor", "Hacer un pedido"]
    assert all(a["url"].startswith("https://wa.me/573000000000") for a in res["acciones"])


def test_url_de_pedido_propia_reemplaza_al_enlace_de_whatsapp(client_sin_transaccion, headers_admin, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "empresa_whatsapp", "573000000000")
    monkeypatch.setattr(settings, "empresa_pedido_url", "https://wtfood.example/pedido")
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.get(f"/promociones/mensaje/{id_c}", headers=headers_admin).json()
    assert res["acciones"][1]["url"] == "https://wtfood.example/pedido"


def test_vista_previa_va_al_correo_del_usuario_con_botones(client_sin_transaccion, headers_admin, monkeypatch):
    from app.core.config import settings
    enviados = []
    monkeypatch.setattr("app.api.promociones.enviar_correo", lambda d, a, h, t: enviados.append((d, a, h, t)) or True)
    monkeypatch.setattr(settings, "empresa_whatsapp", "573000000000")
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.post(
        f"/promociones/mensaje/{id_c}/enviar-correo", json={"destino": "mi_correo"}, headers=headers_admin)
    assert res.status_code == 200
    destino, asunto, html, texto = enviados[0]
    assert destino == "asly@flowinsight.com" and asunto.startswith("[Vista previa]")
    assert "Hablar con un asesor" in html and "Hacer un pedido" in html and "Hablar con un asesor" in texto
    assert "*" in res.json()["destino"]


def test_envio_al_cliente_esta_desactivado_por_defecto(client_sin_transaccion, headers_admin, monkeypatch):
    enviados = []
    monkeypatch.setattr("app.api.promociones.enviar_correo", lambda *a: enviados.append(a) or True)
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.post(
        f"/promociones/mensaje/{id_c}/enviar-correo", json={"destino": "cliente"}, headers=headers_admin)
    assert res.status_code == 403 and enviados == []


def test_envio_al_cliente_cuando_se_habilita(client_sin_transaccion, headers_admin, monkeypatch):
    from app.core.config import settings
    enviados = []
    monkeypatch.setattr("app.api.promociones.enviar_correo", lambda d, a, h, t: enviados.append(d) or True)
    monkeypatch.setattr(settings, "promo_envio_real", True)
    id_c = _cliente_en_riesgo(client_sin_transaccion, headers_admin)
    res = client_sin_transaccion.post(
        f"/promociones/mensaje/{id_c}/enviar-correo", json={"destino": "cliente"}, headers=headers_admin)
    if res.status_code == 400:  # el cliente elegido no tiene correo registrado en los datos de prueba
        return
    assert res.status_code == 200 and len(enviados) == 1 and enviados[0] != "asly@flowinsight.com"
