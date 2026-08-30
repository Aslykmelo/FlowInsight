import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");

  // Si no existe token, regresar al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si existe token, permitir acceso
  return <Outlet />;
}
