import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getModelInfo, mensajeDeError, type ModeloInfo } from "../api/authApi";

const card: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid #e0e0e0",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
};

const h2: React.CSSProperties = { margin: "0 0 0.75rem", fontSize: 16, fontWeight: 500 };
const parrafo: React.CSSProperties = { margin: "0 0 10px", fontSize: 14, color: "#444", lineHeight: 1.55 };

const DESCRIPCION_VARIABLE: Record<string, string> = {
  recencia: "Días desde la última compra del cliente",
  frecuencia: "Cuántos pedidos ha hecho",
  monetario: "Cuánto ha comprado en total",
  ticket_promedio: "Valor promedio de cada pedido",
  antiguedad: "Tiempo transcurrido desde su primera compra",
  intervalo_promedio: "Días que suelen pasar entre un pedido y el siguiente",
  intervalo_std: "Qué tan regulares son esos intervalos",
};

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);

export default function ModelInfo() {
  const [info, setInfo] = useState<ModeloInfo | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar la información del modelo.")))
      .finally(() => setCargando(false));
  }, []);

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
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Cómo funciona el modelo</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Qué predice FlowInsight, con qué datos y qué tan confiable es hoy
          </p>
        </header>

        <main
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxWidth: 860,
          }}
        >
          <section style={card}>
            <h2 style={h2}>Qué hace</h2>
            <p style={parrafo}>
              A partir del historial de pedidos de cada cliente, el sistema estima dos cosas:
              <strong> cuándo volverá a comprar</strong> y <strong>qué tan probable es que
              abandone</strong> (que no compre en los próximos 90 días). Con eso clasifica a cada
              cliente en riesgo bajo, medio o alto y genera las alertas de la pantalla
              Predicciones.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              Riesgo <strong>bajo</strong>: hasta 30 %. <strong>Medio</strong>: entre 30 % y
              60 %. <strong>Alto</strong>: más de 60 %.
            </p>
          </section>

          {cargando && <p role="status" style={{ color: "#666" }}>Cargando información del modelo...</p>}
          {error && (
            <div
              role="alert"
              style={{
                background: "#FAECE7",
                border: "0.5px solid #E24B4A",
                color: "#993C1D",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {info && (
            <>
              <section style={card}>
                <h2 style={h2}>Con qué datos aprende</h2>
                <p style={parrafo}>
                  Usa el método RFM (recencia, frecuencia y valor monetario), ampliado con otras
                  variables de comportamiento de compra:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#444" }}>
                  {info.variables.map((v) => (
                    <li key={v} style={{ marginBottom: 4 }}>
                      <strong>{v}</strong>
                      {DESCRIPCION_VARIABLE[v] ? `: ${DESCRIPCION_VARIABLE[v]}` : ""}
                    </li>
                  ))}
                </ul>
              </section>

              <section style={card}>
                <h2 style={h2}>Cómo se evalúa</h2>
                <p style={{ ...parrafo, marginBottom: 0 }}>
                  El historial se divide por fecha: el modelo aprende con los periodos más antiguos
                  y se prueba con los más recientes, que nunca vio
                  {info.snapshots_total !== null &&
                    ` (${info.snapshots_entrenamiento} muestras de entrenamiento y ${info.snapshots_prueba} de prueba, ${info.snapshots_total} en total)`}
                  . Así la medición no se infla por haber visto el futuro.
                </p>
              </section>

              <section style={card}>
                <h2 style={h2}>Resultado actual (versión {info.version})</h2>
                <div className="table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 460 }}>
                    <thead>
                      <tr style={{ background: "#f9f9f9", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Métrica</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Obtenido</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Meta</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500 }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <FilaMetrica
                        nombre="R² (días hasta la próxima compra)"
                        valor={info.r2}
                        meta={info.umbral_r2}
                      />
                      <FilaMetrica
                        nombre="F1 (detección de abandono)"
                        valor={info.f1}
                        meta={info.umbral_f1}
                      />
                    </tbody>
                  </table>
                </div>
                <p style={{ ...parrafo, marginTop: 12, marginBottom: 0 }}>
                  Del total de clientes que el modelo marca en riesgo, acierta
                  {" "}{pct(info.precision)} de las veces (precisión), y detecta
                  {" "}{pct(info.recall)} de los que realmente se van (cobertura). Hay predicciones
                  guardadas para {info.clientes_con_prediccion} clientes.
                </p>
              </section>

              <section style={{ ...card, borderColor: "#EF9F27", background: "#FFFBF2" }}>
                <h2 style={h2}>Qué tan confiable es hoy</h2>
                <p style={parrafo}>
                  El modelo funciona y entrega predicciones reales, pero <strong>no alcanza las
                  metas de precisión</strong> definidas para el proyecto. La causa principal es
                  que se entrenó con datos simulados, que no reproducen cómo un cliente real va
                  espaciando sus compras antes de abandonar.
                </p>
                <p style={{ ...parrafo, marginBottom: 0 }}>
                  Úsalo como una señal de apoyo, no como un dato definitivo. El indicador de días
                  sin comprar es más directo y confiable. La precisión debería mejorar a medida
                  que el sistema acumule historial real de la empresa.
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FilaMetrica({ nombre, valor, meta }: { nombre: string; valor: number | null; meta: number }) {
  const cumple = valor !== null && valor >= meta;
  return (
    <tr style={{ borderTop: "0.5px solid #f0f0f0" }}>
      <td style={{ padding: "10px 12px" }}>{nombre}</td>
      <td style={{ padding: "10px 12px", fontWeight: 500 }}>
        {valor === null ? "—" : valor.toFixed(2)}
      </td>
      <td style={{ padding: "10px 12px" }}>≥ {meta.toFixed(2)}</td>
      <td style={{ padding: "10px 12px" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: "3px 10px",
            borderRadius: 6,
            color: cumple ? "#0F6E56" : "#993C1D",
            background: cumple ? "#E1F5EE" : "#FAECE7",
          }}
        >
          {cumple ? "Cumple" : "No alcanza la meta"}
        </span>
      </td>
    </tr>
  );
}
