import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Asistente from "./Asistente";

interface Props {
  roles?: string[];
}

export default function ProtectedRoute({ roles }: Props) {
  const { usuario, cargando } = useAuth();
  const token = localStorage.getItem("token");

  // Sin token: regresar al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (cargando) {
    return (
      <div role="status" style={{ padding: "2rem", color: "#666", fontFamily: "system-ui, sans-serif" }}>
        Cargando...
      </div>
    );
  }

  // Token vencido o inválido: la sesión ya se limpió en el contexto
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  // Ruta restringida a ciertos roles
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Outlet />
      <Asistente />
    </>
  );
}
