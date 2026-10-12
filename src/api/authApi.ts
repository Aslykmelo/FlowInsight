import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Perfil {
  id_usuario: number;
  nombre_usuario: string;
  correo: string;
  rol: string;
  telefono: string | null;
  estado: string | null;
  ultima_sesion: string | null;
}

export interface ModeloInfo {
  version: string;
  fecha_entrenamiento: string | null;
  r2: number | null;
  umbral_r2: number;
  f1: number | null;
  umbral_f1: number;
  precision: number | null;
  recall: number | null;
  snapshots_total: number | null;
  snapshots_entrenamiento: number | null;
  snapshots_prueba: number | null;
  variables: string[];
  clientes_con_prediccion: number;
  notas: string | null;
}

export const getMe = () => api.get<Perfil>("/auth/me").then((r) => r.data);

export const updateMe = (datos: { nombre_usuario?: string; telefono?: string }) =>
  api.patch<Perfil>("/auth/me", datos).then((r) => r.data);

export const changePassword = (contrasena_actual: string, nueva_contrasena: string) =>
  api
    .post<{ mensaje: string }>("/auth/cambiar-contrasena", { contrasena_actual, nueva_contrasena })
    .then((r) => r.data);

export const forgotPassword = (correo: string) =>
  api.post<{ mensaje: string }>("/auth/forgot-password", { correo }).then((r) => r.data);

export const resetPassword = (correo: string, codigo: string, nueva_contrasena: string) =>
  api
    .post<{ mensaje: string }>("/auth/reset-password", { correo, codigo, nueva_contrasena })
    .then((r) => r.data);

export const getModelInfo = () => api.get<ModeloInfo>("/predicciones/modelo").then((r) => r.data);

export function mensajeDeError(err: unknown, porDefecto: string): string {
  if (axios.isAxiosError(err)) {
    const detalle = err.response?.data?.detail;
    if (typeof detalle === "string") return detalle;
    if (Array.isArray(detalle) && detalle[0]?.msg) return String(detalle[0].msg);
    if (!err.response) return "No se pudo conectar con el servidor.";
  }
  return porDefecto;
}
