import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as CJTooltip,
  Legend as CJLegend,
} from "chart.js";

import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, CJTooltip, CJLegend);

// ============================================================
// TIPOS
// ============================================================

interface KPI {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  color: string;
  bg: string;
}

interface SalesPoint {
  mes: string;
  ventas: number;
  prediccion: number;
}

interface ApiKPI {
  total_pedidos: number;
  total_clientes: number;
  ingresos_totales: number;
  ticket_promedio: number;
  clientes_activos: number;
}

interface ApiSale {
  fecha: string;
  total_pedidos: number;
  ingresos: number;
}

interface ChurnRisk {
  bajo_riesgo: number;
  riesgo_medio: number;
  alto_riesgo: number;
}

interface ProductoTop {
  producto: string;
  unidades_vendidas: number;
  ingresos: number;
}

interface VentaCanal {
  canal: string;
  total_pedidos: number;
  ingresos: number;
}

type WidgetId =
  | "kpis"
  | "ventas_prediccion"
  | "ventas_mensuales"
  | "riesgo_abandono"
  | "top_productos"
  | "ventas_canal";

interface WidgetDef {
  id: WidgetId;
  label: string;
}

const WIDGETS: WidgetDef[] = [
  { id: "kpis", label: "Tarjetas de KPIs" },
  { id: "ventas_prediccion", label: "Ventas reales vs Predicción ML" },
  { id: "ventas_mensuales", label: "Ventas mensuales" },
  { id: "riesgo_abandono", label: "Riesgo de abandono" },
  { id: "top_productos", label: "Productos más vendidos" },
  { id: "ventas_canal", label: "Ventas por canal" },
];

const WIDGETS_STORAGE_KEY = "flowinsight_dashboard_widgets";

// ============================================================
// URL DEL BACKEND
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// COMPONENTE KPI
// ============================================================

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e0e0e0",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: 13, color: "#888" }}>{kpi.label}</p>
      <p style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 500, color: kpi.color }}>
        {kpi.value}
      </p>
      <span
        style={{
          fontSize: 12,
          color: kpi.positive ? "#0F6E56" : "#993C1D",
          background: kpi.positive ? "#E1F5EE" : "#FAECE7",
          padding: "2px 8px",
          borderRadius: 6,
        }}
      >
        {kpi.delta}
      </span>
    </div>
  );
}

// ============================================================
// TARJETA CONTENEDORA (usada por los widgets)
// ============================================================

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "1.25rem" }}>
      <h2 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 500 }}>{title}</h2>
      {children}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const [kpis, setKpis] = useState<ApiKPI | null>(null);
  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [churnRisk, setChurnRisk] = useState<ChurnRisk | null>(null);
  const [topProductos, setTopProductos] = useState<ProductoTop[]>([]);
  const [ventasCanal, setVentasCanal] = useState<VentaCanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // PESTAÑAS Y WIDGETS SELECCIONABLES (estilo Power BI)
  // ==========================================================

  const [activeTab, setActiveTab] = useState<"resumen" | "personalizado">("resumen");

  const [widgetsVisibles, setWidgetsVisibles] = useState<Record<WidgetId, boolean>>(() => {
    try {
      const guardado = localStorage.getItem(WIDGETS_STORAGE_KEY);
      if (guardado) return JSON.parse(guardado);
    } catch {
      // si localStorage falla, seguimos con el valor por defecto
    }
    return {
      kpis: true,
      ventas_prediccion: true,
      ventas_mensuales: false,
      riesgo_abandono: false,
      top_productos: false,
      ventas_canal: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgetsVisibles));
    } catch {
      // no pasa nada si el navegador bloquea localStorage
    }
  }, [widgetsVisibles]);

  const toggleWidget = (id: WidgetId) => {
    setWidgetsVisibles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ==========================================================
  // CARGAR DATOS DEL BACKEND
  // ==========================================================

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setError("No hay sesión iniciada.");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const kpiResponse = await fetch(`${API_URL}/dashboard/kpis`, { method: "GET", headers });
        if (!kpiResponse.ok) throw new Error(`Error al obtener KPIs: ${kpiResponse.status}`);
        const kpiData: ApiKPI = await kpiResponse.json();
        setKpis(kpiData);

        const salesResponse = await fetch(`${API_URL}/dashboard/sales`, { method: "GET", headers });
        if (!salesResponse.ok) throw new Error(`Error al obtener ventas: ${salesResponse.status}`);
        const salesApiData: ApiSale[] = await salesResponse.json();

        const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        const datosGrafica: SalesPoint[] = salesApiData.map((item) => {
          const partes = item.fecha.split("-");
          const numeroMes = Number(partes[1]);
          const mes = nombresMeses[numeroMes - 1] || item.fecha;
          const ventas = Number(item.ingresos);

          // Predicción temporal: NO crea datos en la BD, solo mantiene
          // la gráfica mientras conectamos el modelo ML real (semana 6-7).
          const prediccion = Math.round(ventas * 0.94);

          return { mes, ventas, prediccion };
        });

        setSalesData(datosGrafica);

        const churnResponse = await fetch(`${API_URL}/dashboard/churn-risk`, { method: "GET", headers });
        if (!churnResponse.ok) throw new Error(`Error al obtener riesgo de abandono: ${churnResponse.status}`);
        const churnData: ChurnRisk = await churnResponse.json();
        setChurnRisk(churnData);

        const topProductosResponse = await fetch(`${API_URL}/dashboard/top-productos`, { method: "GET", headers });
        if (!topProductosResponse.ok) throw new Error(`Error al obtener productos: ${topProductosResponse.status}`);
        const topProductosData: ProductoTop[] = await topProductosResponse.json();
        setTopProductos(topProductosData);

        const ventasCanalResponse = await fetch(`${API_URL}/dashboard/ventas-por-canal`, { method: "GET", headers });
        if (!ventasCanalResponse.ok) throw new Error(`Error al obtener ventas por canal: ${ventasCanalResponse.status}`);
        const ventasCanalData: VentaCanal[] = await ventasCanalResponse.json();
        setVentasCanal(ventasCanalData);
      } catch (err) {
        console.error("Error cargando Dashboard:", err);
        setError("No fue posible cargar la información del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    cargarDashboard();
  }, []);

  const formatoMoneda = (valor: number) => {
    return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 });
  };

  const KPI_DATA: KPI[] = kpis
    ? [
        {
          label: "Total clientes",
          value: kpis.total_clientes.toLocaleString("es-CO"),
          delta: "Clientes Registrados",
          positive: true,
          color: "#534AB7",
          bg: "#EEEDFE",
        },
        {
          label: "Ventas del mes",
          value: salesData.length > 0 ? formatoMoneda(salesData[salesData.length - 1].ventas) : formatoMoneda(0),
          delta: "Ventas Registradas",
          positive: true,
          color: "#0F6E56",
          bg: "#E1F5EE",
        },
        {
          label: "Ticket promedio",
          value: formatoMoneda(kpis.ticket_promedio),
          delta: "Promedio por pedido",
          positive: true,
          color: "#BA7517",
          bg: "#FAEEDA",
        },
        {
          label: "Ingresos totales",
          value: formatoMoneda(kpis.ingresos_totales),
          delta: "Ventas Totales",
          positive: true,
          color: "#0F6E56",
          bg: "#E1F5EE",
        },
      ]
    : [];

  const DONUT_DATA = {
    labels: ["Bajo riesgo", "Riesgo medio", "Alto riesgo"],
    datasets: [
      {
        data: churnRisk ? [churnRisk.bajo_riesgo, churnRisk.riesgo_medio, churnRisk.alto_riesgo] : [0, 0, 0],
        backgroundColor: ["#1D9E75", "#EF9F27", "#E24B4A"],
        borderWidth: 0,
      },
    ],
  };

  const RIESGO_DATA = [
    { label: "Bajo riesgo", value: churnRisk?.bajo_riesgo ?? 0, color: "#1D9E75" },
    { label: "Riesgo medio", value: churnRisk?.riesgo_medio ?? 0, color: "#EF9F27" },
    { label: "Alto riesgo", value: churnRisk?.alto_riesgo ?? 0, color: "#E24B4A" },
  ];

  // ==========================================================
  // RENDER DE CADA WIDGET (reutilizable en las 2 pestañas)
  // ==========================================================

  const renderWidget = (id: WidgetId) => {
    if (id === "kpis") {
      return (
        <section
          key={id}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
        >
          {KPI_DATA.map((kpi) => (
            <KPICard key={kpi.label} kpi={kpi} />
          ))}
        </section>
      );
    }

    if (id === "ventas_prediccion") {
      return (
        <Card key={id} title="Ventas reales vs Predicción ML">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 13 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number, name: string) => [formatoMoneda(value), name]} />
              <Legend />
              <Line type="monotone" dataKey="ventas" stroke="#534AB7" strokeWidth={2.5} dot={{ r: 4 }} name="Ventas reales" />
              <Line
                type="monotone"
                dataKey="prediccion"
                stroke="#1D9E75"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
                name="Predicción (ML)"
              />
            </LineChart>
          </ResponsiveContainer>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#999" }}>
            * La predicción mostrada actualmente es temporal y será reemplazada por el modelo de Machine Learning.
          </p>
        </Card>
      );
    }

    if (id === "ventas_mensuales") {
      return (
        <Card key={id} title="Ventas mensuales">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 13 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [formatoMoneda(value), "Ventas"]} />
              <Bar dataKey="ventas" fill="#534AB7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      );
    }

    if (id === "top_productos") {
      return (
        <Card key={id} title="Productos más vendidos">
          <ResponsiveContainer width="100%" height={Math.max(200, topProductos.length * 44)}>
            <BarChart data={topProductos} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 13 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="producto" tick={{ fontSize: 12 }} width={160} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "ingresos" ? [formatoMoneda(value), "Ingresos"] : [value, "Unidades"]
                }
              />
              <Bar dataKey="ingresos" fill="#0F6E56" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      );
    }

    if (id === "ventas_canal") {
      const coloresCanal = ["#534AB7", "#0F6E56", "#BA7517", "#993C1D", "#1D6E9E"];
      const donutCanal = {
        labels: ventasCanal.map((v) => v.canal),
        datasets: [
          {
            data: ventasCanal.map((v) => v.ingresos),
            backgroundColor: ventasCanal.map((_, i) => coloresCanal[i % coloresCanal.length]),
            borderWidth: 0,
          },
        ],
      };

      return (
        <Card key={id} title="Ventas por canal">
          <div style={{ maxWidth: 220, margin: "0 auto" }}>
            <Doughnut
              data={donutCanal}
              options={{
                plugins: { legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12 } } },
                cutout: "60%",
              }}
            />
          </div>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
            {ventasCanal.map((v, i) => (
              <div key={v.canal} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#555", textTransform: "capitalize" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: coloresCanal[i % coloresCanal.length],
                      display: "inline-block",
                    }}
                  />
                  {v.canal}
                </span>
                <span style={{ fontWeight: 500 }}>{v.total_pedidos} pedidos</span>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    // riesgo_abandono
    return (
      <Card key={id} title="Riesgo de abandono">
        <div style={{ maxWidth: 200, margin: "0 auto" }}>
          <Doughnut
            data={DONUT_DATA}
            options={{
              plugins: { legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12 } } },
              cutout: "68%",
            }}
          />
        </div>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          {RIESGO_DATA.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#555" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, display: "inline-block" }} />
                {r.label}
              </span>
              <span style={{ fontWeight: 500 }}>{r.value} clientes</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "15px 0 0", fontSize: 11, color: "#999", textAlign: "center" }}>
          Datos obtenidos de la base de datos
        </p>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui, sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <LoadingSpinner message="Cargando información del dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui, sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem" }}>
          <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui, sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {/* HEADER */}
        <header
          style={{
            background: "#fff",
            borderBottom: "0.5px solid #e0e0e0",
            padding: "0.875rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Dashboard</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              {new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href = "/upload";
            }}
            style={{ background: "#534AB7", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 14 }}
          >
            + Cargar Excel
          </button>
        </header>

        {/* PESTAÑAS */}
        <div style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0", padding: "0 1.5rem", display: "flex", gap: 4 }}>
          {[
            { id: "resumen" as const, label: "Resumen general" },
            { id: "personalizado" as const, label: "Vista personalizada" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #534AB7" : "2px solid transparent",
                color: activeTab === tab.id ? "#534AB7" : "#666",
                fontWeight: activeTab === tab.id ? 500 : 400,
                fontSize: 14,
                padding: "12px 4px",
                marginRight: 20,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {activeTab === "resumen" && (
            <>
              {renderWidget("kpis")}
              {renderWidget("ventas_prediccion")}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: "1.25rem" }}>
                {renderWidget("ventas_mensuales")}
                {renderWidget("riesgo_abandono")}
              </div>
            </>
          )}

          {activeTab === "personalizado" && (
            <>
              {/* SELECTOR DE WIDGETS (estilo Power BI) */}
              <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "1rem 1.25rem" }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 500, color: "#555" }}>
                  Elige qué quieres ver en tu dashboard:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {WIDGETS.map((w) => (
                    <label
                      key={w.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        color: "#333",
                        background: widgetsVisibles[w.id] ? "#EEEDFE" : "#f5f5f7",
                        border: widgetsVisibles[w.id] ? "0.5px solid #534AB7" : "0.5px solid #e0e0e0",
                        borderRadius: 8,
                        padding: "6px 12px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={widgetsVisibles[w.id]}
                        onChange={() => toggleWidget(w.id)}
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* WIDGETS SELECCIONADOS */}
              {WIDGETS.filter((w) => widgetsVisibles[w.id]).length === 0 ? (
                <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "2rem", textAlign: "center", color: "#999", fontSize: 13 }}>
                  No has seleccionado ningún widget. Marca al menos uno arriba para verlo aquí.
                </div>
              ) : (
                WIDGETS.filter((w) => widgetsVisibles[w.id]).map((w) => renderWidget(w.id))
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
