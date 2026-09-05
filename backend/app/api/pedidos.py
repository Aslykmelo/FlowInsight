from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Pedido, DetallePedido, Producto
from app.schemas.pedido import PedidoCreate, PedidoOut
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.post("/", response_model=PedidoOut)
def crear_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    nuevo_pedido = Pedido(
        id_cliente=pedido.id_cliente,
        canal=pedido.canal,
        estado_pedido="pendiente",
        total=0,
    )

    db.add(nuevo_pedido)
    db.flush()

    total = 0

    for item in pedido.detalles:
        producto = (
            db.query(Producto)
            .filter(Producto.id_producto == item.id_producto)
            .first()
        )

        if not producto:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item.id_producto} no existe",
            )

        subtotal = float(producto.precio) * item.cantidad

        detalle = DetallePedido(
            id_pedido=nuevo_pedido.id_pedido,
            id_producto=item.id_producto,
            cantidad=item.cantidad,
            precio_unitario=producto.precio,
            subtotal=subtotal,
        )

        db.add(detalle)
        total += subtotal

    nuevo_pedido.total = total

    db.commit()
    db.refresh(nuevo_pedido)

    return nuevo_pedido


@router.get("/", response_model=list[PedidoOut])
def listar_pedidos(
    db: Session = Depends(get_db),
    usuario_actual=Depends(get_current_user),
):
    return db.query(Pedido).all()