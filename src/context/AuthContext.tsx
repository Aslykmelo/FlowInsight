import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe, type Perfil } from "../api/authApi";

interface AuthValue {
  usuario: Perfil | null;
  cargando: boolean;
  esAdmin: boolean;
  recargar: () => Promise<void>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState<boolean>(!!localStorage.getItem("token"));

  const recargar = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setUsuario(await getMe());
    } catch {
      localStorage.removeItem("token");
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    let activo = true;
    getMe()
      .then((u) => activo && setUsuario(u))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem("token");
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        esAdmin: usuario?.rol === "Administrador",
        recargar,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
