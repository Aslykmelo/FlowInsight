import { API_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, Pencil, Plus, Search, ShieldAlert, UserCheck, UserRoundSearch,
  UserX, X, XCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface User {
  id: number;
  nombre: string;
  email: string;
  rol: "Administrador" | "Analista";
  estado: "activo" | "inactivo";
  ultimaSesion: string;
  telefono: string;
}

interface ApiUsuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  ultima_sesion: string | null;
  telefono: string | null;
}

interface UserFormData {
  nombre: string;
  email: string;
  rol: User["rol"];
  password: string;
  telefono: string;
}


// El estado se comunica con texto + ícono + color (nunca solo color)
const ESTADO_STYLE: Record<User["estado"], { chip: string; label: string }> = {
  activo:   { chip: "chip chip-ok",  label: "Activo"   },
  inactivo: { chip: "chip chip-bad", label: "Inactivo" },
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

// Estilos propios de esta pantalla (el resto sale de design.css)
const PAGE_CSS = `
  @keyframes us-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  .us-search { position: relative; width: 100%; max-width: 400px; }
  .us-search svg { position: absolute; left: var(--s-3); top: 50%; transform: translateY(-50%); color: var(--c-muted); pointer-events: none; }
  .us-search .input { padding-left: 40px; }
  .us-card { padding: 0; overflow: hidden; }
  .us-table { min-width: 880px; }
  .us-table .chip { white-space: nowrap; }
  .us-table th, .us-table td { padding-left: 8px; padding-right: 8px; }
  .us-table th:first-child, .us-table td:first-child { padding-left: var(--s-4); }
  .us-table th:last-child, .us-table td:last-child { padding-right: var(--s-4); }
  .us-name { font-weight: 600; color: var(--c-ink); }
  .us-date { min-width: 92px; font-variant-numeric: tabular-nums; }
  .us-table td:nth-child(2) { white-space: nowrap; }
  .us-actions .btn { padding: 0 10px; gap: 6px; font-size: 13px; }
  .us-actions { display: flex; gap: var(--s-2); justify-content: flex-end; }
  .us-state { display: flex; flex-direction: column; align-items: center; gap: var(--s-2);
    padding: var(--s-6) var(--s-5); text-align: center; }
  .us-state-icon { width: 48px; height: 48px; border-radius: var(--r-md); background: var(--c-primary-soft);
    color: var(--c-primary); display: flex; align-items: center; justify-content: center; margin-bottom: var(--s-2); }
  .us-state-icon[data-bad="true"] { background: var(--c-bad-soft); color: var(--c-bad); }
  .us-state h2 { margin: 0; font-size: 16px; }
  .us-state p { margin: 0; max-width: 360px; font-size: 14px; color: var(--c-muted); }
  .us-state .btn { margin-top: var(--s-3); }
  .us-skel-row { display: flex; gap: var(--s-4); padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--c-line); }
  .us-skel { height: 16px; border-radius: 4px; background: var(--c-line); animation: us-pulse 1.4s ease-in-out infinite; }
  .us-foot { margin: 0; font-size: 13px; color: var(--c-muted); }
  .us-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
  .us-overlay { position: fixed; inset: 0; background: rgba(27, 36, 48, 0.5); display: flex;
    align-items: center; justify-content: center; padding: var(--s-4); z-index: 140; }
  .us-dialog { background: var(--c-surface); border-radius: var(--r-lg); padding: var(--s-5);
    width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow-y: auto; box-shadow: var(--shadow-2); }
  .us-dialog-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); margin-bottom: var(--s-4); }
  .us-dialog-head h2 { margin: 0; font-size: 18px; font-weight: 700; }
  .us-close { width: 40px; height: 40px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    border: none; border-radius: var(--r-sm); background: transparent; color: var(--c-muted); cursor: pointer; }
  .us-close:hover { background: var(--c-bg); color: var(--c-ink); }
  .us-field { margin-bottom: var(--s-4); }
  .us-req { color: var(--c-bad); }
  .us-dialog-btns { display: flex; gap: var(--s-3); margin-top: var(--s-5); }
  .us-dialog-btns .btn { flex: 1; }
`;

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

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
  const [telefono, setTelefono] = useState(user?.telefono ?? "");
  const [error, setError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // onClose llega como función nueva en cada render del padre; se guarda en una ref
  // para que el efecto (foco inicial, trampa de Tab) se ejecute una sola vez.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Mantiene el foco dentro del diálogo mientras está abierto
      if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const primero = items[0];
        const ultimo = items[items.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      anterior?.focus?.(); // devuelve el foco al botón que abrió el diálogo
    };
  }, []);

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
    onSave({ nombre: nombre.trim(), email: email.trim(), rol, password, telefono: telefono.trim() });
  };

  const mensajeError = error || errorExterno;

  return (
    <div className="us-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="user-modal-title"
        className="us-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="us-dialog-head">
          <h2 id="user-modal-title">
            {esEdicion ? "Editar usuario" : "Agregar usuario"}
          </h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Cerrar formulario de usuario"
            className="us-close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="us-field">
            <label htmlFor="user-nombre" className="field-label">Nombre <span className="us-req" aria-hidden="true">*</span></label>
            <input id="user-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo" autoComplete="off" aria-required="true" />
          </div>

          <div className="us-field">
            <label htmlFor="user-email" className="field-label">Correo electrónico <span className="us-req" aria-hidden="true">*</span></label>
            <input id="user-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@flowinsight.com" autoComplete="off" aria-required="true" />
          </div>

          <div className="us-field">
            <label htmlFor="user-telefono" className="field-label">Teléfono celular (para recuperar la contraseña)</label>
            <input id="user-telefono" className="input" inputMode="tel" value={telefono}
              onChange={(e) => setTelefono(e.target.value)} placeholder="3001234567" autoComplete="off" />
          </div>

          <div className="us-field">
            <label htmlFor="user-rol" className="field-label">Rol</label>
            <select id="user-rol" className="input" value={rol} onChange={(e) => setRol(e.target.value as User["rol"])}>
              <option value="Analista">Analista</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>

          <div className="us-field">
            <label htmlFor="user-password" className="field-label">
              {esEdicion ? "Nueva contraseña (opcional)" : <>Contraseña <span className="us-req" aria-hidden="true">*</span></>}
            </label>
            <input id="user-password" className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={esEdicion ? "Dejar en blanco para no cambiarla" : "••••••••"}
              autoComplete="new-password"
              aria-required={!esEdicion}
              aria-describedby={mensajeError ? "user-modal-error" : undefined} />
          </div>

          {mensajeError && (
            <div id="user-modal-error" role="alert" aria-live="assertive" className="notice notice-bad"
              style={{ display: "flex", alignItems: "flex-start", gap: "var(--s-2)" }}>
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{mensajeError}</span>
            </div>
          )}

          <div className="us-dialog-btns">
            <button type="button" onClick={onClose} disabled={guardando} className="btn">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn btn-primary">
              {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
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
        telefono: u.telefono ?? "",
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
        ? { nombre: data.nombre, email: data.email, rol: data.rol, password: data.password || null, telefono: data.telefono || null }
        : { nombre: data.nombre, email: data.email, rol: data.rol, password: data.password, telefono: data.telefono || null };

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

  const sinPermiso = error.startsWith("No tienes permisos");

  return (
    <div className="app-shell">
      <style>{PAGE_CSS}</style>
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

      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Usuarios</h1>
            <p>Gestión de usuarios del sistema</p>
          </div>
          {!error && (
            <button type="button" onClick={abrirCrear} className="btn btn-primary" disabled={loading}>
              <Plus size={18} aria-hidden="true" />
              Agregar usuario
            </button>
          )}
        </header>

        <main className="page-body">
          {!error && (
            <div className="us-search">
              <label htmlFor="user-busqueda" className="us-sr">Buscar usuarios por nombre o correo</label>
              <Search size={18} aria-hidden="true" />
              <input
                id="user-busqueda"
                type="search"
                className="input"
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          )}

          <section className="card us-card" aria-label="Lista de usuarios" aria-busy={loading}>
            {loading ? (
              <div role="status" aria-live="polite">
                <span className="us-sr">Cargando usuarios...</span>
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="us-skel-row" aria-hidden="true">
                    <div className="us-skel" style={{ flex: 2 }} />
                    <div className="us-skel" style={{ flex: 3 }} />
                    <div className="us-skel" style={{ flex: 1 }} />
                    <div className="us-skel" style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="us-state" role="alert">
                <div className="us-state-icon" data-bad="true" aria-hidden="true">
                  {sinPermiso ? <ShieldAlert size={24} /> : <AlertCircle size={24} />}
                </div>
                <h2>{sinPermiso ? "Acceso restringido" : "No pudimos cargar los usuarios"}</h2>
                <p>{error}</p>
                {!sinPermiso && (
                  <button type="button" className="btn btn-outline" onClick={cargarUsuarios}>
                    Intentar nuevamente
                  </button>
                )}
              </div>
            ) : datos.length === 0 ? (
              <div className="us-state">
                <div className="us-state-icon" aria-hidden="true"><UserRoundSearch size={24} /></div>
                <h2>{users.length === 0 ? "Aún no hay usuarios" : "No se encontraron usuarios"}</h2>
                <p>
                  {users.length === 0
                    ? "Agrega el primer usuario para darle acceso al sistema."
                    : "Revisa la ortografía o prueba con otro nombre o correo."}
                </p>
                {users.length === 0 ? (
                  <button type="button" className="btn btn-outline" onClick={abrirCrear}>
                    <Plus size={18} aria-hidden="true" />
                    Agregar usuario
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline" onClick={() => setBusqueda("")}>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table us-table">
                  <thead>
                    <tr>
                      <th scope="col">Nombre</th>
                      <th scope="col">Email</th>
                      <th scope="col">Teléfono</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Última sesión</th>
                      <th scope="col" className="num">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((u) => {
                      const s = ESTADO_STYLE[u.estado];
                      return (
                        <tr key={u.id}>
                          <td className="us-name">{u.nombre}</td>
                          <td>{u.email}</td>
                          <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{u.telefono || "—"}</td>
                          <td><span className="chip">{u.rol}</span></td>
                          <td>
                            <span className={s.chip}>
                              {u.estado === "activo"
                                ? <CheckCircle2 size={14} aria-hidden="true" />
                                : <XCircle size={14} aria-hidden="true" />}
                              {s.label}
                            </span>
                          </td>
                          <td className="us-date">{u.ultimaSesion}</td>
                          <td>
                            <div className="us-actions">
                              <button type="button" className="btn btn-outline" onClick={() => abrirEditar(u)}
                                aria-label={`Editar a ${u.nombre}`}>
                                <Pencil size={16} aria-hidden="true" />
                                Editar
                              </button>
                              {u.estado === "activo" ? (
                                <button type="button" className="btn btn-danger" onClick={() => toggleEstado(u)}
                                  aria-label={`Desactivar a ${u.nombre}`}>
                                  <UserX size={16} aria-hidden="true" />
                                  Desactivar
                                </button>
                              ) : (
                                <button type="button" className="btn" onClick={() => toggleEstado(u)}
                                  aria-label={`Activar a ${u.nombre}`}>
                                  <UserCheck size={16} aria-hidden="true" />
                                  Activar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {!loading && !error && users.length > 0 && (
            <p className="us-foot">
              Mostrando {datos.length} de {users.length} usuarios
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
