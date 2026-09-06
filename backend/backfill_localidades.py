"""
Asigna ciudad="Bogota" y una localidad real de Bogota a los clientes
del dataset sintetico que aun no la tienen, para poder alimentar el
mapa de ventas. La asignacion de localidad por cliente es aleatoria
(seed=42, igual que generate_dataset.py) pero ponderada por el peso
poblacional real aproximado de cada localidad, para que el mapa
resultante se vea realista.
"""
import random

from app.db.session import SessionLocal
from app.models.models import Cliente

random.seed(42)

# Peso relativo aproximado (poblacion real, redondeado) de cada localidad de Bogota.
LOCALIDADES_PESOS = {
    "Suba": 15,
    "Kennedy": 13,
    "Engativa": 12,
    "Bosa": 9,
    "Ciudad Bolivar": 8,
    "San Cristobal": 6,
    "Usaquen": 5,
    "Usme": 5,
    "Fontibon": 4,
    "Rafael Uribe Uribe": 4,
    "Puente Aranda": 3,
    "Tunjuelito": 2,
    "Barrios Unidos": 2,
    "Chapinero": 1.5,
    "Antonio Nariño": 1.5,
    "Los Martires": 1.5,
    "Teusaquillo": 1.5,
    "Santa Fe": 1,
    "La Candelaria": 0.5,
}

localidades = list(LOCALIDADES_PESOS.keys())
pesos = list(LOCALIDADES_PESOS.values())

db = SessionLocal()
clientes = db.query(Cliente).filter(Cliente.localidad.is_(None)).all()

for cliente in clientes:
    cliente.ciudad = cliente.ciudad or "Bogota"
    cliente.localidad = random.choices(localidades, weights=pesos, k=1)[0]

db.commit()
print(f"{len(clientes)} clientes actualizados con ciudad y localidad")
