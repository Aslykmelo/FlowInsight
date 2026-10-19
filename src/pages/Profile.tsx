import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, FileText, FileUp, LogOut, Megaphone, Sparkles, X, type LucideIcon } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { updateMe, changePassword, getActividad, mensajeDeError, type ActividadUsuario } from "../api/authApi";

// Colores de la paleta de marca; todos dan contraste >= 4.5:1 con la inicial en blanco.
const COLORES_AVATAR = [
  { valor: "#534AB7", nombre: "Morado" },
  { valor: "#0F6E56", nombre: "Verde" },
  { valor: "#1F5FD1", nombre: "Azul" },
  { valor: "#8A5208", nombre: "Ámbar" },
  { valor: "#A33A1E", nombre: "Rojo" },
  { valor: "#1B2430", nombre: "Oscuro" },
];

// Tonos que se guardaban antes de unificar la paleta, para no perder la elección de quien ya eligió uno.
const COLOR_ANTERIOR: Record<string, string> = { "#2F6FED": "#1F5FD1", "#BA7517": "#8A5208", "#993C1D": "#A33A1E" };

const leerColor = (id: number | undefined) => {
  try {
    const guardado = localStorage.getItem(`avatar-color-${id}`);
    if (!guardado) return COLORES_AVATAR[0].valor;
    return COLOR_ANTERIOR[guardado] ?? guardado;
  } catch {
    return COLORES_AVATAR[0].valor;
  }
};

const ACCESOS: { etiqueta: string; ruta: string; icono: LucideIcon }[] = [
  { etiqueta: "Generar un informe", ruta: "/reports", icono: FileText },
  { etiqueta: "Ver clientes en riesgo", ruta: "/promotions", icono: Megaphone },
  { etiqueta: "Revisar predicciones", ruta: "/predictions", icono: Sparkles },
  { etiqueta: "Cargar datos de Excel", ruta: "/upload", icono: FileUp },
];

const PERMISOS: Record<string, { puede: string[]; noPuede: string[] }> = {
  Administrador: {
    puede: [
      "Ver el dashboard, las predicciones, los clientes, los reportes, las promociones, el mapa y el cubo OLAP",
      "Cargar archivos Excel",
      "Crear y editar productos",
      "Crear, editar, activar y desactivar usuarios del sistema",
    ],
    noPuede: [],
  },
  Analista: {
    puede: [
      "Ver el dashboard, las predicciones, los clientes, los reportes, las promociones, el mapa y el cubo OLAP",
      "Cargar archivos Excel",
    ],
    noPuede: ["Gestionar usuarios del sistema", "Crear o editar productos"],
  },
};

const formatoFecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function Profile() {
  const navigate = useNavigate();
  const { usuario, recargar, cerrarSesion } = useAuth();

  // null = sin editar: se muestra el valor guardado del usuario
  const [nombreEditado, setNombre] = useState<string | null>(null);
  const [telefonoEditado, setTelefono] = useState<string | null>(null);
  const nombre = nombreEditado ?? usuario?.nombre_usuario ?? "";
  const telefono = telefonoEditado ?? usuario?.telefono ?? "";
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msgClave, setMsgClave] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambiando, setCambiando] = useState(false);

  const [colorAvatar, setColorAvatar] = useState(() => leerColor(usuario?.id_usuario));
  const [actividad, setActividad] = useState<ActividadUsuario | null>(null);
  const [cargandoActividad, setCargandoActividad] = useState(true);

  useEffect(() => {
    getActividad()
      .then(setActividad)
      .catch(() => setActividad(null))
      .finally(() => setCargandoActividad(false));
  }, []);

  const elegirColor = (color: string) => {
    setColorAvatar(color);
    try {
      localStorage.setItem(`avatar-color-${usuario?.id_usuario}`, color);
    } catch {
      /* sin almacenamiento: el color vale solo para esta visita */
    }
  };

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMsgPerfil(null);
    try {
      await updateMe({ nombre_usuario: nombre.trim(), telefono: telefono.trim() });
      await recargar();
      setMsgPerfil({ tipo: "ok", texto: "Datos actualizados." });
    } catch (err) {
      setMsgPerfil({ tipo: "error", texto: mensajeDeError(err, "No se pudo guardar el perfil.") });
    } finally {
      setGuardando(false);
    }
  };

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva.length < 8) {
      setMsgClave({ tipo: "error", texto: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (nueva !== confirmar) {
      setMsgClave({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }
    setCambiando(true);
    setMsgClave(null);
    try {
      await changePassword(actual, nueva);
      setActual("");
      setNueva("");
      setConfirmar("");
      setMsgClave({ tipo: "ok", texto: "Contraseña actualizada." });
    } catch (err) {
      setMsgClave({ tipo: "error", texto: mensajeDeError(err, "No se pudo cambiar la contraseña.") });
    } finally {
      setCambiando(false);
    }
  };

  const salir = () => {
    cerrarSesion();
    navigate("/", { replace: true });
  };

  const permisos = usuario ? PERMISOS[usuario.rol] ?? PERMISOS.Analista : PERMISOS.Analista;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Mi perfil</h1>
            <p>Tus datos de cuenta, tu contraseña y los permisos de tu rol</p>
          </div>
        </header>

        <main className="page-body" style={{ maxWidth: 880 }}>
          <section className="card" style={{ display: "flex", alignItems: "center", gap: "var(--s-4)", flexWrap: "wrap" }}>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: colorAvatar,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(usuario?.nombre_usuario ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{usuario?.nombre_usuario}</p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--c-muted)", overflowWrap: "anywhere" }}>{usuario?.correo}</p>
              <p style={{ margin: "var(--s-2) 0 0", fontSize: 13, color: "var(--c-muted)", fontVariantNumeric: "tabular-nums" }}>
                Última sesión: {formatoFecha(usuario?.ultima_sesion ?? null)}
              </p>
            </div>
            <span className="chip">{usuario?.rol}</span>
          </section>

          <section className="card">
            <h2>Personaliza tu cuenta</h2>
            <p style={{ margin: "0 0 var(--s-3)", fontSize: 13, color: "var(--c-muted)" }}>
              El color se guarda en este navegador. El tamaño del texto se cambia con los botones A- y A+ del menú.
            </p>
            <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }} role="radiogroup" aria-label="Color del avatar">
              {COLORES_AVATAR.map((c) => {
                const elegido = colorAvatar === c.valor;
                return (
                  <button
                    key={c.valor}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    aria-label={c.nombre}
                    title={c.nombre}
                    onClick={() => elegirColor(c.valor)}
                    style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", cursor: "pointer",
                      border: elegido ? `2px solid ${c.valor}` : "2px solid transparent", padding: 3,
                      display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: c.valor, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {elegido && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card" aria-busy={cargandoActividad}>
            <h2>Mi actividad</h2>
            {cargandoActividad ? (
              <p role="status" style={{ margin: 0, fontSize: 14, color: "var(--c-muted)" }}>Cargando tu actividad…</p>
            ) : actividad ? (
              <>
                <div style={{ display: "grid", gap: "var(--s-3)", marginBottom: "var(--s-4)",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}>
                  <div className="kpi" style={{ boxShadow: "none", background: "var(--c-primary-soft)", borderColor: "var(--c-primary-line)" }}>
                    <p className="kpi-label">Informes generados</p>
                    <p className="kpi-value">{actividad.reportes_generados}</p>
                  </div>
                  <div className="kpi" style={{ boxShadow: "none", background: "var(--c-primary-soft)", borderColor: "var(--c-primary-line)" }}>
                    <p className="kpi-label">En PDF / en Excel</p>
                    <p className="kpi-value">
                      {actividad.reportes_por_formato.pdf ?? 0} / {actividad.reportes_por_formato.xlsx ?? 0}
                    </p>
                  </div>
                </div>
                {actividad.reportes_recientes.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {actividad.reportes_recientes.map((r) => (
                      <li key={r.id_reporte} style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap",
                        padding: "var(--s-2) 0", borderBottom: "1px solid var(--c-line)", fontSize: 14, color: "var(--c-ink-2)" }}>
                        <FileText size={16} aria-hidden="true" style={{ color: "var(--c-muted)", flexShrink: 0 }} />
                        <span style={{ flex: "1 1 160px", overflowWrap: "anywhere" }}>{r.nombre ?? "Reporte"}</span>
                        <span className="chip chip-info">{(r.formato ?? "").toUpperCase()}</span>
                        <span style={{ fontSize: 13, color: "var(--c-muted)", fontVariantNumeric: "tabular-nums" }}>{formatoFecha(r.fecha)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, color: "var(--c-muted)" }}>Aún no has generado informes.</p>
                )}
              </>
            ) : (
              <p role="alert" className="notice notice-bad" style={{ margin: 0 }}>No se pudo cargar tu actividad.</p>
            )}
          </section>

          <section className="card">
            <h2>Accesos rápidos</h2>
            <div style={{ display: "grid", gap: "var(--s-2)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
              {ACCESOS.map((a) => (
                <button key={a.ruta} type="button" className="btn" onClick={() => navigate(a.ruta)}
                  style={{ justifyContent: "flex-start" }}>
                  <a.icono size={18} aria-hidden="true" style={{ color: "var(--c-primary)", flexShrink: 0 }} />
                  {a.etiqueta}
                </button>
              ))}
            </div>
          </section>

          <div style={{ display: "grid", gap: "var(--s-5)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
            <section className="card">
              <h2>Datos personales</h2>
              <form onSubmit={guardarPerfil} noValidate>
                <div style={{ marginBottom: "var(--s-4)" }}>
                  <label htmlFor="perfil-nombre" className="field-label">Nombre</label>
                  <input
                    id="perfil-nombre"
                    className="input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: "var(--s-4)" }}>
                  <label htmlFor="perfil-telefono" className="field-label">Teléfono celular</label>
                  <input
                    id="perfil-telefono"
                    className="input"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="3001234567"
                    aria-describedby="perfil-telefono-ayuda"
                  />
                  <p id="perfil-telefono-ayuda" style={{ margin: "var(--s-2) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
                    A este número enviamos el código si olvidas tu contraseña. Si no registras uno, lo enviamos a tu
                    correo ({usuario?.correo}).
                  </p>
                </div>
                {msgPerfil && <Mensaje {...msgPerfil} />}
                <button type="submit" disabled={guardando} className="btn btn-primary">
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
              </form>
            </section>

            <section className="card">
              <h2>Cambiar contraseña</h2>
              <form onSubmit={guardarClave} noValidate>
                <div style={{ marginBottom: "var(--s-4)" }}>
                  <label htmlFor="clave-actual" className="field-label">Contraseña actual</label>
                  <input
                    id="clave-actual"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: "var(--s-4)" }}>
                  <label htmlFor="clave-nueva" className="field-label">Nueva contraseña</label>
                  <input
                    id="clave-nueva"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    aria-describedby="clave-nueva-ayuda"
                  />
                  <p id="clave-nueva-ayuda" style={{ margin: "var(--s-2) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
                    Mínimo 8 caracteres.
                  </p>
                </div>
                <div style={{ marginBottom: "var(--s-4)" }}>
                  <label htmlFor="clave-confirmar" className="field-label">Confirmar nueva contraseña</label>
                  <input
                    id="clave-confirmar"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                  />
                </div>
                {msgClave && <Mensaje {...msgClave} />}
                <button type="submit" disabled={cambiando} className="btn btn-outline">
                  {cambiando ? "Actualizando…" : "Actualizar contraseña"}
                </button>
              </form>
            </section>
          </div>

          <section className="card">
            <h2>Permisos de tu rol ({usuario?.rol})</h2>
            <p style={{ margin: "0 0 var(--s-2)", fontSize: 14, fontWeight: 700, color: "var(--c-ok)" }}>Puedes</p>
            <ul style={{ margin: "0 0 var(--s-4)", padding: 0, listStyle: "none" }}>
              {permisos.puede.map((p) => (
                <li key={p} style={{ display: "flex", gap: "var(--s-2)", marginBottom: "var(--s-2)", fontSize: 14, color: "var(--c-ink-2)" }}>
                  <Check size={18} aria-hidden="true" style={{ color: "var(--c-ok)", flexShrink: 0, marginTop: 2 }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            {permisos.noPuede.length > 0 && (
              <>
                <p style={{ margin: "0 0 var(--s-2)", fontSize: 14, fontWeight: 700, color: "var(--c-bad)" }}>
                  No puedes
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {permisos.noPuede.map((p) => (
                    <li key={p} style={{ display: "flex", gap: "var(--s-2)", marginBottom: "var(--s-2)", fontSize: 14, color: "var(--c-ink-2)" }}>
                      <X size={18} aria-hidden="true" style={{ color: "var(--c-bad)", flexShrink: 0, marginTop: 2 }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <div>
            <button type="button" onClick={salir} className="btn btn-danger">
              <LogOut size={16} aria-hidden="true" /> Cerrar sesión
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Mensaje({ tipo, texto }: { tipo: "ok" | "error"; texto: string }) {
  const ok = tipo === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`notice ${ok ? "notice-ok" : "notice-bad"}`}
      style={{ marginBottom: "var(--s-4)" }}
    >
      {texto}
    </div>
  );
}
