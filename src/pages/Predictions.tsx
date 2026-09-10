import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────
interface CompraHistorica {
  fecha: string;
  monto: number;
}

interface Prediction {
  id: string;
  cliente: string;
  ciudad: string;
  ultimaCompra: string;
  diasSinComprar: number;
  intervalo: number;
  proximaCompra: string;
  riesgo: "bajo" | "medio" | "alto";
  probabilidad: number;
  historial: CompraHistorica[];
}

interface ApiPrediccion {
  id: string;
  cliente: string;
  ciudad: string | null;
  ultima_compra: string | null;
  dias_sin_comprar: number;
  intervalo: number;
  proxima_compra: string | null;
  riesgo: string;
  probabilidad: number;
  historial: { fecha: string; monto: number }[];
}

const API_URL = "http://127.0.0.1:8000";

// ─── Helpers ──────────────────────────────────────────
const riesgoValido = (r: string): Prediction["riesgo"] =>
  r === "alto" ? "alto" : r === "medio" ? "medio" : "bajo";

const RIESGO_STYLE: Record<Prediction["riesgo"], { color: string; bg: string; label: string; emoji: string }> = {
  bajo:  { color: "#0F6E56", bg: "#E1F5EE", label: "Bajo",  emoji: "🟢" },
  medio: { color: "#BA7517", bg: "#FAEEDA", label: "Medio", emoji: "🟡" },
  alto:  { color: "#993C1D", bg: "#FAECE7", label: "Alto",  emoji: "🔴" },
};

const RECOMENDACION: Record<Prediction["riesgo"], string> = {
  alto:  "Contactar en los próximos 3 días",
  medio: "Monitorear en los próximos 7 días",
  bajo:  "Sin acción inmediata — cliente estable",
};

function Semaforo({ riesgo }: { riesgo: Prediction["riesgo"] }) {
  const s = RIESGO_STYLE[riesgo];
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", fontSize: 14, lineHeight: 1,
        animation: riesgo === "alto" ? "flowinsight-pulse 1.4s ease-in-out infinite" : "none",
      }}
    >
      {s.emoji}
    </span>
  );
}

function RiesgoBadge({ riesgo }: { riesgo: Prediction["riesgo"] }) {
  const s = RIESGO_STYLE[riesgo];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:s.color, background:s.bg,
      padding:"3px 10px", borderRadius:6, fontWeight:500 }}>
      <Semaforo riesgo={riesgo} />
      {s.label}
    </span>
  );
}

function BarProbabilidad({ valor }: { valor: number }) {
  const color = valor >= 70 ? "#1D9E75" : valor >= 40 ? "#EF9F27" : "#993C1D";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, background:"#f0f0f0", borderRadius:99, height:6 }}>
        <div style={{ width:`${valor}%`, background:color, borderRadius:99, height:6 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:500, color, minWidth:32 }}>{valor}%</span>
    </div>
  );
}

// ─── Panel de detalle por cliente ──────────────────────
function DetallePrediccion({ prediction, onClose }: { prediction: Prediction; onClose: () => void }) {
  const s = RIESGO_STYLE[prediction.riesgo];
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-modal-title"
        style={{ background:"#fff", borderRadius:16, padding:"1.75rem",
        width:520, maxWidth:"calc(100vw - 32px)", boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem" }}>
          <div>
            <p id="detalle-modal-title" style={{ margin:0, fontSize:17, fontWeight:500 }}>{prediction.cliente}</p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#888" }}>{prediction.id} · {prediction.ciudad}</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Cerrar detalle de predicción"
            style={{ background:"transparent", border:"none",
            cursor:"pointer", fontSize:22, color:"#aaa", lineHeight:1 }}>×</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:500, color:"#333" }}>Historial de compras</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={prediction.historial}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize:12 }} />
              <YAxis tick={{ fontSize:12 }} tickFormatter={(v) => `$${(Number(v)/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString("es-CO")}`, "Monto"]} />
              <Line type="monotone" dataKey="monto" stroke="#534AB7" strokeWidth={2.5} dot={{ r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div style={{ background:"#f5f5f7", borderRadius:12, padding:"0.75rem 1rem" }}>
            <p style={{ margin:"0 0 4px", fontSize:11, color:"#888" }}>Próxima compra estimada</p>
            <p style={{ margin:0, fontSize:16, fontWeight:500, color:"#534AB7" }}>{prediction.proximaCompra}</p>
          </div>
          <div style={{ background:"#f5f5f7", borderRadius:12, padding:"0.75rem 1rem" }}>
            <p style={{ margin:"0 0 4px", fontSize:11, color:"#888" }}>Riesgo de abandono</p>
            <RiesgoBadge riesgo={prediction.riesgo} />
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <p style={{ margin:"0 0 6px", fontSize:12, color:"#888" }}>Probabilidad de retención</p>
          <BarProbabilidad valor={prediction.probabilidad} />
        </div>

        <div style={{ background:s.bg, border:`0.5px solid ${s.color}`, borderRadius:12, padding:"0.875rem 1rem" }}>
          <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:500, color:s.color, textTransform:"uppercase", letterSpacing:0.3 }}>
            Recomendación de acción
          </p>
          <p style={{ margin:0, fontSize:14, color:s.color, fontWeight:500 }}>
            {RECOMENDACION[prediction.riesgo]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Predictions Page ─────────────────────────────────
export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtro, setFiltro] = useState<"todos" | "bajo" | "medio" | "alto">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [ciudad, setCiudad] = useState("todas");
  const [intervaloMin, setIntervaloMin] = useState("");
  const [intervaloMax, setIntervaloMax] = useState("");
  const [probMin, setProbMin] = useState("");
  const [probMax, setProbMax] = useState("");
  const [seleccionado, setSeleccionado] = useState<Prediction | null>(null);

  const tablaRef = useRef<HTMLDivElement>(null);

  // ───────────────────────────────────────────
  // CARGAR PREDICCIONES DEL BACKEND
  // ───────────────────────────────────────────
  useEffect(() => {
    const cargarPredicciones = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("No hay sesión iniciada.");
          return;
        }

        const response = await fetch(`${API_URL}/predicciones`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Error al obtener predicciones: ${response.status}`);
        }

        const data: ApiPrediccion[] = await response.json();

        const prediccionesFormateadas: Prediction[] = data.map((p) => ({
          id: p.id,
          cliente: p.cliente,
          ciudad: p.ciudad || "Sin ciudad",
          ultimaCompra: p.ultima_compra || "—",
          diasSinComprar: p.dias_sin_comprar,
          intervalo: p.intervalo,
          proximaCompra: p.proxima_compra || "—",
          riesgo: riesgoValido(p.riesgo),
          probabilidad: p.probabilidad,
          historial: p.historial,
        }));

        setPredictions(prediccionesFormateadas);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar las predicciones.");
      } finally {
        setLoading(false);
      }
    };

    cargarPredicciones();
  }, []);

  const CIUDADES = Array.from(new Set(predictions.map(p => p.ciudad))).sort();

  const datos = predictions
    .filter(p => filtro === "todos" || p.riesgo === filtro)
    .filter(p => ciudad === "todas" || p.ciudad === ciudad)
    .filter(p => intervaloMin === "" || p.intervalo >= Number(intervaloMin))
    .filter(p => intervaloMax === "" || p.intervalo <= Number(intervaloMax))
    .filter(p => probMin === "" || p.probabilidad >= Number(probMin))
    .filter(p => probMax === "" || p.probabilidad <= Number(probMax))
    .filter(p => p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
                 p.id.toLowerCase().includes(busqueda.toLowerCase()));

  const conteo = {
    bajo:  predictions.filter(p => p.riesgo === "bajo").length,
    medio: predictions.filter(p => p.riesgo === "medio").length,
    alto:  predictions.filter(p => p.riesgo === "alto").length,
  };

  const clientesAltoRiesgo = predictions
    .filter(p => p.riesgo === "alto")
    .sort((a, b) => a.probabilidad - b.probabilidad);

  const hayFiltrosActivos =
    busqueda !== "" || filtro !== "todos" || ciudad !== "todas" ||
    intervaloMin !== "" || intervaloMax !== "" || probMin !== "" || probMax !== "";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltro("todos");
    setCiudad("todas");
    setIntervaloMin("");
    setIntervaloMax("");
    setProbMin("");
    setProbMax("");
  };

  const verTodosAltoRiesgo = () => {
    setFiltro("alto");
    tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ───────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", fontSize:18, color:"#666" }}>
          Cargando predicciones...
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────
  // ERROR
  // ───────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center",
          flexDirection:"column", gap:10 }}>
          <h2>Error</h2>
          <p style={{ color:"#777" }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ background:"#534AB7", color:"#fff",
            border:"none", borderRadius:8, padding:"10px 18px", cursor:"pointer" }}>
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />

      <style>{`
        @keyframes flowinsight-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-pulse] { animation: none !important; }
        }
      `}</style>

      {seleccionado && (
        <DetallePrediccion prediction={seleccionado} onClose={() => setSeleccionado(null)} />
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <header style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0",
          padding:"0.875rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:500 }}>Predicciones ML</h1>
            <p style={{ margin:0, fontSize:13, color:"#888" }}>
              Próxima compra e índice de riesgo de abandono por cliente
            </p>
          </div>
          <button style={{ background:"#534AB7", color:"#fff", border:"none",
            borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14 }}>
            ↓ Exportar CSV
          </button>
        </header>

        <main style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Banner de alerta global */}
          {clientesAltoRiesgo.length > 5 && (
            <div role="alert" style={{ background:"#FAECE7", border:"0.5px solid #993C1D", borderRadius:12,
              padding:"0.875rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between",
              flexWrap:"wrap", gap:12 }}>
              <span style={{ fontSize:13, color:"#993C1D", fontWeight:500, display:"flex", alignItems:"center", gap:8 }}>
                <span aria-hidden="true">🔴</span>
                {clientesAltoRiesgo.length} clientes están en alto riesgo de abandono y requieren atención inmediata
              </span>
              <button onClick={verTodosAltoRiesgo}
                style={{ background:"#993C1D", color:"#fff", border:"none",
                  borderRadius:8, padding:"6px 16px", cursor:"pointer", fontSize:13, fontWeight:500 }}>
                Ver todos
              </button>
            </div>
          )}

          {/* Panel de alertas activas */}
          {clientesAltoRiesgo.length > 0 && (
            <section aria-label="Alertas de clientes en alto riesgo">
              <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:500, color:"#333" }}>
                Alertas activas — requieren atención inmediata
              </p>
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
                {clientesAltoRiesgo.map(p => (
                  <button key={p.id} type="button" onClick={() => setSeleccionado(p)}
                    style={{ flex:"0 0 220px", textAlign:"left", font:"inherit", cursor:"pointer",
                      background:"#fff", border:"0.5px solid #E9B8AC", borderLeft:"3px solid #993C1D",
                      borderRadius:12, padding:"0.875rem 1rem" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <span data-pulse aria-hidden="true" style={{ fontSize:14, display:"inline-block",
                        animation:"flowinsight-pulse 1.4s ease-in-out infinite" }}>🔴</span>
                      <span style={{ fontSize:13, fontWeight:500 }}>{p.cliente}</span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:12, color:"#993C1D" }}>
                      {p.diasSinComprar} días sin comprar
                    </p>
                    <p style={{ margin:0, fontSize:12, color:"#888" }}>
                      Retención: <strong style={{ color:"#993C1D" }}>{p.probabilidad}%</strong>
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Resumen riesgo */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
            {(["bajo","medio","alto"] as const).map(r => {
              const s = RIESGO_STYLE[r];
              const activo = filtro === r;
              return (
                <button key={r} type="button"
                  onClick={() => setFiltro(activo ? "todos" : r)}
                  aria-pressed={activo}
                  aria-label={`Filtrar por riesgo ${s.label}, ${conteo[r]} clientes`}
                  style={{ background:"#fff", border: activo ? `1.5px solid ${s.color}` : "0.5px solid #e0e0e0",
                    borderRadius:12, padding:"1rem 1.25rem", cursor:"pointer",
                    textAlign:"left", font:"inherit" }}>
                  <p style={{ margin:"0 0 4px", fontSize:12, color:"#888" }}>Riesgo {s.label}</p>
                  <p style={{ margin:0, fontSize:26, fontWeight:500, color:s.color }}>{conteo[r]}</p>
                  <p style={{ margin:"4px 0 0", fontSize:12, color:"#aaa" }}>clientes</p>
                </button>
              );
            })}
          </div>

          {/* Buscador */}
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1rem 1.25rem" }}>
            <input
              type="text"
              placeholder="Buscar por cliente o ID..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              aria-label="Buscar por cliente o ID"
              style={{ width:"100%", border:"0.5px solid #e0e0e0", borderRadius:8,
                padding:"8px 12px", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {/* Filtros avanzados */}
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12,
            padding:"1rem 1.25rem", display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>

            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:150 }}>
              <label htmlFor="pred-ciudad" style={{ fontSize:12, color:"#888", fontWeight:500 }}>Ciudad</label>
              <select id="pred-ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)}
                style={{ border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", background:"#fff", boxSizing:"border-box" }}>
                <option value="todas">Todas las ciudades</option>
                {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="pred-int-min" style={{ fontSize:12, color:"#888", fontWeight:500 }}>Intervalo mín. (días)</label>
              <input id="pred-int-min" type="number" min={0} placeholder="0" value={intervaloMin}
                onChange={e => setIntervaloMin(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="pred-int-max" style={{ fontSize:12, color:"#888", fontWeight:500 }}>Intervalo máx. (días)</label>
              <input id="pred-int-max" type="number" min={0} placeholder="60" value={intervaloMax}
                onChange={e => setIntervaloMax(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="pred-prob-min" style={{ fontSize:12, color:"#888", fontWeight:500 }}>Retención mín. (%)</label>
              <input id="pred-prob-min" type="number" min={0} max={100} placeholder="0" value={probMin}
                onChange={e => setProbMin(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="pred-prob-max" style={{ fontSize:12, color:"#888", fontWeight:500 }}>Retención máx. (%)</label>
              <input id="pred-prob-max" type="number" min={0} max={100} placeholder="100" value={probMax}
                onChange={e => setProbMax(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>

            <button onClick={limpiarFiltros} disabled={!hayFiltrosActivos}
              style={{ marginLeft:"auto",
                background: hayFiltrosActivos ? "#fff" : "#f5f5f7",
                color: hayFiltrosActivos ? "#534AB7" : "#bbb",
                border: hayFiltrosActivos ? "0.5px solid #534AB7" : "0.5px solid #e0e0e0",
                borderRadius:8, padding:"8px 16px", fontSize:13,
                cursor: hayFiltrosActivos ? "pointer" : "not-allowed" }}>
              Limpiar filtros
            </button>
          </div>

          {/* Tabla */}
          <div ref={tablaRef} style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f9f9f9", borderBottom:"0.5px solid #e0e0e0" }}>
                  {["ID","Cliente","Ciudad","Última compra","Intervalo (días)","Próxima compra","Probabilidad retención","Riesgo"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                      fontWeight:500, color:"#666", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="🤖"
                        title="Todavía no hay predicciones disponibles"
                        description="Los modelos de Machine Learning generan predicciones una vez haya suficiente historial de compras cargado."
                        actionLabel="Ir a Cargar Excel"
                        onAction={() => { window.location.href = "/upload"; }}
                      />
                    </td>
                  </tr>
                ) : datos.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="🔍"
                        title="Sin resultados con estos filtros"
                        description="Ningún cliente coincide con la búsqueda o los filtros aplicados."
                        actionLabel={hayFiltrosActivos ? "Limpiar filtros" : undefined}
                        onAction={hayFiltrosActivos ? limpiarFiltros : undefined}
                      />
                    </td>
                  </tr>
                ) : datos.map((p, i) => (
                  <tr key={p.id}
                    onClick={() => setSeleccionado(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSeleccionado(p);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalle de predicción de ${p.cliente}`}
                    style={{ borderBottom:"0.5px solid #f0f0f0", cursor:"pointer",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding:"12px 16px", color:"#888", fontWeight:500 }}>{p.id}</td>
                    <td style={{ padding:"12px 16px", fontWeight:500 }}>{p.cliente}</td>
                    <td style={{ padding:"12px 16px", color:"#555" }}>{p.ciudad}</td>
                    <td style={{ padding:"12px 16px", color:"#555" }}>{p.ultimaCompra}</td>
                    <td style={{ padding:"12px 16px", color:"#555", textAlign:"center" }}>{p.intervalo}</td>
                    <td style={{ padding:"12px 16px", color:"#534AB7", fontWeight:500 }}>{p.proximaCompra}</td>
                    <td style={{ padding:"12px 16px", minWidth:140 }}>
                      <BarProbabilidad valor={p.probabilidad} />
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <RiesgoBadge riesgo={p.riesgo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ margin:0, fontSize:12, color:"#aaa" }}>
            Mostrando {datos.length} de {predictions.length} clientes
          </p>

        </main>
      </div>
    </div>
  );
}