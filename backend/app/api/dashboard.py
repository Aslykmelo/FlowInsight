from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Pedido,
    Cliente,
    Usuario,
    PrediccionCliente,
)
from app.schemas.dashboard import (
    KPIsOut,
    VentaDiaria,
    RiesgoAbandonoOut,
)
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)


# ============================================================
# KPIs DEL DASHBOARD
# ============================================================

@router.get("/kpis", response_model=KPIsOut)
def obtener_kpis(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    total_pedidos = db.query(
        func.count(Pedido.id_pedido)
    ).scalar() or 0

    total_clientes = db.query(
        func.count(Cliente.id_cliente)
    ).scalar() or 0

    ingresos_totales = db.query(
        func.sum(Pedido.total)
    ).scalar() or 0

    clientes_activos = db.query(
        func.count(
            func.distinct(Pedido.id_cliente)
        )
    ).scalar() or 0

    ticket_promedio = (
        ingresos_totales / total_pedidos
        if total_pedidos > 0
        else 0
    )

    return KPIsOut(
        total_pedidos=total_pedidos,
        total_clientes=total_clientes,
        ingresos_totales=float(ingresos_totales),
        ticket_promedio=round(
            float(ticket_promedio),
            2
        ),
        clientes_activos=clientes_activos,
    )


# ============================================================
# VENTAS POR MES
# ============================================================

@router.get(
    "/sales",
    response_model=list[VentaDiaria]
)
def ventas_por_mes(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(
            func.to_char(
                Pedido.fecha_pedido,
                "YYYY-MM"
            ).label("fecha"),

            func.count(
                Pedido.id_pedido
            ).label("total_pedidos"),

            func.sum(
                Pedido.total
            ).label("ingresos"),
        )
        .group_by(
            func.to_char(
                Pedido.fecha_pedido,
                "YYYY-MM"
            )
        )
        .order_by(
            func.to_char(
                Pedido.fecha_pedido,
                "YYYY-MM"
            )
        )
        .all()
    )

    return [
        {
            "fecha": r.fecha,
            "total_pedidos": r.total_pedidos,
            "ingresos": float(r.ingresos or 0),
        }
        for r in resultados
    ]


# ============================================================
# RIESGO DE ABANDONO
# ============================================================

@router.get(
    "/churn-risk",
    response_model=RiesgoAbandonoOut
)
def riesgo_abandono(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):

    # --------------------------------------------------------
    # Bajo riesgo: 0% a 30%
    # --------------------------------------------------------

    bajo_riesgo = (
        db.query(
            func.count(
                PrediccionCliente.id_prediccion
            )
        )
        .filter(
            PrediccionCliente.riesgo_abandono <= 0.30
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------------
    # Riesgo medio: >30% hasta 60%
    # --------------------------------------------------------

    riesgo_medio = (
        db.query(
            func.count(
                PrediccionCliente.id_prediccion
            )
        )
        .filter(
            PrediccionCliente.riesgo_abandono > 0.30,
            PrediccionCliente.riesgo_abandono <= 0.60,
        )
        .scalar()
        or 0
    )

    # --------------------------------------------------------
    # Alto riesgo: >60%
    # --------------------------------------------------------

    alto_riesgo = (
        db.query(
            func.count(
                PrediccionCliente.id_prediccion
            )
        )
        .filter(
            PrediccionCliente.riesgo_abandono > 0.60
        )
        .scalar()
        or 0
    )

    return RiesgoAbandonoOut(
        bajo_riesgo=bajo_riesgo,
        riesgo_medio=riesgo_medio,
        alto_riesgo=alto_riesgo,
    )