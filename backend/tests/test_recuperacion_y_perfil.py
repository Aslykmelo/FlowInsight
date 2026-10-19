"""Recuperacion de contrasena por SMS, perfil del usuario y ficha del modelo."""
from datetime import datetime, timedelta

import re

import pytest

from app.core.config import settings
from app.core.security import hash_password
from app.models.models import Usuario

CORREO = "recuperacion.test@flowinsight.com"
CLAVE = "clave-original-1"


@pytest.fixture()
def usuario_con_telefono(db_session):
    usuario = Usuario(
        id_rol=2,
        nombre_usuario="Usuario Recuperacion (test)",
        contrasena=hash_password(CLAVE),
        correo=CORREO,
        estado="activo",
        telefono="+573001234567",
    )
    db_session.add(usuario)
    db_session.commit()
    return usuario


@pytest.fixture()
def sms_enviados(monkeypatch):
    """Simula un proveedor de SMS real y guarda (telefono, mensaje)."""
    enviados: list[tuple[str, str]] = []

    def falso_envio(telefono, mensaje):
        enviados.append((telefono, mensaje))
        return True

    monkeypatch.setattr(settings, "sms_provider", "twilio")
    monkeypatch.setattr("app.api.auth.enviar_sms", falso_envio)
    return enviados


@pytest.fixture()
def correos_enviados(monkeypatch):
    """Intercepta el correo y guarda (destino, asunto, html, texto)."""
    enviados: list[tuple[str, str, str, str]] = []

    def falso_correo(destino, asunto, html, texto):
        enviados.append((destino, asunto, html, texto))
        return True

    monkeypatch.setattr("app.api.auth.enviar_correo", falso_correo)
    return enviados


def _codigo(sms):
    return sms[-1][1].split("es ")[1].split(".")[0]


def _login(client, correo, clave):
    return client.post("/auth/login", data={"username": correo, "password": clave})


# ----------------------------------------------------------- recuperar clave
def test_forgot_password_envia_sms_y_el_codigo_permite_cambiar_la_clave(
    client, usuario_con_telefono, sms_enviados
):
    res = client.post("/auth/forgot-password", json={"correo": CORREO})
    assert res.status_code == 200
    assert len(sms_enviados) == 1
    assert sms_enviados[0][0] == "+573001234567"

    codigo = _codigo(sms_enviados)
    assert len(codigo) == 6 and codigo.isdigit()

    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": codigo, "nueva_contrasena": "clave-nueva-2"},
    )
    assert res.status_code == 200
    assert _login(client, CORREO, "clave-nueva-2").status_code == 200
    assert _login(client, CORREO, CLAVE).status_code == 401


def test_forgot_password_no_revela_si_el_correo_existe(client, sms_enviados):
    existente = client.post("/auth/forgot-password", json={"correo": "no.existe@x.com"})
    assert existente.status_code == 200
    assert "enviamos un código" in existente.json()["mensaje"]
    assert sms_enviados == []


def test_sin_proveedor_de_sms_el_codigo_llega_al_correo(client, usuario_con_telefono, correos_enviados):
    # sms_provider por defecto es "consola": no hay SMS real, asi que se usa el correo de la cuenta
    res = client.post("/auth/forgot-password", json={"correo": CORREO})
    assert res.status_code == 200
    assert len(correos_enviados) == 1
    destino, asunto, html, texto = correos_enviados[0]
    codigo = re.search(r"es (\d{6})\.", texto).group(1)
    assert destino == CORREO
    assert asunto == "Tu código de verificación de FlowInsight"
    assert codigo in html and "FlowInsight" in html and "W&amp;T Food" in html
    assert "<a " not in html          # el correo de seguridad no lleva enlaces ni botones
    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": codigo, "nueva_contrasena": "clave-nueva-2"},
    )
    assert res.status_code == 200


def test_usuario_sin_telefono_recibe_el_codigo_por_correo(client, db_session, correos_enviados):
    db_session.add(Usuario(
        id_rol=2, nombre_usuario="Sin telefono (test)", contrasena=hash_password(CLAVE),
        correo="sin.telefono.test@flowinsight.com", estado="activo",
    ))
    db_session.commit()
    res = client.post("/auth/forgot-password", json={"correo": "sin.telefono.test@flowinsight.com"})
    assert res.status_code == 200
    assert [c[0] for c in correos_enviados] == ["sin.telefono.test@flowinsight.com"]


def test_si_falla_el_sms_se_envia_por_correo(client, usuario_con_telefono, correos_enviados, monkeypatch):
    monkeypatch.setattr(settings, "sms_provider", "twilio")
    monkeypatch.setattr("app.api.auth.enviar_sms", lambda telefono, mensaje: False)
    client.post("/auth/forgot-password", json={"correo": CORREO})
    assert len(correos_enviados) == 1


def test_con_sms_disponible_no_se_envia_correo(client, usuario_con_telefono, sms_enviados, correos_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    assert len(sms_enviados) == 1 and correos_enviados == []


def test_el_codigo_se_guarda_cifrado(client, db_session, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    codigo = _codigo(sms_enviados)
    db_session.refresh(usuario_con_telefono)
    assert usuario_con_telefono.codigo_recuperacion_hash
    assert codigo not in usuario_con_telefono.codigo_recuperacion_hash


def test_no_se_reenvia_codigo_antes_de_60_segundos(client, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    client.post("/auth/forgot-password", json={"correo": CORREO})
    assert len(sms_enviados) == 1


def test_codigo_incorrecto_es_rechazado(client, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": "000000", "nueva_contrasena": "clave-nueva-2"},
    )
    assert res.status_code == 400
    assert _login(client, CORREO, CLAVE).status_code == 200


def test_tras_cinco_intentos_fallidos_ni_el_codigo_correcto_sirve(
    client, usuario_con_telefono, sms_enviados
):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    correcto = _codigo(sms_enviados)
    falso = "000000" if correcto != "000000" else "111111"
    for _ in range(5):
        client.post(
            "/auth/reset-password",
            json={"correo": CORREO, "codigo": falso, "nueva_contrasena": "clave-nueva-2"},
        )
    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": correcto, "nueva_contrasena": "clave-nueva-2"},
    )
    assert res.status_code == 400


def test_codigo_vencido_es_rechazado(client, db_session, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    codigo = _codigo(sms_enviados)
    db_session.refresh(usuario_con_telefono)
    usuario_con_telefono.codigo_recuperacion_expira = datetime.now() - timedelta(minutes=1)
    db_session.commit()
    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": codigo, "nueva_contrasena": "clave-nueva-2"},
    )
    assert res.status_code == 400


def test_el_codigo_solo_sirve_una_vez(client, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    codigo = _codigo(sms_enviados)
    cuerpo = {"correo": CORREO, "codigo": codigo, "nueva_contrasena": "clave-nueva-2"}
    assert client.post("/auth/reset-password", json=cuerpo).status_code == 200
    assert client.post("/auth/reset-password", json=cuerpo).status_code == 400


def test_nueva_contrasena_debe_tener_minimo_8_caracteres(client, usuario_con_telefono, sms_enviados):
    client.post("/auth/forgot-password", json={"correo": CORREO})
    res = client.post(
        "/auth/reset-password",
        json={"correo": CORREO, "codigo": _codigo(sms_enviados), "nueva_contrasena": "corta"},
    )
    assert res.status_code == 422


# ----------------------------------------------------------- perfil
def test_me_incluye_rol_y_telefono(client, usuario_con_telefono):
    token = _login(client, CORREO, CLAVE).json()["access_token"]
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["rol"] == "Analista"
    assert cuerpo["telefono"] == "+573001234567"


def test_actualizar_perfil_normaliza_el_telefono(client, usuario_con_telefono):
    token = _login(client, CORREO, CLAVE).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(
        "/auth/me",
        json={"nombre_usuario": "Nombre Nuevo", "telefono": "300 987 6543"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["nombre_usuario"] == "Nombre Nuevo"
    assert res.json()["telefono"] == "+573009876543"


def test_telefono_invalido_es_rechazado(client, usuario_con_telefono):
    token = _login(client, CORREO, CLAVE).json()["access_token"]
    res = client.patch(
        "/auth/me", json={"telefono": "12345"}, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 422


def test_cambiar_contrasena_exige_la_actual(client, usuario_con_telefono):
    token = _login(client, CORREO, CLAVE).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    mala = client.post(
        "/auth/cambiar-contrasena",
        json={"contrasena_actual": "incorrecta", "nueva_contrasena": "otra-clave-9"},
        headers=headers,
    )
    assert mala.status_code == 400
    buena = client.post(
        "/auth/cambiar-contrasena",
        json={"contrasena_actual": CLAVE, "nueva_contrasena": "otra-clave-9"},
        headers=headers,
    )
    assert buena.status_code == 200
    assert _login(client, CORREO, "otra-clave-9").status_code == 200


# ----------------------------------------------------------- roles y modelo
def test_analista_no_puede_listar_usuarios(client, headers_ventas):
    assert client.get("/users", headers=headers_ventas).status_code == 403


def test_administrador_puede_crear_usuario_con_telefono(client, headers_admin):
    res = client.post(
        "/users",
        json={
            "nombre": "Analista Nuevo (test)",
            "email": "analista.nuevo.test@flowinsight.com",
            "rol": "Analista",
            "password": "clave-segura-1",
            "telefono": "3151112233",
        },
        headers=headers_admin,
    )
    assert res.status_code == 200
    assert res.json()["telefono"] == "+573151112233"


def test_ficha_del_modelo_expone_metricas_y_umbrales(client_sin_transaccion, headers_ventas):
    res = client_sin_transaccion.get("/predicciones/modelo", headers=headers_ventas)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["umbral_r2"] == 0.75 and cuerpo["umbral_f1"] == 0.78
    assert cuerpo["r2"] is not None and cuerpo["f1"] is not None
    assert "recencia" in cuerpo["variables"]
    assert cuerpo["clientes_con_prediccion"] > 0


def test_ficha_del_modelo_requiere_autenticacion(client_sin_transaccion):
    assert client_sin_transaccion.get("/predicciones/modelo").status_code == 401


# ----------------------------------------------------------------- actividad del perfil
def test_actividad_requiere_sesion(client):
    assert client.get("/auth/me/actividad").status_code == 401


def test_actividad_cuenta_los_reportes_del_propio_usuario(client_sin_transaccion, headers_admin):
    antes = client_sin_transaccion.get("/auth/me/actividad", headers=headers_admin).json()
    nuevo = client_sin_transaccion.post(
        "/reports/generate", json={"tipo": "ventas", "formato": "xlsx"}, headers=headers_admin)
    assert nuevo.status_code == 200
    try:
        despues = client_sin_transaccion.get("/auth/me/actividad", headers=headers_admin).json()
        assert despues["reportes_generados"] == antes["reportes_generados"] + 1
        assert despues["reportes_por_formato"]["xlsx"] == antes["reportes_por_formato"].get("xlsx", 0) + 1
        assert despues["reportes_recientes"][0]["tipo"] == "ventas"
        assert len(despues["reportes_recientes"]) <= 5
    finally:
        client_sin_transaccion.delete(f"/reports/{nuevo.json()['id_reporte']}", headers=headers_admin)
