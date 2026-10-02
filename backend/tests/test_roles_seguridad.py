"""RF17 (roles y permisos) y RF20-23 (seguridad/control de acceso)."""


def test_ventas_no_puede_crear_producto(client, headers_ventas):
    res = client.post(
        "/productos/",
        json={"nombre_producto": "Producto de prueba", "precio": 1000, "stock": 1},
        headers=headers_ventas,
    )
    assert res.status_code == 403


def test_administrador_si_puede_crear_producto(client, headers_admin):
    res = client.post(
        "/productos/",
        json={"nombre_producto": "Producto de prueba (test)", "precio": 1000, "stock": 1},
        headers=headers_admin,
    )
    assert res.status_code == 200
    assert res.json()["nombre_producto"] == "Producto de prueba (test)"


def test_crear_producto_sin_autenticar_rechazado(client):
    res = client.post(
        "/productos/",
        json={"nombre_producto": "Producto de prueba", "precio": 1000, "stock": 1},
    )
    assert res.status_code == 401


def test_ventas_si_puede_listar_productos(client, headers_ventas):
    # Ventas no puede crear productos, pero si debe poder consultarlos.
    res = client.get("/productos/", headers=headers_ventas)
    assert res.status_code == 200


def test_usuario_inactivo_no_puede_autenticarse(client, db_session, headers_admin):
    from app.models.models import Usuario
    from app.core.security import hash_password

    usuario_inactivo = Usuario(
        id_rol=2,
        nombre_usuario="Usuario Inactivo (test)",
        contrasena=hash_password("clave123"),
        correo="inactivo.test@flowinsight.com",
        estado="inactivo",
    )
    db_session.add(usuario_inactivo)
    db_session.commit()

    res = client.post(
        "/auth/login",
        data={"username": "inactivo.test@flowinsight.com", "password": "clave123"},
    )
    assert res.status_code in (401, 403)
