import { API_URL } from "../config";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import { useAuth } from "../context/AuthContext";
import { Upload, Users, TrendingUp, Receipt, Wallet, ChartColumn, type LucideIcon } from "lucide-react";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ============================================================
// TIPOS
// ============================================================

interface ApiKPI {
  total_pedidos: number;
  total_clientes: number;
  ingresos_totales: number;
  ticket_promedio: number;
  clientes_activos: number;
}

interface ApiSale {
  fecha: string; // "YYYY-MM"
  total_pedidos: number;
  ingresos: number;
}

interface ChurnRisk {
  bajo_riesgo: number;
  riesgo_medio: number;
  alto_riesgo: number;
}

interface ApiClienteResumen {
  id_cliente: number;
  nombre_cliente: string;
  ciudad: string | null;
  monto_total: number;
  ultima_compra: string | null;
  estado: "activo" | "en riesgo" | "inactivo";
}

interface SalesPoint {
  mesKey: string; // "YYYY-MM", para filtrar por período
  mes: string;    // etiqueta legible
  ventas: number;
}

type Periodo = "7d" | "30d" | "mes" | "anio";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const REFRESH_MS = 60000;

const NOMBRES_MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Colores de gráficos: salen de la paleta del sistema de diseño (design.css).
const COLOR = {
  primary: "#1e40af",
  accent: "#e8a33d",
  ok: "#0f6e56",
  bad: "#a33a1e",
  grid: "#e6e8ee",
  axis: "#5b6472",
};

const TICK = { fontSize: 12, fill: COLOR.axis };
const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #e6e8ee", fontSize: 13 };

const formatoMoneda = (valor: number) =>
  valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

// Ejes: valores cortos y legibles ("$1,5 M", "$850 mil")
const formatoCompacto = (v: number) => {
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CO")} mil`;
  return `$${n}`;
};

const recortar = (texto: string, max = 18) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

function authHeaders(): HeadersInit | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ============================================================
// SKELETON (carga)
// ============================================================

function SkeletonBox({ width = "100%", height = 16, radius = 6 }: { width?: number | string; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "var(--c-line)",
      animation: "flowinsight-pulse-skeleton 1.4s ease-in-out infinite",
    }} />
  );
}

function KPISkeleton() {
  return (
    <div className="kpi" role="status" aria-label="Cargando indicador">
      <SkeletonBox width={96} height={12} />
      <div style={{ height: "var(--s-3)" }} />
      <SkeletonBox width={128} height={28} />
      <div style={{ height: "var(--s-3)" }} />
      <SkeletonBox width={112} height={12} />
    </div>
  );
}

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="card" role="status" aria-label="Cargando gráfico">
      <SkeletonBox width={180} height={16} />
      <div style={{ height: "var(--s-4)" }} />
      <SkeletonBox height={height} radius={8} />
    </div>
  );
}

// ============================================================
// CONTEO ANIMADO
// ============================================================

function useCountUp(valor: number, duracionMs = 700): number {
  const [display, setDisplay] = useState(valor);
  const inicioValor = useRef(valor);

  useEffect(() => {
    const desde = inicioValor.current;
    const hasta = valor;
    if (desde === hasta) return;

    // Respeta la preferencia de "reducir movimiento"
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      inicioValor.current = hasta;
      setDisplay(hasta);
      return;
    }

    const inicioTiempo = performance.now();
    let raf: number;

    function tick(ahora: number) {
      const t = Math.min(1, (ahora - inicioTiempo) / duracionMs);
      setDisplay(desde + (hasta - desde) * t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        inicioValor.current = hasta;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return display;
}

// ============================================================
// KPI CARD
// ============================================================

interface KPIDef {
  label: string;
  valor: number;
  formato: (v: number) => string;
  delta: string;
  icon: LucideIcon;
}

function KPICard({ kpi }: { kpi: KPIDef }) {
  const animado = useCountUp(kpi.valor);
  const Icono = kpi.icon;
  return (
    <div className="kpi">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--s-3)" }}>
        <p className="kpi-label">{kpi.label}</p>
        <span aria-hidden="true" style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "var(--r-sm)",
          background: "var(--c-primary-soft)", color: "var(--c-primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icono size={20} />
        </span>
      </div>
      <p className="kpi-value">{kpi.formato(animado)}</p>
      <p className="kpi-note">{kpi.delta}</p>
    </div>
  );
}

// ============================================================
// TARJETA CONTENEDORA (con estado de error propio)
// ============================================================

function Card({ title, error, onRetry, children }: {
  title: string; error?: string | null; onRetry?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="card" aria-label={title}>
      <h2>{title}</h2>
      {error ? (
        <ErrorMessage message={`No fue posible cargar esta información. ${error}`} onRetry={onRetry} />
      ) : children}
    </section>
  );
}

// Envoltorio accesible para un gráfico: describe su contenido a lectores de pantalla
function ChartBox({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="img" aria-label={label}>{children}</div>;
}

// ============================================================
// PERÍODO — filtra el arreglo mensual de ventas (el backend
// agrega por mes; "7 días"/"30 días" se acercan usando el mes
// más reciente disponible, no hay granularidad diaria real).
// ============================================================

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "7d",   label: "Últimos 7 días" },
  { id: "30d",  label: "Últimos 30 días" },
  { id: "mes",  label: "Este mes" },
  { id: "anio", label: "Este año" },
];

function filtrarPorPeriodo(ventas: ApiSale[], periodo: Periodo): ApiSale[] {
  if (ventas.length === 0) return ventas;
  if (periodo === "anio") {
    const anioActual = ventas[ventas.length - 1].fecha.slice(0, 4);
    return ventas.filter((v) => v.fecha.startsWith(anioActual));
  }
  // 7d / 30d / mes: el dato más granular que hay es mensual
  return ventas.slice(-1);
}

const TABS = [
  { id: "ventas" as const, label: "Ventas" },
  { id: "clientes" as const, label: "Clientes" },
];

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"ventas" | "clientes">("ventas");
  const [periodo, setPeriodo] = useState<Periodo>("anio");

  const [kpisState, setKpisState] = useState<FetchState<ApiKPI>>({ data: null, loading: true, error: null });
  const [salesState, setSalesState] = useState<FetchState<ApiSale[]>>({ data: null, loading: true, error: null });
  const [churnState, setChurnState] = useState<FetchState<ChurnRisk>>({ data: null, loading: true, error: null });
  const [clientesState, setClientesState] = useState<FetchState<ApiClienteResumen[]>>({ data: null, loading: true, error: null });

  const [sinConexion, setSinConexion] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [segundosDesde, setSegundosDesde] = useState(0);

  // ------------------------------------------------------------
  // Carga de datos — cada recurso mantiene su propio estado, así
  // si uno falla no rompe el resto del dashboard.
  // ------------------------------------------------------------
  const cargarTodo = async (esRefresh: boolean) => {
    const headers = authHeaders();
    if (!headers) {
      const msg = "No hay sesión iniciada.";
      setKpisState((s) => ({ ...s, loading: false, error: msg }));
      setSalesState((s) => ({ ...s, loading: false, error: msg }));
      setChurnState((s) => ({ ...s, loading: false, error: msg }));
      setClientesState((s) => ({ ...s, loading: false, error: msg }));
      return;
    }

    if (!esRefresh) {
      setKpisState((s) => ({ ...s, loading: true }));
      setSalesState((s) => ({ ...s, loading: true }));
      setChurnState((s) => ({ ...s, loading: true }));
      setClientesState((s) => ({ ...s, loading: true }));
    }

    const [kpisRes, salesRes, churnRes, clientesRes] = await Promise.allSettled([
      fetch(`${API_URL}/dashboard/kpis`, { headers }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch(`${API_URL}/dashboard/sales`, { headers }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch(`${API_URL}/dashboard/churn-risk`, { headers }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetch(`${API_URL}/clientes/resumen`, { headers }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
    ]);

    let huboFallo = false;

    if (kpisRes.status === "fulfilled") {
      setKpisState({ data: kpisRes.value, loading: false, error: null });
    } else {
      huboFallo = true;
      setKpisState((s) => ({ data: s.data, loading: false, error: s.data ? null : "No fue posible conectar con el servidor." }));
    }

    if (salesRes.status === "fulfilled") {
      setSalesState({ data: salesRes.value, loading: false, error: null });
    } else {
      huboFallo = true;
      setSalesState((s) => ({ data: s.data, loading: false, error: s.data ? null : "No fue posible obtener las ventas." }));
    }

    if (churnRes.status === "fulfilled") {
      setChurnState({ data: churnRes.value, loading: false, error: null });
    } else {
      huboFallo = true;
      setChurnState((s) => ({ data: s.data, loading: false, error: s.data ? null : "No fue posible obtener el riesgo de abandono." }));
    }

    if (clientesRes.status === "fulfilled") {
      setClientesState({ data: clientesRes.value, loading: false, error: null });
    } else {
      huboFallo = true;
      setClientesState((s) => ({ data: s.data, loading: false, error: s.data ? null : "No fue posible obtener los clientes." }));
    }

    setSinConexion(huboFallo && kpisRes.status === "rejected");
    if (kpisRes.status === "fulfilled") {
      setUltimaActualizacion(new Date());
    }
  };

  useEffect(() => {
    cargarTodo(false);
    const interval = setInterval(() => cargarTodo(true), REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ticker de "hace X segundos"
  useEffect(() => {
    const tick = setInterval(() => {
      if (ultimaActualizacion) {
        setSegundosDesde(Math.floor((Date.now() - ultimaActualizacion.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [ultimaActualizacion]);

  // ------------------------------------------------------------
  // Transformaciones de datos
  // ------------------------------------------------------------
  const salesDataCompleto: SalesPoint[] = useMemo(() => {
    if (!salesState.data) return [];
    return salesState.data.map((item) => {
      const [anio, mesNum] = item.fecha.split("-");
      const nombreMes = NOMBRES_MESES[Number(mesNum) - 1] || item.fecha;
      const ventas = Number(item.ingresos);
      return { mesKey: item.fecha, mes: `${nombreMes} ${anio.slice(-2)}`, ventas };
    });
  }, [salesState.data]);

  const salesFiltrado = useMemo(() => {
    if (!salesState.data) return [];
    const filtradas = filtrarPorPeriodo(salesState.data, periodo);
    const clavesFiltradas = new Set(filtradas.map((f) => f.fecha));
    return salesDataCompleto.filter((s) => clavesFiltradas.has(s.mesKey));
  }, [salesState.data, salesDataCompleto, periodo]);

  const ventasAcumuladas = useMemo(() => {
    let acumulado = 0;
    return salesFiltrado.map((p) => {
      acumulado += p.ventas;
      return { mes: p.mes, acumulado };
    });
  }, [salesFiltrado]);

  const topClientes = useMemo(() => {
    if (!clientesState.data) return [];
    return [...clientesState.data].sort((a, b) => b.monto_total - a.monto_total).slice(0, 5);
  }, [clientesState.data]);

  const clientesPorCiudad = useMemo(() => {
    if (!clientesState.data) return [];
    const mapa = new Map<string, number>();
    clientesState.data.forEach((c) => {
      const ciudad = c.ciudad || "Sin ciudad";
      mapa.set(ciudad, (mapa.get(ciudad) ?? 0) + 1);
    });
    return Array.from(mapa.entries()).map(([ciudad, cantidad]) => ({ ciudad, cantidad }));
  }, [clientesState.data]);

  const clientesEnRiesgo = useMemo(() => {
    if (!clientesState.data) return [];
    return clientesState.data.filter((c) => c.estado === "en riesgo");
  }, [clientesState.data]);

  const kpis = kpisState.data;
  const kpiCards: KPIDef[] = kpis ? [
    { label:"Total clientes",  valor:kpis.total_clientes,  formato:(v) => Math.round(v).toLocaleString("es-CO"), delta:"Clientes registrados", icon: Users },
    { label:"Ventas del mes",  valor: salesFiltrado.length > 0 ? salesFiltrado[salesFiltrado.length - 1].ventas : 0, formato:formatoMoneda, delta:"Ventas registradas", icon: TrendingUp },
    { label:"Ticket promedio", valor:kpis.ticket_promedio, formato:formatoMoneda, delta:"Promedio por pedido", icon: Receipt },
    { label:"Ingresos totales",valor:kpis.ingresos_totales,formato:formatoMoneda, delta:"Ventas totales", icon: Wallet },
  ] : [];

  const churn = churnState.data;
  const RIESGO_PIE_DATA = [
    { name:"Bajo riesgo",  value: churn?.bajo_riesgo ?? 0,  color: COLOR.ok },
    { name:"Riesgo medio", value: churn?.riesgo_medio ?? 0, color: COLOR.accent },
    { name:"Alto riesgo",  value: churn?.alto_riesgo ?? 0,  color: COLOR.bad },
  ];
  const totalRiesgo = RIESGO_PIE_DATA.reduce((acc, r) => acc + r.value, 0);

  const cargandoVentas = salesState.loading && !salesState.data;
  const cargandoClientes = clientesState.loading && !clientesState.data;
  const reintentar = () => cargarTodo(false);
  const sinVentas = salesFiltrado.length === 0;
  const irACargar = () => navigate("/upload");

  const vacioVentas = (
    <EmptyState
      icon={<ChartColumn size={24} />}
      title="Todavía no hay ventas registradas"
      description="Las gráficas se llenan cuando cargas un archivo de ventas en Excel."
      actionLabel="Ir a Cargar Excel"
      onAction={irACargar}
    />
  );

  const textoActualizacion = !ultimaActualizacion
    ? null
    : segundosDesde < 10 ? "hace unos segundos"
    : segundosDesde < 60 ? `hace ${segundosDesde} s`
    : `hace ${Math.floor(segundosDesde / 60)} min`;

  return (
    <div className="app-shell">
      <Sidebar />

      <style>{`
        @keyframes flowinsight-pulse-skeleton { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .dash-toolbar {
          background: var(--c-surface);
          border-bottom: 1px solid var(--c-line);
          padding: 0 var(--s-5);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--s-2) var(--s-4);
        }
        .dash-tabs { display: flex; gap: var(--s-5); }
        .dash-tab {
          min-height: 48px;
          padding: 0 var(--s-1);
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--c-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .dash-tab:hover { color: var(--c-ink); }
        .dash-tab[aria-selected="true"] { color: var(--c-primary); border-bottom-color: var(--c-primary); }
        .dash-periods { display: flex; gap: var(--s-2); flex-wrap: wrap; padding: var(--s-2) 0; }
        .dash-periods .btn[aria-pressed="true"] {
          background: var(--c-primary-soft);
          border-color: var(--c-primary);
          color: var(--c-primary);
        }
        .dash-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--s-4); }
        .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: var(--s-5); }
        .dash-legend-row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); font-size: 14px; }
        @media (max-width: 600px) {
          .dash-toolbar { padding: 0 var(--s-4); }
        }
      `}</style>

      <div className="app-main">
        {/* ENCABEZADO */}
        <header className="page-header">
          <div>
            <h1>{usuario ? `Bienvenido, ${usuario.nombre_usuario.split(" ")[0]}` : "Dashboard"}</h1>
            <p>{new Date().toLocaleDateString("es-CO", { dateStyle:"long" })}</p>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"var(--s-3)", flexWrap:"wrap" }}>
            {sinConexion && (
              <span className="chip chip-bad" role="status">Sin conexión con el servidor</span>
            )}
            {textoActualizacion && (
              <span style={{ fontSize:13, color:"var(--c-muted)" }}>
                Actualizado {textoActualizacion}
              </span>
            )}
            <button type="button" className="btn btn-primary" onClick={irACargar}>
              <Upload size={16} aria-hidden="true" />
              Cargar Excel
            </button>
          </div>
        </header>

        {/* PESTAÑAS Y PERÍODO */}
        <div className="dash-toolbar">
          <div className="dash-tabs" role="tablist" aria-label="Secciones del dashboard">
            {TABS.map((tab, idx) => (
              <button key={tab.id} type="button" role="tab" id={`tab-${tab.id}`}
                className="dash-tab"
                aria-selected={activeTab === tab.id}
                aria-controls="dash-panel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const sig = TABS[(idx + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
                    setActiveTab(sig.id);
                    document.getElementById(`tab-${sig.id}`)?.focus();
                  }
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dash-periods" role="group" aria-label="Período de ventas">
            {PERIODOS.map((p) => (
              <button key={p.id} type="button" className="btn"
                aria-pressed={periodo === p.id}
                onClick={() => setPeriodo(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <main className="page-body">
          {periodo !== "anio" && (
            <p className="notice notice-warn" role="note" style={{ margin:0 }}>
              El sistema agrupa las ventas por mes, así que &quot;{PERIODOS.find(p => p.id === periodo)?.label}&quot; muestra el mes más reciente disponible.
            </p>
          )}

          {/* KPIs — siempre visibles, en ambas pestañas */}
          <section aria-label="Indicadores principales" className="dash-kpis">
            {kpisState.loading && !kpis ? (
              [0,1,2,3].map((i) => <KPISkeleton key={i} />)
            ) : kpisState.error && !kpis ? (
              <div className="card" style={{ gridColumn:"1 / -1" }}>
                <ErrorMessage message={`No fue posible cargar los indicadores. ${kpisState.error}`} onRetry={reintentar} />
              </div>
            ) : (
              kpiCards.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)
            )}
          </section>

          <div role="tabpanel" id="dash-panel" aria-labelledby={`tab-${activeTab}`}
            style={{ display:"flex", flexDirection:"column", gap:"var(--s-5)" }}>

            {/* ================= PESTAÑA VENTAS ================= */}
            {activeTab === "ventas" && (
              <>
                {cargandoVentas ? (
                  <ChartSkeleton height={260} />
                ) : (
                  <Card title="Ventas por mes" error={salesState.error} onRetry={reintentar}>
                    {sinVentas ? vacioVentas : (
                      <>
                        <ChartBox label={`Gráfico de líneas con las ventas reales para ${salesFiltrado.length} ${salesFiltrado.length === 1 ? "mes" : "meses"}. Última venta: ${formatoMoneda(salesFiltrado[salesFiltrado.length - 1].ventas)}.`}>
                          <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={salesFiltrado}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                              <XAxis dataKey="mes" tick={TICK} minTickGap={4} />
                              <YAxis tick={TICK} width={88} tickFormatter={formatoCompacto} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => [formatoMoneda(Number(v)), name]} />
                              <Legend wrapperStyle={{ fontSize: 13 }} />
                              <Line isAnimationActive={false} type="monotone" dataKey="ventas" stroke={COLOR.primary} strokeWidth={3} dot={{ r:4 }} name="Ventas reales" />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartBox>
                      </>
                    )}
                  </Card>
                )}

                <div className="dash-grid">
                  {cargandoVentas ? <ChartSkeleton /> : (
                    <Card title="Ventas mensuales" error={salesState.error} onRetry={reintentar}>
                      {sinVentas ? vacioVentas : (
                        <ChartBox label={`Gráfico de barras con las ventas de ${salesFiltrado.length} ${salesFiltrado.length === 1 ? "mes" : "meses"}.`}>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={salesFiltrado}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                              <XAxis dataKey="mes" tick={TICK} minTickGap={4} />
                              <YAxis tick={TICK} width={88} tickFormatter={formatoCompacto} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatoMoneda(Number(v)), "Ventas"]} />
                              <Bar isAnimationActive={false} dataKey="ventas" fill={COLOR.primary} radius={[4,4,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartBox>
                      )}
                    </Card>
                  )}

                  {cargandoVentas ? <ChartSkeleton /> : (
                    <Card title="Tendencia acumulada de ventas" error={salesState.error} onRetry={reintentar}>
                      {sinVentas ? vacioVentas : (
                        <ChartBox label={`Gráfico de área con las ventas acumuladas. Total acumulado: ${formatoMoneda(ventasAcumuladas[ventasAcumuladas.length - 1].acumulado)}.`}>
                          <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={ventasAcumuladas}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                              <XAxis dataKey="mes" tick={TICK} minTickGap={4} />
                              <YAxis tick={TICK} width={88} tickFormatter={formatoCompacto} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatoMoneda(Number(v)), "Acumulado"]} />
                              <Area isAnimationActive={false} type="monotone" dataKey="acumulado" stroke={COLOR.primary} strokeWidth={3} fill={COLOR.primary} fillOpacity={0.12} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartBox>
                      )}
                    </Card>
                  )}
                </div>

                {cargandoClientes ? <ChartSkeleton /> : (
                  <Card title="Top 5 clientes por monto de compra" error={clientesState.error} onRetry={reintentar}>
                    {topClientes.length === 0 ? (
                      <EmptyState
                        icon={<Users size={24} />}
                        title="Todavía no hay clientes con compras"
                        description="El ranking aparece cuando cargas un archivo de ventas en Excel."
                        actionLabel="Ir a Cargar Excel"
                        onAction={irACargar}
                      />
                    ) : (
                      <ChartBox label={`Gráfico de barras con los ${topClientes.length} clientes que más compran. El primero es ${topClientes[0].nombre_cliente} con ${formatoMoneda(topClientes[0].monto_total)}.`}>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={topClientes} layout="vertical" margin={{ left: 0, right: 28 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} horizontal={false} />
                            <XAxis type="number" tick={TICK} tickFormatter={formatoCompacto} />
                            <YAxis type="category" dataKey="nombre_cliente" width={170} tick={TICK}
                              tickFormatter={(v) => recortar(String(v), 24)} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatoMoneda(Number(v)), "Monto"]} />
                            <Bar isAnimationActive={false} dataKey="monto_total" fill={COLOR.primary} radius={[0,4,4,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartBox>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* ================= PESTAÑA CLIENTES ================= */}
            {activeTab === "clientes" && (
              <>
                <div className="dash-grid">
                  {churnState.loading && !churnState.data ? <ChartSkeleton height={200} /> : (
                    <Card title="Riesgo de abandono" error={churnState.error} onRetry={reintentar}>
                      {totalRiesgo === 0 ? (
                        <EmptyState
                          title="Sin datos de riesgo todavía"
                          description="El riesgo de abandono se calcula cuando hay historial de compras cargado."
                          actionLabel="Ir a Cargar Excel"
                          onAction={irACargar}
                        />
                      ) : (
                        <>
                          <ChartBox label={`Gráfico circular de riesgo de abandono: ${RIESGO_PIE_DATA.map((r) => `${r.name} ${r.value}`).join(", ")} clientes.`}>
                            <div style={{ maxWidth:220, margin:"0 auto" }}>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie isAnimationActive={false} data={RIESGO_PIE_DATA} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}
                                    paddingAngle={2} stroke="#ffffff" strokeWidth={2}>
                                    {RIESGO_PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                  </Pie>
                                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => [`${v} clientes`, name]} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartBox>
                          <ul style={{ margin:"var(--s-4) 0 0", padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:"var(--s-2)" }}>
                            {RIESGO_PIE_DATA.map((r) => (
                              <li key={r.name} className="dash-legend-row">
                                <span style={{ display:"flex", alignItems:"center", gap:"var(--s-2)", color:"var(--c-ink-2)" }}>
                                  <span aria-hidden="true" style={{ width:12, height:12, borderRadius:3, background:r.color, display:"inline-block" }} />
                                  {r.name}
                                </span>
                                <span style={{ fontWeight:600, fontVariantNumeric:"tabular-nums" }}>
                                  {r.value} clientes · {Math.round((r.value / totalRiesgo) * 100)}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </Card>
                  )}

                  {cargandoClientes ? <ChartSkeleton height={280} /> : (
                    <Card title="Clientes por ciudad" error={clientesState.error} onRetry={reintentar}>
                      {clientesPorCiudad.length === 0 ? (
                        <EmptyState
                          icon={<Users size={24} />}
                          title="Todavía no hay clientes registrados"
                          description="Los clientes aparecen cuando cargas un archivo de ventas en Excel."
                          actionLabel="Ir a Cargar Excel"
                          onAction={irACargar}
                        />
                      ) : (
                        <ChartBox label={`Gráfico de barras con la cantidad de clientes en ${clientesPorCiudad.length} ${clientesPorCiudad.length === 1 ? "ciudad" : "ciudades"}.`}>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={clientesPorCiudad}>
                              <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} />
                              <XAxis dataKey="ciudad" tick={TICK} />
                              <YAxis tick={TICK} allowDecimals={false} />
                              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} clientes`, "Clientes"]} />
                              <Bar isAnimationActive={false} dataKey="cantidad" fill={COLOR.primary} radius={[4,4,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartBox>
                      )}
                    </Card>
                  )}
                </div>

                {cargandoClientes ? <ChartSkeleton height={200} /> : (
                  <Card title="Clientes en riesgo" error={clientesState.error} onRetry={reintentar}>
                    <div className="table-scroll" style={{ border:"1px solid var(--c-line)", borderRadius:"var(--r-sm)" }}>
                      <table className="table" style={{ minWidth:480 }}>
                        <caption style={{ position:"absolute", width:1, height:1, overflow:"hidden", clip:"rect(0 0 0 0)" }}>
                          Clientes en riesgo de abandono
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Cliente</th>
                            <th scope="col">Ciudad</th>
                            <th scope="col" className="num">Monto total</th>
                            <th scope="col">Última compra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientesEnRiesgo.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding:"var(--s-5)", textAlign:"center", color:"var(--c-muted)" }}>
                              No hay clientes en riesgo actualmente
                            </td></tr>
                          ) : clientesEnRiesgo.map((c) => (
                            <tr key={c.id_cliente}>
                              <td style={{ fontWeight:600, color:"var(--c-ink)" }}>{c.nombre_cliente}</td>
                              <td>{c.ciudad || "—"}</td>
                              <td className="num">{formatoMoneda(c.monto_total)}</td>
                              <td>{c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString("es-CO") : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
