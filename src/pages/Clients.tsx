import { useState } from "react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface Client {
  id: string;
  nombre: string;
  telefono: string;
  ciudad: string;
  totalPedidos: number;
  montoTotal: string;
  ultimaCompra: string;
  intervalo: number;
  estado: "activo" | "en riesgo" | "inactivo";
}

// ─── Mock data — clientes W&T Food ───────────────────
const CLIENTS: Client[] = [
  { id:"CLI001", nombre:"Restaurante El Fogón",     telefono:"601 234 5678", ciudad:"Bogotá",    totalPedidos:24, montoTotal:"$4.320.000",  ultimaCompra:"15/04/2026", intervalo:12, estado:"activo"    },
  { id:"CLI002", nombre:"Cafetería Central",         telefono:"601 345 6789", ciudad:"Bogotá",    totalPedidos:8,  montoTotal:"$980.000",    ultimaCompra:"02/04/2026", intervalo:28, estado:"en riesgo" },
  { id:"CLI003", nombre:"Hotel Dann Carlton",        telefono:"601 456 7890", ciudad:"Bogotá",    totalPedidos:36, montoTotal:"$12.500.000", ultimaCompra:"20/04/2026", intervalo:10, estado:"activo"    },
  { id:"CLI004", nombre:"Panadería La Espiga",       telefono:"604 567 8901", ciudad:"Medellín",  totalPedidos:15, montoTotal:"$2.100.000",  ultimaCompra:"10/04/2026", intervalo:14, estado:"activo"    },
  { id:"CLI005", nombre:"Supermercado Éxito Norte",  telefono:"601 678 9012", ciudad:"Bogotá",    totalPedidos:4,  montoTotal:"$560.000",    ultimaCompra:"25/03/2026", intervalo:45, estado:"en riesgo" },
  { id:"CLI006", nombre:"Club El Nogal",             telefono:"601 789 0123", ciudad:"Bogotá",    totalPedidos:48, montoTotal:"$18.200.000", ultimaCompra:"18/04/2026", intervalo:7,  estado:"activo"    },
  { id:"CLI007", nombre:"Colegio Los Alpes",         telefono:"601 890 1234", ciudad:"Bogotá",    totalPedidos:10, montoTotal:"$1.450.000",  ultimaCompra:"05/04/2026", intervalo:21, estado:"activo"    },
  { id:"CLI008", nombre:"Clínica Shaio",             telefono:"601 901 2345", ciudad:"Bogotá",    totalPedidos:22, montoTotal:"$5.800.000",  ultimaCompra:"12/04/2026", intervalo:15, estado:"activo"    },
  { id:"CLI009", nombre:"Bar La Candelaria",         telefono:"601 012 3456", ciudad:"Bogotá",    totalPedidos:2,  montoTotal:"$210.000",    ultimaCompra:"01/03/2026", intervalo:60, estado:"inactivo"  },
  { id:"CLI010", nombre:"Jardín Infantil Semillas",  telefono:"605 123 4567", ciudad:"Cali",      totalPedidos:18, montoTotal:"$2.900.000",  ultimaCompra:"22/04/2026", intervalo:8,  estado:"activo"    },
  { id:"CLI011", nombre:"Fonda Paisa Doña Rosa",     telefono:"604 234 5678", ciudad:"Medellín",  totalPedidos:30, montoTotal:"$6.100.000",  ultimaCompra:"19/04/2026", intervalo:11, estado:"activo"    },
  { id:"CLI012", nombre:"Centro Comercial Andino",   telefono:"601 345 6780", ciudad:"Bogotá",    totalPedidos:1,  montoTotal:"$80.000",     ultimaCompra:"10/02/2026", intervalo:75, estado:"inactivo"  },
];

const ESTADO_STYLE: Record<string, { color: string; bg: string }> = {
  "activo":    { color:"#0F6E56", bg:"#E1F5EE" },
  "en riesgo": { color:"#BA7517", bg:"#FAEEDA" },
  "inactivo":  { color:"#993C1D", bg:"#FAECE7" },
};

// ─── Ciudades disponibles (derivadas de los clientes) ─
const CIUDADES = Array.from(new Set(CLIENTS.map(c => c.ciudad))).sort();

// ─── "DD/MM/AAAA" → "AAAAMMDD" para comparar fechas sin líos de huso horario ─
function fechaComparable(fecha: string): string {
  const [d, m, y] = fecha.split("/");
  return `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
}

// ─── Modal detalle cliente ────────────────────────────
function ClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const s = ESTADO_STYLE[client.estado];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"2rem",
        width:460, boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:"50%", background:"#EEEDFE",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, fontWeight:500, color:"#534AB7", flexShrink:0 }}>
              {client.nombre.charAt(0)}
            </div>
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:500 }}>{client.nombre}</p>
              <p style={{ margin:0, fontSize:12, color:"#888" }}>{client.id}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            cursor:"pointer", fontSize:22, color:"#aaa", lineHeight:1 }}>×</button>
        </div>

        {[
          { label:"Teléfono",            value: client.telefono },
          { label:"Ciudad",              value: client.ciudad },
          { label:"Total pedidos",       value: `${client.totalPedidos} pedidos` },
          { label:"Monto total",         value: client.montoTotal },
          { label:"Última compra",       value: client.ultimaCompra },
          { label:"Intervalo promedio",  value: `${client.intervalo} días entre compras` },
        ].map(row => (
          <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
            padding:"10px 0", borderBottom:"0.5px solid #f0f0f0", fontSize:14 }}>
            <span style={{ color:"#888" }}>{row.label}</span>
            <span style={{ fontWeight:500 }}>{row.value}</span>
          </div>
        ))}

        <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:14 }}>
          <span style={{ color:"#888" }}>Estado</span>
          <span style={{ fontSize:12, color:s.color, background:s.bg,
            padding:"3px 10px", borderRadius:6, fontWeight:500 }}>
            {client.estado.charAt(0).toUpperCase() + client.estado.slice(1)}
          </span>
        </div>

        <button onClick={onClose} style={{ marginTop:"1.5rem", width:"100%",
          background:"#534AB7", color:"#fff", border:"none", borderRadius:8,
          padding:"10px", cursor:"pointer", fontSize:14 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Clients Page ─────────────────────────────────────
export default function Clients() {
  const [busqueda, setBusqueda]   = useState("");
  const [filtro, setFiltro]       = useState<"todos" | "activo" | "en riesgo" | "inactivo">("todos");
  const [selected, setSelected]   = useState<Client | null>(null);

  const [ciudad, setCiudad]             = useState("todas");
  const [fechaDesde, setFechaDesde]     = useState("");
  const [fechaHasta, setFechaHasta]     = useState("");
  const [intervaloMin, setIntervaloMin] = useState("");
  const [intervaloMax, setIntervaloMax] = useState("");

  const hayFiltrosActivos =
    busqueda !== "" || filtro !== "todos" || ciudad !== "todas" ||
    fechaDesde !== "" || fechaHasta !== "" || intervaloMin !== "" || intervaloMax !== "";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltro("todos");
    setCiudad("todas");
    setFechaDesde("");
    setFechaHasta("");
    setIntervaloMin("");
    setIntervaloMax("");
  };

  const datos = CLIENTS
    .filter(c => filtro === "todos" || c.estado === filtro)
    .filter(c => ciudad === "todas" || c.ciudad === ciudad)
    .filter(c => {
      if (!fechaDesde && !fechaHasta) return true;
      const fc = fechaComparable(c.ultimaCompra);
      if (fechaDesde && fc < fechaDesde.replace(/-/g, "")) return false;
      if (fechaHasta && fc > fechaHasta.replace(/-/g, "")) return false;
      return true;
    })
    .filter(c => {
      if (intervaloMin !== "" && c.intervalo < Number(intervaloMin)) return false;
      if (intervaloMax !== "" && c.intervalo > Number(intervaloMax)) return false;
      return true;
    })
    .filter(c =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    );

  const conteo = {
    activo:    CLIENTS.filter(c => c.estado === "activo").length,
    enRiesgo:  CLIENTS.filter(c => c.estado === "en riesgo").length,
    inactivo:  CLIENTS.filter(c => c.estado === "inactivo").length,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />
      {selected && <ClientModal client={selected} onClose={() => setSelected(null)} />}

      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <header style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0",
          padding:"0.875rem 1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:500 }}>Clientes</h1>
            <p style={{ margin:0, fontSize:13, color:"#888" }}>
              Historial de clientes de W&T Food S.A.S
            </p>
          </div>
          <span style={{ fontSize:13, color:"#888", background:"#f0f0f0",
            padding:"6px 14px", borderRadius:8 }}>
            {CLIENTS.length} clientes registrados
          </span>
        </header>

        <main style={{ padding:"1.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Resumen estados */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { key:"activo",    label:"Activos",      count: conteo.activo,   color:"#0F6E56", bg:"#E1F5EE" },
              { key:"en riesgo", label:"En riesgo",    count: conteo.enRiesgo, color:"#BA7517", bg:"#FAEEDA" },
              { key:"inactivo",  label:"Inactivos",    count: conteo.inactivo, color:"#993C1D", bg:"#FAECE7" },
            ].map(item => (
              <div key={item.key}
                onClick={() => setFiltro(filtro === item.key as typeof filtro ? "todos" : item.key as typeof filtro)}
                style={{ background:"#fff", border: filtro === item.key ? `1.5px solid ${item.color}`:"0.5px solid #e0e0e0",
                  borderRadius:12, padding:"1rem 1.25rem", cursor:"pointer" }}>
                <p style={{ margin:"0 0 4px", fontSize:12, color:"#888" }}>{item.label}</p>
                <p style={{ margin:0, fontSize:26, fontWeight:500, color:item.color }}>{item.count}</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"#aaa" }}>clientes</p>
              </div>
            ))}
          </div>

          {/* Búsqueda y filtros */}
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <input type="text" placeholder="Buscar por nombre, ID o ciudad..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ flex:1, minWidth:220, border:"0.5px solid #e0e0e0", borderRadius:8,
                padding:"8px 12px", fontSize:14, outline:"none",
                background:"#fff", boxSizing:"border-box" as const }} />
            {(["todos","activo","en riesgo","inactivo"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ background: filtro === f ? "#534AB7":"#fff",
                  color: filtro === f ? "#fff":"#555",
                  border: filtro === f ? "none":"0.5px solid #e0e0e0",
                  borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Filtros avanzados */}
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12,
            padding:"1rem 1.25rem", display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>

            <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth:170 }}>
              <label style={{ fontSize:12, color:"#888", fontWeight:500 }}>Ciudad</label>
              <select value={ciudad} onChange={e => setCiudad(e.target.value)}
                style={{ border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", background:"#fff", boxSizing:"border-box" as const }}>
                <option value="todas">Todas las ciudades</option>
                {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:12, color:"#888", fontWeight:500 }}>Última compra desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                style={{ border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" as const }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:12, color:"#888", fontWeight:500 }}>Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                style={{ border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" as const }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:12, color:"#888", fontWeight:500 }}>Intervalo mín. (días)</label>
              <input type="number" min={0} placeholder="0" value={intervaloMin}
                onChange={e => setIntervaloMin(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" as const }} />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:12, color:"#888", fontWeight:500 }}>Intervalo máx. (días)</label>
              <input type="number" min={0} placeholder="90" value={intervaloMax}
                onChange={e => setIntervaloMax(e.target.value)}
                style={{ width:90, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 10px",
                  fontSize:13, outline:"none", boxSizing:"border-box" as const }} />
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
          <div style={{ background:"#fff", border:"0.5px solid #e0e0e0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f9f9f9", borderBottom:"0.5px solid #e0e0e0" }}>
                  {["ID","Cliente","Ciudad","Pedidos","Monto total","Última compra","Intervalo","Estado",""].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                      fontWeight:500, color:"#666", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>
                    No se encontraron clientes
                  </td></tr>
                ) : datos.map((c, i) => {
                  const s = ESTADO_STYLE[c.estado];
                  return (
                    <tr key={c.id} style={{ borderBottom:"0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff":"#fafafa" }}>
                      <td style={{ padding:"12px 16px", color:"#888", fontWeight:500 }}>{c.id}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"#EEEDFE",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:12, fontWeight:500, color:"#534AB7", flexShrink:0 }}>
                            {c.nombre.charAt(0)}
                          </div>
                          <span style={{ fontWeight:500 }}>{c.nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#555" }}>{c.ciudad}</td>
                      <td style={{ padding:"12px 16px", color:"#555", textAlign:"center" }}>{c.totalPedidos}</td>
                      <td style={{ padding:"12px 16px", fontWeight:500, color:"#0F6E56" }}>{c.montoTotal}</td>
                      <td style={{ padding:"12px 16px", color:"#555" }}>{c.ultimaCompra}</td>
                      <td style={{ padding:"12px 16px", color:"#555" }}>{c.intervalo} días</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ fontSize:12, color:s.color, background:s.bg,
                          padding:"3px 10px", borderRadius:6, fontWeight:500 }}>
                          {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <button onClick={() => setSelected(c)}
                          style={{ background:"transparent", border:"0.5px solid #e0e0e0",
                            borderRadius:6, padding:"4px 12px", cursor:"pointer",
                            fontSize:12, color:"#534AB7" }}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ margin:0, fontSize:12, color:"#aaa" }}>
            Mostrando {datos.length} de {CLIENTS.length} clientes
          </p>
        </main>
      </div>
    </div>
  );
}