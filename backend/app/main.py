from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.session import engine
from app.api import clientes, auth, productos, pedidos, dashboard, upload, reportes, promociones, usuarios, olap, predicciones

app = FastAPI(title="FlowInsight API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router)
app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(dashboard.router)
app.include_router(upload.router)
app.include_router(reportes.router)
app.include_router(promociones.router)
app.include_router(usuarios.router)
app.include_router(olap.router)
app.include_router(predicciones.router)


@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}