import { useState } from "react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface User {
  id: string;
  nombre: string;
  email: string;
  rol: "Administrador" | "Analista";
  estado: "activo" | "inactivo";
  ultimaSesion: string;
}

interface UserFormData {
  nombre: string;
  email: string;
  rol: User["rol"];
  password: string;
}

// ─── Mock data — usuarios del sistema ─────────────────
const USUARIOS_INICIALES: User[] = [
  { id: "USR001", nombre: "Ana Torres",      email: "ana.torres@flowinsight.com",      rol: "Administrador", estado: "activo",   ultimaSesion: "22/04/2026 09:14" },
  { id: "USR002", nombre: "Julián Quintero", email: "julian.quintero@flowinsight.com", rol: "Analista",       estado: "activo",   ultimaSesion: "21/04/2026 17:40" },
  { id: "USR003", nombre: "Camila Rojas",    email: "camila.rojas@flowinsight.com",    rol: "Analista",       estado: "inactivo", ultimaSesion: "02/03/2026 11:05" },
  { id: "USR004", nombre: "Asly Camelo",     email: "asly@flowinsight.com",            rol: "Administrador", estado: "activo",   ultimaSesion: "22/04/2026 08:02" },
  { id: "USR005", nombre: "David Peña",      email: "david.pena@flowinsight.com",      rol: "Analista",       estado: "inactivo", ultimaSesion: "15/01/2026 13:22" },
];

const ESTADO_STYLE: Record<User["estado"], { color: string; bg: string; label: string }> = {
  activo:   { color: "#0F6E56", bg: "#E1F5EE", label: "Activo"   },
  inactivo: { color: "#993C1D", bg: "#FAECE7", label: "Inactivo" },
};

// ─── Modal de crear/editar usuario ─────────────────────
function UserModal({
  user,
  onSave,
  onClose,
}: {
  user: User | null;
  onSave: (data: UserFormData) => void;
  onClose: () => void;
}) {
  const esEdicion = user !== null;

  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [rol, setRol] = useState<User["rol"]>(user?.rol ?? "Analista");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (!esEdicion && !password.trim()) {
      setError("La contraseña es obligatoria para un usuario nuevo.");
      return;
    }
    onSave({ nombre: nombre.trim(), email: email.trim(), rol, password });
  };

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
        style={{ background: "#fff", borderRadius: 12, padding: "2rem", width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {esEdicion ? "Editar usuario" : "Agregar usuario"}
          </p>
          <button onClick={onClose} style={{ background: "transparent", border: "none",
            cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Correo electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@flowinsight.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Rol</label>
          <select value={rol} onChange={(e) => setRol(e.target.value as User["rol"])}
            style={{ ...inputStyle, background: "#fff" }}>
            <option value="Analista">Analista</option>
            <option value="Administrador">Administrador</option>
          </select>
        </div>

        <div style={{ marginBottom: error ? 10 : 20 }}>
          <label style={labelStyle}>
            {esEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
          </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={esEdicion ? "Dejar en blanco para no cambiarla" : "••••••••"}
            style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: "#FAECE7", border: "0.5px solid #E24B4A", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, color: "#993C1D", marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#fff", color: "#555",
            border: "0.5px solid #e0e0e0", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} style={{ flex: 1, background: "#534AB7", color: "#fff",
            border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
            {esEdicion ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page ────────────────────────────────────────
export default function Users() {
  const [users, setUsers] = useState<User[]>(USUARIOS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<User | null>(null);

  const datos = users.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear = () => {
    setUsuarioEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (u: User) => {
    setUsuarioEditando(u);
    setModalAbierto(true);
  };

  // La creación/edición real la maneja el backend en POST/PUT /users
  const guardarUsuario = (data: UserFormData) => {
    if (usuarioEditando) {
      console.log(`PUT /users/${usuarioEditando.id}`, data);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usuarioEditando.id
            ? { ...u, nombre: data.nombre, email: data.email, rol: data.rol }
            : u
        )
      );
    } else {
      console.log("POST /users", data);
      const nuevoId = `USR${String(users.length + 1).padStart(3, "0")}`;
      setUsers((prev) => [
        ...prev,
        { id: nuevoId, nombre: data.nombre, email: data.email, rol: data.rol, estado: "activo", ultimaSesion: "Nunca" },
      ]);
    }
    setModalAbierto(false);
  };

  // El cambio de estado real lo maneja el backend en PATCH /users/{id}/estado
  const toggleEstado = (u: User) => {
    const nuevoEstado = u.estado === "activo" ? "inactivo" : "activo";
    console.log(`PATCH /users/${u.id}/estado`, { estado: nuevoEstado });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, estado: nuevoEstado } : x))
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />
      {modalAbierto && (
        <UserModal user={usuarioEditando} onSave={guardarUsuario} onClose={() => setModalAbierto(false)} />
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
                  {["ID", "Nombre", "Email", "Rol", "Estado", "Última sesión", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                      fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>
                    No se encontraron usuarios
                  </td></tr>
                ) : datos.map((u, i) => {
                  const s = ESTADO_STYLE[u.estado];
                  return (
                    <tr key={u.id} style={{ borderBottom: "0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "12px 16px", color: "#888", fontWeight: 500 }}>{u.id}</td>
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
