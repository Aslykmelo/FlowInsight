from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Numeric, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base


class Rol(Base):
    __tablename__ = "rol"

    id_rol = Column(Integer, primary_key=True)
    nombre_rol = Column(String(50), nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True)
    id_rol = Column(Integer, ForeignKey("rol.id_rol"), nullable=False)
    nombre_usuario = Column(String(100), nullable=False)
    contrasena = Column(String(255), nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    estado = Column(String(20), default="activo")      
    ultima_sesion = Column(DateTime, nullable=True)      

    rol = relationship("Rol", back_populates="usuarios")


class Cliente(Base):
    __tablename__ = "cliente"

    id_cliente = Column(Integer, primary_key=True)
    nombre_cliente = Column(String(150), nullable=False)
    telefono = Column(String(20))
    correo = Column(String(150))
    direccion = Column(String(255))
    ciudad = Column(String(100), nullable=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    autorizacion_datos = Column(Boolean, default=False)

    pedidos = relationship("Pedido", back_populates="cliente")


class Producto(Base):
    __tablename__ = "producto"

    id_producto = Column(Integer, primary_key=True)
    nombre_producto = Column(String(150), nullable=False)
    categoria = Column(String(100))
    precio = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0)


class Pedido(Base):
    __tablename__ = "pedido"

    id_pedido = Column(Integer, primary_key=True)
    id_cliente = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=False)
    fecha_pedido = Column(DateTime, default=datetime.utcnow)
    total = Column(Numeric(12, 2), default=0)
    estado_pedido = Column(String(50), default="pendiente")
    canal = Column(String(50))

    cliente = relationship("Cliente", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido")


class DetallePedido(Base):
    __tablename__ = "detalle_pedido"

    id_detalle = Column(Integer, primary_key=True)
    id_pedido = Column(Integer, ForeignKey("pedido.id_pedido"), nullable=False)
    id_producto = Column(Integer, ForeignKey("producto.id_producto"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="detalles")


class ImportacionInteracciones(Base):
    __tablename__ = "importacion_interacciones"

    id_registro = Column(Integer, primary_key=True)
    id_cliente = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=False)
    fecha_importacion = Column(DateTime, default=datetime.utcnow)
    tipo_interaccion = Column(String(50))
    fuente_archivo = Column(String(255))


class AnalisisComportamiento(Base):
    __tablename__ = "analisis_comportamiento"

    id_analisis = Column(Integer, primary_key=True)
    id_cliente = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=False)
    frecuencia_compra = Column(Numeric(10, 2))
    promedio_gasto = Column(Numeric(12, 2))
    prediccion_recompra = Column(DateTime)
    fecha_analisis = Column(DateTime, default=datetime.utcnow)
    nivel_satisfaccion = Column(String(50))


class ModeloPrediccion(Base):
    __tablename__ = "modelo_prediccion"

    id_modelo = Column(Integer, primary_key=True)
    version = Column(String(20), nullable=False)
    fecha_entrenamiento = Column(DateTime, default=datetime.utcnow)
    precision_modelo = Column(Numeric(5, 4))
    notas = Column(Text)


class PrediccionCliente(Base):
    __tablename__ = "prediccion_cliente"

    id_prediccion = Column(Integer, primary_key=True)
    id_cliente = Column(Integer, ForeignKey("cliente.id_cliente"), nullable=False)
    id_modelo = Column(Integer, ForeignKey("modelo_prediccion.id_modelo"), nullable=False)
    fecha_prediccion = Column(DateTime, default=datetime.utcnow)
    probabilidad_recompra = Column(Numeric(5, 4))
    riesgo_abandono = Column(Numeric(5, 4))


class LogActividad(Base):
    __tablename__ = "log_actividad"

    id_log = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_pedido = Column(Integer, ForeignKey("pedido.id_pedido"), nullable=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    tipo = Column(String(50))
    descripcion = Column(Text)


class ReporteGenerado(Base):
    __tablename__ = "reporte_generado"

    id_reporte = Column(Integer, primary_key=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_pedido = Column(Integer, ForeignKey("pedido.id_pedido"), nullable=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    formato = Column(String(20))
    estado = Column(String(50))
    nombre = Column(String(200))        
    tipo = Column(String(50))           
    archivo_path = Column(String(500)) 