from app.db.session import SessionLocal
from app.models.models import Rol, Usuario
from app.core.security import hash_password

db = SessionLocal()

rol = db.query(Rol).filter(Rol.nombre_rol == "Administrador").first()
if not rol:
    rol = Rol(nombre_rol="Administrador")
    db.add(rol)
    db.commit()
    db.refresh(rol)

usuario = Usuario(
    id_rol=rol.id_rol,
    nombre_usuario="Asly",
    correo="asly@flowinsight.com",
    contrasena=hash_password("admin123"),
)
db.add(usuario)
db.commit()
print(f"Usuario creado: {usuario.correo} / contraseña: admin123")

db.close()