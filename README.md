# FlowInsight

Aplicación web para el análisis y visualización del comportamiento de clientes de **W&T Food S.A.S.**, desarrollada como proyecto de grado de Ingeniería de Software (Universidad Manuela Beltrán).

Centraliza los pedidos y clientes que hoy se manejan en archivos Excel, calcula indicadores de compra automáticamente y usa dos modelos de machine learning (Random Forest Regressor y Gradient Boosting Classifier sobre variables RFM) para estimar cuándo volverá a comprar un cliente y su riesgo de abandono.

## Estado actual

| Módulo | Estado |
|---|---|
| Frontend (React + Vite + TS) | Funcional: dashboard, carga de Excel, predicciones, clientes, reportes, promociones, mapa de Bogotá, cubo OLAP 3D, usuarios; diseño responsivo |
| Backend (FastAPI + PostgreSQL) | Funcional: autenticación JWT con roles, ETL de Excel con deduplicación, dashboard, reportes Excel/PDF, promociones, OLAP, predicciones |
| Modelo de IA | Entrenado y conectado al backend. Resultado sobre el dataset sintético: R² = 0.23 (meta 0.75) y F1 = 0.30 (meta 0.78); ver limitación abajo |
| Pruebas | 36 pruebas automatizadas (pytest), 79 % de cobertura del backend |
| Despliegue | Solo entorno local de prueba; sin despliegue en producción |

### Limitaciones conocidas

- La precisión de los modelos está por debajo de la meta porque el dataset sintético no reproduce la dependencia temporal de un abandono real; se espera mejorar con historial real de la empresa.
- Solo se aceptan archivos `.xlsx` / `.xls` en la carga (no `.csv`).
- No hay alertas automáticas ni reentrenamiento periódico del modelo (el reentrenamiento es manual con `train_model.py`).
- No hay registro de logs de auditoría ni cifrado de datos de clientes a nivel de aplicación.
- El CORS del backend solo admite `http://localhost:<puerto>`.

## Stack

- **Frontend**: React 19, Vite, TypeScript, React Router, Axios, Chart.js / Recharts, Leaflet, three.js
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Alembic, pandas / openpyxl, reportlab
- **IA**: scikit-learn (Random Forest Regressor, Gradient Boosting Classifier)
- **Pruebas**: pytest, httpx, pytest-cov

## Estructura

```
src/                # Frontend
  api/              # Cliente HTTP hacia el backend (axios + JWT)
  components/       # Componentes compartidos (Sidebar, rutas protegidas)
  pages/            # Dashboard, UploadExcel, Predictions, Clients, Reports,
                    # Promotions, SalesMap, OlapCube, Users, Login
backend/
  app/api/          # Routers FastAPI
  app/models/       # Modelos SQLAlchemy
  alembic/          # Migraciones
  tests/            # Pruebas automatizadas
  generate_dataset.py, train_model.py, create_admin.py, create_ventas_user.py
```

## Puesta en marcha local

Requisitos: Node.js 20+, Python 3.12+, PostgreSQL.

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # en Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # completar DATABASE_URL y SECRET_KEY
alembic upgrade head            # crea las tablas
python create_admin.py          # usuario administrador de prueba
python create_ventas_user.py    # usuario analista de prueba
python generate_dataset.py      # dataset sintético (400 clientes)
python train_model.py           # entrena y guarda los modelos
uvicorn app.main:app --reload   # API en http://localhost:8000
```

Las contraseñas de los usuarios de prueba están en `create_admin.py` y `create_ventas_user.py`; cámbielas antes de cualquier uso fuera de desarrollo.

### Frontend

```bash
npm install
npm run dev                     # http://localhost:5173
```

El frontend espera la API en `http://localhost:8000` (ver `src/api`).

### Pruebas

```bash
cd backend
pytest --cov=app
```

Las pruebas corren sobre la base de desarrollo dentro de transacciones que se revierten al terminar, por lo que no alteran los datos.

## Equipo

- Asly Camelo — Backend, base de datos, arquitectura y liderazgo del proyecto
- Julian Quiroz — Integración
- Britney/Tatiana Torres — Frontend
