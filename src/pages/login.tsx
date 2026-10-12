import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

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

      const response = await axios.post("http://localhost:8000/auth/login", formData, {
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
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>W&amp;T Food S.A.S</p>
        </div>

        <form onSubmit={handleLogin} noValidate>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 500, color: "#16163a" }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "#888" }}>
            Inicia sesión para acceder al sistema
          </p>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-email" style={labelStyle}>Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label htmlFor="login-password" style={labelStyle}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby={error ? "login-error" : undefined}
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPass}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 6,
                }}
              >
                <span aria-hidden="true">{showPass ? "🙈" : "👁️"}</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: "#534AB7" }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && (
            <div
              id="login-error"
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
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#534AB7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión →"}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div
            style={{
              marginTop: "1.5rem",
              background: "#f9f9f9",
              border: "0.5px solid #e0e0e0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "#888",
            }}
          >
            <p style={{ margin: "0 0 4px", fontWeight: 500 }}>credenciales de prueba</p>
            <p style={{ margin: 0 }}>
              asly@flowinsight.com · <span style={{ color: "#534AB7" }}>admin123</span>
            </p>
          </div>
        )}

        <p style={{ marginTop: "2rem", fontSize: 12, color: "#bbb", textAlign: "center" }}>
          FlowInsight v1.0 — Proyecto de grado UMB
        </p>
      </div>
    </div>
  );
}
