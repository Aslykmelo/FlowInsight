import { API_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";
import { Search, X, CircleCheck, TriangleAlert, Clock, CircleDashed, Users, type LucideIcon } from "lucide-react";

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
  estado: Estado;
}

// Mismas categorías que Promociones, el mapa y el cubo OLAP (por días desde la última compra).
type Estado = "activo" | "ocasional" | "en_riesgo" | "sin_pedidos";

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
  estado: Estado;
}

// Cada estado lleva color, ícono y texto: nunca se comunica solo con color.
const ESTADO_STYLE: Record<Client["estado"], { chip: string; icon: LucideIcon; label: string; color: string }> = {
  activo:      { chip: "chip chip-ok",      icon: CircleCheck,   label: "Activo",      color: "var(--c-ok)" },
  ocasional:   { chip: "chip chip-warn",    icon: Clock,         label: "Ocasional",   color: "var(--c-warn)" },
  en_riesgo:   { chip: "chip chip-bad",     icon: TriangleAlert, label: "En riesgo",   color: "var(--c-bad)" },
  sin_pedidos: { chip: "chip chip-neutral", icon: CircleDashed,  label: "Sin pedidos", color: "var(--c-muted)" },
};

function EstadoChip({ estado }: { estado: Client["estado"] }) {
  const s = ESTADO_STYLE[estado];
  const Icono = s.icon;
  return (
    <span className={s.chip}>
      <Icono size={14} aria-hidden="true" />
      {s.label}
    </span>
  );
}

// ─── Helpers de formato ───────────────────────────────
const formatoMoneda = (valor: number) =>
  valor.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const formatoFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// "YYYY-MM-DDTHH:mm:ss" → "YYYYMMDD", para comparar fechas sin líos de huso horario
function fechaComparable(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
};

const ESTILOS = `
  .cli-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--s-4); }
  .cli-summary-btn {
    width: 100%;
    text-align: left;
    font: inherit;
    cursor: pointer;
    min-height: 40px;
  }
  .cli-summary-btn:hover { border-color: var(--c-faint); }
  .cli-summary-btn[aria-pressed="true"] { border-color: var(--c-primary); box-shadow: 0 0 0 2px var(--c-primary); }
  .cli-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--s-4); align-items: end; }
  .cli-search { position: relative; flex: 1 1 260px; min-width: 0; }
  .cli-search .input { padding-left: 40px; }
  .cli-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--c-muted); pointer-events: none; }
  .cli-seg { display: flex; gap: var(--s-2); flex-wrap: wrap; }
  .cli-seg .btn[aria-pressed="true"] { background: var(--c-primary-soft); border-color: var(--c-primary); color: var(--c-primary); }
  .cli-avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: var(--c-primary-soft); color: var(--c-primary);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
  }
  .cli-row-btn { min-height: 40px; padding: 0 var(--s-3); font-size: 13px; white-space: nowrap; }
  .cli-overlay {
    position: fixed; inset: 0; z-index: 140; padding: var(--s-4);
    background: rgba(27, 36, 48, 0.5);
    display: flex; align-items: center; justify-content: center;
  }
  .cli-dialog {
    background: var(--c-surface); border-radius: var(--r-lg); padding: var(--s-5);
    width: 480px; max-width: 100%; max-height: 100%; overflow-y: auto;
    box-shadow: var(--shadow-2);
  }
  .cli-dl { margin: 0; }
  .cli-dl-row {
    display: flex; justify-content: space-between; align-items: center; gap: var(--s-4);
    padding: var(--s-3) 0; border-bottom: 1px solid var(--c-line); font-size: 14px;
  }
  .cli-dl-row dt { color: var(--c-muted); }
  .cli-dl-row dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
`;

// ─── Modal detalle cliente ────────────────────────────
function ClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filas = [
    { label:"Teléfono",            value: client.telefono || "—" },
    { label:"Correo",              value: client.correo || "—" },
    { label:"Ciudad",              value: client.ciudad || "—" },
    { label:"Total pedidos",       value: `${client.totalPedidos} pedidos` },
    { label:"Monto total",         value: formatoMoneda(client.montoTotal) },
    { label:"Última compra",       value: client.ultimaCompra },
    { label:"Intervalo promedio",  value: client.intervalo != null ? `${client.intervalo} días entre compras` : "—" },
  ];

  return (
    <div className="cli-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="client-modal-title"
        className="cli-dialog"
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"var(--s-3)", marginBottom:"var(--s-4)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"var(--s-3)", minWidth:0 }}>
            <div aria-hidden="true" className="cli-avatar" style={{ width:48, height:48, fontSize:18 }}>
              {client.nombre.charAt(0)}
            </div>
            <div style={{ minWidth:0 }}>
              <h2 id="client-modal-title" style={{ margin:0, fontSize:18, fontWeight:700, overflowWrap:"anywhere" }}>{client.nombre}</h2>
              <p style={{ margin:0, fontSize:13, color:"var(--c-muted)" }}>ID {client.id}</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" className="btn" onClick={onClose}
            aria-label="Cerrar detalle de cliente" style={{ width:40, padding:0, flexShrink:0 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <dl className="cli-dl">
          {filas.map(row => (
            <div key={row.label} className="cli-dl-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          <div className="cli-dl-row" style={{ borderBottom:"none" }}>
            <dt>Estado</dt>
            <dd><EstadoChip estado={client.estado} /></dd>
          </div>
        </dl>

        <button type="button" className="btn btn-outline" onClick={onClose}
          style={{ marginTop:"var(--s-4)", width:"100%" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Clients Page ─────────────────────────────────────
export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda]   = useState("");
  const [filtro, setFiltro]       = useState<"todos" | Estado>("todos");
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

  const conteo: Record<Estado, number> = {
    activo:      clients.filter(c => c.estado === "activo").length,
    ocasional:   clients.filter(c => c.estado === "ocasional").length,
    en_riesgo:   clients.filter(c => c.estado === "en_riesgo").length,
    sin_pedidos: clients.filter(c => c.estado === "sin_pedidos").length,
  };

  const encabezado = (extra?: React.ReactNode) => (
    <header className="page-header">
      <div>
        <h1>Clientes</h1>
        <p>Historial de clientes de W&amp;T Food S.A.S</p>
      </div>
      {extra}
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
            <LoadingSpinner message="Cargando clientes..." />
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

  const ORDEN: Estado[] = ["activo", "ocasional", "en_riesgo", ...(conteo.sin_pedidos > 0 ? (["sin_pedidos"] as Estado[]) : [])];
  const resumen: { key: Estado; label: string; count: number }[] = ORDEN.map(key => ({
    key, label: ESTADO_STYLE[key].label, count: conteo[key],
  }));

  return (
    <div className="app-shell">
      <Sidebar />
      <style>{ESTILOS}</style>
      {selected && <ClientModal client={selected} onClose={() => setSelected(null)} />}

      <div className="app-main">
        {encabezado(
          <span className="chip chip-info" style={{ fontSize:13, padding:"6px 12px" }}>
            <Users size={14} aria-hidden="true" />
            {clients.length} clientes registrados
          </span>
        )}

        <main className="page-body">

          {/* Resumen estados */}
          <section aria-label="Resumen por estado" className="cli-summary">
            {resumen.map(item => {
              const activo = filtro === item.key;
              const s = ESTADO_STYLE[item.key];
              const Icono = s.icon;
              return (
                <button key={item.key} type="button" className="kpi cli-summary-btn"
                  onClick={() => setFiltro(activo ? "todos" : item.key)}
                  aria-pressed={activo}
                  aria-label={`Filtrar por estado ${item.label}, ${item.count} clientes`}>
                  <p className="kpi-label" style={{ display:"flex", alignItems:"center", gap:"var(--s-2)", color:s.color }}>
                    <Icono size={16} aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="kpi-value">{item.count}</p>
                  <p className="kpi-note">clientes</p>
                </button>
              );
            })}
          </section>
          <p style={{ margin: "calc(var(--s-3) * -1) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
            Se clasifican por los días desde su última compra: <strong>Activo</strong>, hasta 30 días;
            {" "}<strong>Ocasional</strong>, de 31 a 90; <strong>En riesgo</strong>, más de 90. Son las mismas
            categorías de Promociones, el mapa y el cubo OLAP.
          </p>

          {/* Búsqueda y filtros */}
          <section aria-label="Búsqueda y filtros" className="card" style={{ display:"flex", flexDirection:"column", gap:"var(--s-4)", padding:"var(--s-4) var(--s-5)" }}>
            <div style={{ display:"flex", gap:"var(--s-3)", alignItems:"center", flexWrap:"wrap" }}>
              <div className="cli-search">
                <Search size={18} aria-hidden="true" />
                <input type="search" className="input" placeholder="Buscar por nombre o ciudad..."
                  aria-label="Buscar por nombre o ciudad"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <div className="cli-seg" role="group" aria-label="Filtrar por estado">
                {(["todos", ...ORDEN] as const).map(f => (
                  <button key={f} type="button" className="btn" aria-pressed={filtro === f}
                    onClick={() => setFiltro(f)}>
                    {f === "todos" ? "Todos" : ESTADO_STYLE[f].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cli-filters">
              <div>
                <label className="field-label" htmlFor="cli-ciudad">Ciudad</label>
                <select id="cli-ciudad" className="input" value={ciudad} onChange={e => setCiudad(e.target.value)}>
                  <option value="todas">Todas las ciudades</option>
                  {CIUDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="cli-desde">Última compra desde</label>
                <input id="cli-desde" type="date" className="input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="cli-hasta">Hasta</label>
                <input id="cli-hasta" type="date" className="input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="cli-int-min">Intervalo mín. (días)</label>
                <input id="cli-int-min" type="number" min={0} placeholder="0" className="input" value={intervaloMin}
                  onChange={e => setIntervaloMin(e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="cli-int-max">Intervalo máx. (días)</label>
                <input id="cli-int-max" type="number" min={0} placeholder="90" className="input" value={intervaloMax}
                  onChange={e => setIntervaloMax(e.target.value)} />
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
          {clients.length === 0 ? (
            <div className="card" style={{ padding:0 }}>
              <EmptyState
                icon={<Users size={24} />}
                title="Todavía no hay clientes registrados"
                description="Los clientes aparecen aquí automáticamente cuando cargas un archivo de ventas en Excel."
                actionLabel="Ir a Cargar Excel"
                onAction={() => navigate("/upload")}
              />
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:"hidden" }}>
              <div className="table-scroll">
                <table className="table" style={{ minWidth:820 }}>
                  <caption style={SR_ONLY}>Listado de clientes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Cliente</th>
                      <th scope="col">Ciudad</th>
                      <th scope="col" className="num">Pedidos</th>
                      <th scope="col" className="num">Monto total</th>
                      <th scope="col">Última compra</th>
                      <th scope="col" className="num">Intervalo</th>
                      <th scope="col">Estado</th>
                      <th scope="col"><span style={SR_ONLY}>Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding:0 }}>
                        <EmptyState
                          icon={<Search size={24} />}
                          title="Sin resultados con estos filtros"
                          description="Ningún cliente coincide con la búsqueda o los filtros aplicados."
                          actionLabel={hayFiltrosActivos ? "Limpiar filtros" : undefined}
                          onAction={hayFiltrosActivos ? limpiarFiltros : undefined}
                        />
                      </td></tr>
                    ) : datos.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:"var(--s-3)" }}>
                            <div aria-hidden="true" className="cli-avatar">{c.nombre.charAt(0)}</div>
                            <span style={{ fontWeight:600, color:"var(--c-ink)" }}>{c.nombre}</span>
                          </div>
                        </td>
                        <td>{c.ciudad}</td>
                        <td className="num">{c.totalPedidos}</td>
                        <td className="num" style={{ fontWeight:600, color:"var(--c-ink)" }}>{formatoMoneda(c.montoTotal)}</td>
                        <td style={{ whiteSpace:"nowrap" }}>{c.ultimaCompra}</td>
                        <td className="num" style={{ whiteSpace:"nowrap" }}>{c.intervalo != null ? `${c.intervalo} días` : "—"}</td>
                        <td><EstadoChip estado={c.estado} /></td>
                        <td>
                          <button type="button" className="btn btn-outline cli-row-btn" onClick={() => setSelected(c)}
                            aria-label={`Ver detalle de ${c.nombre}`}>
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p role="status" style={{ margin:0, fontSize:13, color:"var(--c-muted)" }}>
            Mostrando {datos.length} de {clients.length} clientes
          </p>
        </main>
      </div>
    </div>
  );
}
