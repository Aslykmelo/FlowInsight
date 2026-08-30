"""
Genera un dataset sintetico realista para FlowInsight, replicando la estructura
de los Excel de W&T Food S.A.S. (distribuidora de pollo, huevos y nueces).

No son datos reales de la empresa (protegidos por la Ley 1581 de 2012) - son
datos ficticios generados para poder desarrollar y entrenar el modelo de IA
sin exponer informacion real de clientes.

Diseñado para dejar señal real de comportamiento (RFM): una parte de los
clientes compra con frecuencia hasta hoy, otra parte compro solo al principio
y no ha vuelto - asi el futuro modelo de riesgo de abandono tiene patrones
reales que aprender, no solo ruido aleatorio.
"""

import random
from datetime import datetime, timedelta

from faker import Faker

from app.db.session import SessionLocal
from app.models.models import Cliente, Producto, Pedido, DetallePedido

fake = Faker("es_CO")
random.seed(42)

N_CLIENTES = 400
HOY = datetime(2026, 8, 29)

TIPOS_NEGOCIO = ["Restaurante", "Tienda", "Panaderia", "Cafeteria", "Hotel", "Asadero", "Supermercado"]

PRODUCTOS = [
    ("Pollo entero", "Carnes", 18500),
    ("Pechuga de pollo x kg", "Carnes", 16800),
    ("Alas de pollo x kg", "Carnes", 12500),
    ("Muslos de pollo x kg", "Carnes", 13200),
    ("Huevos AA x30", "Huevos", 22000),
    ("Huevos AA x360", "Huevos", 240000),
    ("Huevos rojos x30", "Huevos", 23500),
    ("Nueces de macadamia 1kg", "Nueces", 45000),
    ("Almendras 1kg", "Nueces", 38000),
    ("Nueces del Brasil 1kg", "Nueces", 42000),
    ("Mix de nueces 1kg", "Nueces", 40000),
    ("Maní tostado 1kg", "Nueces", 18000),
]


def generar_productos(db):
    productos = []
    for nombre, categoria, precio in PRODUCTOS:
        p = Producto(nombre_producto=nombre, categoria=categoria, precio=precio, stock=random.randint(50, 500))
        db.add(p)
        productos.append(p)
    db.flush()
    return productos


def generar_clientes(db):
    clientes = []
    for _ in range(N_CLIENTES):
        tipo = random.choice(TIPOS_NEGOCIO)
        nombre = f"{tipo} {fake.last_name()}"
        registro = HOY - timedelta(days=random.randint(60, 3 * 365))
        c = Cliente(
            nombre_cliente=nombre,
            telefono=fake.phone_number(),
            correo=fake.unique.company_email(),
            direccion=fake.address().replace("\n", ", "),
            fecha_registro=registro,
            autorizacion_datos=random.random() < 0.95,
        )
        db.add(c)
        clientes.append(c)
    db.flush()
    return clientes


def generar_pedidos(db, clientes, productos):
    total_pedidos = 0
    total_detalles = 0

    for cliente in clientes:
        perfil = random.choices(["activo", "ocasional", "en_riesgo"], weights=[0.5, 0.25, 0.25])[0]

        if perfil == "activo":
            n_pedidos = random.randint(15, 40)
            fin_compras = HOY
        elif perfil == "ocasional":
            n_pedidos = random.randint(4, 12)
            fin_compras = HOY - timedelta(days=random.randint(0, 45))
        else:  # en_riesgo: dejo de comprar hace tiempo
            n_pedidos = random.randint(2, 8)
            fin_compras = HOY - timedelta(days=random.randint(90, 250))

        inicio_compras = cliente.fecha_registro
        if fin_compras <= inicio_compras:
            fin_compras = inicio_compras + timedelta(days=1)
        rango_dias = max((fin_compras - inicio_compras).days, 1)

        fechas = sorted(inicio_compras + timedelta(days=random.randint(0, rango_dias)) for _ in range(n_pedidos))

        for fecha in fechas:
            pedido = Pedido(
                id_cliente=cliente.id_cliente,
                fecha_pedido=fecha,
                estado_pedido=random.choices(
                    ["entregado", "pendiente", "cancelado"], weights=[0.85, 0.1, 0.05]
                )[0],
                canal=random.choice(["telefono", "web", "excel", "presencial"]),
                total=0,
            )
            db.add(pedido)
            db.flush()

            n_items = random.randint(1, 4)
            productos_pedido = random.sample(productos, n_items)
            total_pedido = 0
            for producto in productos_pedido:
                cantidad = random.randint(1, 10)
                subtotal = float(producto.precio) * cantidad
                detalle = DetallePedido(
                    id_pedido=pedido.id_pedido,
                    id_producto=producto.id_producto,
                    cantidad=cantidad,
                    precio_unitario=producto.precio,
                    subtotal=subtotal,
                )
                db.add(detalle)
                total_pedido += subtotal
                total_detalles += 1

            pedido.total = total_pedido
            total_pedidos += 1

        db.commit()

    return total_pedidos, total_detalles


def main():
    db = SessionLocal()
    try:
        print("Generando productos...")
        productos = generar_productos(db)
        db.commit()
        print(f"  {len(productos)} productos creados")

        print("Generando clientes...")
        clientes = generar_clientes(db)
        db.commit()
        print(f"  {len(clientes)} clientes creados")

        print("Generando pedidos (esto toma un momento)...")
        total_pedidos, total_detalles = generar_pedidos(db, clientes, productos)
        print(f"  {total_pedidos} pedidos y {total_detalles} lineas de detalle creados")

        print("\nListo. Dataset sintetico generado.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
