"""Endpoints del asistente: apoyo a la decision sobre clientes.

Todo sale del historial real de pedidos y de la ultima prediccion guardada del modelo; ver
app.core.decision_cliente para las reglas.
"""
from collections import defaultdict
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.promociones import producto_favorito_de
from app.core.decision_cliente import Decision, Perfil, decidir, estadisticas, percentil, puntuar
from app.core.dependencies import get_current_user
from app.core.segmentos import dias_sin_comprar_de
from app.db.session import get_db
from app.models.models import Cliente, ModeloPrediccion, Pedido, PrediccionCliente, Usuario

router = APIRouter(prefix="/asistente", tags=["asistente"])


class ClienteBasico(BaseModel):
    id_cliente: int
    nombre_cliente: str


class SenalOut(BaseModel):
    texto: str
    tono: Literal["ok", "info", "atencion", "alerta"]


class AnalisisClienteOut(BaseModel):
    id_cliente: int
    nombre_cliente: str
    categoria: Optional[str]
    dias_sin_comprar: Optional[int]
    pedidos: int
    prioridad: Literal["alta", "media", "baja", "no_contactar"]
    puntaje: int
    titulo: str
    recomendacion: str
    pasos: list[str]
    senales: list[SenalOut]
    confianza: Literal["alta", "media", "baja"]
    aviso: str
    puede_contactar: bool


class PrioridadOut(BaseModel):
    id_cliente: int
    nombre_cliente: str
    categoria: Optional[str]
    dias_sin_comprar: Optional[int]
    prioridad: Literal["alta", "media", "baja", "no_contactar"]
    puntaje: int
    titulo: str


def _cargar_historial(db: Session) -> dict[int, list[tuple[datetime, float]]]:
    filas = (
        db.query(Pedido.id_cliente, Pedido.fecha_pedido, Pedido.total)
        .filter(Pedido.fecha_pedido.isnot(None))
        .order_by(Pedido.id_cliente, Pedido.fecha_pedido)
        .all()
    )
    historial: dict[int, list[tuple[datetime, float]]] = defaultdict(list)
    for id_cliente, fecha, total in filas:
        historial[id_cliente].append((fecha, float(total or 0)))
    return historial


def _riesgos_del_modelo(db: Session) -> dict[int, float]:
    modelo = db.query(ModeloPrediccion).order_by(ModeloPrediccion.id_modelo.desc()).first()
    if not modelo:
        return {}
    filas = (
        db.query(PrediccionCliente.id_cliente, PrediccionCliente.riesgo_abandono)
        .filter(PrediccionCliente.id_modelo == modelo.id_modelo)
        .all()
    )
    return {i: float(r) for i, r in filas if r is not None}


def _perfil(
    cliente: Cliente,
    compras: list[tuple[datetime, float]],
    montos_todos: list[float],
    riesgos: dict[int, float],
) -> Perfil:
    fechas = [f for f, _ in compras]
    monto = sum(t for _, t in compras)
    intervalo, tendencia = estadisticas(fechas)
    return Perfil(
        nombre=cliente.nombre_cliente,
        autorizado=bool(cliente.autorizacion_datos),
        pedidos=len(compras),
        monto_total=monto,
        ultima_compra=fechas[-1] if fechas else None,
        dias_sin_comprar=dias_sin_comprar_de(fechas[-1]) if fechas else None,
        intervalo_promedio=intervalo,
        tendencia=tendencia,
        percentil_valor=percentil(monto, montos_todos),
        riesgo_modelo=riesgos.get(cliente.id_cliente),
    )


@router.get("/clientes", response_model=list[ClienteBasico])
def listar_clientes(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    """Nombres de los clientes, para que el asistente reconozca a cual se refiere la pregunta."""
    filas = db.query(Cliente.id_cliente, Cliente.nombre_cliente).order_by(Cliente.nombre_cliente).all()
    return [ClienteBasico(id_cliente=i, nombre_cliente=n) for i, n in filas]


@router.get("/cliente/{id_cliente}", response_model=AnalisisClienteOut)
def analizar_cliente(
    id_cliente: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    historial = _cargar_historial(db)
    montos_todos = [sum(t for _, t in c) for c in historial.values()]
    perfil = _perfil(cliente, historial.get(id_cliente, []), montos_todos, _riesgos_del_modelo(db))
    perfil.producto_favorito = producto_favorito_de(db, id_cliente)
    d: Decision = decidir(perfil)

    return AnalisisClienteOut(
        id_cliente=cliente.id_cliente,
        nombre_cliente=cliente.nombre_cliente,
        categoria=perfil.categoria,
        dias_sin_comprar=perfil.dias_sin_comprar,
        pedidos=perfil.pedidos,
        prioridad=d.prioridad,
        puntaje=d.puntaje,
        titulo=d.titulo,
        recomendacion=d.recomendacion,
        pasos=d.pasos,
        senales=[SenalOut(texto=s.texto, tono=s.tono) for s in d.senales],
        confianza=d.confianza,
        aviso=d.aviso,
        puede_contactar=perfil.autorizado and perfil.dias_sin_comprar is not None,
    )


@router.get("/prioridades", response_model=list[PrioridadOut])
def clientes_prioritarios(
    limite: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """A quien contactar primero: clientes que autorizaron sus datos, ordenados por urgencia y valor."""
    historial = _cargar_historial(db)
    montos_todos = [sum(t for _, t in c) for c in historial.values()]
    riesgos = _riesgos_del_modelo(db)

    clientes = db.query(Cliente).filter(Cliente.autorizacion_datos == True).all()  # noqa: E712
    candidatos = []
    for c in clientes:
        compras = historial.get(c.id_cliente)
        if not compras:
            continue
        perfil = _perfil(c, compras, montos_todos, riesgos)
        candidatos.append((puntuar(perfil), perfil.dias_sin_comprar or 0, c, perfil))

    candidatos.sort(key=lambda x: (x[0], x[1]), reverse=True)
    salida = []
    for _, _, c, perfil in candidatos[:limite]:
        d = decidir(perfil)
        salida.append(PrioridadOut(
            id_cliente=c.id_cliente, nombre_cliente=c.nombre_cliente, categoria=perfil.categoria,
            dias_sin_comprar=perfil.dias_sin_comprar, prioridad=d.prioridad, puntaje=d.puntaje, titulo=d.titulo,
        ))
    return salida
