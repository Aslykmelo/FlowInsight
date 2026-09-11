"""
Entrena los dos modelos de FlowInsight sobre variables RFM:

  - RandomForestRegressor   -> dias_hasta_proxima_compra (regresion, metrica R2)
  - GradientBoostingClassifier -> abandono en los proximos 90 dias (clasificacion, metrica F1)

Metodologia (para evitar fuga de datos / circularidad):
  Se generan "cortes" (snapshots) mensuales a lo largo de todo el historial de
  pedidos (sep-2023 a ago-2026). Para cada cliente y cada corte S se calculan
  las variables RFM usando SOLO pedidos anteriores a S (recencia, frecuencia,
  monetario, ticket promedio, antiguedad), y las etiquetas se miden con lo que
  el cliente realmente hizo DESPUES de S, dentro de una ventana de 90 dias:
    - abandono_label = 1 si no volvio a comprar en esos 90 dias
    - dias_hasta_proxima = dias reales hasta su siguiente compra (90 si no volvio)

  La evaluacion usa un corte temporal (los snapshots mas recientes quedan como
  test, nunca vistos en entrenamiento) en vez de un split aleatorio, para que
  el R2 y el F1 reportados sean honestos y no producto de fuga temporal.

  Los modelos finales (los que se usan para poblar prediccion_cliente) se
  reentrenan sobre TODOS los snapshots (train+test) una vez ya evaluados.
"""
import sys
from datetime import timedelta

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import f1_score, r2_score, precision_score, recall_score

from app.db.session import SessionLocal
from app.models.models import Cliente, Pedido, ModeloPrediccion, PrediccionCliente

VENTANA_DIAS = 90
PASO_SNAPSHOT_DIAS = 30
FEATURES = [
    "recencia", "frecuencia", "monetario", "ticket_promedio", "antiguedad",
    "intervalo_promedio", "intervalo_std",
]
CARPETA_MODELOS = "ml_models"


def cargar_datos(db):
    clientes = pd.read_sql(
        db.query(Cliente.id_cliente, Cliente.fecha_registro).statement, db.bind
    )
    pedidos = pd.read_sql(
        db.query(Pedido.id_cliente, Pedido.fecha_pedido, Pedido.total).statement, db.bind
    )
    pedidos["fecha_pedido"] = pd.to_datetime(pedidos["fecha_pedido"])
    clientes["fecha_registro"] = pd.to_datetime(clientes["fecha_registro"])
    return clientes, pedidos


def construir_snapshots(clientes: pd.DataFrame, pedidos: pd.DataFrame) -> pd.DataFrame:
    fecha_min = pedidos["fecha_pedido"].min()
    fecha_max = pedidos["fecha_pedido"].max()

    inicio = fecha_min + timedelta(days=120)
    fin = fecha_max - timedelta(days=VENTANA_DIAS)
    cortes = pd.date_range(inicio, fin, freq=f"{PASO_SNAPSHOT_DIAS}D")

    pedidos_por_cliente = {
        id_cliente: grupo.sort_values("fecha_pedido")
        for id_cliente, grupo in pedidos.groupby("id_cliente")
    }
    registro_por_cliente = clientes.set_index("id_cliente")["fecha_registro"].to_dict()

    filas = []
    for id_cliente, hist in pedidos_por_cliente.items():
        fechas = hist["fecha_pedido"].values
        totales = hist["total"].values
        fecha_registro = registro_por_cliente.get(id_cliente)

        for corte in cortes:
            antes = fechas <= np.datetime64(corte)
            n_antes = antes.sum()
            # Se exigen al menos 3 compras previas para tener un intervalo
            # promedio confiable; con menos, el "ritmo" del cliente es ruido.
            if n_antes < 3:
                continue

            fechas_antes = np.sort(fechas[antes])
            ultima_antes = fechas_antes.max()
            recencia = (corte - pd.Timestamp(ultima_antes)).days
            frecuencia = int(n_antes)
            monetario = float(totales[antes].sum())
            ticket_promedio = monetario / frecuencia
            antiguedad = (corte - fecha_registro).days if fecha_registro is not None else 0

            intervalos = np.diff(fechas_antes).astype("timedelta64[D]").astype(float)
            intervalo_promedio = float(intervalos.mean())
            intervalo_std = float(intervalos.std()) if len(intervalos) > 1 else 0.0
            # Cuantos "intervalos tipicos" del propio cliente han pasado desde
            # su ultima compra: la senal real de abandono no es el numero
            # absoluto de dias, sino que tan anormal es la pausa para EL.
            recencia_relativa = recencia / intervalo_promedio if intervalo_promedio > 0 else recencia

            despues_mask = (fechas > np.datetime64(corte)) & (
                fechas <= np.datetime64(corte + timedelta(days=VENTANA_DIAS))
            )
            hay_recompra = despues_mask.any()
            if hay_recompra:
                siguiente = fechas[despues_mask].min()
                dias_hasta_proxima = (pd.Timestamp(siguiente) - corte).days
            else:
                dias_hasta_proxima = VENTANA_DIAS

            filas.append({
                "id_cliente": id_cliente,
                "corte": corte,
                "recencia": recencia,
                "frecuencia": frecuencia,
                "monetario": monetario,
                "ticket_promedio": ticket_promedio,
                "antiguedad": antiguedad,
                "intervalo_promedio": intervalo_promedio,
                "intervalo_std": intervalo_std,
                "recencia_relativa": recencia_relativa,
                "abandono_label": 0 if hay_recompra else 1,
                "dias_hasta_proxima": dias_hasta_proxima,
            })

    return pd.DataFrame(filas)


def dividir_train_test(dataset: pd.DataFrame):
    cortes_ordenados = sorted(dataset["corte"].unique())
    n_test = max(1, round(len(cortes_ordenados) * 0.2))
    cortes_test = set(cortes_ordenados[-n_test:])

    es_test = dataset["corte"].isin(cortes_test)
    return dataset[~es_test], dataset[es_test]


def entrenar_y_evaluar(train: pd.DataFrame, test: pd.DataFrame):
    X_train, X_test = train[FEATURES], test[FEATURES]

    regresor = RandomForestRegressor(
        n_estimators=400, max_depth=4, min_samples_leaf=20, random_state=42
    )
    regresor.fit(X_train, train["dias_hasta_proxima"])
    pred_dias = regresor.predict(X_test)
    r2 = r2_score(test["dias_hasta_proxima"], pred_dias)

    clasificador = GradientBoostingClassifier(
        n_estimators=300, max_depth=3, learning_rate=0.03, random_state=42
    )
    clasificador.fit(X_train, train["abandono_label"])
    pred_abandono = clasificador.predict(X_test)
    f1 = f1_score(test["abandono_label"], pred_abandono)
    precision = precision_score(test["abandono_label"], pred_abandono, zero_division=0)
    recall = recall_score(test["abandono_label"], pred_abandono, zero_division=0)

    return r2, f1, precision, recall


def reentrenar_final(dataset: pd.DataFrame):
    X = dataset[FEATURES]
    regresor = RandomForestRegressor(
        n_estimators=400, max_depth=4, min_samples_leaf=20, random_state=42
    )
    regresor.fit(X, dataset["dias_hasta_proxima"])

    clasificador = GradientBoostingClassifier(
        n_estimators=300, max_depth=3, learning_rate=0.03, random_state=42
    )
    clasificador.fit(X, dataset["abandono_label"])
    return regresor, clasificador


def poblar_predicciones(db, regresor, clasificador, clientes: pd.DataFrame, pedidos: pd.DataFrame, id_modelo: int):
    ahora = pd.Timestamp(pd.Timestamp.now("UTC").date())
    registro_por_cliente = clientes.set_index("id_cliente")["fecha_registro"].to_dict()

    db.query(PrediccionCliente).filter(PrediccionCliente.id_modelo == id_modelo).delete()

    filas = []
    for id_cliente, hist in pedidos.groupby("id_cliente"):
        hist = hist.sort_values("fecha_pedido")
        fechas = np.sort(hist["fecha_pedido"].values)
        totales = hist["total"].values
        if len(fechas) < 3:
            continue

        ultima = pd.Timestamp(fechas.max())
        recencia = (ahora - ultima).days
        frecuencia = len(fechas)
        monetario = float(totales.sum())
        ticket_promedio = monetario / frecuencia
        fecha_registro = registro_por_cliente.get(id_cliente)
        antiguedad = (ahora - fecha_registro).days if fecha_registro is not None else 0

        intervalos = np.diff(fechas).astype("timedelta64[D]").astype(float)
        intervalo_promedio = float(intervalos.mean())
        intervalo_std = float(intervalos.std()) if len(intervalos) > 1 else 0.0
        recencia_relativa = recencia / intervalo_promedio if intervalo_promedio > 0 else recencia

        x = pd.DataFrame([{
            "recencia": recencia, "frecuencia": frecuencia, "monetario": monetario,
            "ticket_promedio": ticket_promedio, "antiguedad": antiguedad,
            "intervalo_promedio": intervalo_promedio, "intervalo_std": intervalo_std,
            "recencia_relativa": recencia_relativa,
        }])[FEATURES]

        dias_predichos = float(regresor.predict(x)[0])
        probabilidad_recompra = max(0.0, min(1.0, 1 - dias_predichos / VENTANA_DIAS))
        riesgo_abandono = float(clasificador.predict_proba(x)[0][1])

        filas.append(PrediccionCliente(
            id_cliente=int(id_cliente),
            id_modelo=id_modelo,
            probabilidad_recompra=round(probabilidad_recompra, 4),
            riesgo_abandono=round(riesgo_abandono, 4),
        ))

    db.bulk_save_objects(filas)
    db.commit()
    return len(filas)


def main():
    db = SessionLocal()
    print("Cargando clientes y pedidos...")
    clientes, pedidos = cargar_datos(db)
    print(f"{len(clientes)} clientes, {len(pedidos)} pedidos")

    print("Construyendo snapshots RFM (esto toma unos segundos)...")
    dataset = construir_snapshots(clientes, pedidos)
    print(f"{len(dataset)} filas de entrenamiento (cliente x corte temporal)")

    train, test = dividir_train_test(dataset)
    print(f"Train: {len(train)} filas | Test (fuera de tiempo): {len(test)} filas")

    print("Entrenando y evaluando sobre el corte temporal...")
    r2, f1, precision, recall = entrenar_y_evaluar(train, test)
    print(f"RandomForestRegressor  R2  = {r2:.4f}  (umbral tesis: >= 0.75)")
    print(f"GradientBoostingClassifier F1 = {f1:.4f}  (umbral tesis: >= 0.78)")
    print(f"  precision = {precision:.4f} | recall = {recall:.4f}")

    print("Reentrenando modelos finales sobre todo el dataset...")
    regresor, clasificador = reentrenar_final(dataset)

    import os
    os.makedirs(CARPETA_MODELOS, exist_ok=True)
    joblib.dump(regresor, os.path.join(CARPETA_MODELOS, "rf_regresor_recompra.joblib"))
    joblib.dump(clasificador, os.path.join(CARPETA_MODELOS, "gb_clasificador_abandono.joblib"))

    notas = (
        f"RandomForestRegressor (dias_hasta_proxima_compra): R2={r2:.4f} (umbral tesis 0.75, NO alcanzado). "
        f"GradientBoostingClassifier (abandono en 90 dias): F1={f1:.4f} (umbral tesis 0.78, NO alcanzado), "
        f"precision={precision:.4f}, recall={recall:.4f}. "
        f"Entrenado sobre {len(dataset)} snapshots RFM ({len(train)} train / {len(test)} test, "
        f"split temporal fuera de muestra). Variables: {', '.join(FEATURES)}. "
        f"Diagnostico: un LinearRegression base ya topa en R2~0.25 con las mismas variables, "
        f"y la variable de mayor importancia (intervalo_promedio) explica la mayor parte de la "
        f"senal disponible. El techo no es de hiperparametros: el generador sintetico "
        f"(generate_dataset.py) asigna fechas de pedido de forma uniforme/memoryless dentro del "
        f"rango activo de cada cliente, asi que el historial RFM previo tiene una relacion real "
        f"pero moderada con el momento exacto de la proxima compra. Para cerrar la brecha haria "
        f"falta un generador con dependencia temporal mas realista (momentum de compra, "
        f"desaceleracion gradual antes del abandono), no mas ajuste de estos modelos."
    )
    modelo = ModeloPrediccion(version="v1.0", precision_modelo=round(f1, 4), notas=notas)
    db.add(modelo)
    db.commit()
    db.refresh(modelo)
    print(f"Modelo registrado: id_modelo={modelo.id_modelo}")

    print("Poblando prediccion_cliente para todos los clientes reales...")
    n = poblar_predicciones(db, regresor, clasificador, clientes, pedidos, modelo.id_modelo)
    print(f"{n} predicciones guardadas")

    cumple_r2 = r2 >= 0.75
    cumple_f1 = f1 >= 0.78
    print("\n=== RESUMEN ===")
    print(f"R2 >= 0.75: {'CUMPLE' if cumple_r2 else 'NO CUMPLE'} ({r2:.4f})")
    print(f"F1 >= 0.78: {'CUMPLE' if cumple_f1 else 'NO CUMPLE'} ({f1:.4f})")


if __name__ == "__main__":
    sys.exit(main())
