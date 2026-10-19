import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, CircleCheck, Sparkles } from "lucide-react";
import { forgotPassword, resetPassword, mensajeDeError } from "../api/authApi";

const REENVIO_SEGUNDOS = 60;

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
    <div className="login-shell">
      {/* En pantallas angostas el panel de marca queda como una franja compacta sobre el formulario. */}
      <style>{"@media (max-width: 760px) { .login-visual { flex: none !important; gap: 16px !important; } .login-form-panel { flex: 1; justify-content: flex-start !important; } .login-titular { display: none !important; } }"}</style>

      <section
        className="login-visual"
        aria-label="FlowInsight"
        style={{
          background: "var(--c-sidebar)",
          color: "#fff",
          padding: "var(--s-6) 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "var(--s-6)",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
            <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "var(--c-primary)",
              display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} color="#fff" />
            </span>
            FlowInsight
          </p>
          <p style={{ margin: "var(--s-1) 0 0 48px", fontSize: 13, color: "#c5c4e0" }}>W&amp;T Food S.A.S</p>
        </div>
        <p className="login-titular" style={{ margin: 0, maxWidth: 520, fontSize: 28, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
          Recupera el acceso a tu cuenta en dos pasos
        </p>
      </section>

      <main
        className="login-form-panel"
        style={{
          background: "var(--c-surface)",
          padding: "var(--s-6) 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{ margin: "0 0 var(--s-1)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Recuperar contraseña
          </h1>

          {paso === "correo" && (
            <form onSubmit={pedirCodigo} noValidate>
              <p style={{ margin: "0 0 var(--s-5)", fontSize: 14, color: "var(--c-muted)", lineHeight: 1.6 }}>
                Te enviaremos un código de verificación por mensaje de texto al teléfono de tu cuenta o, si no tienes uno registrado, a tu correo.
              </p>
              <div style={{ marginBottom: "var(--s-4)" }}>
                <label htmlFor="fp-correo" className="field-label">Correo electrónico</label>
                <input
                  id="fp-correo"
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </div>
              {error && <Alerta texto={error} />}
              <button type="submit" disabled={enviando} className="btn btn-primary" style={{ width: "100%", minHeight: 44, fontSize: 15 }}>
                {enviando ? "Enviando…" : "Enviar código"}
              </button>
            </form>
          )}

          {paso === "codigo" && (
            <form onSubmit={restablecer} noValidate>
              <p style={{ margin: "0 0 var(--s-4)", fontSize: 14, color: "var(--c-muted)" }}>
                Paso 2 de 2: escribe el código y elige tu nueva contraseña.
              </p>
              <p role="status" className="notice notice-ok" style={{ margin: "0 0 var(--s-4)" }}>
                {aviso}
              </p>
              {import.meta.env.DEV && (
                <p style={{ margin: "0 0 var(--s-4)", fontSize: 13, color: "var(--c-muted)" }}>
                  Modo desarrollo: sin proveedor de SMS ni de correo configurado, el código aparece en la
                  consola del servidor.
                </p>
              )}
              <div style={{ marginBottom: "var(--s-4)" }}>
                <label htmlFor="fp-codigo" className="field-label">Código de 6 dígitos</label>
                <input
                  id="fp-codigo"
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                  style={{ letterSpacing: 6, fontSize: 18, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                />
              </div>
              <div style={{ marginBottom: "var(--s-4)" }}>
                <label htmlFor="fp-nueva" className="field-label">Nueva contraseña</label>
                <input
                  id="fp-nueva"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  aria-describedby="fp-nueva-ayuda"
                />
                <p id="fp-nueva-ayuda" style={{ margin: "var(--s-2) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
                  Mínimo 8 caracteres.
                </p>
              </div>
              <div style={{ marginBottom: "var(--s-4)" }}>
                <label htmlFor="fp-confirmar" className="field-label">Confirmar contraseña</label>
                <input
                  id="fp-confirmar"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
              {error && <Alerta texto={error} />}
              <button type="submit" disabled={enviando} className="btn btn-primary" style={{ width: "100%", minHeight: 44, fontSize: 15 }}>
                {enviando ? "Guardando…" : "Restablecer contraseña"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => pedirCodigo()}
                disabled={espera > 0 || enviando}
                style={{ width: "100%", marginTop: "var(--s-2)", border: "none", background: "transparent",
                  color: espera > 0 ? "var(--c-muted)" : "var(--c-primary)", fontVariantNumeric: "tabular-nums" }}
              >
                {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
              </button>
            </form>
          )}

          {paso === "listo" && (
            <div>
              <p
                role="status"
                className="notice notice-ok"
                style={{ margin: "var(--s-4) 0 var(--s-5)", display: "flex", gap: "var(--s-2)", alignItems: "flex-start", fontSize: 14 }}
              >
                <CircleCheck size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Contraseña restablecida. Ya puedes iniciar sesión con tu nueva contraseña.</span>
              </p>
              <Link to="/" className="btn btn-primary" style={{ width: "100%", minHeight: 44, fontSize: 15 }}>
                Ir a iniciar sesión
              </Link>
            </div>
          )}

          {paso !== "listo" && (
            <p style={{ textAlign: "center", margin: "var(--s-5) 0 0" }}>
              <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "var(--s-1)", minHeight: 40, fontSize: 14,
                fontWeight: 600, color: "var(--c-primary)" }}>
                <ArrowLeft size={16} aria-hidden="true" /> Volver a iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Alerta({ texto }: { texto: string }) {
  return (
    <div role="alert" className="notice notice-bad"
      style={{ display: "flex", gap: "var(--s-2)", alignItems: "flex-start", marginBottom: "var(--s-4)" }}>
      <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{texto}</span>
    </div>
  );
}
