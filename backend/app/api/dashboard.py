from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Pedido, Cliente
from app.schemas.dashboard import KPIsOut, VentaDiaria

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=KPIsOut)
def obtener_kpis(db: Session = Depends(get_db)):
    total_pedidos = db.query(func.count(Pedido.id_pedido)).scalar() or 0
    total_clientes = db.query(func.count(Cliente.id_cliente)).scalar() or 0
    ingresos_totales = db.query(func.sum(Pedido.total)).scalar() or 0
    clientes_activos = db.query(func.count(func.distinct(Pedido.id_cliente))).scalar() or 0
    ticket_promedio = (ingresos_totales / total_pedidos) if total_pedidos > 0 else 0

    return KPIsOut(
        total_pedidos=total_pedidos,
        total_clientes=total_clientes,
        ingresos_totales=float(ingresos_totales),
        ticket_promedio=round(float(ticket_promedio), 2),
        clientes_activos=clientes_activos,
    )


@router.get("/sales", response_model=list[VentaDiaria])
def ventas_por_dia(db: Session = Depends(get_db)):
    resultados = (
        db.query(
            func.date(Pedido.fecha_pedido).label("fecha"),
            func.count(Pedido.id_pedido).label("total_pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .group_by(func.date(Pedido.fecha_pedido))
        .order_by(func.date(Pedido.fecha_pedido))
        .all()
    )
    return [
        {"fecha": r.fecha, "total_pedidos": r.total_pedidos, "ingresos": float(r.ingresos)}
        for r in resultados
    ]