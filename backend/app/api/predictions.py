from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Pedido, PrediccionCliente, ModeloPrediccion, Usuario
from app.schemas.predictions import PrediccionClienteOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/predictions", tags=["predictions"])

VENTANA_ENTRENAMIENTO_DIAS = 90


def categorizar_riesgo(riesgo_abandono: float) -> str:
    if riesgo_abandono <= 0.30:
        return "bajo"
    if riesgo_abandono <= 0.60:
        return "medio"
    return "alto"


@router.get("/", response_model=list[PrediccionClienteOut])
def listar_predicciones(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ultimo_modelo = (
        db.query(ModeloPrediccion)
        .order_by(ModeloPrediccion.id_modelo.desc())
        .first()
    )
    if not ultimo_modelo:
        return []

    predicciones = (
        db.query(PrediccionCliente, Cliente.nombre_cliente)
        .join(Cliente, Cliente.id_cliente == PrediccionCliente.id_cliente)
        .filter(PrediccionCliente.id_modelo == ultimo_modelo.id_modelo)
        .all()
    )
    if not predicciones:
        return []

    ids_clientes = [p.id_cliente for p, _ in predicciones]
    pedidos = (
        db.query(Pedido.id_cliente, Pedido.fecha_pedido)
        .filter(Pedido.id_cliente.in_(ids_clientes))
        .order_by(Pedido.fecha_pedido)
        .all()
    )
    fechas_por_cliente = defaultdict(list)
    for id_cliente, fecha in pedidos:
        fechas_por_cliente[id_cliente].append(fecha)

    resultado = []
    for prediccion, nombre in predicciones:
        fechas = fechas_por_cliente.get(prediccion.id_cliente, [])
        if not fechas:
            continue

        ultima_compra = fechas[-1]
        probabilidad = float(prediccion.probabilidad_recompra)
        riesgo = float(prediccion.riesgo_abandono)

        # Se invierte la misma transformacion usada al guardar la prediccion
        # (probabilidad_recompra = 1 - dias_predichos / ventana) para mostrar
        # la fecha estimada que realmente predijo el RandomForestRegressor.
        dias_predichos = round((1 - probabilidad) * VENTANA_ENTRENAMIENTO_DIAS)
        proxima_compra_estimada = ultima_compra + timedelta(days=dias_predichos)

        if len(fechas) >= 2:
            intervalos = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
            intervalo_dias = round(sum(intervalos) / len(intervalos))
        else:
            intervalo_dias = 0

        resultado.append(PrediccionClienteOut(
            id_cliente=prediccion.id_cliente,
            cliente=nombre,
            ultima_compra=ultima_compra.strftime("%d/%m/%Y"),
            intervalo_dias=intervalo_dias,
            proxima_compra_estimada=proxima_compra_estimada.strftime("%d/%m/%Y"),
            probabilidad_recompra=round(probabilidad * 100, 1),
            riesgo_abandono=round(riesgo * 100, 1),
            riesgo=categorizar_riesgo(riesgo),
        ))

    resultado.sort(key=lambda p: p.riesgo_abandono, reverse=True)
    return resultado
