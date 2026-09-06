from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Usuario, Rol
from app.schemas.usuarios import UsuarioCreate, UsuarioUpdate, EstadoUpdate, UsuarioOut
from app.core.security import hash_password
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/users", tags=["users"])


def _a_usuario_out(usuario: Usuario) -> dict:
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre_usuario,
        "email": usuario.correo,
        "rol": usuario.rol.nombre_rol if usuario.rol else "—",
        "estado": usuario.estado or "activo",
        "ultima_sesion": usuario.ultima_sesion,
    }


def _buscar_rol(db: Session, nombre_rol: str) -> Rol:
    rol = db.query(Rol).filter(Rol.nombre_rol == nombre_rol).first()
    if not rol:
        raise HTTPException(status_code=400, detail=f"El rol '{nombre_rol}' no existe")
    return rol


@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(require_admin),
):
    usuarios = db.query(Usuario).all()
    return [_a_usuario_out(u) for u in usuarios]


@router.post("", response_model=UsuarioOut)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(require_admin),
):
    existente = db.query(Usuario).filter(Usuario.correo == datos.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    rol = _buscar_rol(db, datos.rol)

    nuevo = Usuario(
        nombre_usuario=datos.nombre,
        correo=datos.email,
        contrasena=hash_password(datos.password),
        id_rol=rol.id_rol,
        estado="activo",
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return _a_usuario_out(nuevo)


@router.put("/{id_usuario}", response_model=UsuarioOut)
def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(require_admin),
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    rol = _buscar_rol(db, datos.rol)

    usuario.nombre_usuario = datos.nombre
    usuario.correo = datos.email
    usuario.id_rol = rol.id_rol

    if datos.password:
        usuario.contrasena = hash_password(datos.password)

    db.commit()
    db.refresh(usuario)

    return _a_usuario_out(usuario)


@router.patch("/{id_usuario}/estado", response_model=UsuarioOut)
def cambiar_estado(
    id_usuario: int,
    datos: EstadoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(require_admin),
):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if datos.estado not in ("activo", "inactivo"):
        raise HTTPException(status_code=400, detail="Estado inválido")

    usuario.estado = datos.estado
    db.commit()
    db.refresh(usuario)

    return _a_usuario_out(usuario)