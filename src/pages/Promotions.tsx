import { API_URL } from "../config";
import { useEffect, useState } from "react";
import {
  AlertCircle, AlertTriangle, Check, CheckCircle2, Clock, Copy, ExternalLink, Mail,
  MessageSquareText, SearchX, type LucideIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

interface ClientePromocion {
  id_cliente: number;
  nombre_cliente: string;
  telefono: string | null;
  dias_sin_comprar: number;
  categoria: "activo" | "ocasional" | "en_riesgo";
}

interface AccionPromocion {
  etiqueta: string;
  url: string;
  tipo: "asesor" | "pedido";
}

interface MensajePromocion extends ClientePromocion {
  producto_favorito: string | null;
  mensaje: string;
  link_whatsapp: string | null;
  acciones: AccionPromocion[];
}

// La categoría se comunica con texto + ícono + color (nunca solo color)
const CATEGORIA_STYLE: Record<ClientePromocion["categoria"], { chip: string; label: string; Icon: LucideIcon }> = {
  activo: { chip: "chip chip-ok", label: "Activo", Icon: CheckCircle2 },
  ocasional: { chip: "chip chip-warn", label: "Ocasional", Icon: Clock },
  en_riesgo: { chip: "chip chip-bad", label: "En riesgo", Icon: AlertTriangle },
};

const FILTROS: { value: ClientePromocion["categoria"] | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "en_riesgo", label: "En riesgo" },
  { value: "ocasional", label: "Ocasional" },
  { value: "activo", label: "Activo" },
];

// Estilos propios de esta pantalla (el resto sale de design.css)
const PAGE_CSS = `
  @keyframes pr-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  .pr-layout { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: var(--s-5); align-items: start; }
  @media (max-width: 1100px) { .pr-layout { grid-template-columns: minmax(0, 1fr); } }
  .pr-card { padding: 0; overflow: hidden; }
  .pr-card-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
    gap: var(--s-3); padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--c-line); }
  .pr-card-head h2 { margin: 0; }
  .pr-filters { display: flex; flex-wrap: wrap; gap: var(--s-2); }
  .pr-filter { min-height: 40px; padding: 0 var(--s-3); border-radius: 999px; border: 1px solid var(--c-line-strong);
    background: var(--c-surface); color: var(--c-ink-2); font-size: 14px; font-weight: 600; cursor: pointer;
    transition: background 0.15s, border-color 0.15s; }
  .pr-filter:hover { background: var(--c-bg); border-color: var(--c-faint); }
  .pr-filter[aria-pressed="true"] { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
  .pr-filter-n { font-variant-numeric: tabular-nums; opacity: 0.9; margin-left: 6px; }
  .pr-table { min-width: 560px; }
  .pr-table .chip { white-space: nowrap; }
  .pr-table td { white-space: nowrap; }
  .pr-table td:first-child { white-space: normal; }
  .pr-table tbody tr { cursor: pointer; }
  .pr-table tbody tr.pr-sel { background: var(--c-primary-soft); }
  .pr-table tbody tr.pr-sel td:first-child { box-shadow: inset 3px 0 0 var(--c-primary); }
  .pr-rowbtn { display: inline-flex; align-items: center; min-height: 40px; padding: 0; border: none; background: transparent;
    color: var(--c-ink); font-size: 14px; font-weight: 600; text-align: left; cursor: pointer; }
  .pr-rowbtn:hover { color: var(--c-primary); text-decoration: underline; }
  .pr-foot { margin: 0; padding: var(--s-3) var(--s-5); font-size: 13px; color: var(--c-muted); border-top: 1px solid var(--c-line); }
  .pr-state { display: flex; flex-direction: column; align-items: center; gap: var(--s-2);
    padding: var(--s-6) var(--s-5); text-align: center; }
  .pr-state-icon { width: 48px; height: 48px; border-radius: var(--r-md); background: var(--c-primary-soft);
    color: var(--c-primary); display: flex; align-items: center; justify-content: center; margin-bottom: var(--s-2); }
  .pr-state h3 { margin: 0; font-size: 16px; font-weight: 700; }
  .pr-state p { margin: 0; max-width: 320px; font-size: 14px; color: var(--c-muted); }
  .pr-state .btn { margin-top: var(--s-3); }
  .pr-skel-row { display: flex; gap: var(--s-4); padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--c-line); }
  .pr-skel { height: 16px; border-radius: 4px; background: var(--c-line); animation: pr-pulse 1.4s ease-in-out infinite; }
  .pr-panel { position: sticky; top: var(--s-5); }
  @media (max-width: 1100px) { .pr-panel { position: static; } }
  .pr-panel h2 { margin-bottom: var(--s-2); }
  .pr-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2) var(--s-3); margin-bottom: var(--s-3);
    font-size: 13px; color: var(--c-muted); }
  .pr-client { margin: 0 0 var(--s-2); font-size: 15px; font-weight: 700; color: var(--c-ink); }
  .pr-text { min-height: 144px; padding: var(--s-3); line-height: 1.5; resize: vertical; }
  .pr-actions { margin-top: var(--s-4); padding: var(--s-3) var(--s-4); background: var(--c-bg);
    border: 1px solid var(--c-line); border-radius: var(--r-sm); }
  .pr-actions-title { margin: 0 0 var(--s-2); font-size: 13px; font-weight: 600; color: var(--c-ink-2); }
  .pr-btn-row { display: flex; flex-wrap: wrap; gap: var(--s-2); }
  .pr-btn-row .btn { flex: 1 1 auto; }
  .pr-main-actions { margin-top: var(--s-4); }
  .pr-mail { width: 100%; margin-top: var(--s-2); }
  .pr-privacy { margin: var(--s-3) 0 0; font-size: 12px; line-height: 1.5; color: var(--c-muted); }
  .pr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
  .pr-notice { display: flex; align-items: flex-start; gap: var(--s-2); margin-top: var(--s-2); line-height: 1.5; }
  .pr-notice p { margin: 0; }
`;

export default function Promotions() {
  const [clientes, setClientes] = useState<ClientePromocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>("en_riesgo");
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<MensajePromocion | null>(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const pedirClientes = () => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/promociones/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
        return res.json();
      })
      .then((data) => setClientes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // Reintento manual tras un error
  const cargarClientes = () => {
    setLoading(true);
    setError(null);
    pedirClientes();
  };

  useEffect(() => {
    pedirClientes();
    // Llegada desde el asistente: /promotions?cliente=ID abre directamente el mensaje de ese cliente
    const id = Number(new URLSearchParams(window.location.search).get("cliente"));
    if (id) {
      setFiltro("todos");
      seleccionarCliente(id);
    }
  }, []);

  const seleccionarCliente = (id: number) => {
    setSeleccionado(id);
    setMensaje(null);
    setCopiado(false);
    setAviso(null);
    setErrorMensaje(null);
    setCargandoMensaje(true);
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/promociones/mensaje/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo generar el mensaje");
        return res.json();
      })
      .then((data) => setMensaje(data))
      .catch((err) => setErrorMensaje(err.message))
      .finally(() => setCargandoMensaje(false));
  };

  const copiarMensaje = async () => {
    if (!mensaje) return;
    await navigator.clipboard.writeText(mensaje.mensaje);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const enviarVistaPrevia = async () => {
    if (!mensaje) return;
    setEnviando(true);
    setAviso(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/promociones/mensaje/${mensaje.id_cliente}/enviar-correo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ destino: "mi_correo" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? "No se pudo enviar el correo");
      setAviso({
        ok: true,
        texto: data.modo === "real"
          ? `Vista previa enviada a ${data.destino}. Revisa tu bandeja de entrada.`
          : "El servidor no tiene un proveedor de correo configurado: el mensaje quedó solo en el registro del servidor.",
      });
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : "No se pudo enviar el correo" });
    } finally {
      setEnviando(false);
    }
  };

  const clientesFiltrados = clientes.filter((c) => filtro === "todos" || c.categoria === filtro);
  const catMensaje = mensaje ? CATEGORIA_STYLE[mensaje.categoria] : null;
  const cuenta = (valor: (typeof FILTROS)[number]["value"]) =>
    valor === "todos" ? clientes.length : clientes.filter((c) => c.categoria === valor).length;

  return (
    <div className="app-shell">
      <style>{PAGE_CSS}</style>
      <Sidebar />

      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Mensajes de promoción</h1>
            <p>Selecciona un cliente para generar un mensaje personalizado y copiarlo o enviarlo por WhatsApp</p>
          </div>
        </header>

        <main className="page-body">
          <div className="pr-layout">
            {/* ───── Lista de clientes ───── */}
            <section className="card pr-card" aria-label="Clientes" aria-busy={loading}>
              <div className="pr-card-head">
                <div className="pr-filters" role="group" aria-label="Filtrar por categoría">
                  {FILTROS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className="pr-filter"
                      aria-pressed={filtro === f.value}
                      onClick={() => setFiltro(f.value)}
                    >
                      {f.label}
                      {!loading && !error && <span className="pr-filter-n">({cuenta(f.value)})</span>}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div role="status" aria-live="polite">
                  <span className="pr-sr">Cargando clientes...</span>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <div key={n} className="pr-skel-row" aria-hidden="true">
                      <div className="pr-skel" style={{ flex: 3 }} />
                      <div className="pr-skel" style={{ flex: 2 }} />
                      <div className="pr-skel" style={{ flex: 1 }} />
                      <div className="pr-skel" style={{ flex: 2 }} />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="pr-state" role="alert">
                  <div className="pr-state-icon" aria-hidden="true" style={{ background: "var(--c-bad-soft)", color: "var(--c-bad)" }}>
                    <AlertCircle size={24} />
                  </div>
                  <h3>No pudimos cargar los clientes</h3>
                  <p>{error}</p>
                  <button type="button" className="btn btn-outline" onClick={cargarClientes}>
                    Intentar nuevamente
                  </button>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="pr-state">
                  <div className="pr-state-icon" aria-hidden="true"><SearchX size={24} /></div>
                  <h3>
                    {clientes.length === 0
                      ? "Aún no hay clientes con historial de pedidos"
                      : "No hay clientes en esta categoría"}
                  </h3>
                  <p>
                    {clientes.length === 0
                      ? "Cuando cargues pedidos, aquí aparecerán los clientes para enviarles una promoción."
                      : "Prueba con otra categoría para ver más clientes."}
                  </p>
                  {clientes.length > 0 && filtro !== "todos" && (
                    <button type="button" className="btn btn-outline" onClick={() => setFiltro("todos")}>
                      Ver todos los clientes
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="table pr-table">
                    <thead>
                      <tr>
                        <th scope="col">Cliente</th>
                        <th scope="col">Teléfono</th>
                        <th scope="col" className="num">Días sin comprar</th>
                        <th scope="col">Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((c) => {
                        const s = CATEGORIA_STYLE[c.categoria];
                        const activo = seleccionado === c.id_cliente;
                        return (
                          <tr
                            key={c.id_cliente}
                            className={activo ? "pr-sel" : undefined}
                            onClick={() => seleccionarCliente(c.id_cliente)}
                          >
                            <td>
                              <button
                                type="button"
                                className="pr-rowbtn"
                                aria-pressed={activo}
                                aria-label={`Generar mensaje de promoción para ${c.nombre_cliente}`}
                              >
                                {c.nombre_cliente}
                              </button>
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c.telefono || "—"}</td>
                            <td className="num">{c.dias_sin_comprar}</td>
                            <td>
                              <span className={s.chip}>
                                <s.Icon size={14} aria-hidden="true" />
                                {s.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && !error && (
                <p className="pr-foot">
                  Mostrando {clientesFiltrados.length} de {clientes.length} clientes con historial de pedidos
                </p>
              )}
            </section>

            {/* ───── Mensaje generado ───── */}
            <section className="card pr-panel" aria-label="Mensaje generado">
              <h2>Mensaje generado</h2>

              {!seleccionado && (
                <div className="pr-state" style={{ padding: "var(--s-5) 0" }}>
                  <div className="pr-state-icon" aria-hidden="true"><MessageSquareText size={24} /></div>
                  <p>Selecciona un cliente de la lista para generar su mensaje.</p>
                </div>
              )}

              {seleccionado && cargandoMensaje && (
                <div role="status">
                  <span className="pr-sr">Generando mensaje...</span>
                  <div aria-hidden="true">
                    <div className="pr-skel" style={{ width: "40%", marginBottom: "var(--s-3)" }} />
                    <div className="pr-skel" style={{ height: 144 }} />
                  </div>
                </div>
              )}

              {seleccionado && !cargandoMensaje && errorMensaje && (
                <div role="alert" className="notice notice-bad">
                  <p style={{ margin: "0 0 var(--s-3)" }}>{errorMensaje}</p>
                  <button type="button" className="btn btn-danger" onClick={() => seleccionarCliente(seleccionado)}>
                    Intentar nuevamente
                  </button>
                </div>
              )}

              {mensaje && catMensaje && !cargandoMensaje && (
                <>
                  <p className="pr-client">{mensaje.nombre_cliente}</p>
                  <div className="pr-meta">
                    <span className={catMensaje.chip}>
                      <catMensaje.Icon size={14} aria-hidden="true" />
                      {catMensaje.label}
                    </span>
                    {mensaje.producto_favorito && (
                      <span>Producto favorito: {mensaje.producto_favorito}</span>
                    )}
                  </div>

                  <label htmlFor="pr-mensaje" className="field-label">Texto del mensaje</label>
                  <textarea
                    id="pr-mensaje"
                    readOnly
                    value={mensaje.mensaje}
                    className="input pr-text"
                  />

                  <div className="pr-actions">
                    <p className="pr-actions-title">Botones que verá el cliente en el mensaje</p>
                    {mensaje.acciones.length > 0 ? (
                      <div className="pr-btn-row">
                        {mensaje.acciones.map((a) => (
                          <a
                            key={a.tipo}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{ background: "var(--c-surface)" }}
                          >
                            {a.etiqueta}
                            <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="notice notice-warn" style={{ margin: 0, lineHeight: 1.5 }}>
                        Aún no hay botones: configura el WhatsApp de la empresa (EMPRESA_WHATSAPP) o el enlace de
                        pedidos (EMPRESA_PEDIDO_URL) en el servidor.
                      </p>
                    )}
                  </div>

                  <div className="pr-btn-row pr-main-actions">
                    <button type="button" className="btn btn-primary" onClick={copiarMensaje}>
                      {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                      {copiado ? "¡Copiado!" : "Copiar mensaje"}
                    </button>
                    <span role="status" className="pr-sr">{copiado ? "Mensaje copiado al portapapeles" : ""}</span>

                    {mensaje.link_whatsapp && (
                      <a
                        href={mensaje.link_whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                      >
                        Abrir en WhatsApp
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn pr-mail"
                    onClick={enviarVistaPrevia}
                    disabled={enviando}
                  >
                    <Mail size={18} aria-hidden="true" />
                    {enviando ? "Enviando..." : "Enviarme una vista previa por correo"}
                  </button>
                  {aviso && (
                    <div
                      role={aviso.ok ? "status" : "alert"}
                      className={`notice pr-notice ${aviso.ok ? "notice-ok" : "notice-bad"}`}
                    >
                      {aviso.ok
                        ? <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                        : <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />}
                      <p>{aviso.texto}</p>
                    </div>
                  )}
                  <p className="pr-privacy">
                    El correo con botones se envía a tu cuenta para revisarlo. El envío directo al cliente está
                    desactivado por defecto y solo aplica a clientes que autorizaron el uso de sus datos.
                  </p>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
