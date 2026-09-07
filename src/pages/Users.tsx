import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface User {
  id: number;
  nombre: string;
  email: string;
  rol: "Administrador" | "Analista";
  estado: "activo" | "inactivo";
  ultimaSesion: string;
}

interface ApiUsuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  ultima_sesion: string | null;
}

interface UserFormData {
  nombre: string;
  email: string;
  rol: User["rol"];
  password: string;
}

const API_URL = "http://127.0.0.1:8000";

const ESTADO_STYLE: Record<User["estado"], { color: string; bg: string; label: string }> = {
  activo:   { color: "#0F6E56", bg: "#E1F5EE", label: "Activo"   },
  inactivo: { color: "#993C1D", bg: "#FAECE7", label: "Inactivo" },
};

// ─── Helpers ───────────────────────────────────────────
const formatoFechaHora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "Nunca";

const rolValido = (rol: string): User["rol"] =>
  rol === "Administrador" ? "Administrador" : "Analista";

// ─── Modal de crear/editar usuario ─────────────────────
function UserModal({
  user,
  onSave,
  onClose,
  guardando,
  errorExterno,
}: {
  user: User | null;
  onSave: (data: UserFormData) => void;
  onClose: () => void;
  guardando: boolean;
  errorExterno: string;
}) {
  const esEdicion = user !== null;

  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [rol, setRol] = useState<User["rol"]>(user?.rol ?? "Analista");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (!esEdicion && !password.trim()) {
      setError("La contraseña es obligatoria para un usuario nuevo.");
      return;
    }
    setError("");
    onSave({ nombre: nombre.trim(), email: email.trim(), rol, password });
  };

  const mensajeError = error || errorExterno;

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 500, color: "#555", marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", border: "0.5px solid #e0e0e0", borderRadius: 8,
    padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="user-modal-title"
        style={{ background: "#fff", borderRadius: 12, padding: "2rem", width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <p id="user-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {esEdicion ? "Editar usuario" : "Agregar usuario"}
          </p>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Cerrar formulario de usuario"
            style={{ background: "transparent", border: "none",
            cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="user-nombre" style={labelStyle}>Nombre</label>
          <input id="user-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="user-email" style={labelStyle}>Correo electrónico</label>
          <input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@flowinsight.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="user-rol" style={labelStyle}>Rol</label>
          <select id="user-rol" value={rol} onChange={(e) => setRol(e.target.value as User["rol"])}
            style={{ ...inputStyle, background: "#fff" }}>
            <option value="Analista">Analista</option>
            <option value="Administrador">Administrador</option>
          </select>
        </div>

        <div style={{ marginBottom: mensajeError ? 10 : 20 }}>
          <label htmlFor="user-password" style={labelStyle}>
            {esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
          </label>
          <input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={esEdicion ? "Dejar en blanco para no cambiarla" : "••••••••"}
            aria-describedby={mensajeError ? "user-modal-error" : undefined}
            style={inputStyle} />
        </div>

        {mensajeError && (
          <div id="user-modal-error" role="alert" aria-live="assertive"
            style={{ background: "#FAECE7", border: "0.5px solid #E24B4A", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#993C1D", marginBottom: 16 }}>
            <span aria-hidden="true">⚠️</span> {mensajeError}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={guardando} style={{ flex: 1, background: "#fff", color: "#555",
            border: "0.5px solid #e0e0e0", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={guardando} style={{ flex: 1, background: "#534AB7", color: "#fff",
            border: "none", borderRadius: 8, padding: "10px", cursor: guardando ? "default" : "pointer",
            fontSize: 14, fontWeight: 500, opacity: guardando ? 0.7 : 1 }}>
            {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page ────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<User | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  // ───────────────────────────────────────────
  // CARGAR USUARIOS DEL BACKEND
  // ───────────────────────────────────────────
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No hay sesión iniciada.");
        return;
      }

      const response = await fetch(`${API_URL}/users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 403) {
        setError("No tienes permisos para gestionar usuarios (solo Administrador).");
        return;
      }

      if (!response.ok) {
        throw new Error(`Error al obtener usuarios: ${response.status}`);
      }

      const data: ApiUsuario[] = await response.json();

      const usuariosFormateados: User[] = data.map((u) => ({
        id: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        rol: rolValido(u.rol),
        estado: u.estado === "inactivo" ? "inactivo" : "activo",
        ultimaSesion: formatoFechaHora(u.ultima_sesion),
      }));

      setUsers(usuariosFormateados);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const datos = users.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear = () => {
    setUsuarioEditando(null);
    setErrorModal("");
    setModalAbierto(true);
  };

  const abrirEditar = (u: User) => {
    setUsuarioEditando(u);
    setErrorModal("");
    setModalAbierto(true);
  };

  // ───────────────────────────────────────────
  // CREAR / EDITAR USUARIO (POST o PUT /users)
  // ───────────────────────────────────────────
  const guardarUsuario = async (data: UserFormData) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorModal("No hay sesión iniciada.");
      return;
    }

    setGuardando(true);
    setErrorModal("");

    try {
      const esEdicion = usuarioEditando !== null;
      const url = esEdicion
        ? `${API_URL}/users/${usuarioEditando!.id}`
        : `${API_URL}/users`;

      const body = esEdicion
        ? { nombre: data.nombre, email: data.email, rol: data.rol, password: data.password || null }
        : { nombre: data.nombre, email: data.email, rol: data.rol, password: data.password };

      const response = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${response.status}`);
      }

      setModalAbierto(false);
      await cargarUsuarios();
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : "No fue posible guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  // ───────────────────────────────────────────
  // ACTIVAR / DESACTIVAR (PATCH /users/{id}/estado)
  // ───────────────────────────────────────────
  const toggleEstado = async (u: User) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const nuevoEstado = u.estado === "activo" ? "inactivo" : "activo";

    // Actualización optimista, para que la UI responda al instante
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, estado: nuevoEstado } : x))
    );

    try {
      const response = await fetch(`${API_URL}/users/${u.id}/estado`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      // Si falló, revierte el cambio optimista
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, estado: u.estado } : x))
      );
    }
  };

  // ───────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 18, color: "#666" }}>
          Cargando usuarios...
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────
  // ERROR
  // ───────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center",
          flexDirection: "column", gap: 10 }}>
          <h2>Error</h2>
          <p style={{ color: "#777" }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ background: "#534AB7", color: "#fff",
            border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />
      {modalAbierto && (
        <UserModal
          user={usuarioEditando}
          onSave={guardarUsuario}
          onClose={() => setModalAbierto(false)}
          guardando={guardando}
          errorExterno={errorModal}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Usuarios</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              Gestión de usuarios del sistema
            </p>
          </div>
          <button onClick={abrirCrear} style={{ background: "#534AB7", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 14 }}>
            + Agregar usuario
          </button>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 360, border: "0.5px solid #e0e0e0", borderRadius: 8,
              padding: "8px 12px", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }}
          />

          <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9", borderBottom: "0.5px solid #e0e0e0" }}>
                  {["Nombre", "Email", "Rol", "Estado", "Última sesión", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                      fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>
                    No se encontraron usuarios
                  </td></tr>
                ) : datos.map((u, i) => {
                  const s = ESTADO_STYLE[u.estado];
                  return (
                    <tr key={u.id} style={{ borderBottom: "0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.nombre}</td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, color: "#534AB7", background: "#EEEDFE",
                          padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
                          {u.rol}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, color: s.color, background: s.bg,
                          padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>{u.ultimaSesion}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => abrirEditar(u)}
                            style={{ background: "transparent", border: "0.5px solid #534AB7",
                              borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                              fontSize: 12, color: "#534AB7", fontWeight: 500 }}>
                            Editar
                          </button>
                          <button onClick={() => toggleEstado(u)}
                            style={{ background: "transparent",
                              border: u.estado === "activo" ? "0.5px solid #993C1D" : "0.5px solid #0F6E56",
                              borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12,
                              color: u.estado === "activo" ? "#993C1D" : "#0F6E56", fontWeight: 500 }}>
                            {u.estado === "activo" ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
            Mostrando {datos.length} de {users.length} usuarios
          </p>
        </main>
      </div>
    </div>
  );
}