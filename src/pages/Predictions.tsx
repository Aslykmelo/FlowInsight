import { API_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Download, Search, X, CircleCheck, TriangleAlert, CircleX, Sparkles, type LucideIcon,
} from "lucide-react";
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

// Colores de gráficos: salen de la paleta del sistema de diseño.
const COLOR = { primary: "#1e40af", grid: "#e2e8f0", axis: "#475569" };

const formatoCompacto = (v: number) => {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CO")} mil`;
  return `$${n}`;
};

// ─── Helpers ──────────────────────────────────────────
const riesgoValido = (r: string): Prediction["riesgo"] =>
  r === "alto" ? "alto" : r === "medio" ? "medio" : "bajo";

// Cada nivel de riesgo se comunica con color + ícono + texto (no solo color).
const RIESGO_STYLE: Record<Prediction["riesgo"], { chip: string; notice: string; color: string; bar: string; label: string; icon: LucideIcon }> = {
  bajo:  { chip: "chip chip-ok",   notice: "notice notice-ok",   color: "var(--c-ok)",   bar: "#0f6e56", label: "Bajo",  icon: CircleCheck },
  medio: { chip: "chip chip-warn", notice: "notice notice-warn", color: "var(--c-warn)", bar: "#e8a33d", label: "Medio", icon: TriangleAlert },
  alto:  { chip: "chip chip-bad",  notice: "notice notice-bad",  color: "var(--c-bad)",  bar: "#a33a1e", label: "Alto",  icon: CircleX },
};

const RECOMENDACION: Record<Prediction["riesgo"], string> = {
  alto:  "Contactar en los próximos 3 días",
  medio: "Monitorear en los próximos 7 días",
  bajo:  "Sin acción inmediata — cliente estable",
};

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
};

const ESTILOS = `
  .pred-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--s-4); }
  .pred-summary-btn { width: 100%; text-align: left; font: inherit; cursor: pointer; min-height: 40px; }
  .pred-summary-btn:hover { border-color: var(--c-faint); }
  .pred-summary-btn[aria-pressed="true"] { border-color: var(--c-primary); box-shadow: 0 0 0 2px var(--c-primary); }
  .pred-alerts { display: flex; gap: var(--s-3); overflow-x: auto; padding: var(--s-1) var(--s-1) var(--s-2); margin: 0 calc(-1 * var(--s-1)); }
  .pred-alert-card {
    flex: 0 0 220px; text-align: left; font: inherit; cursor: pointer;
    background: var(--c-surface); border: 1px solid var(--c-bad);
    border-radius: var(--r-md); padding: var(--s-3) var(--s-4); min-height: 40px;
  }
  .pred-alert-card:hover { background: var(--c-bad-soft); }
  .pred-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--s-4); align-items: end; }
  .pred-search { position: relative; }
  .pred-search .input { padding-left: 40px; }
  .pred-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--c-muted); pointer-events: none; }
  .pred-seg { display: flex; gap: var(--s-2); flex-wrap: wrap; }
  .pred-seg .btn[aria-pressed="true"] { background: var(--c-primary-soft); border-color: var(--c-primary); color: var(--c-primary); }
  .pred-row { cursor: pointer; }
  .pred-name-btn {
    background: transparent; border: none; padding: var(--s-2) 0; min-height: 40px; cursor: pointer;
    font: inherit; font-weight: 600; color: var(--c-primary); text-align: left;
  }
  .pred-name-btn:hover { text-decoration: underline; }
  .pred-meter { display: flex; align-items: center; gap: var(--s-2); min-width: 120px; }
  .pred-meter-track { flex: 1; background: var(--c-line); border-radius: 99px; height: 8px; overflow: hidden; }
  .pred-meter-fill { height: 100%; border-radius: 99px; }
  .pred-meter-value { min-width: 40px; text-align: right; font-size: 13px; font-weight: 700; color: var(--c-ink); font-variant-numeric: tabular-nums; }
  .pred-overlay {
    position: fixed; inset: 0; z-index: 140; padding: var(--s-4);
    background: rgba(27, 36, 48, 0.5);
    display: flex; align-items: center; justify-content: center;
  }
  .pred-dialog {
    background: var(--c-surface); border-radius: var(--r-lg); padding: var(--s-5);
    width: 540px; max-width: 100%; max-height: 100%; overflow-y: auto;
    box-shadow: var(--shadow-2);
  }
  .pred-info { background: var(--c-bg); border-radius: var(--r-md); padding: var(--s-3) var(--s-4); }
  .pred-info-label { margin: 0 0 var(--s-1); font-size: 12px; font-weight: 600; color: var(--c-muted); }
`;

function RiesgoBadge({ riesgo }: { riesgo: Prediction["riesgo"] }) {
  const s = RIESGO_STYLE[riesgo];
  const Icono = s.icon;
  return (
    <span className={s.chip}>
      <Icono size={14} aria-hidden="true" />
      {s.label}
    </span>
  );
}

function BarProbabilidad({ valor, etiqueta = "Probabilidad de retención" }: { valor: number; etiqueta?: string }) {
  const color = valor >= 70 ? "#0f6e56" : valor >= 40 ? "#e8a33d" : "#a33a1e";
  const ancho = Math.max(0, Math.min(100, valor));
  return (
    <div className="pred-meter">
      <div className="pred-meter-track" role="meter" aria-label={etiqueta}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}>
        <div className="pred-meter-fill" style={{ width:`${ancho}%`, background:color }} />
      </div>
      <span className="pred-meter-value">{valor}%</span>
    </div>
  );
}

// ─── Panel de detalle por cliente ──────────────────────
function DetallePrediccion({ prediction, onClose }: { prediction: Prediction; onClose: () => void }) {
  const s = RIESGO_STYLE[prediction.riesgo];
  const IconoRiesgo = s.icon;
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
    <div className="pred-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="detalle-modal-title"
        className="pred-dialog"
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"var(--s-3)", marginBottom:"var(--s-4)" }}>
          <div style={{ minWidth:0 }}>
            <h2 id="detalle-modal-title" style={{ margin:0, fontSize:18, fontWeight:700, overflowWrap:"anywhere" }}>{prediction.cliente}</h2>
            <p style={{ margin:"2px 0 0", fontSize:13, color:"var(--c-muted)" }}>{prediction.id} · {prediction.ciudad}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="btn" onClick={onClose}
            aria-label="Cerrar detalle de predicción" style={{ width:40, padding:0, flexShrink:0 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ marginBottom:"var(--s-4)" }}>
          <h3 style={{ margin:"0 0 var(--s-2)", fontSize:14, fontWeight:700 }}>Historial de compras</h3>
          {prediction.historial.length === 0 ? (
            <p style={{ margin:0, fontSize:14, color:"var(--c-muted)" }}>
              Este cliente aún no tiene compras en el historial.
            </p>
          ) : (
            <div role="img" aria-label={`Gráfico de líneas con ${prediction.historial.length} compras históricas de ${prediction.cliente}.`}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={prediction.historial}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                  <XAxis dataKey="fecha" tick={{ fontSize:12, fill:COLOR.axis }} />
                  <YAxis tick={{ fontSize:12, fill:COLOR.axis }} width={84} tickFormatter={formatoCompacto} />
                  <Tooltip contentStyle={{ borderRadius:8, border:"1px solid #e6e8ee", fontSize:13 }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString("es-CO")}`, "Monto"]} />
                  <Line isAnimationActive={false} type="monotone" dataKey="monto" stroke={COLOR.primary} strokeWidth={3} dot={{ r:4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid-auto" style={{ marginBottom:"var(--s-4)", gap:"var(--s-3)" }}>
          <div className="pred-info">
            <p className="pred-info-label">Próxima compra estimada</p>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:"var(--c-primary)", fontVariantNumeric:"tabular-nums" }}>{prediction.proximaCompra}</p>
          </div>
          <div className="pred-info">
            <p className="pred-info-label">Riesgo de abandono</p>
            <RiesgoBadge riesgo={prediction.riesgo} />
          </div>
        </div>

        <div style={{ marginBottom:"var(--s-4)" }}>
          <p className="pred-info-label">Probabilidad de retención</p>
          <BarProbabilidad valor={prediction.probabilidad} />
        </div>

        <div className={s.notice} style={{ padding:"var(--s-3) var(--s-4)" }}>
          <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.03em",
            display:"flex", alignItems:"center", gap:"var(--s-2)" }}>
            <IconoRiesgo size={14} aria-hidden="true" />
            Recomendación de acción
          </p>
          <p style={{ margin:0, fontSize:14, fontWeight:600 }}>
            {RECOMENDACION[prediction.riesgo]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Predictions Page ─────────────────────────────────
export default function Predictions() {
  const navigate = useNavigate();
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

  // Exporta a CSV lo que se ve en la tabla (respeta los filtros aplicados)
  const exportarCSV = () => {
    const columnas = ["ID", "Cliente", "Ciudad", "Última compra", "Intervalo (días)", "Próxima compra", "Probabilidad de retención (%)", "Riesgo"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const filas = datos.map(p => [p.id, p.cliente, p.ciudad, p.ultimaCompra, p.intervalo, p.proximaCompra, p.probabilidad, RIESGO_STYLE[p.riesgo].label]);
    const csv = [columnas, ...filas].map(f => f.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predicciones.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const encabezado = (accion?: React.ReactNode) => (
    <header className="page-header">
      <div>
        <h1>Predicciones ML</h1>
        <p>Próxima compra e índice de riesgo de abandono por cliente</p>
      </div>
      {accion}
    </header>
  );

  // ───────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          {encabezado()}
          <main className="page-body">
            <LoadingSpinner message="Cargando predicciones..." />
          </main>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────
  // ERROR
  // ───────────────────────────────────────────
  if (error) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          {encabezado()}
          <main className="page-body">
            <ErrorMessage message={error} onRetry={() => window.location.reload()} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <style>{ESTILOS}</style>

      {seleccionado && (
        <DetallePrediccion prediction={seleccionado} onClose={() => setSeleccionado(null)} />
      )}

      <div className="app-main">
        {encabezado(
          <button type="button" className="btn btn-primary" onClick={exportarCSV} disabled={datos.length === 0}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </button>
        )}

        <main className="page-body">

          {/* Banner de alerta global */}
          {clientesAltoRiesgo.length > 5 && (
            <div role="alert" className="notice notice-bad" style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", flexWrap:"wrap", gap:"var(--s-3)", padding:"var(--s-3) var(--s-4)" }}>
              <span style={{ fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:"var(--s-2)" }}>
                <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink:0 }} />
                {clientesAltoRiesgo.length} clientes están en alto riesgo de abandono y requieren atención inmediata
              </span>
              <button type="button" className="btn btn-danger" onClick={verTodosAltoRiesgo}>
                Ver todos
              </button>
            </div>
          )}

          {/* Panel de alertas activas */}
          {clientesAltoRiesgo.length > 0 && (
            <section aria-label="Alertas de clientes en alto riesgo">
              <h2 style={{ margin:"0 0 var(--s-3)", fontSize:16, fontWeight:700 }}>
                Alertas activas: requieren atención inmediata
              </h2>
              <div className="pred-alerts">
                {clientesAltoRiesgo.map(p => (
                  <button key={p.id} type="button" className="pred-alert-card" onClick={() => setSeleccionado(p)}
                    aria-label={`Ver detalle de ${p.cliente}: ${p.diasSinComprar} días sin comprar, retención ${p.probabilidad}%`}>
                    <span style={{ display:"flex", alignItems:"center", gap:"var(--s-2)", marginBottom:"var(--s-2)",
                      fontSize:14, fontWeight:600, color:"var(--c-ink)" }}>
                      <CircleX size={16} color="var(--c-bad)" aria-hidden="true" style={{ flexShrink:0 }} />
                      {p.cliente}
                    </span>
                    <span style={{ display:"block", fontSize:13, color:"var(--c-bad)", fontWeight:600 }}>
                      {p.diasSinComprar} días sin comprar
                    </span>
                    <span style={{ display:"block", fontSize:13, color:"var(--c-muted)", fontVariantNumeric:"tabular-nums" }}>
                      Retención: <strong style={{ color:"var(--c-ink)" }}>{p.probabilidad}%</strong>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Resumen riesgo */}
          <section aria-label="Resumen por nivel de riesgo" className="pred-summary">
            {(["bajo","medio","alto"] as const).map(r => {
              const s = RIESGO_STYLE[r];
              const Icono = s.icon;
              const activo = filtro === r;
              return (
                <button key={r} type="button" className="kpi pred-summary-btn"
                  onClick={() => setFiltro(activo ? "todos" : r)}
                  aria-pressed={activo}
                  aria-label={`Filtrar por riesgo ${s.label}, ${conteo[r]} clientes`}>
                  <p className="kpi-label" style={{ display:"flex", alignItems:"center", gap:"var(--s-2)", color:s.color }}>
                    <Icono size={16} aria-hidden="true" />
                    Riesgo {s.label}
                  </p>
                  <p className="kpi-value">{conteo[r]}</p>
                  <p className="kpi-note">clientes</p>
                </button>
              );
            })}
          </section>

          {/* Búsqueda y filtros */}
          <section aria-label="Búsqueda y filtros" className="card"
            style={{ display:"flex", flexDirection:"column", gap:"var(--s-4)", padding:"var(--s-4) var(--s-5)" }}>
            <div style={{ display:"flex", gap:"var(--s-3)", alignItems:"center", flexWrap:"wrap" }}>
              <div className="pred-search" style={{ flex:"1 1 260px", minWidth:0 }}>
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  className="input"
                  placeholder="Buscar por cliente o ID..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  aria-label="Buscar por cliente o ID"
                />
              </div>
              <div className="pred-seg" role="group" aria-label="Filtrar por riesgo">
                {(["todos","bajo","medio","alto"] as const).map(f => (
                  <button key={f} type="button" className="btn" aria-pressed={filtro === f}
                    onClick={() => setFiltro(f)}>
                    {f === "todos" ? "Todos" : `Riesgo ${RIESGO_STYLE[f].label.toLowerCase()}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="pred-filters">
              <div>
                <label className="field-label" htmlFor="pred-ciudad">Ciudad</label>
                <select id="pred-ciudad" className="input" value={ciudad} onChange={e => setCiudad(e.target.value)}>
                  <option value="todas">Todas las ciudades</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="pred-int-min">Intervalo mín. (días)</label>
                <input id="pred-int-min" type="number" min={0} placeholder="0" className="input" value={intervaloMin}
                  onChange={e => setIntervaloMin(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="pred-int-max">Intervalo máx. (días)</label>
                <input id="pred-int-max" type="number" min={0} placeholder="60" className="input" value={intervaloMax}
                  onChange={e => setIntervaloMax(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="pred-prob-min">Retención mín. (%)</label>
                <input id="pred-prob-min" type="number" min={0} max={100} placeholder="0" className="input" value={probMin}
                  onChange={e => setProbMin(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="pred-prob-max">Retención máx. (%)</label>
                <input id="pred-prob-max" type="number" min={0} max={100} placeholder="100" className="input" value={probMax}
                  onChange={e => setProbMax(e.target.value)} />
              </div>

              <div>
                <button type="button" className="btn btn-outline" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}
                  style={{ width:"100%" }}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          </section>

          {/* Tabla */}
          <div ref={tablaRef} className="card" style={{ padding:0, overflow:"hidden" }}>
            <div className="table-scroll">
              <table className="table" style={{ minWidth:880 }}>
                <caption style={SR_ONLY}>Predicciones de compra y riesgo de abandono por cliente</caption>
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Ciudad</th>
                    <th scope="col">Última compra</th>
                    <th scope="col" className="num">Intervalo (días)</th>
                    <th scope="col">Próxima compra</th>
                    <th scope="col">Probabilidad retención</th>
                    <th scope="col">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding:0 }}>
                        <EmptyState
                          icon={<Sparkles size={24} />}
                          title="Todavía no hay predicciones disponibles"
                          description="Los modelos de Machine Learning generan predicciones una vez haya suficiente historial de compras cargado."
                          actionLabel="Ir a Cargar Excel"
                          onAction={() => navigate("/upload")}
                        />
                      </td>
                    </tr>
                  ) : datos.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding:0 }}>
                        <EmptyState
                          icon={<Search size={24} />}
                          title="Sin resultados con estos filtros"
                          description="Ningún cliente coincide con la búsqueda o los filtros aplicados."
                          actionLabel={hayFiltrosActivos ? "Limpiar filtros" : undefined}
                          onAction={hayFiltrosActivos ? limpiarFiltros : undefined}
                        />
                      </td>
                    </tr>
                  ) : datos.map((p) => (
                    <tr key={p.id} className="pred-row" onClick={() => setSeleccionado(p)}>
                      <td style={{ color:"var(--c-muted)", fontWeight:600, whiteSpace:"nowrap" }}>{p.id}</td>
                      <td>
                        {/* Botón real dentro de la fila: accesible con teclado y lector de pantalla */}
                        <button type="button" className="pred-name-btn"
                          onClick={(e) => { e.stopPropagation(); setSeleccionado(p); }}
                          aria-label={`Ver detalle de predicción de ${p.cliente}`}>
                          {p.cliente}
                        </button>
                      </td>
                      <td>{p.ciudad}</td>
                      <td style={{ whiteSpace:"nowrap" }}>{p.ultimaCompra}</td>
                      <td className="num">{p.intervalo}</td>
                      <td style={{ fontWeight:600, color:"var(--c-ink)", whiteSpace:"nowrap", fontVariantNumeric:"tabular-nums" }}>{p.proximaCompra}</td>
                      <td>
                        <BarProbabilidad valor={p.probabilidad} etiqueta={`Probabilidad de retención de ${p.cliente}`} />
                      </td>
                      <td>
                        <RiesgoBadge riesgo={p.riesgo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p role="status" style={{ margin:0, fontSize:13, color:"var(--c-muted)" }}>
            Mostrando {datos.length} de {predictions.length} clientes
          </p>

        </main>
      </div>
    </div>
  );
}
