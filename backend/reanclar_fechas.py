"""
Re-ancla el dataset simulado a una fecha reciente para demostraciones.

El dataset de FlowInsight es sintetico y su ultimo pedido es del 29 de agosto de 2026,
pero la aplicacion calcula el estado de cada cliente (Activo <= 15 dias, En riesgo <= 30,
Inactivo > 30) contra la fecha de hoy. Con el paso del tiempo todos los clientes aparecen
como inactivos. Este script desplaza TODAS las fechas del historial por el mismo numero de
dias, de modo que el ultimo pedido quede en la fecha indicada.

Que cambia:    pedido.fecha_pedido y cliente.fecha_registro (mismo desplazamiento).
Que NO cambia: los intervalos entre compras, los montos, las variables RFM de entrenamiento
               ni, por tanto, las metricas del modelo (R2, F1).
Predicciones:  las guardadas dependen de "hoy", asi que se recalculan con los modelos ya
               entrenados (no se reentrena) para que sean coherentes con las nuevas fechas.

Uso (desde backend/):
  python reanclar_fechas.py --fin 2026-11-06                # vista previa, no escribe nada
  python reanclar_fechas.py --fin 2026-11-06 --aplicar      # aplica el cambio
  python reanclar_fechas.py --fin 2026-08-29 --aplicar      # revierte al estado original

Solo para datos simulados. No usar con datos reales de clientes.
"""
import argparse
import os
from datetime import date, datetime

import joblib
from sqlalchemy import func, text

from app.db.session import SessionLocal
from app.models.models import Pedido, ModeloPrediccion


def fecha_maxima(db) -> date | None:
    maximo = db.query(func.max(Pedido.fecha_pedido)).scalar()
    return maximo.date() if maximo else None


def calcular_desplazamiento(db, fin_objetivo: date) -> tuple[date, int]:
    """Devuelve (fecha del ultimo pedido actual, dias a desplazar)."""
    actual = fecha_maxima(db)
    if actual is None:
        raise ValueError("No hay pedidos para re-anclar")
    return actual, (fin_objetivo - actual).days


def desplazar_fechas(db, dias: int) -> dict:
    """Suma `dias` (puede ser negativo) a las fechas del historial, en una sola transaccion."""
    if dias == 0:
        return {"pedidos": 0, "clientes": 0}
    params = {"d": dias}
    pedidos = db.execute(
        text("UPDATE pedido SET fecha_pedido = fecha_pedido + (:d * INTERVAL '1 day')"), params
    ).rowcount
    clientes = db.execute(
        text("UPDATE cliente SET fecha_registro = fecha_registro + (:d * INTERVAL '1 day')"), params
    ).rowcount
    db.commit()
    return {"pedidos": pedidos, "clientes": clientes}


def refrescar_predicciones(db, ahora: date) -> int:
    """Recalcula prediccion_cliente del ultimo modelo con los modelos ya entrenados."""
    import train_model as tm

    modelo = db.query(ModeloPrediccion).order_by(ModeloPrediccion.id_modelo.desc()).first()
    if modelo is None:
        return 0
    regresor = joblib.load(os.path.join(tm.CARPETA_MODELOS, "rf_regresor_recompra.joblib"))
    clasificador = joblib.load(os.path.join(tm.CARPETA_MODELOS, "gb_clasificador_abandono.joblib"))
    clientes, pedidos = tm.cargar_datos(db)
    return tm.poblar_predicciones(
        db, regresor, clasificador, clientes, pedidos, modelo.id_modelo, ahora=ahora
    )


def ejecutar(db, fin_objetivo: date, aplicar: bool, refrescar: bool = True, hoy: date | None = None) -> dict:
    actual, dias = calcular_desplazamiento(db, fin_objetivo)
    resultado = {
        "fecha_maxima_anterior": actual.isoformat(),
        "fecha_maxima_nueva": fin_objetivo.isoformat(),
        "dias_desplazamiento": dias,
        "aplicado": False,
        "predicciones_recalculadas": 0,
    }
    if not aplicar or dias == 0:
        return resultado
    resultado.update(desplazar_fechas(db, dias))
    resultado["aplicado"] = True
    if refrescar:
        resultado["predicciones_recalculadas"] = refrescar_predicciones(db, hoy or date.today())
    return resultado


def main(argv=None):
    ap = argparse.ArgumentParser(description="Re-ancla las fechas del dataset simulado.")
    ap.add_argument("--fin", required=True, help="Fecha (AAAA-MM-DD) que tendra el ultimo pedido")
    ap.add_argument("--aplicar", action="store_true", help="Escribe los cambios (sin esto solo muestra la vista previa)")
    ap.add_argument("--sin-predicciones", action="store_true", help="No recalcular prediccion_cliente")
    ap.add_argument("--hoy", help="Fecha que se usa como 'hoy' al recalcular predicciones (por defecto, la actual)")
    args = ap.parse_args(argv)

    fin = datetime.strptime(args.fin, "%Y-%m-%d").date()
    hoy = datetime.strptime(args.hoy, "%Y-%m-%d").date() if args.hoy else None

    db = SessionLocal()
    try:
        r = ejecutar(db, fin, aplicar=args.aplicar, refrescar=not args.sin_predicciones, hoy=hoy)
    finally:
        db.close()

    print(f"Ultimo pedido actual : {r['fecha_maxima_anterior']}")
    print(f"Ultimo pedido nuevo  : {r['fecha_maxima_nueva']}")
    print(f"Desplazamiento       : {r['dias_desplazamiento']:+d} dias")
    if not args.aplicar:
        print("VISTA PREVIA: no se escribio nada. Agregue --aplicar para ejecutar el cambio.")
    elif not r["aplicado"]:
        print("Sin cambios: el historial ya termina en esa fecha.")
    else:
        print(f"Pedidos actualizados : {r['pedidos']} | Clientes actualizados: {r['clientes']}")
        print(f"Predicciones recalculadas: {r['predicciones_recalculadas']}")
        print(f"Para revertir: python reanclar_fechas.py --fin {r['fecha_maxima_anterior']} --aplicar")


if __name__ == "__main__":
    main()
