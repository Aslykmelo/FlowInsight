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
            maxWidth: 1000,
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

          <section style={card}>
            <h2 style={h2}>El recorrido, paso a paso</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
              {PASOS.map((p, i) => (
                <div key={p.titulo} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 130px" }}>
                  <div style={{ flex: 1, background: p.fondo, borderRadius: 12, padding: "14px 12px", textAlign: "center",
                    minHeight: 132 }}>
                    <div aria-hidden="true" style={{ fontSize: 28 }}>{p.icono}</div>
                    <p style={{ margin: "6px 0 4px", fontSize: 13, fontWeight: 600, color: "#1B2430" }}>
                      {i + 1}. {p.titulo}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.45 }}>{p.texto}</p>
                  </div>
                  {i < PASOS.length - 1 && <span aria-hidden="true" style={{ color: "#534AB7", fontSize: 20 }}>›</span>}
                </div>
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>Niveles de riesgo</h2>
            <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: 600,
              color: "#fff" }}>
              <div style={{ flex: 30, background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Bajo · hasta 30 %
              </div>
              <div style={{ flex: 30, background: "#EF9F27", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Medio · 30 a 60 %
              </div>
              <div style={{ flex: 40, background: "#E24B4A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Alto · más de 60 %
              </div>
            </div>
            <p style={{ ...parrafo, margin: "10px 0 0", fontSize: 13, color: "#666" }}>
              El porcentaje es la probabilidad que calcula el modelo de que el cliente no compre en los próximos 90 días.
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
                <h2 style={h2}>¿Qué tan efectivo es? (versión {info.version})</h2>
                <p style={{ ...parrafo, fontSize: 13, color: "#666" }}>
                  Medido con los periodos más recientes, que el modelo no vio al aprender. Los porcentajes son
                  los que dejó el entrenamiento; no se ajustaron para verse mejor.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                  <Medidor
                    titulo="Precisión"
                    valor={info.precision}
                    explicacion={info.precision === null ? "" :
                      `De cada 100 clientes que marca en riesgo, ${Math.round(info.precision * 100)} realmente se iban.`}
                  />
                  <Medidor
                    titulo="Cobertura"
                    valor={info.recall}
                    explicacion={info.recall === null ? "" :
                      `De cada 100 clientes que de verdad se van, detecta ${Math.round(info.recall * 100)}.`}
                  />
                  <Medidor
                    titulo="F1 (balance)"
                    valor={info.f1}
                    meta={info.umbral_f1}
                    explicacion="Resume precisión y cobertura en un solo número. La raya marca la meta del proyecto."
                  />
                </div>
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

const PASOS = [
  { icono: "🗂️", titulo: "Historial", texto: "Pedidos de cada cliente: fechas, montos y productos.", fondo: "#EEF3FE" },
  { icono: "🧮", titulo: "Variables", texto: "Se resume el comportamiento: cuándo, cuánto y cada cuánto compra.", fondo: "#F6F5FD" },
  { icono: "🤖", titulo: "Modelos", texto: "Uno estima la próxima compra y otro la probabilidad de abandono.", fondo: "#E1F5EE" },
  { icono: "🚦", titulo: "Riesgo", texto: "Cada cliente queda en riesgo bajo, medio o alto.", fondo: "#FAEEDA" },
  { icono: "🎯", titulo: "Acción", texto: "Alertas, mensajes de promoción y reportes para el equipo comercial.", fondo: "#FAECE7" },
];

function Medidor({ titulo, valor, meta, explicacion }: {
  titulo: string; valor: number | null; meta?: number; explicacion: string;
}) {
  const radio = 38;
  const circunferencia = 2 * Math.PI * radio;
  const fraccion = valor === null ? 0 : Math.max(0, Math.min(1, valor));
  const color = meta !== undefined && valor !== null && valor < meta ? "#BA7517" : "#534AB7";
  return (
    <div style={{ flex: "1 1 190px", border: "0.5px solid #e8e8ee", borderRadius: 12, padding: 14, textAlign: "center" }}>
      <svg width="104" height="104" viewBox="0 0 104 104" role="img"
        aria-label={`${titulo}: ${valor === null ? "sin dato" : pct(valor)}`}>
        <circle cx="52" cy="52" r={radio} fill="none" stroke="#ECEBF6" strokeWidth="10" />
        <circle cx="52" cy="52" r={radio} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${fraccion * circunferencia} ${circunferencia}`} transform="rotate(-90 52 52)" />
        {meta !== undefined && (
          <line x1="52" y1="6" x2="52" y2="18" stroke="#1B2430" strokeWidth="2"
            transform={`rotate(${meta * 360} 52 52)`} />
        )}
        <text x="52" y="58" textAnchor="middle" fontSize="19" fontWeight="600" fill="#1B2430">
          {valor === null ? "—" : `${Math.round(valor * 100)}%`}
        </text>
      </svg>
      <p style={{ margin: "4px 0 4px", fontSize: 14, fontWeight: 600 }}>{titulo}</p>
      <p style={{ margin: 0, fontSize: 12, color: "#666", lineHeight: 1.45 }}>{explicacion}</p>
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
