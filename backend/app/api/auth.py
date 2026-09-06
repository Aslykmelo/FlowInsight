from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Usuario
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.schemas.auth import Token, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == form_data.username).first()
    if not usuario or not verify_password(form_data.password, usuario.contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    if usuario.estado == "inactivo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu usuario está inactivo. Contacta a un administrador.",
        )

    usuario.ultima_sesion = datetime.now()
    db.commit()

    token = create_access_token({"sub": str(usuario.id_usuario)})
    return Token(access_token=token)


@router.get("/me", response_model=UsuarioOut)
def leer_usuario_actual(usuario: Usuario = Depends(get_current_user)):
    return UsuarioOut(
        id_usuario=usuario.id_usuario,
        nombre_usuario=usuario.nombre_usuario,
        correo=usuario.correo,
        rol=usuario.rol.nombre_rol,
    )