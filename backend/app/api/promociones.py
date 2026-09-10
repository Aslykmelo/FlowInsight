import re
from datetime import datetime
from urllib.parse import quote
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Pedido, DetallePedido, Producto, Usuario
from app.schemas.promociones import ClientePromocion, MensajePromocionOut
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/promociones", tags=["promociones"])


# ============================================================
# Umbrales de recencia (dias sin comprar) calcados de los
# perfiles usados para generar el dataset: activo = compras
# recientes, ocasional = hasta 45 dias sin comprar, en_riesgo
# = 90 a 250 dias sin comprar. Mientras no exista un modelo de
# IA entrenado (PrediccionCliente.riesgo_abandono), esta es la
# señal real que usamos; el dia que el modelo este entrenado,
# se puede reemplazar esta categorizacion por riesgo_abandono
# sin tocar el resto del endpoint.
# ============================================================
UMBRAL_ACTIVO = 30
UMBRAL_OCASIONAL = 90


def categorizar(dias_sin_comprar: int) -> str:
    if dias_sin_comprar <= UMBRAL_ACTIVO:
        return "activo"
    if dias_sin_comprar <= UMBRAL_OCASIONAL:
        return "ocasional"
    return "en_riesgo"


def producto_favorito_de(db: Session, id_cliente: int) -> Optional[str]:
    resultado = (
        db.query(Producto.nombre_producto)
        .join(DetallePedido, DetallePedido.id_producto == Producto.id_producto)
        .join(Pedido, Pedido.id_pedido == DetallePedido.id_pedido)
        .filter(Pedido.id_cliente == id_cliente)
        .group_by(Producto.nombre_producto)
        .order_by(func.sum(DetallePedido.cantidad).desc())
        .first()
    )
    return resultado.nombre_producto if resultado else None


def generar_mensaje(nombre: str, dias: int, categoria: str, producto_favorito: Optional[str]) -> str:
    if categoria == "en_riesgo":
        fav = f" (tu producto favorito, {producto_favorito}, ya tiene disponibilidad)" if producto_favorito else ""
        return (
            f"Hola {nombre}, en W&T Food te extrañamos. Hace {dias} días no recibimos un pedido tuyo{fav}. "
            f"Como cliente especial, tenemos un descuento en tu próxima compra. ¿Te preparamos una cotización?"
        )
    if categoria == "ocasional":
        fav = f", incluido {producto_favorito}" if producto_favorito else ""
        return (
            f"Hola {nombre}, ¿cómo vas? Ya pasaron {dias} días desde tu último pedido con nosotros. "
            f"Tenemos buena disponibilidad esta semana{fav}. ¿Programamos tu próximo pedido?"
        )
    fav = f" Vimos que sueles pedir {producto_favorito}." if producto_favorito else ""
    return (
        f"Hola {nombre}, gracias por seguir confiando en W&T Food.{fav} "
        f"Esta semana tenemos promociones que te pueden interesar. ¿Te enviamos el catálogo actualizado?"
    )


def link_whatsapp_de(telefono: Optional[str], mensaje: str) -> Optional[str]:
    if not telefono:
        return None
    solo_digitos = re.sub(r"\D", "", telefono)
    if not solo_digitos:
        return None
    if len(solo_digitos) == 10:
        solo_digitos = "57" + solo_digitos
    return f"https://wa.me/{solo_digitos}?text={quote(mensaje)}"


# ============================================================
# LISTA DE CLIENTES CON SU CATEGORIA DE RECENCIA
#
# IMPORTANTE: se filtra por Cliente.autorizacion_datos == True,
# para respetar la Ley 1581 de 2012. No quitar este filtro sin
# agregar uno equivalente.
# ============================================================

@router.get("/clientes", response_model=list[ClientePromocion])
def listar_clientes_promocion(
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ultima_compra = (
        db.query(
            Pedido.id_cliente,
            func.max(Pedido.fecha_pedido).label("ultima_fecha"),
        )
        .group_by(Pedido.id_cliente)
        .subquery()
    )

    resultados = (
        db.query(Cliente, ultima_compra.c.ultima_fecha)
        .join(ultima_compra, ultima_compra.c.id_cliente == Cliente.id_cliente)
        .filter(Cliente.autorizacion_datos == True)
        .all()
    )

    ahora = datetime.utcnow()
    clientes = []
    for cliente, ultima_fecha in resultados:
        dias = (ahora - ultima_fecha).days
        cat = categorizar(dias)
        if categoria and cat != categoria:
            continue
        clientes.append(
            ClientePromocion(
                id_cliente=cliente.id_cliente,
                nombre_cliente=cliente.nombre_cliente,
                telefono=cliente.telefono,
                dias_sin_comprar=dias,
                categoria=cat,
            )
        )

    clientes.sort(key=lambda c: c.dias_sin_comprar, reverse=True)
    return clientes


# ============================================================
# MENSAJE DE PROMOCION PARA UN CLIENTE ESPECIFICO
#
# IMPORTANTE: se verifica autorizacion_datos aunque el cliente
# venga directo por id_cliente (no solo desde la lista ya
# filtrada de arriba), porque este endpoint genera contacto
# real (mensaje + link de WhatsApp), no solo una visualizacion
# interna. Ley 1581 de 2012.
# ============================================================

@router.get("/mensaje/{id_cliente}", response_model=MensajePromocionOut)
def generar_mensaje_promocion(
    id_cliente: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if not cliente.autorizacion_datos:
        raise HTTPException(
            status_code=403,
            detail="Este cliente no ha autorizado el uso de sus datos; no se puede generar un mensaje de promoción",
        )

    ultima_fecha = (
        db.query(func.max(Pedido.fecha_pedido))
        .filter(Pedido.id_cliente == id_cliente)
        .scalar()
    )
    if not ultima_fecha:
        raise HTTPException(
            status_code=400,
            detail="Este cliente no tiene pedidos registrados; no se puede generar un mensaje de promoción",
        )

    dias = (datetime.utcnow() - ultima_fecha).days
    categoria = categorizar(dias)
    favorito = producto_favorito_de(db, id_cliente)
    mensaje = generar_mensaje(cliente.nombre_cliente, dias, categoria, favorito)

    return MensajePromocionOut(
        id_cliente=cliente.id_cliente,
        nombre_cliente=cliente.nombre_cliente,
        telefono=cliente.telefono,
        categoria=categoria,
        dias_sin_comprar=dias,
        producto_favorito=favorito,
        mensaje=mensaje,
        link_whatsapp=link_whatsapp_de(cliente.telefono, mensaje),
    )