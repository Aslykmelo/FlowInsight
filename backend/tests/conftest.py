"""
Infraestructura de pruebas automatizadas de FlowInsight.

Corre contra la base de datos real de desarrollo (la misma que usa
`uvicorn` localmente), pero cada prueba que escribe datos lo hace dentro
de una transaccion que se revierte (rollback) al final del test, para
no dejar basura ni modificar el dataset sintetico que usan el dashboard,
las promociones y el modelo de IA. Las pruebas de solo lectura (la
mayoria) no necesitan esto porque no modifican nada.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.main import app
from app.db.session import engine, SessionLocal, get_db

ADMIN_EMAIL = "asly@flowinsight.com"
ADMIN_PASSWORD = "admin123"
VENTAS_EMAIL = "ventas@flowinsight.com"
VENTAS_PASSWORD = "ventas123"


@pytest.fixture()
def db_session():
    """
    Sesion ligada a una transaccion externa que siempre se revierte al
    cerrar. Un simple session.commit() dentro del codigo de la app
    liberaria esa transaccion externa antes de tiempo, asi que se usa el
    patron oficial de SQLAlchemy para pruebas: la sesion vive dentro de un
    SAVEPOINT que se reabre automaticamente cada vez que el codigo bajo
    prueba hace commit, y solo el rollback final de la transaccion externa
    deja la base de datos exactamente como estaba.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _reabrir_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    def _get_db_override():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db_override
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def client(db_session):
    """TestClient que escribe dentro de la transaccion revertible de arriba."""
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client_sin_transaccion():
    """TestClient contra la sesion real, para pruebas de solo lectura."""
    with TestClient(app) as c:
        yield c


def _login(c: TestClient, email: str, password: str) -> str:
    res = c.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert res.status_code == 200, f"login fallo para {email}: {res.text}"
    return res.json()["access_token"]


@pytest.fixture()
def token_admin(client_sin_transaccion):
    return _login(client_sin_transaccion, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture()
def token_ventas(client_sin_transaccion):
    return _login(client_sin_transaccion, VENTAS_EMAIL, VENTAS_PASSWORD)


@pytest.fixture()
def headers_admin(token_admin):
    return {"Authorization": f"Bearer {token_admin}"}


@pytest.fixture()
def headers_ventas(token_ventas):
    return {"Authorization": f"Bearer {token_ventas}"}
