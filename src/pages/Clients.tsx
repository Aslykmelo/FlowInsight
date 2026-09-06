import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface Client {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  ciudad: string;
  totalPedidos: number;
  montoTotal: number;
  ultimaCompraISO: string | null;   // fecha real, para filtrar/ordenar
  ultimaCompra: string;             // fecha ya formateada, para mostrar
  intervalo: number | null;
  estado: "activo" | "en riesgo" | "inactivo";
}

interface ApiClienteResumen {
  id_cliente: number;
  nombre_cliente: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad: string | null;
  total_pedidos: number;
  monto_total: number;
  ultima_compra: string | null;
  intervalo_promedio: number | null;
  estado: "activo" | "en riesgo" | "inactivo";
}

const API_URL = "http://127.0.0.1:8000";

const ESTADO_STYLE: Record<string, { color: string; bg: string }> = {
  "activo":    { color:"#0F6E56", bg:"#E1F5EE" },
  "en riesgo": { color:"#BA7517", bg:"#FAEEDA" },
  "inactivo":  { color:"#993C1D", bg:"#FAECE7" },
};

// ─── Helpers de formato ───────────────────────────────
const formatoMoneda = (valor: number) =>
  valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const formatoFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// "YYYY-MM-DDTHH:mm:ss" → "YYYYMMDD", para comparar fechas sin líos de huso horario
function fechaComparable(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
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
              <p style={{ margin:0, fontSize:12, color:"#888" }}>ID {client.id}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            cursor:"pointer", fontSize:22, color:"#aaa", lineHeight:1 }}>×</button>
        </div>

        {[
          { label:"Teléfono",            value: client.telefono || "—" },
          { label:"Correo",              value: client.correo || "—" },
          { label:"Ciudad",              value: client.ciudad || "—" },
          { label:"Total pedidos",       value: `${client.totalPedidos} pedidos` },
          { label:"Monto total",         value: formatoMoneda(client.montoTotal) },
          { label:"Última compra",       value: client.ultimaCompra },
          { label:"Intervalo promedio",  value: client.intervalo != null ? `${client.intervalo} días entre compras` : "—" },
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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda]   = useState("");
  const [filtro, setFiltro]       = useState<"todos" | "activo" | "en riesgo" | "inactivo">("todos");
  const [selected, setSelected]   = useState<Client | null>(null);

  const [ciudad, setCiudad]             = useState("todas");
  const [fechaDesde, setFechaDesde]     = useState("");
  const [fechaHasta, setFechaHasta]     = useState("");
  const [intervaloMin, setIntervaloMin] = useState("");
  const [intervaloMax, setIntervaloMax] = useState("");

  // ───────────────────────────────────────────
  // CARGAR DATOS DEL BACKEND
  // ───────────────────────────────────────────
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("No hay sesión iniciada.");
          return;
        }

        const response = await fetch(`${API_URL}/clientes/resumen`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Error al obtener clientes: ${response.status}`);
        }

        const data: ApiClienteResumen[] = await response.json();

        const clientesFormateados: Client[] = data.map((c) => ({
          id: c.id_cliente,
          nombre: c.nombre_cliente,
          telefono: c.telefono || "—",
          correo: c.correo || "—",
          ciudad: c.ciudad || "Sin ciudad",
          totalPedidos: c.total_pedidos,
          montoTotal: c.monto_total,
          ultimaCompraISO: c.ultima_compra,
          ultimaCompra: formatoFecha(c.ultima_compra),
          intervalo: c.intervalo_promedio,
          estado: c.estado,
        }));

        setClients(clientesFormateados);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar la información de clientes.");
      } finally {
        setLoading(false);
      }
    };

    cargarClientes();
  }, []);

  // Ciudades disponibles, derivadas de los clientes reales
  const CIUDADES = Array.from(new Set(clients.map(c => c.ciudad))).sort();

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

  const datos = clients
    .filter(c => filtro === "todos" || c.estado === filtro)
    .filter(c => ciudad === "todas" || c.ciudad === ciudad)
    .filter(c => {
      if (!fechaDesde && !fechaHasta) return true;
      if (!c.ultimaCompraISO) return false; // sin fecha, no se puede comparar
      const fc = fechaComparable(c.ultimaCompraISO);
      if (fechaDesde && fc < fechaDesde.replace(/-/g, "")) return false;
      if (fechaHasta && fc > fechaHasta.replace(/-/g, "")) return false;
      return true;
    })
    .filter(c => {
      if (intervaloMin === "" && intervaloMax === "") return true;
      if (c.intervalo == null) return false; // sin intervalo (1 solo pedido), no se puede comparar
      if (intervaloMin !== "" && c.intervalo < Number(intervaloMin)) return false;
      if (intervaloMax !== "" && c.intervalo > Number(intervaloMax)) return false;
      return true;
    })
    .filter(c =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    );

  const conteo = {
    activo:    clients.filter(c => c.estado === "activo").length,
    enRiesgo:  clients.filter(c => c.estado === "en riesgo").length,
    inactivo:  clients.filter(c => c.estado === "inactivo").length,
  };

  // ───────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", fontSize:18, color:"#666" }}>
          Cargando clientes...
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
            {clients.length} clientes registrados
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
            <input type="text" placeholder="Buscar por nombre o ciudad..."
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
                  {["Cliente","Ciudad","Pedidos","Monto total","Última compra","Intervalo","Estado",""].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left",
                      fontWeight:500, color:"#666", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:"2rem", textAlign:"center", color:"#aaa" }}>
                    No se encontraron clientes
                  </td></tr>
                ) : datos.map((c, i) => {
                  const s = ESTADO_STYLE[c.estado];
                  return (
                    <tr key={c.id} style={{ borderBottom:"0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff":"#fafafa" }}>
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
                      <td style={{ padding:"12px 16px", fontWeight:500, color:"#0F6E56" }}>{formatoMoneda(c.montoTotal)}</td>
                      <td style={{ padding:"12px 16px", color:"#555" }}>{c.ultimaCompra}</td>
                      <td style={{ padding:"12px 16px", color:"#555" }}>{c.intervalo != null ? `${c.intervalo} días` : "—"}</td>
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
            Mostrando {datos.length} de {clients.length} clientes
          </p>
        </main>
      </div>
    </div>
  );
}