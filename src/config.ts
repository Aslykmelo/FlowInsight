// URL del backend (FastAPI).
// En desarrollo usa localhost; en producción Vercel la toma de la variable VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
