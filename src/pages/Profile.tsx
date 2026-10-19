import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { updateMe, changePassword, getActividad, mensajeDeError, type ActividadUsuario } from "../api/authApi";

const COLORES_AVATAR = ["#534AB7", "#0F6E56", "#2F6FED", "#BA7517", "#993C1D", "#1B2430"];

const leerColor = (id: number | undefined) => {
  try {
    return localStorage.getItem(`avatar-color-${id}`) ?? COLORES_AVATAR[0];
  } catch {
    return COLORES_AVATAR[0];
  }
};

const ACCESOS = [
  { etiqueta: "Generar un informe", ruta: "/reports", emoji: "📄" },
  { etiqueta: "Ver clientes en riesgo", ruta: "/promotions", emoji: "🎯" },
  { etiqueta: "Revisar predicciones", ruta: "/predictions", emoji: "🤖" },
  { etiqueta: "Cargar datos de Excel", ruta: "/upload", emoji: "📁" },
];

const card: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid #e0e0e0",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "0.5px solid #e0e0e0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#555",
  marginBottom: 6,
};

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

  useEffect(() => {
    getActividad().then(setActividad).catch(() => setActividad(null));
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
    <div className="app-shell" style={{ background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />
      <div className="app-main">
        <header
          style={{
            background: "#fff",
            borderBottom: "0.5px solid #e0e0e0",
            padding: "0.875rem 1.5rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Mi perfil</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Tus datos de cuenta, tu contraseña y los permisos de tu rol
          </p>
        </header>

        <main
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxWidth: 760,
          }}
        >
          <section style={{ ...card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {(usuario?.nombre_usuario ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{usuario?.nombre_usuario}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#777" }}>{usuario?.correo}</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
                Última sesión: {formatoFecha(usuario?.ultima_sesion ?? null)}
              </p>
            </div>
            <span
              style={{
                fontSize: 12,
                color: "#534AB7",
                background: "#EEEDFE",
                padding: "4px 12px",
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              {usuario?.rol}
            </span>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 500 }}>Personaliza tu cuenta</h2>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#888" }}>
              El color se guarda en este navegador. El tamaño del texto se cambia con los botones A- y A+ del menú.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label="Color del avatar">
              {COLORES_AVATAR.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={colorAvatar === c}
                  aria-label={`Color ${c}`}
                  onClick={() => elegirColor(c)}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer",
                    border: colorAvatar === c ? "3px solid #fff" : "3px solid transparent",
                    outline: colorAvatar === c ? `2px solid ${c}` : "none" }}
                />
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>Mi actividad</h2>
            {actividad ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ flex: "1 1 150px", background: "#F6F5FD", borderRadius: 10, padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#777" }}>Informes generados</p>
                    <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 500 }}>{actividad.reportes_generados}</p>
                  </div>
                  <div style={{ flex: "1 1 150px", background: "#F6F5FD", borderRadius: 10, padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#777" }}>En PDF / en Excel</p>
                    <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 500 }}>
                      {actividad.reportes_por_formato.pdf ?? 0} / {actividad.reportes_por_formato.xlsx ?? 0}
                    </p>
                  </div>
                </div>
                {actividad.reportes_recientes.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#444" }}>
                    {actividad.reportes_recientes.map((r) => (
                      <li key={r.id_reporte} style={{ marginBottom: 4 }}>
                        {r.nombre ?? "Reporte"} · {(r.formato ?? "").toUpperCase()} · {formatoFecha(r.fecha)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Aún no has generado informes.</p>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "#888" }}>No se pudo cargar tu actividad.</p>
            )}
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>Accesos rápidos</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {ACCESOS.map((a) => (
                <button
                  key={a.ruta}
                  type="button"
                  onClick={() => navigate(a.ruta)}
                  style={{ background: "#fff", border: "0.5px solid #d8d8e4", borderRadius: 10, padding: "10px 14px",
                    fontSize: 13, cursor: "pointer", color: "#333" }}
                >
                  <span aria-hidden="true">{a.emoji}</span> {a.etiqueta}
                </button>
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>Datos personales</h2>
            <form onSubmit={guardarPerfil} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="perfil-nombre" style={labelStyle}>Nombre</label>
                <input
                  id="perfil-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="perfil-telefono" style={labelStyle}>Teléfono celular</label>
                <input
                  id="perfil-telefono"
                  inputMode="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  aria-describedby="perfil-telefono-ayuda"
                  style={inputStyle}
                />
                <p id="perfil-telefono-ayuda" style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
                  A este número enviamos el código si olvidas tu contraseña. Si no registras uno, lo enviamos a tu
                  correo ({usuario?.correo}).
                </p>
              </div>
              {msgPerfil && <Mensaje {...msgPerfil} />}
              <button type="submit" disabled={guardando} style={botonPrimario(guardando)}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>Cambiar contraseña</h2>
            <form onSubmit={guardarClave} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="clave-actual" style={labelStyle}>Contraseña actual</label>
                <input
                  id="clave-actual"
                  type="password"
                  autoComplete="current-password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="clave-nueva" style={labelStyle}>Nueva contraseña</label>
                <input
                  id="clave-nueva"
                  type="password"
                  autoComplete="new-password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="clave-confirmar" style={labelStyle}>Confirmar nueva contraseña</label>
                <input
                  id="clave-confirmar"
                  type="password"
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {msgClave && <Mensaje {...msgClave} />}
              <button type="submit" disabled={cambiando} style={botonPrimario(cambiando)}>
                {cambiando ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
          </section>

          <section style={card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>
              Permisos de tu rol ({usuario?.rol})
            </h2>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 500, color: "#0F6E56" }}>Puedes</p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13, color: "#444" }}>
              {permisos.puede.map((p) => (
                <li key={p} style={{ marginBottom: 4 }}>{p}</li>
              ))}
            </ul>
            {permisos.noPuede.length > 0 && (
              <>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 500, color: "#993C1D" }}>
                  No puedes
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#444" }}>
                  {permisos.noPuede.map((p) => (
                    <li key={p} style={{ marginBottom: 4 }}>{p}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <div>
            <button
              type="button"
              onClick={salir}
              style={{
                background: "#fff",
                color: "#993C1D",
                border: "0.5px solid #993C1D",
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Cerrar sesión
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
      style={{
        background: ok ? "#E1F5EE" : "#FAECE7",
        border: `0.5px solid ${ok ? "#0F6E56" : "#E24B4A"}`,
        color: ok ? "#0F6E56" : "#993C1D",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        marginBottom: 14,
      }}
    >
      {texto}
    </div>
  );
}

function botonPrimario(deshabilitado: boolean): React.CSSProperties {
  return {
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 500,
    cursor: deshabilitado ? "default" : "pointer",
    opacity: deshabilitado ? 0.7 : 1,
  };
}
