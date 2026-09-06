from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Usuario
from app.core.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        usuario = (
            db.query(Usuario)
            .filter(Usuario.id_usuario == int(user_id))
            .first()
        )

        if usuario is None:
            raise credentials_exception

        if usuario.estado == "inactivo":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu usuario está inactivo. Contacta a un administrador.",
            )

        return usuario

    except HTTPException:
        raise
    except Exception:
        raise credentials_exception


def require_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if not usuario.rol or usuario.rol.nombre_rol != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede realizar esta acción",
        )
    return usuario