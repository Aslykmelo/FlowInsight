"""RF16 (inicio de sesion) y control de acceso basico."""


def test_login_credenciales_correctas_devuelve_token(client_sin_transaccion):
    res = client_sin_transaccion.post(
        "/auth/login",
        data={"username": "asly@flowinsight.com", "password": "admin123"},
    )
    assert res.status_code == 200
    cuerpo = res.json()
    assert "access_token" in cuerpo
    assert len(cuerpo["access_token"]) > 20


def test_login_password_incorrecta_rechazada(client_sin_transaccion):
    res = client_sin_transaccion.post(
        "/auth/login",
        data={"username": "asly@flowinsight.com", "password": "password-incorrecta"},
    )
    assert res.status_code == 401


def test_login_usuario_inexistente_rechazado(client_sin_transaccion):
    res = client_sin_transaccion.post(
        "/auth/login",
        data={"username": "nadie@flowinsight.com", "password": "lo-que-sea"},
    )
    assert res.status_code == 401


def test_auth_me_devuelve_datos_del_usuario_autenticado(client_sin_transaccion, headers_admin):
    res = client_sin_transaccion.get("/auth/me", headers=headers_admin)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["correo"] == "asly@flowinsight.com"
    assert cuerpo["rol"] == "Administrador"


def test_auth_me_sin_token_rechazado(client_sin_transaccion):
    res = client_sin_transaccion.get("/auth/me")
    assert res.status_code == 401


def test_endpoint_protegido_con_token_invalido_rechazado(client_sin_transaccion):
    res = client_sin_transaccion.get(
        "/dashboard/kpis",
        headers={"Authorization": "Bearer esto-no-es-un-jwt-valido"},
    )
    assert res.status_code == 401
