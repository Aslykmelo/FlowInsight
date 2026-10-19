import hashlib
import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Pedido,
    Cliente,
    Usuario,
    PrediccionCliente,
    DetallePedido,
    Producto,
)
from app.schemas.dashboard import (
    KPIsOut,
    VentaDiaria,
    RiesgoAbandonoOut,
    ProductoTop,
    VentaPorCanal,
)
from app.schemas.mapa import VentaLocalidad, MapaClientesOut, PuntoCliente, ProductoCliente
from app.core.dependencies import get_current_user


CENTROIDES_LOCALIDADES = {
    "Usaquen": (4.6946, -74.0307),
    "Chapinero": (4.6488, -74.0648),
    "Santa Fe": (4.6097, -74.0817),
    "San Cristobal": (4.5573, -74.0817),
    "Usme": (4.4692, -74.1258),
    "Tunjuelito": (4.5722, -74.1436),
    "Bosa": (4.6182, -74.1773),
    "Kennedy": (4.6280, -74.1567),
    "Fontibon": (4.6728, -74.1466),
    "Engativa": (4.7100, -74.1136),
    "Suba": (4.7420, -74.0837),
    "Barrios Unidos": (4.6690, -74.0836),
    "Teusaquillo": (4.6378, -74.0938),
    "Los Martires": (4.6042, -74.0910),
    "Antonio Nariño": (4.5900, -74.0996),
    "Puente Aranda": (4.6157, -74.1136),
    "La Candelaria": (4.5967, -74.0750),
    "Rafael Uribe Uribe": (4.5580, -74.1130),
    "Ciudad Bolivar": (4.5000, -74.1500),
}


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)


@router.get("/kpis", response_model=KPIsOut)
def obtener_kpis(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    total_pedidos = (
        db.query(func.count(Pedido.id_pedido))
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .scalar() or 0
    )

    total_clientes = (
        db.query(func.count(Cliente.id_cliente))
        .filter(Cliente.autorizacion_datos == True)
        .scalar() or 0
    )

    ingresos_totales = (
        db.query(func.sum(Pedido.total))
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .scalar() or 0
    )

    clientes_activos = (
        db.query(func.count(func.distinct(Pedido.id_cliente)))
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .scalar() or 0
    )

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
        .join(Cliente, Cliente.id_cliente == Pedido.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
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
# TEMPORAL: se calcula en vivo a partir del historial de pedidos
# de cada cliente (promedio de días entre compras vs. días desde
# la última compra). Cuando el modelo de Machine Learning esté
# entrenado, esta función se reemplaza por sus predicciones reales.

@router.get(
    "/churn-risk",
    response_model=RiesgoAbandonoOut
)
def riesgo_abandono(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    clientes = (
        db.query(Cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    bajo_riesgo = 0
    riesgo_medio = 0
    alto_riesgo = 0

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
        if not fechas:
            continue

        ultima_compra = fechas[-1]

        if len(fechas) >= 2:
            diffs = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
            intervalo = round(sum(diffs) / len(diffs)) if diffs else 30
        else:
            intervalo = 30

        intervalo = max(intervalo, 1)
        dias_sin_comprar = (datetime.now() - ultima_compra).days
        ratio = dias_sin_comprar / intervalo

        if ratio <= 1.2:
            bajo_riesgo += 1
        elif ratio <= 2:
            riesgo_medio += 1
        else:
            alto_riesgo += 1

    return RiesgoAbandonoOut(
        bajo_riesgo=bajo_riesgo,
        riesgo_medio=riesgo_medio,
        alto_riesgo=alto_riesgo,
    )


@router.get("/top-productos", response_model=list[ProductoTop])
def productos_mas_vendidos(
    limite: int = 5,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(
            Producto.nombre_producto.label("producto"),
            func.sum(DetallePedido.cantidad).label("unidades_vendidas"),
            func.sum(DetallePedido.subtotal).label("ingresos"),
        )
        .join(Producto, DetallePedido.id_producto == Producto.id_producto)
        .group_by(Producto.nombre_producto)
        .order_by(func.sum(DetallePedido.subtotal).desc())
        .limit(limite)
        .all()
    )

    return [
        {
            "producto": r.producto,
            "unidades_vendidas": int(r.unidades_vendidas or 0),
            "ingresos": float(r.ingresos or 0),
        }
        for r in resultados
    ]


@router.get("/ventas-por-canal", response_model=list[VentaPorCanal])
def ventas_por_canal(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(
            Pedido.canal,
            func.count(Pedido.id_pedido).label("total_pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .group_by(Pedido.canal)
        .order_by(func.sum(Pedido.total).desc())
        .all()
    )

    return [
        {
            "canal": r.canal or "Sin especificar",
            "total_pedidos": r.total_pedidos,
            "ingresos": float(r.ingresos or 0),
        }
        for r in resultados
    ]


@router.get("/ventas-por-localidad", response_model=list[VentaLocalidad])
def ventas_por_localidad(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(
            Cliente.localidad,
            func.count(func.distinct(Cliente.id_cliente)).label("total_clientes"),
            func.count(Pedido.id_pedido).label("total_pedidos"),
            func.sum(Pedido.total).label("ingresos"),
        )
        .join(Pedido, Pedido.id_cliente == Cliente.id_cliente)
        .filter(Cliente.localidad.isnot(None))
        .group_by(Cliente.localidad)
        .all()
    )

    return [
        {
            "localidad": r.localidad,
            "lat": CENTROIDES_LOCALIDADES[r.localidad][0],
            "lng": CENTROIDES_LOCALIDADES[r.localidad][1],
            "total_clientes": r.total_clientes,
            "total_pedidos": r.total_pedidos,
            "ingresos": float(r.ingresos or 0),
        }
        for r in resultados
        if r.localidad in CENTROIDES_LOCALIDADES
    ]


# ============================================================
# MAPA DE CLIENTES Y PRODUCTOS
#
# La base de datos no guarda coordenadas por cliente, solo su localidad
# y direccion. Para poder dibujar cada cliente se usa el centroide de su
# localidad y un desplazamiento estable (derivado del id del cliente, siempre
# el mismo) de hasta ~1,2 km. Por eso la posicion es APROXIMADA y la
# respuesta lo indica; el dia que se carguen latitud/longitud reales,
# este es el unico lugar que hay que cambiar.
# Solo se incluyen clientes con autorizacion_datos (Ley 1581 de 2012).
# ============================================================

RADIO_DESPLAZAMIENTO_GRADOS = 0.011  # ~1,2 km


def posicion_aproximada(id_cliente: int, localidad: str) -> tuple[float, float]:
    lat0, lng0 = CENTROIDES_LOCALIDADES[localidad]
    digest = hashlib.sha256(f"flowinsight-{id_cliente}".encode()).digest()
    angulo = int.from_bytes(digest[:4], "big") / 2**32 * 2 * math.pi
    radio = math.sqrt(int.from_bytes(digest[4:8], "big") / 2**32) * RADIO_DESPLAZAMIENTO_GRADOS
    return lat0 + radio * math.sin(angulo), lng0 + radio * math.cos(angulo)


@router.get("/mapa-clientes", response_model=MapaClientesOut)
def mapa_clientes(
    producto: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    filas = (
        db.query(
            Cliente.id_cliente,
            Cliente.nombre_cliente,
            Cliente.localidad,
            Cliente.direccion,
            Producto.nombre_producto,
            func.sum(DetallePedido.cantidad).label("cantidad"),
            func.sum(DetallePedido.subtotal).label("ingresos"),
            func.count(func.distinct(Pedido.id_pedido)).label("pedidos"),
            func.max(Pedido.fecha_pedido).label("ultima"),
        )
        .join(Pedido, Pedido.id_cliente == Cliente.id_cliente)
        .join(DetallePedido, DetallePedido.id_pedido == Pedido.id_pedido)
        .join(Producto, Producto.id_producto == DetallePedido.id_producto)
        .filter(Cliente.autorizacion_datos == True, Cliente.localidad.isnot(None))  # noqa: E712
        .group_by(Cliente.id_cliente, Cliente.nombre_cliente, Cliente.localidad, Cliente.direccion,
                  Producto.nombre_producto)
        .all()
    )

    por_cliente: dict[int, dict] = {}
    nombres_producto: set[str] = set()
    for f in filas:
        if f.localidad not in CENTROIDES_LOCALIDADES:
            continue
        nombres_producto.add(f.nombre_producto)
        c = por_cliente.setdefault(f.id_cliente, {
            "id_cliente": f.id_cliente, "nombre_cliente": f.nombre_cliente, "localidad": f.localidad,
            "direccion": f.direccion, "ultima": f.ultima, "productos": [],
        })
        c["ultima"] = max(c["ultima"], f.ultima)
        c["productos"].append(ProductoCliente(
            nombre=f.nombre_producto, cantidad=int(f.cantidad or 0), ingresos=float(f.ingresos or 0)))

    pedidos_por_cliente = dict(
        db.query(Pedido.id_cliente, func.count(Pedido.id_pedido)).group_by(Pedido.id_cliente).all()
    )
    ahora = datetime.utcnow()
    puntos = []
    for c in por_cliente.values():
        productos = sorted(c["productos"], key=lambda x: x.cantidad, reverse=True)
        if producto and not any(x.nombre == producto for x in productos):
            continue
        lat, lng = posicion_aproximada(c["id_cliente"], c["localidad"])
        puntos.append(PuntoCliente(
            id_cliente=c["id_cliente"], nombre_cliente=c["nombre_cliente"], localidad=c["localidad"],
            direccion=c["direccion"], lat=lat, lng=lng, pedidos=pedidos_por_cliente.get(c["id_cliente"], 0),
            ingresos=sum(x.ingresos for x in productos), dias_sin_comprar=(ahora - c["ultima"]).days,
            producto_principal=productos[0].nombre if productos else None, productos=productos,
        ))

    sin_autorizacion = (
        db.query(func.count(Cliente.id_cliente)).filter(Cliente.autorizacion_datos != True).scalar() or 0  # noqa: E712
    )
    return MapaClientesOut(
        productos_disponibles=sorted(nombres_producto),
        clientes=sorted(puntos, key=lambda x: x.ingresos, reverse=True),
        clientes_sin_autorizacion=sin_autorizacion,
    )
