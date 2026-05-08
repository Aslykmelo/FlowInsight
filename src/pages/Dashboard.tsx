import Sidebar from "../components/Sidebar";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Chart as ChartJS, ArcElement,
  Tooltip as CJTooltip, Legend as CJLegend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, CJTooltip, CJLegend);

// ─── Types ────────────────────────────────────────────
interface KPI {
  label: string; value: string;
  delta: string; positive: boolean;
  color: string; bg: string;
}
interface SalesPoint { mes: string; ventas: number; prediccion: number; }

// ─── Mock data (reemplazar con tu API) ────────────────
const KPI_DATA: KPI[] = [
  { label: "Total clientes",  value: "1,248",   delta: "+12%",   positive: true,  color: "#534AB7", bg: "#EEEDFE" },
  { label: "Ventas del mes",  value: "$84,320",  delta: "+8.4%",  positive: true,  color: "#0F6E56", bg: "#E1F5EE" },
  { label: "Intervalo prom.", value: "14 días",  delta: "-2 días",positive: true,  color: "#185FA5", bg: "#E6F1FB" },
  { label: "Riesgo abandono", value: "23%",      delta: "+3%",    positive: false, color: "#993C1D", bg: "#FAECE7" },
];

const SALES_DATA: SalesPoint[] = [
  { mes: "Ene", ventas: 42000, prediccion: 40000 },
  { mes: "Feb", ventas: 55000, prediccion: 52000 },
  { mes: "Mar", ventas: 49000, prediccion: 51000 },
  { mes: "Abr", ventas: 63000, prediccion: 60000 },
  { mes: "May", ventas: 71000, prediccion: 68000 },
  { mes: "Jun", ventas: 84320, prediccion: 80000 },
];

const DONUT_DATA = {
  labels: ["Bajo riesgo", "Riesgo medio", "Alto riesgo"],
  datasets: [{ data: [820, 298, 130],
    backgroundColor: ["#1D9E75", "#EF9F27", "#E24B4A"], borderWidth: 0 }],
};

// ─── KPI Card ─────────────────────────────────────────
function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e0e0e0",
      borderRadius:12, padding:"1rem 1.25rem" }}>
      <p style={{ margin:"0 0 6px", fontSize:13, color:"#888" }}>{kpi.label}</p>
      <p style={{ margin:"0 0 8px", fontSize:26, fontWeight:500, color:kpi.color }}>{kpi.value}</p>
      <span style={{ fontSize:12, color: kpi.positive ? "#0F6E56":"#993C1D",
        background: kpi.positive ? "#E1F5EE":"#FAECE7", padding:"2px 8px", borderRadius:6 }}>
        {kpi.delta} vs mes anterior
      </span>
    </div>
  );
}


// ─── Dashboard ────────────────────────────────────────
export default function Dashboard() {
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"auto" }}>

        {/* Header */}
        <header style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0",
          padding:"0.875rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:500 }}>Dashboard</h1>
            <p style={{ margin:0, fontSize:13, color:"#888" }}>
              {new Date().toLocaleDateString("es-CO", { dateStyle:"long" })}
            </p>
          </div>
          <button style={{ background:"#534AB7", color:"#fff", border:"none",
            borderRadius:8, padding:"8px 18px", cursor:"pointer", fontSize:14 }}>
            + Cargar Excel
          </button>
        </header>

        <main style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.5rem" }}>

          {/* KPIs */}
          <section style={{ display:"grid",
            gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
            {KPI_DATA.map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
          </section>

          {/* Line chart */}
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
            <h2 style={{ margin:"0 0 1rem", fontSize:16, fontWeight:500 }}>Ventas reales vs Predicción ML</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={SALES_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize:13 }} />
                <YAxis tick={{ fontSize:13 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString("es-CO")}`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="ventas" stroke="#534AB7" strokeWidth={2.5}
                  dot={{ r:4 }} name="Ventas reales" />
                <Line type="monotone" dataKey="prediccion" stroke="#1D9E75" strokeWidth={2}
                  strokeDasharray="6 4" dot={{ r:4 }} name="Predicción (ML)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar + Donut */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"1.25rem" }}>

            <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
              <h2 style={{ margin:"0 0 1rem", fontSize:16, fontWeight:500 }}>Ventas mensuales</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={SALES_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize:13 }} />
                  <YAxis tick={{ fontSize:13 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString("es-CO")}`, "Ventas"]} />
                  <Bar dataKey="ventas" fill="#534AB7" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
              <h2 style={{ margin:"0 0 1rem", fontSize:16, fontWeight:500 }}>Riesgo de abandono</h2>
              <div style={{ maxWidth:200, margin:"0 auto" }}>
                <Doughnut data={DONUT_DATA}
                  options={{ plugins:{ legend:{ position:"bottom",
                    labels:{ font:{ size:12 }, padding:12 } } }, cutout:"68%" }} />
              </div>
              <div style={{ marginTop:"1rem", display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { label:"Bajo riesgo",  value:"820", color:"#1D9E75" },
                  { label:"Riesgo medio", value:"298", color:"#EF9F27" },
                  { label:"Alto riesgo",  value:"130", color:"#E24B4A" },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:6, color:"#555" }}>
                      <span style={{ width:8, height:8, borderRadius:"50%",
                        background:r.color, display:"inline-block" }} />
                      {r.label}
                    </span>
                    <span style={{ fontWeight:500 }}>{r.value} clientes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}