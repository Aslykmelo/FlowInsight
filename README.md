# FlowInsight

Aplicación web para el análisis y visualización del comportamiento de clientes de **W&T Food S.A.S.**, desarrollada como proyecto de grado de Ingeniería de Software (Universidad Manuela Beltrán).

Centraliza los pedidos y clientes que hoy se manejan en archivos Excel, calcula indicadores de compra automáticamente y usa dos modelos de machine learning (Random Forest Regressor y Gradient Boosting Classifier sobre variables RFM) para predecir cuándo volverá a comprar un cliente y estimar su riesgo de abandono.

## Estado actual

| Módulo | Estado |
|---|---|
| Frontend (React + Vite + TS) | En desarrollo — dashboard, carga de Excel, predicciones |
| Backend (FastAPI + PostgreSQL) | Pendiente |
| Modelo de IA | Diseñado, entrenamiento pendiente |
| Integración | Pendiente |

## Stack

- **Frontend**: React 19, Vite, TypeScript, React Router, Axios, Chart.js / Recharts
- **Backend** (pendiente de implementar): FastAPI, PostgreSQL, SQLAlchemy, Alembic
- **IA**: scikit-learn (Random Forest Regressor, Gradient Boosting Classifier)

## Estructura

```
src/
  api/          # Cliente HTTP hacia el backend (axios + JWT)
  components/   # Componentes compartidos
  pages/        # Dashboard, UploadExcel, Predictions, Clients
```

## Desarrollo local

```bash
npm install
npm run dev
```

El frontend espera un backend FastAPI corriendo en `http://localhost:8000` con los endpoints `/dashboard/kpis`, `/dashboard/sales`, `/predictions` y `/upload`.

## Equipo

- Asly Camelo — Backend, base de datos, arquitectura y liderazgo del proyecto
- Julian Quiroz — Integración
- Britney/Tatiana Torres — Frontend
