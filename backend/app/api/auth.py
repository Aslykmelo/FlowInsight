import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import Usuario
from app.core.config import settings
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.sms import enviar_sms
from app.core.correo import enviar_correo
from app.core.plantillas_correo import correo_codigo
from app.core.telefono import normalizar_telefono
from app.schemas.auth import (
    Token,
    UsuarioOut,
    PerfilUpdate,
    CambiarContrasenaIn,
    ForgotPasswordIn,
    ResetPasswordIn,
    MensajeOut,
)

logger = logging.getLogger("flowinsight.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

MENSAJE_RECUPERACION = (
    "Si el correo está registrado, enviamos un código de verificación por SMS o por correo."
)
ERROR_CODIGO = "Código inválido o vencido"


def _enviar_codigo(usuario: Usuario, codigo: str) -> str | None:
    """Entrega el codigo por SMS si hay telefono y un proveedor de SMS real configurado; si no se puede,
    lo envia al correo de la cuenta. Devuelve el canal usado ("sms" o "correo") o None si fallo todo."""
    if usuario.telefono and settings.sms_provider != "consola":
        mensaje = (
            f"FlowInsight: tu código para restablecer la contraseña es {codigo}. "
            f"Vence en {settings.recovery_code_minutes} minutos. Si no lo pediste, ignóralo."
        )
        if enviar_sms(usuario.telefono, mensaje):
            return "sms"
        logger.warning("Fallo el SMS de recuperación del usuario %s; se intenta por correo", usuario.id_usuario)

    asunto, html, texto = correo_codigo(usuario.nombre_usuario, codigo, settings.recovery_code_minutes)
    if enviar_correo(usuario.correo, asunto, html, texto):
        return "correo"
    return None


def _usuario_out(usuario: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id_usuario=usuario.id_usuario,
        nombre_usuario=usuario.nombre_usuario,
        correo=usuario.correo,
        rol=usuario.rol.nombre_rol,
        telefono=usuario.telefono,
        estado=usuario.estado,
        ultima_sesion=usuario.ultima_sesion,
    )


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
    return _usuario_out(usuario)


@router.patch("/me", response_model=UsuarioOut)
def actualizar_perfil(
    datos: PerfilUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if datos.nombre_usuario is not None:
        usuario.nombre_usuario = datos.nombre_usuario.strip()

    if datos.telefono is not None:
        if datos.telefono.strip() == "":
            usuario.telefono = None
        else:
            try:
                usuario.telefono = normalizar_telefono(datos.telefono)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=str(e))

    db.commit()
    db.refresh(usuario)
    return _usuario_out(usuario)


@router.post("/cambiar-contrasena", response_model=MensajeOut)
def cambiar_contrasena(
    datos: CambiarContrasenaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not verify_password(datos.contrasena_actual, usuario.contrasena):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    usuario.contrasena = hash_password(datos.nueva_contrasena)
    db.commit()
    return MensajeOut(mensaje="Contraseña actualizada")


@router.post("/forgot-password", response_model=MensajeOut)
def solicitar_codigo_recuperacion(datos: ForgotPasswordIn, db: Session = Depends(get_db)):
    """Genera un codigo de 6 digitos y lo envia por SMS al telefono del usuario.
    Siempre responde igual, exista o no la cuenta, para no revelar que correos estan registrados."""
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo.strip()).first()

    if not usuario or usuario.estado == "inactivo":
        return MensajeOut(mensaje=MENSAJE_RECUPERACION)

    ahora = datetime.now()
    vigencia = timedelta(minutes=settings.recovery_code_minutes)

    if usuario.codigo_recuperacion_expira:
        generado = usuario.codigo_recuperacion_expira - vigencia
        if (ahora - generado).total_seconds() < settings.recovery_code_resend_seconds:
            return MensajeOut(mensaje=MENSAJE_RECUPERACION)

    codigo = f"{secrets.randbelow(10**6):06d}"
    usuario.codigo_recuperacion_hash = hash_password(codigo)
    usuario.codigo_recuperacion_expira = ahora + vigencia
    usuario.codigo_recuperacion_intentos = 0
    db.commit()

    canal = _enviar_codigo(usuario, codigo)
    if canal is None:
        logger.error("No se pudo enviar el código de recuperación al usuario %s por ningún canal", usuario.id_usuario)

    return MensajeOut(mensaje=MENSAJE_RECUPERACION)


@router.post("/reset-password", response_model=MensajeOut)
def restablecer_contrasena(datos: ResetPasswordIn, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.correo.strip()).first()

    codigo_invalido = HTTPException(status_code=400, detail=ERROR_CODIGO)

    if (
        not usuario
        or usuario.estado == "inactivo"
        or not usuario.codigo_recuperacion_hash
        or not usuario.codigo_recuperacion_expira
        or usuario.codigo_recuperacion_expira < datetime.now()
        or (usuario.codigo_recuperacion_intentos or 0) >= settings.recovery_code_max_attempts
    ):
        raise codigo_invalido

    if not verify_password(datos.codigo, usuario.codigo_recuperacion_hash):
        usuario.codigo_recuperacion_intentos = (usuario.codigo_recuperacion_intentos or 0) + 1
        db.commit()
        raise codigo_invalido

    usuario.contrasena = hash_password(datos.nueva_contrasena)
    usuario.codigo_recuperacion_hash = None
    usuario.codigo_recuperacion_expira = None
    usuario.codigo_recuperacion_intentos = 0
    db.commit()

    return MensajeOut(mensaje="Contraseña restablecida. Ya puedes iniciar sesión.")
