from app.db.session import SessionLocal
from app.models.models import Rol, Usuario
from app.core.security import hash_password

db = SessionLocal()

rol = db.query(Rol).filter(Rol.nombre_rol == "Ventas").first()
if not rol:
    rol = Rol(nombre_rol="Ventas")
    db.add(rol)
    db.commit()
    db.refresh(rol)

usuario = db.query(Usuario).filter(Usuario.correo == "ventas@flowinsight.com").first()
if not usuario:
    usuario = Usuario(
        id_rol=rol.id_rol,
        nombre_usuario="Equipo Ventas",
        correo="ventas@flowinsight.com",
        contrasena=hash_password("ventas123"),
    )
    db.add(usuario)
    db.commit()
    print(f"Usuario creado: {usuario.correo} / contraseña: ventas123")
else:
    print("El usuario de ventas ya existia")

db.close()
