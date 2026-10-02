import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

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
  prediccion: number;
}

type Periodo = "7d" | "30d" | "mes" | "anio";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const API_URL = "http://127.0.0.1:8000";
const REFRESH_MS = 60000;

const NOMBRES_MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const formatoMoneda = (valor: number) =>
  valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

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
      background: "linear-gradient(90deg, #eee 25%, #f3f3f3 37%, #eee 63%)",
      backgroundSize: "400% 100%",
      animation: "flowinsight-shimmer 1.4s ease infinite",
    }} />
  );
}

function KPISkeleton() {
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1rem 1.25rem" }}>
      <SkeletonBox width={90} height={12} />
      <div style={{ height:8 }} />
      <SkeletonBox width={120} height={26} />
      <div style={{ height:10 }} />
      <SkeletonBox width={70} height={18} radius={6} />
    </div>
  );
}

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
      <SkeletonBox width={180} height={16} />
      <div style={{ height:16 }} />
      <SkeletonBox height={height} radius={10} />
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
  color: string;
  bg: string;
}

function KPICard({ kpi }: { kpi: KPIDef }) {
  const animado = useCountUp(kpi.valor);
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1rem 1.25rem" }}>
      <p style={{ margin:"0 0 6px", fontSize:13, color:"#888" }}>{kpi.label}</p>
      <p style={{ margin:"0 0 8px", fontSize:26, fontWeight:500, color:kpi.color, fontVariantNumeric:"tabular-nums" }}>
        {kpi.formato(animado)}
      </p>
      <span style={{ fontSize:12, color:"#0F6E56", background:"#E1F5EE", padding:"2px 8px", borderRadius:6 }}>
        {kpi.delta}
      </span>
    </div>
  );
}

// ============================================================
// TARJETA CONTENEDORA (con estado de error propio)
// ============================================================

function Card({ title, error, children }: { title: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
      <h2 style={{ margin:"0 0 1rem", fontSize:16, fontWeight:500 }}>{title}</h2>
      {error ? (
        <div role="alert" style={{ background:"#FAECE7", border:"0.5px solid #993C1D", borderRadius:8,
          padding:"0.875rem 1rem", fontSize:13, color:"#993C1D" }}>
          No fue posible cargar esta información. {error}
        </div>
      ) : children}
    </div>
  );
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

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
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
      // Predicción temporal: NO crea datos en la BD, solo mantiene la
      // gráfica mientras se conecta el modelo ML real.
      const prediccion = Math.round(ventas * 0.94);
      return { mesKey: item.fecha, mes: `${nombreMes} ${anio.slice(-2)}`, ventas, prediccion };
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
    { label:"Total clientes",  valor:kpis.total_clientes,  formato:(v) => Math.round(v).toLocaleString("es-CO"), delta:"Clientes registrados", color:"#534AB7", bg:"#EEEDFE" },
    { label:"Ventas del mes",  valor: salesFiltrado.length > 0 ? salesFiltrado[salesFiltrado.length - 1].ventas : 0, formato:formatoMoneda, delta:"Ventas registradas", color:"#0F6E56", bg:"#E1F5EE" },
    { label:"Ticket promedio", valor:kpis.ticket_promedio, formato:formatoMoneda, delta:"Promedio por pedido", color:"#BA7517", bg:"#FAEEDA" },
    { label:"Ingresos totales",valor:kpis.ingresos_totales,formato:formatoMoneda, delta:"Ventas totales", color:"#0F6E56", bg:"#E1F5EE" },
  ] : [];

  const churn = churnState.data;
  const RIESGO_PIE_DATA = [
    { name:"Bajo riesgo",  value: churn?.bajo_riesgo ?? 0,  color:"#1D9E75" },
    { name:"Riesgo medio", value: churn?.riesgo_medio ?? 0, color:"#EF9F27" },
    { name:"Alto riesgo",  value: churn?.alto_riesgo ?? 0,  color:"#993C1D" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />

      <style>{`
        @keyframes flowinsight-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
      `}</style>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"auto" }}>
        {/* HEADER */}
        <header style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0",
          padding:"0.875rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:500 }}>Dashboard</h1>
            <p style={{ margin:0, fontSize:13, color:"#888" }}>
              {new Date().toLocaleDateString("es-CO", { dateStyle:"long" })}
            </p>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#888" }}>
              {sinConexion && (
                <span style={{ background:"#FAECE7", color:"#993C1D", padding:"3px 10px",
                  borderRadius:6, fontWeight:500, fontSize:11 }}>
                  Sin conexión
                </span>
              )}
              {ultimaActualizacion && (
                <span>
                  Última actualización: hace {segundosDesde < 60 ? `${segundosDesde}s` : `${Math.floor(segundosDesde/60)} min`}
                </span>
              )}
            </div>
            <button
              onClick={() => { window.location.href = "/upload"; }}
              style={{ background:"#534AB7", color:"#fff", border:"none", borderRadius:8,
                padding:"8px 18px", cursor:"pointer", fontSize:14 }}>
              + Cargar Excel
            </button>
          </div>
        </header>

        {/* PESTAÑAS */}
        <div style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0", padding:"0 1.5rem",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:4 }}>
            {[{ id:"ventas" as const, label:"Ventas" }, { id:"clientes" as const, label:"Clientes" }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ background:"transparent", border:"none",
                  borderBottom: activeTab === tab.id ? "2px solid #534AB7" : "2px solid transparent",
                  color: activeTab === tab.id ? "#534AB7" : "#666",
                  fontWeight: activeTab === tab.id ? 500 : 400, fontSize:14,
                  padding:"12px 4px", marginRight:20, cursor:"pointer" }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:6, padding:"8px 0" }}>
            {PERIODOS.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)}
                style={{ background: periodo === p.id ? "#16163a" : "transparent",
                  color: periodo === p.id ? "#fff" : "#666",
                  border: periodo === p.id ? "none" : "0.5px solid #e0e0e0",
                  borderRadius:6, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {periodo !== "anio" && (
          <p style={{ margin:0, padding:"6px 1.5rem 0", fontSize:11, color:"#aaa" }}>
            * El backend agrega las ventas por mes; "{PERIODOS.find(p => p.id === periodo)?.label}" muestra el mes más reciente disponible.
          </p>
        )}

        <main style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem" }}>

          {/* KPIs — siempre visibles, en ambas pestañas */}
          <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
            {kpisState.loading && !kpis ? (
              [0,1,2,3].map((i) => <KPISkeleton key={i} />)
            ) : kpisState.error && !kpis ? (
              <div style={{ gridColumn:"1 / -1" }}>
                <Card title="KPIs" error={kpisState.error}><></></Card>
              </div>
            ) : (
              kpiCards.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)
            )}
          </section>

          {/* ================= PESTAÑA VENTAS ================= */}
          {activeTab === "ventas" && (
            <>
              {salesState.loading && !salesState.data ? (
                <ChartSkeleton height={260} />
              ) : (
                <Card title="Ventas reales vs Predicción ML" error={salesState.error}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={salesFiltrado}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize:13 }} />
                      <YAxis tick={{ fontSize:13 }} tickFormatter={(v) => `$${(Number(v)/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any, name: any) => [formatoMoneda(Number(v)), name]} />
                      <Legend />
                      <Line type="monotone" dataKey="ventas" stroke="#534AB7" strokeWidth={2.5} dot={{ r:4 }} name="Ventas reales" />
                      <Line type="monotone" dataKey="prediccion" stroke="#1D9E75" strokeWidth={2} strokeDasharray="6 4" dot={{ r:4 }} name="Predicción (ML)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:"1.25rem" }}>
                {salesState.loading && !salesState.data ? <ChartSkeleton /> : (
                  <Card title="Ventas mensuales" error={salesState.error}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={salesFiltrado}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize:13 }} />
                        <YAxis tick={{ fontSize:13 }} tickFormatter={(v) => `$${(Number(v)/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => [formatoMoneda(Number(v)), "Ventas"]} />
                        <Bar dataKey="ventas" fill="#534AB7" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {salesState.loading && !salesState.data ? <ChartSkeleton /> : (
                  <Card title="Tendencia acumulada de ventas" error={salesState.error}>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={ventasAcumuladas}>
                        <defs>
                          <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize:13 }} />
                        <YAxis tick={{ fontSize:13 }} tickFormatter={(v) => `$${(Number(v)/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => [formatoMoneda(Number(v)), "Acumulado"]} />
                        <Area type="monotone" dataKey="acumulado" stroke="#1D9E75" strokeWidth={2} fill="url(#colorAcumulado)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              {clientesState.loading && !clientesState.data ? <ChartSkeleton /> : (
                <Card title="Top 5 clientes por monto de compra" error={clientesState.error}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topClientes} layout="vertical" margin={{ left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:13 }} tickFormatter={(v) => `$${(Number(v)/1000000).toFixed(1)}M`} />
                      <YAxis type="category" dataKey="nombre_cliente" width={160} tick={{ fontSize:12 }} />
                      <Tooltip formatter={(v: any) => [formatoMoneda(Number(v)), "Monto"]} />
                      <Bar dataKey="monto_total" fill="#534AB7" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}

          {/* ================= PESTAÑA CLIENTES ================= */}
          {activeTab === "clientes" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"340px minmax(0,1fr)", gap:"1.25rem" }}>
                {churnState.loading && !churnState.data ? <ChartSkeleton height={200} /> : (
                  <Card title="Riesgo de abandono" error={churnState.error}>
                    <div style={{ maxWidth:220, margin:"0 auto" }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={RIESGO_PIE_DATA} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                            {RIESGO_PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: any, name: any) => [`${v} clientes`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop:"1rem", display:"flex", flexDirection:"column", gap:8 }}>
                      {RIESGO_PIE_DATA.map((r) => (
                        <div key={r.name} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                          <span style={{ display:"flex", alignItems:"center", gap:6, color:"#555" }}>
                            <span style={{ width:8, height:8, borderRadius:"50%", background:r.color, display:"inline-block" }} />
                            {r.name}
                          </span>
                          <span style={{ fontWeight:500 }}>{r.value} clientes</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {clientesState.loading && !clientesState.data ? <ChartSkeleton height={280} /> : (
                  <Card title="Clientes por ciudad" error={clientesState.error}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={clientesPorCiudad}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="ciudad" tick={{ fontSize:13 }} />
                        <YAxis tick={{ fontSize:13 }} allowDecimals={false} />
                        <Tooltip formatter={(v: any) => [`${v} clientes`, "Clientes"]} />
                        <Bar dataKey="cantidad" fill="#16163a" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              {clientesState.loading && !clientesState.data ? <ChartSkeleton height={200} /> : (
                <Card title="Clientes en riesgo" error={clientesState.error}>
                  <div style={{ border:"0.5px solid #e0e0e0", borderRadius:12, overflow:"hidden" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead>
                        <tr style={{ background:"#f9f9f9", borderBottom:"0.5px solid #e0e0e0" }}>
                          {["Cliente","Ciudad","Monto total","Última compra"].map((h) => (
                            <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:500, color:"#666" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientesEnRiesgo.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding:"1.5rem", textAlign:"center", color:"#aaa" }}>
                            No hay clientes en riesgo actualmente
                          </td></tr>
                        ) : clientesEnRiesgo.map((c, i) => (
                          <tr key={c.id_cliente} style={{ borderBottom:"0.5px solid #f0f0f0", background: i % 2 === 0 ? "#fff":"#fafafa" }}>
                            <td style={{ padding:"12px 16px", fontWeight:500 }}>{c.nombre_cliente}</td>
                            <td style={{ padding:"12px 16px", color:"#555" }}>{c.ciudad || "—"}</td>
                            <td style={{ padding:"12px 16px", color:"#0F6E56", fontWeight:500 }}>{formatoMoneda(c.monto_total)}</td>
                            <td style={{ padding:"12px 16px", color:"#555" }}>
                              {c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString("es-CO") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
