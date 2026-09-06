from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente, Pedido
from app.schemas.clientes import ClienteCreate, ClienteOut, ClienteResumen
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.post("/", response_model=ClienteOut)
def crear_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    nuevo = Cliente(**cliente.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/", response_model=list[ClienteOut])
def listar_clientes(
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    return db.query(Cliente).all()


@router.get("/resumen", response_model=list[ClienteResumen])
def listar_clientes_resumen(
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    clientes = db.query(Cliente).all()
    resultado = []

    for cliente in clientes:
        pedidos = (
            db.query(Pedido)
            .filter(Pedido.id_cliente == cliente.id_cliente)
            .order_by(Pedido.fecha_pedido)
            .all()
        )

        total_pedidos = len(pedidos)
        monto_total = sum(float(p.total or 0) for p in pedidos)
        ultima_compra = pedidos[-1].fecha_pedido if pedidos else None

        intervalo_promedio = None
        fechas = [p.fecha_pedido for p in pedidos if p.fecha_pedido]
        if len(fechas) >= 2:
            diffs = [
                (fechas[i + 1] - fechas[i]).days
                for i in range(len(fechas) - 1)
            ]
            if diffs:
                intervalo_promedio = round(sum(diffs) / len(diffs))

        if not ultima_compra:
            estado = "inactivo"
        else:
            dias_desde_ultima = (datetime.now() - ultima_compra).days
            if dias_desde_ultima <= 15:
                estado = "activo"
            elif dias_desde_ultima <= 30:
                estado = "en riesgo"
            else:
                estado = "inactivo"

        resultado.append({
            "id_cliente": cliente.id_cliente,
            "nombre_cliente": cliente.nombre_cliente,
            "telefono": cliente.telefono,
            "correo": cliente.correo,
            "direccion": cliente.direccion,
            "ciudad": cliente.ciudad,
            "localidad": cliente.localidad,
            "total_pedidos": total_pedidos,
            "monto_total": monto_total,
            "ultima_compra": ultima_compra,
            "intervalo_promedio": intervalo_promedio,
            "estado": estado,
        })

    return resultado