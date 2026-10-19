import { API_URL } from "../config";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { AlertCircle, ArrowRight, Eye, EyeOff, Megaphone, MapPinned, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BENEFICIOS = [
  { icono: Sparkles, texto: "Cuándo vuelve a comprar cada cliente y quiénes están en riesgo de dejar de hacerlo" },
  { icono: MapPinned, texto: "Dónde están los clientes en Bogotá y qué producto consume cada uno" },
  { icono: Megaphone, texto: "Mensajes de promoción y reportes listos para el equipo comercial" },
];

export default function Login() {
  const navigate = useNavigate();
  const { recargar } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // FastAPI OAuth2PasswordRequestForm espera x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post(`${API_URL}/auth/login`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", response.data.access_token);
      await recargar();
      navigate("/dashboard");
    } catch (err) {
      const axiosError = err as AxiosError;

      if (axiosError.response?.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (axiosError.response?.status === 403) {
        setError("Tu usuario está inactivo. Contacta a un administrador.");
      } else if (axiosError.response?.status === 422) {
        setError("Los datos enviados no son válidos.");
      } else {
        setError("No se pudo conectar con el servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      {/* En pantallas angostas solo se deja la marca arriba del formulario. */}
      <style>{"@media (max-width: 760px) { .login-visual { flex: none !important; gap: 16px !important; } .login-form-panel { flex: 1; justify-content: flex-start !important; } .login-beneficios { display: none !important; } .login-titular { font-size: 20px !important; } }"}</style>

      <section
        className="login-visual"
        aria-label="Presentación de FlowInsight"
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

        <div style={{ maxWidth: 520 }}>
          <p className="login-titular" style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Conoce a tus clientes y vende a tiempo
          </p>
          <ul className="login-beneficios" style={{ listStyle: "none", margin: "var(--s-5) 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
            {BENEFICIOS.map((b) => (
              <li key={b.texto} style={{ display: "flex", alignItems: "flex-start", gap: "var(--s-3)", fontSize: 15, lineHeight: 1.5, color: "#e1e0f2" }}>
                <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <b.icono size={18} color="#fff" />
                </span>
                <span style={{ paddingTop: 6 }}>{b.texto}</span>
              </li>
            ))}
          </ul>
        </div>
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
          <form onSubmit={handleLogin} noValidate>
            <h1 style={{ margin: "0 0 var(--s-1)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Bienvenido de nuevo
            </h1>
            <p style={{ margin: "0 0 var(--s-5)", fontSize: 14, color: "var(--c-muted)" }}>
              Inicia sesión para acceder al sistema
            </p>

            <div style={{ marginBottom: "var(--s-4)" }}>
              <label htmlFor="login-email" className="field-label">Correo electrónico</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                aria-invalid={error ? true : undefined}
              />
            </div>

            <div style={{ marginBottom: "var(--s-2)" }}>
              <label htmlFor="login-password" className="field-label">Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={error ? true : undefined}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPass}
                  style={{
                    position: "absolute",
                    right: 1,
                    top: 1,
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--r-sm)",
                    color: "var(--c-muted)",
                    cursor: "pointer",
                  }}
                >
                  {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginBottom: "var(--s-4)" }}>
              <Link to="/forgot-password" style={{ display: "inline-flex", alignItems: "center", minHeight: 40, fontSize: 14,
                fontWeight: 600, color: "var(--c-primary)" }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div id="login-error" role="alert" className="notice notice-bad"
                style={{ display: "flex", gap: "var(--s-2)", alignItems: "flex-start", marginBottom: "var(--s-4)" }}>
                <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", minHeight: 44, fontSize: 15 }}>
              {loading ? "Iniciando sesión…" : <>Iniciar sesión <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="notice" style={{ marginTop: "var(--s-5)", color: "var(--c-muted)" }}>
              <p style={{ margin: "0 0 var(--s-1)", fontWeight: 700, color: "var(--c-ink-2)" }}>Credenciales de prueba</p>
              <p style={{ margin: 0 }}>
                asly@flowinsight.com · <span style={{ color: "var(--c-primary)", fontWeight: 600 }}>admin123</span>
              </p>
            </div>
          )}

          <p style={{ marginTop: "var(--s-6)", fontSize: 13, color: "var(--c-muted)", textAlign: "center" }}>
            FlowInsight v1.0 — Proyecto de grado UMB
          </p>
        </div>
      </main>
    </div>
  );
}
