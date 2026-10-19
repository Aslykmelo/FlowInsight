import { useEffect, useState } from "react";
import { AlertTriangle, Brain, Calculator, CircleCheck, Database, Gauge, Target, TriangleAlert, type LucideIcon } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getModelInfo, mensajeDeError, type ModeloInfo } from "../api/authApi";

const parrafo: React.CSSProperties = { margin: "0 0 var(--s-3)", fontSize: 14, color: "var(--c-ink-2)", lineHeight: 1.6 };

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

const PASOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  { icono: Database, titulo: "Historial", texto: "Pedidos de cada cliente: fechas, montos y productos." },
  { icono: Calculator, titulo: "Variables", texto: "Se resume el comportamiento: cuándo, cuánto y cada cuánto compra." },
  { icono: Brain, titulo: "Modelos", texto: "Uno estima la próxima compra y otro la probabilidad de abandono." },
  { icono: Gauge, titulo: "Riesgo", texto: "Cada cliente queda en riesgo bajo, medio o alto." },
  { icono: Target, titulo: "Acción", texto: "Alertas, mensajes de promoción y reportes para el equipo comercial." },
];

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
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Cómo funciona el modelo</h1>
            <p>Qué predice FlowInsight, con qué datos y qué tan confiable es hoy</p>
          </div>
        </header>

        <main className="page-body" style={{ maxWidth: 1040 }}>
          <section className="card">
            <h2>Qué hace</h2>
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

          <section className="card">
            <h2>El recorrido, paso a paso</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--s-3)",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", columnGap: "var(--s-5)", rowGap: "var(--s-5)" }}>
              {PASOS.map((p, i) => (
                <li key={p.titulo} style={{ borderTop: "2px solid var(--c-primary)", paddingTop: "var(--s-3)" }}>
                  <p style={{ margin: "0 0 var(--s-1)", display: "flex", alignItems: "center", gap: "var(--s-2)",
                    fontSize: 14, fontWeight: 700, color: "var(--c-ink)" }}>
                    <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--c-primary)" }}>
                      <p.icono size={20} />
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}.</span> {p.titulo}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--c-ink-2)", lineHeight: 1.5 }}>{p.texto}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2>Niveles de riesgo</h2>
            <div style={{ display: "flex", borderRadius: "var(--r-sm)", overflow: "hidden", fontSize: 13, fontWeight: 600,
              textAlign: "center", lineHeight: 1.3 }}>
              <div style={{ flex: 30, background: "var(--c-ok)", color: "#fff", padding: "var(--s-2) var(--s-1)" }}>
                Bajo<span style={{ display: "block", fontWeight: 500, fontSize: 12 }}>hasta 30 %</span>
              </div>
              <div style={{ flex: 30, background: "var(--c-accent)", color: "var(--c-ink)", padding: "var(--s-2) var(--s-1)" }}>
                Medio<span style={{ display: "block", fontWeight: 500, fontSize: 12 }}>30 a 60 %</span>
              </div>
              <div style={{ flex: 40, background: "var(--c-bad)", color: "#fff", padding: "var(--s-2) var(--s-1)" }}>
                Alto<span style={{ display: "block", fontWeight: 500, fontSize: 12 }}>más de 60 %</span>
              </div>
            </div>
            <p style={{ ...parrafo, margin: "var(--s-3) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
              El porcentaje es la probabilidad que calcula el modelo de que el cliente no compre en los próximos 90 días.
            </p>
          </section>

          {cargando && (
            <div className="card" role="status" style={{ color: "var(--c-muted)", fontSize: 14 }}>
              Cargando información del modelo…
            </div>
          )}
          {error && (
            <div role="alert" className="notice notice-bad" style={{ display: "flex", gap: "var(--s-2)", alignItems: "flex-start" }}>
              <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <>
              <section className="card">
                <h2>Con qué datos aprende</h2>
                <p style={parrafo}>
                  Usa el método RFM (recencia, frecuencia y valor monetario), ampliado con otras
                  variables de comportamiento de compra:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--c-ink-2)", lineHeight: 1.6 }}>
                  {info.variables.map((v) => (
                    <li key={v} style={{ marginBottom: "var(--s-1)" }}>
                      <strong style={{ color: "var(--c-ink)" }}>{v}</strong>
                      {DESCRIPCION_VARIABLE[v] ? `: ${DESCRIPCION_VARIABLE[v]}` : ""}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2>Cómo se evalúa</h2>
                <p style={{ ...parrafo, marginBottom: 0 }}>
                  El historial se divide por fecha: el modelo aprende con los periodos más antiguos
                  y se prueba con los más recientes, que nunca vio
                  {info.snapshots_total !== null &&
                    ` (${info.snapshots_entrenamiento} muestras de entrenamiento y ${info.snapshots_prueba} de prueba, ${info.snapshots_total} en total)`}
                  . Así la medición no se infla por haber visto el futuro.
                </p>
              </section>

              <section className="card">
                <h2>¿Qué tan efectivo es? (versión {info.version})</h2>
                <p style={{ ...parrafo, fontSize: 13, color: "var(--c-muted)" }}>
                  Medido con los periodos más recientes, que el modelo no vio al aprender. Los porcentajes son
                  los que dejó el entrenamiento; no se ajustaron para verse mejor.
                </p>
                <div style={{ display: "grid", gap: "var(--s-3)", marginBottom: "var(--s-4)",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
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
                <div className="table-scroll" style={{ border: "1px solid var(--c-line)", borderRadius: "var(--r-sm)" }}>
                  <table className="table" style={{ minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th scope="col">Métrica</th>
                        <th scope="col" className="num">Obtenido</th>
                        <th scope="col" className="num">Meta</th>
                        <th scope="col">Estado</th>
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
                <p style={{ ...parrafo, marginTop: "var(--s-3)", marginBottom: 0 }}>
                  Del total de clientes que el modelo marca en riesgo, acierta
                  {" "}{pct(info.precision)} de las veces (precisión), y detecta
                  {" "}{pct(info.recall)} de los que realmente se van (cobertura). Hay predicciones
                  guardadas para {info.clientes_con_prediccion} clientes.
                </p>
              </section>

              <section className="card" style={{ borderColor: "var(--c-accent)", background: "var(--c-accent-soft)" }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                  <TriangleAlert size={20} aria-hidden="true" style={{ color: "var(--c-warn)" }} />
                  Qué tan confiable es hoy
                </h2>
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

function Medidor({ titulo, valor, meta, explicacion }: {
  titulo: string; valor: number | null; meta?: number; explicacion: string;
}) {
  const fraccion = valor === null ? 0 : Math.max(0, Math.min(1, valor));
  const bajoMeta = meta !== undefined && valor !== null && valor < meta;
  return (
    <div style={{ border: "1px solid var(--c-line)", borderRadius: "var(--r-md)", padding: "var(--s-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--s-3)" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{titulo}</p>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {valor === null ? "—" : pct(valor)}
        </p>
      </div>
      <div role="img" aria-label={`${titulo}: ${valor === null ? "sin dato" : pct(valor)}${meta !== undefined ? `, meta ${pct(meta)}` : ""}`}
        style={{ position: "relative", height: 10, margin: "var(--s-3) 0", borderRadius: 5, background: "var(--c-primary-soft)" }}>
        <div style={{ width: `${fraccion * 100}%`, height: "100%", borderRadius: 5,
          background: bajoMeta ? "var(--c-accent)" : "var(--c-primary)" }} />
        {meta !== undefined && (
          <div aria-hidden="true" style={{ position: "absolute", top: -3, bottom: -3, left: `${meta * 100}%`, width: 2,
            background: "var(--c-ink)" }} />
        )}
      </div>
      {meta !== undefined && (
        <p style={{ margin: "0 0 var(--s-1)", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
          color: bajoMeta ? "var(--c-warn)" : "var(--c-ok)" }}>
          Meta: {pct(meta)}{bajoMeta ? " · por debajo de la meta" : ""}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 13, color: "var(--c-muted)", lineHeight: 1.5 }}>{explicacion}</p>
    </div>
  );
}

function FilaMetrica({ nombre, valor, meta }: { nombre: string; valor: number | null; meta: number }) {
  const cumple = valor !== null && valor >= meta;
  return (
    <tr>
      <td>{nombre}</td>
      <td className="num" style={{ fontWeight: 600, color: "var(--c-ink)" }}>
        {valor === null ? "—" : valor.toFixed(2)}
      </td>
      <td className="num">≥ {meta.toFixed(2)}</td>
      <td>
        <span className={`chip ${cumple ? "chip-ok" : "chip-bad"}`}>
          {cumple ? <CircleCheck size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
          {cumple ? "Cumple" : "No alcanza la meta"}
        </span>
      </td>
    </tr>
  );
}
