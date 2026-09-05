from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Cliente
from app.schemas.clientes import ClienteCreate, ClienteOut
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