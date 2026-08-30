import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",  // URL de tu FastAPI
  headers: { "Content-Type": "application/json" },
});

// Añadir JWT a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getDashboardKPIs   = () => api.get("/dashboard/kpis");
export const getSalesData       = () => api.get("/dashboard/sales");
export const getPredictions     = () => api.get("/predictions");
export const uploadExcel        = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};