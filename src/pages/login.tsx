import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    // Validar campos
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // FastAPI OAuth2PasswordRequestForm espera:
      // username y password como x-www-form-urlencoded
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      // Enviar credenciales al backend
      const response = await axios.post(
        "http://localhost:8000/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Obtener token JWT
      const token = response.data.access_token;

      // Guardar token
      localStorage.setItem("token", token);

      // Redirigir al dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Error de login:", error);

      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401) {
        setError("Correo o contraseña incorrectos.");
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
        display: "flex",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* =========================
          PANEL IZQUIERDO
      ========================== */}
      <div
        style={{
          flex: 1,
          background:
            "linear-gradient(135deg, #16163a 0%, #2d2b6b 50%, #1a3a5c 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decoración */}
        <div
          style={{
            position: "absolute",
            width: 350,
            height: 350,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
            top: -80,
            left: -80,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
            bottom: 40,
            right: -60,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(83,74,183,0.15)",
            top: "40%",
            left: "60%",
          }}
        />

        {/* Contenido */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            color: "#fff",
          }}
        >
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 52,
            }}
          >
            🔮
          </p>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            FlowInsight
          </h1>

          <p
            style={{
              margin: "0 0 2.5rem",
              fontSize: 15,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            W&T Food S.A.S
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              textAlign: "left",
            }}
          >
            {[
              {
                emoji: "📊",
                title: "Dashboard en tiempo real",
                desc: "KPIs y métricas actualizadas automáticamente",
              },
              {
                emoji: "🤖",
                title: "Predicciones con ML",
                desc: "Anticipa el comportamiento de tus clientes",
              },
              {
                emoji: "📁",
                title: "Carga de datos Excel",
                desc: "Procesamiento ETL rápido y sin errores",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "12px 16px",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {feature.emoji}
                </span>

                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {feature.title}
                  </p>

                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================
          PANEL DERECHO
      ========================== */}
      <div
        style={{
          width: 440,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2.5rem",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "100%",
          }}
        >
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 24,
              fontWeight: 600,
              color: "#1a1a2e",
            }}
          >
            Bienvenido de nuevo
          </h2>

          <p
            style={{
              margin: "0 0 2rem",
              fontSize: 14,
              color: "#888",
            }}
          >
            Inicia sesión para acceder al sistema
          </p>

          {/* =========================
              EMAIL
          ========================== */}
          <div
            style={{
              marginBottom: 16,
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#555",
                marginBottom: 6,
              }}
            >
              Correo electrónico
            </label>

            <input
              type="email"
              placeholder="asly@flowinsight.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              style={{
                width: "100%",
                border: "0.5px solid #e0e0e0",
                borderRadius: 8,
                padding: "11px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                borderColor:
                  error && !email ? "#E24B4A" : "#e0e0e0",
              }}
            />
          </div>

          {/* =========================
              CONTRASEÑA
          ========================== */}
          <div
            style={{
              marginBottom: error ? 12 : 20,
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#555",
                marginBottom: 6,
              }}
            >
              Contraseña
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                style={{
                  width: "100%",
                  border: "0.5px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "11px 40px 11px 14px",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  borderColor:
                    error && !password ? "#E24B4A" : "#e0e0e0",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#aaa",
                  padding: 0,
                }}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* =========================
              MENSAJE DE ERROR
          ========================== */}
          {error && (
            <div
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
              ⚠️ {error}
            </div>
          )}

          {/* =========================
              BOTÓN LOGIN
          ========================== */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#aaa" : "#534AB7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión →"}
          </button>

          {/* =========================
              DIVISOR
          ========================== */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "1.5rem 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "#e0e0e0",
              }}
            />

            <span
              style={{
                fontSize: 12,
                color: "#bbb",
              }}
            >
              credenciales de prueba
            </span>

            <div
              style={{
                flex: 1,
                height: "0.5px",
                background: "#e0e0e0",
              }}
            />
          </div>

          {/* =========================
              CREDENCIALES DEMO
          ========================== */}
          <div
            style={{
              background: "#f9f9f9",
              border: "0.5px solid #e0e0e0",
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: "#888",
                }}
              >
                Email
              </span>

              <span
                style={{
                  fontWeight: 500,
                  color: "#534AB7",
                }}
              >
                asly@flowinsight.com
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span
                style={{
                  color: "#888",
                }}
              >
                Contraseña
              </span>

              <span
                style={{
                  fontWeight: 500,
                  color: "#534AB7",
                }}
              >
                admin123
              </span>
            </div>
          </div>
        </div>

        {/* =========================
            PIE
        ========================== */}
        <p
          style={{
            marginTop: "2rem",
            fontSize: 12,
            color: "#ccc",
          }}
        >
          FlowInsight v1.0 — Proyecto de grado UMB
        </p>
      </div>
    </div>
  );
}

