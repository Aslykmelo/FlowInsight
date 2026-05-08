import { useState } from "react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface Prediction {
  id: string;
  cliente: string;
  ultimaCompra: string;
  intervalo: number;
  proximaCompra: string;
  riesgo: "bajo" | "medio" | "alto";
  probabilidad: number;
}

// ─── Mock data (reemplazar con tu API) ────────────────
const PREDICTIONS: Prediction[] = [
  { id: "C001", cliente: "Restaurante El Fogón",     ultimaCompra: "15/04/2026", intervalo: 12, proximaCompra: "27/04/2026", riesgo: "bajo",  probabilidad: 92 },
  { id: "C002", cliente: "Cafetería Central",         ultimaCompra: "02/04/2026", intervalo: 18, proximaCompra: "20/04/2026", riesgo: "alto",  probabilidad: 34 },
  { id: "C003", cliente: "Hotel Dann Carlton",        ultimaCompra: "20/04/2026", intervalo: 10, proximaCompra: "30/04/2026", riesgo: "bajo",  probabilidad: 88 },
  { id: "C004", cliente: "Panadería La Espiga",       ultimaCompra: "10/04/2026", intervalo: 14, proximaCompra: "24/04/2026", riesgo: "medio", probabilidad: 61 },
  { id: "C005", cliente: "Supermercado Éxito Norte",  ultimaCompra: "25/03/2026", intervalo: 30, proximaCompra: "24/04/2026", riesgo: "alto",  probabilidad: 28 },
  { id: "C006", cliente: "Club El Nogal",             ultimaCompra: "18/04/2026", intervalo: 7,  proximaCompra: "25/04/2026", riesgo: "bajo",  probabilidad: 95 },
  { id: "C007", cliente: "Colegio Los Alpes",         ultimaCompra: "05/04/2026", intervalo: 21, proximaCompra: "26/04/2026", riesgo: "medio", probabilidad: 55 },
  { id: "C008", cliente: "Clínica Shaio",             ultimaCompra: "12/04/2026", intervalo: 15, proximaCompra: "27/04/2026", riesgo: "bajo",  probabilidad: 81 },
  { id: "C009", cliente: "Bar La Candelaria",         ultimaCompra: "01/03/2026", intervalo: 45, proximaCompra: "15/04/2026", riesgo: "alto",  probabilidad: 18 },
  { id: "C010", cliente: "Jardín Infantil Semillas",  ultimaCompra: "22/04/2026", intervalo: 8,  proximaCompra: "30/04/2026", riesgo: "bajo",  probabilidad: 90 },
];

// ─── Helpers ──────────────────────────────────────────
const RIESGO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  bajo:  { color: "#0F6E56", bg: "#E1F5EE", label: "Bajo"  },
  medio: { color: "#BA7517", bg: "#FAEEDA", label: "Medio" },
  alto:  { color: "#993C1D", bg: "#FAECE7", label: "Alto"  },
};

function RiesgoBadge({ riesgo }: { riesgo: "bajo" | "medio" | "alto" }) {
  const s = RIESGO_STYLE[riesgo];
  return (
    <span style={{ fontSize:12, color:s.color, background:s.bg,
      padding:"3px 10px", borderRadius:6, fontWeight:500 }}>
      {s.label}
    </span>
  );
}

function BarProbabilidad({ valor }: { valor: number }) {
  const color = valor >= 70 ? "#1D9E75" : valor >= 40 ? "#EF9F27" : "#E24B4A";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, background:"#f0f0f0", borderRadius:99, height:6 }}>
        <div style={{ width:`${valor}%`, background:color, borderRadius:99, height:6 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:500, color, minWidth:32 }}>{valor}%</span>
    </div>
  );
}

// ─── Predictions Page ─────────────────────────────────
export default function Predictions() {
  const [filtro, setFiltro] = useState<"todos" | "bajo" | "medio" | "alto">("todos");
  const [busqueda, setBusqueda] = useState("");

  const datos = PREDICTIONS
    .filter(p => filtro === "todos" || p.riesgo === filtro)
    .filter(p => p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
                 p.id.toLowerCase().includes(busqueda.toLowerCase()));

  const conteo = {
    bajo:  PREDICTIONS.filter(p => p.riesgo === "bajo").length,
    medio: PREDICTIONS.filter(p => p.riesgo === "medio").length,
    alto:  PREDICTIONS.filter(p => p.riesgo === "alto").length,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />

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

          {/* Resumen riesgo */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
            {(["bajo","medio","alto"] as const).map(r => {
              const s = RIESGO_STYLE[r];
              return (
                <div key={r} onClick={() => setFiltro(filtro === r ? "todos" : r)}
                  style={{ background:"#fff", border: filtro === r ? `1.5px solid ${s.color}` : "0.5px solid #e0e0e0",
                    borderRadius:12, padding:"1rem 1.25rem", cursor:"pointer" }}>
                  <p style={{ margin:"0 0 4px", fontSize:12, color:"#888" }}>Riesgo {s.label}</p>
                  <p style={{ margin:0, fontSize:26, fontWeight:500, color:s.color }}>{conteo[r]}</p>
                  <p style={{ margin:"4px 0 0", fontSize:12, color:"#aaa" }}>clientes</p>
                </div>
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
              style={{ width:"100%", border:"0.5px solid #e0e0e0", borderRadius:8,
                padding:"8px 12px", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {/* Tabla */}
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f9f9f9", borderBottom:"0.5px solid #e0e0e0" }}>
                  {["ID","Cliente","Última compra","Intervalo (días)","Próxima compra","Probabilidad retención","Riesgo"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                      fontWeight:500, color:"#666", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>
                      No se encontraron resultados
                    </td>
                  </tr>
                ) : datos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom:"0.5px solid #f0f0f0",
                    background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding:"12px 16px", color:"#888", fontWeight:500 }}>{p.id}</td>
                    <td style={{ padding:"12px 16px", fontWeight:500 }}>{p.cliente}</td>
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
            Mostrando {datos.length} de {PREDICTIONS.length} clientes
          </p>

        </main>
      </div>
    </div>
  );
}