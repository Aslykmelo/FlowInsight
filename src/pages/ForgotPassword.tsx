import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword, resetPassword, mensajeDeError } from "../api/authApi";

const REENVIO_SEGUNDOS = 60;

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "0.5px solid #d0d0d0",
  borderRadius: 8,
  padding: "11px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#444",
  marginBottom: 6,
};

const botonPrimario = (deshabilitado: boolean): React.CSSProperties => ({
  width: "100%",
  background: "#534AB7",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px",
  fontSize: 15,
  fontWeight: 500,
  cursor: deshabilitado ? "default" : "pointer",
  opacity: deshabilitado ? 0.7 : 1,
});

export default function ForgotPassword() {
  const [paso, setPaso] = useState<"correo" | "codigo" | "listo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const pedirCodigo = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!correo.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await forgotPassword(correo.trim());
      setAviso(res.mensaje);
      setPaso("codigo");
      setEspera(REENVIO_SEGUNDOS);
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo solicitar el código."));
    } finally {
      setEnviando(false);
    }
  };

  const restablecer = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await resetPassword(correo.trim(), codigo, nueva);
      setPaso("listo");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo restablecer la contraseña."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p aria-hidden="true" style={{ margin: 0, fontSize: 44 }}>🔮</p>
          <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 600, color: "#16163a" }}>
            FlowInsight
          </p>
        </div>

        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 500, color: "#16163a" }}>
          Recuperar contraseña
        </h1>

        {paso === "correo" && (
          <form onSubmit={pedirCodigo} noValidate>
            <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "#888" }}>
              Te enviaremos un código por mensaje de texto al teléfono registrado en tu cuenta.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="fp-correo" style={labelStyle}>Correo electrónico</label>
              <input
                id="fp-correo"
                type="email"
                autoComplete="username"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={inputStyle}
              />
            </div>
            {error && <Alerta texto={error} />}
            <button type="submit" disabled={enviando} style={botonPrimario(enviando)}>
              {enviando ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        )}

        {paso === "codigo" && (
          <form onSubmit={restablecer} noValidate>
            <p
              role="status"
              style={{
                margin: "0 0 1.25rem",
                fontSize: 13,
                color: "#0F6E56",
                background: "#E1F5EE",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              {aviso}
            </p>
            {import.meta.env.DEV && (
              <p style={{ margin: "0 0 1.25rem", fontSize: 12, color: "#888" }}>
                Modo desarrollo: sin proveedor de SMS configurado, el código aparece en la
                consola del servidor.
              </p>
            )}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="fp-codigo" style={labelStyle}>Código de 6 dígitos</label>
              <input
                id="fp-codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                style={{ ...inputStyle, letterSpacing: 6, fontSize: 18, textAlign: "center" }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="fp-nueva" style={labelStyle}>Nueva contraseña</label>
              <input
                id="fp-nueva"
                type="password"
                autoComplete="new-password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="fp-confirmar" style={labelStyle}>Confirmar contraseña</label>
              <input
                id="fp-confirmar"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                style={inputStyle}
              />
            </div>
            {error && <Alerta texto={error} />}
            <button type="submit" disabled={enviando} style={botonPrimario(enviando)}>
              {enviando ? "Guardando..." : "Restablecer contraseña"}
            </button>
            <button
              type="button"
              onClick={() => pedirCodigo()}
              disabled={espera > 0 || enviando}
              style={{
                width: "100%",
                marginTop: 10,
                background: "transparent",
                border: "none",
                color: espera > 0 ? "#aaa" : "#534AB7",
                fontSize: 13,
                cursor: espera > 0 ? "default" : "pointer",
              }}
            >
              {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
            </button>
          </form>
        )}

        {paso === "listo" && (
          <div>
            <p
              role="status"
              style={{
                margin: "1rem 0 1.5rem",
                fontSize: 14,
                color: "#0F6E56",
                background: "#E1F5EE",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              Contraseña restablecida. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Link
              to="/"
              style={{
                ...botonPrimario(false),
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}

        {paso !== "listo" && (
          <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link to="/" style={{ fontSize: 13, color: "#534AB7" }}>
              ← Volver a iniciar sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function Alerta({ texto }: { texto: string }) {
  return (
    <div
      role="alert"
      style={{
        background: "#FAECE7",
        border: "0.5px solid #E24B4A",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        color: "#993C1D",
        marginBottom: 16,
      }}
    >
      {texto}
    </div>
  );
}
