from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Pedido, Usuario
from app.schemas.predicciones import PrediccionOut, CompraHistoricaOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/predicciones", tags=["predicciones"])

MESES_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


@router.get("", response_model=list[PrediccionOut])
def listar_predicciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    clientes = (
        db.query(Cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    resultado = []

    for cliente in clientes:
        pedidos = (
            db.query(Pedido)
            .filter(Pedido.id_cliente == cliente.id_cliente)
            .order_by(Pedido.fecha_pedido)
            .all()
        )

        if not pedidos:
            continue

        fechas = [p.fecha_pedido for p in pedidos if p.fecha_pedido]
        ultima_compra = fechas[-1] if fechas else None

        if len(fechas) >= 2:
            diffs = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
            intervalo = round(sum(diffs) / len(diffs)) if diffs else 30
        else:
            intervalo = 30

        intervalo = max(intervalo, 1)

        dias_sin_comprar = (datetime.now() - ultima_compra).days if ultima_compra else 0
        proxima_compra = None
        if ultima_compra:
            proxima_compra = ultima_compra + timedelta(days=intervalo)

        ratio = dias_sin_comprar / intervalo

        if ratio <= 1.2:
            riesgo = "bajo"
        elif ratio <= 2:
            riesgo = "medio"
        else:
            riesgo = "alto"

        probabilidad = max(0, min(100, round(100 - (ratio - 1) * 45)))

        montos_por_mes = defaultdict(float)
        for p in pedidos:
            if p.fecha_pedido:
                clave = (p.fecha_pedido.year, p.fecha_pedido.month)
                montos_por_mes[clave] += float(p.total or 0)

        meses_ordenados = sorted(montos_por_mes.keys())[-4:]
        historial = [
            CompraHistoricaOut(
                fecha=MESES_ABBR[mes - 1],
                monto=montos_por_mes[(anio, mes)],
            )
            for anio, mes in meses_ordenados
        ]

        resultado.append(PrediccionOut(
            id=str(cliente.id_cliente),
            cliente=cliente.nombre_cliente,
            ciudad=cliente.ciudad,
            ultima_compra=ultima_compra.strftime("%d/%m/%Y") if ultima_compra else None,
            dias_sin_comprar=dias_sin_comprar,
            intervalo=intervalo,
            proxima_compra=proxima_compra.strftime("%d/%m/%Y") if proxima_compra else None,
            riesgo=riesgo,
            probabilidad=probabilidad,
            historial=historial,
        ))

    return resultado