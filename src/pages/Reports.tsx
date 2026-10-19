import { API_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle, CheckCircle2, Clock, Download, FileSpreadsheet, FileText, Info, Loader2,
  Plus, Trash2, type LucideIcon,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
type Formato = "xlsx" | "pdf";

interface Report {
  id: number;
  nombre: string;
  tipo: string;
  formato: Formato;
  fecha: string;
  estado: "listo" | "generando" | "error";
}

interface ApiReporte {
  id_reporte: number;
  nombre: string | null;
  tipo: string | null;
  formato: string | null;
  estado: string | null;
  fecha: string | null;
}

interface TipoReporte {
  value: string;
  label: string;
}

interface DropdownState {
  id: number | "header";
  rect: DOMRect;
}

type ToastKind = "info" | "ok" | "error";

// El estado se comunica con texto + ícono + color (nunca solo color)
const ESTADO_STYLE: Record<Report["estado"], { chip: string; label: string; Icon: LucideIcon }> = {
  listo:     { chip: "chip chip-ok",   label: "Listo",     Icon: CheckCircle2 },
  generando: { chip: "chip chip-warn", label: "Generando", Icon: Clock        },
  error:     { chip: "chip chip-bad",  label: "Error",     Icon: AlertCircle  },
};

const FORMATO_STYLE: Record<Formato, { label: string; Icon: LucideIcon }> = {
  xlsx: { label: "Excel", Icon: FileSpreadsheet },
  pdf:  { label: "PDF",   Icon: FileText        },
};

const TIPOS: TipoReporte[] = [
  { value: "ventas",       label: "Ventas mensuales"   },
  { value: "clientes",     label: "Historial de clientes" },
  { value: "riesgo",       label: "Riesgo de abandono" },
  { value: "predicciones", label: "Predicciones ML"    },
];

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.value, t.label])
);

const formatoValido = (formato: string | null): Formato =>
  formato === "pdf" ? "pdf" : "xlsx";

// Estilos propios de esta pantalla (el resto sale de design.css)
const PAGE_CSS = `
  @keyframes rp-spin { to { transform: rotate(360deg); } }
  @keyframes rp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes rp-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .rp-spin { animation: rp-spin 0.8s linear infinite; }
  .rp-card { padding: 0; overflow: hidden; }
  .rp-table { min-width: 720px; }
  .rp-name { font-weight: 600; color: var(--c-ink); }
  .rp-actions { display: flex; gap: var(--s-2); justify-content: flex-end; }
  .rp-empty { display: flex; flex-direction: column; align-items: center; gap: var(--s-2);
    padding: var(--s-6) var(--s-5); text-align: center; }
  .rp-empty-icon { width: 48px; height: 48px; border-radius: var(--r-md); background: var(--c-primary-soft);
    color: var(--c-primary); display: flex; align-items: center; justify-content: center; margin-bottom: var(--s-2); }
  .rp-empty h2 { margin: 0; font-size: 16px; }
  .rp-empty p { margin: 0; max-width: 360px; font-size: 14px; color: var(--c-muted); }
  .rp-empty .btn { margin-top: var(--s-3); }
  .rp-skel-row { display: flex; gap: var(--s-4); padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--c-line); }
  .rp-skel { height: 16px; border-radius: 4px; background: var(--c-line); animation: rp-pulse 1.4s ease-in-out infinite; }
  .rp-error { display: flex; align-items: flex-start; gap: var(--s-3); flex-wrap: wrap; }
  .rp-error p { margin: 0; flex: 1 1 240px; }
  .rp-foot { margin: 0; font-size: 13px; color: var(--c-muted); }
  .rp-menu { position: fixed; background: var(--c-surface); border: 1px solid var(--c-line);
    border-radius: var(--r-md); box-shadow: var(--shadow-2); overflow: hidden; z-index: 1000; }
  .rp-menu-row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3);
    padding: var(--s-2) var(--s-4); border-bottom: 1px solid var(--c-line); }
  .rp-menu-row:last-child { border-bottom: none; }
  .rp-menu-label { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--c-ink); }
  .rp-menu-btns { display: flex; gap: var(--s-2); flex-shrink: 0; }
  .rp-menu-btns .btn { min-width: 64px; padding: 0 var(--s-3); }
  .rp-toast { position: fixed; bottom: var(--s-5); right: 88px; max-width: calc(100vw - 32px);
    display: flex; align-items: center; gap: var(--s-3); padding: var(--s-3) var(--s-4);
    border-radius: var(--r-md); border: 1px solid; box-shadow: var(--shadow-2); z-index: 1100;
    font-size: 14px; font-weight: 600; animation: rp-toast-in 0.2s ease-out; }
  .rp-toast-info  { background: var(--c-info-soft); border-color: var(--c-info); color: var(--c-info); }
  .rp-toast-ok    { background: var(--c-ok-soft);   border-color: var(--c-ok);   color: var(--c-ok); }
  .rp-toast-error { background: var(--c-bad-soft);  border-color: var(--c-bad);  color: var(--c-bad); }
  @media (max-width: 600px) { .rp-toast { left: var(--s-4); right: var(--s-4); bottom: 88px; } }
`;

// ─── Selector de tipo + formato de reporte (menú vía portal) ─
function TipoDropdown({
  rect,
  onSelect,
}: {
  rect: DOMRect;
  onSelect: (tipo: TipoReporte, formato: Formato) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ancho = Math.min(340, window.innerWidth - 16);
  const izquierda = Math.max(8, Math.min(rect.right - ancho, window.innerWidth - ancho - 8));

  // Lleva el foco al primer botón al abrir, para poder usar el teclado
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  return createPortal(
    <div
      ref={ref}
      data-format-dropdown
      role="group"
      aria-label="Tipos de reporte"
      className="rp-menu"
      style={{ top: rect.bottom + 6, left: izquierda, width: ancho }}
    >
      {TIPOS.map((t) => (
        <div key={t.value} className="rp-menu-row">
          <span className="rp-menu-label">{t.label}</span>
          <div className="rp-menu-btns">
            <button
              type="button"
              className="btn"
              onClick={() => onSelect(t, "xlsx")}
              aria-label={`Generar ${t.label} en Excel`}
            >
              Excel
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onSelect(t, "pdf")}
              aria-label={`Generar ${t.label} en PDF`}
            >
              PDF
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── Aviso temporal ───────────────────────────────────
function Toast({ message, kind }: { message: string; kind: ToastKind }) {
  const Icon = kind === "ok" ? CheckCircle2 : kind === "error" ? AlertCircle : Info;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={`rp-toast rp-toast-${kind}`}
    >
      <Icon size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────
const formatoFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const estadoValido = (estado: string | null): Report["estado"] =>
  estado === "listo" || estado === "generando" || estado === "error" ? estado : "error";

// ─── Reports Page ─────────────────────────────────────
export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generando, setGenerando] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<DropdownState | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);

  // ───────────────────────────────────────────
  // CARGAR REPORTES DEL BACKEND
  // ───────────────────────────────────────────
  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No hay sesión iniciada.");
        return;
      }

      const response = await fetch(`${API_URL}/reports`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Error al obtener reportes: ${response.status}`);
      }

      const data: ApiReporte[] = await response.json();

      const reportesFormateados: Report[] = data.map((r) => ({
        id: r.id_reporte,
        nombre: r.nombre || TIPO_LABEL[r.tipo || ""] || "Reporte",
        tipo: r.tipo ? (TIPO_LABEL[r.tipo] || r.tipo) : "—",
        formato: formatoValido(r.formato),
        fecha: formatoFecha(r.fecha),
        estado: estadoValido(r.estado),
      }));

      setReports(reportesFormateados);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, []);

  // Cerrar el menú al hacer click fuera, o con Escape desde el teclado
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-format-dropdown]") && !target.closest("[data-format-trigger]")) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown((abierto) => {
          if (abierto) headerButtonRef.current?.focus();
          return null;
        });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const mostrarToast = (mensaje: string, kind: ToastKind = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: mensaje, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const toggleDropdown = (id: number | "header", e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown?.id === id) {
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown({ id, rect: e.currentTarget.getBoundingClientRect() });
  };

  // Permite abrir el mismo menú del encabezado desde el botón del estado vacío
  const abrirDropdownHeader = () => {
    const rect = headerButtonRef.current?.getBoundingClientRect();
    if (rect) setOpenDropdown({ id: "header", rect });
  };

  // ───────────────────────────────────────────
  // GENERAR REPORTE (POST /reports/generate)
  // ───────────────────────────────────────────
  const generarReporte = async (tipo: TipoReporte, formato: Formato) => {
    setOpenDropdown(null);

    const token = localStorage.getItem("token");
    if (!token) {
      mostrarToast("No hay sesión iniciada.", "error");
      return;
    }

    setGenerando(true);
    mostrarToast(`Generando reporte de ${tipo.label} en ${FORMATO_STYLE[formato].label}...`);

    try {
      const response = await fetch(`${API_URL}/reports/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tipo: tipo.value, formato }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}`);
      }

      mostrarToast(`Reporte de ${tipo.label} generado correctamente.`, "ok");
      await cargarReportes(); // refresca la tabla con el nuevo reporte
    } catch (err) {
      console.error(err);
      mostrarToast(
        err instanceof Error ? err.message : "No fue posible generar el reporte.",
        "error"
      );
    } finally {
      setGenerando(false);
    }
  };

  // ───────────────────────────────────────────
  // DESCARGAR REPORTE (GET /reports/{id}/download)
  // ───────────────────────────────────────────
  const descargarReporte = async (report: Report) => {
    const token = localStorage.getItem("token");
    if (!token) {
      mostrarToast("No hay sesión iniciada.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reports/${report.id}/download`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }

      // Convierte la respuesta en un archivo descargable en el navegador
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nombreSeguro = report.nombre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "reporte";
      a.download = `${nombreSeguro}.${report.formato}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      mostrarToast(`Descargando ${report.nombre}...`, "ok");
    } catch (err) {
      console.error(err);
      mostrarToast("No fue posible descargar el reporte.", "error");
    }
  };

  // ───────────────────────────────────────────
  // ELIMINAR REPORTE (DELETE /reports/{id})
  // ───────────────────────────────────────────
  const eliminarReporte = async (report: Report) => {
    const confirmar = window.confirm(`¿Eliminar "${report.nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const token = localStorage.getItem("token");
    if (!token) {
      mostrarToast("No hay sesión iniciada.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reports/${report.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Error al eliminar: ${response.status}`);
      }

      mostrarToast(`"${report.nombre}" fue eliminado.`, "ok");
      await cargarReportes(); // refresca la tabla
    } catch (err) {
      console.error(err);
      mostrarToast("No fue posible eliminar el reporte.", "error");
    }
  };

  return (
    <div className="app-shell">
      <style>{PAGE_CSS}</style>
      <Sidebar />

      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Reportes</h1>
            <p>Reportes generados de W&amp;T Food S.A.S</p>
          </div>

          <button
            ref={headerButtonRef}
            type="button"
            data-format-trigger
            className="btn btn-primary"
            onClick={(e) => toggleDropdown("header", e)}
            disabled={generando || loading}
            aria-expanded={openDropdown?.id === "header"}
          >
            {generando
              ? <Loader2 size={18} className="rp-spin" aria-hidden="true" />
              : <Plus size={18} aria-hidden="true" />}
            {generando ? "Generando..." : "Generar reporte"}
          </button>
        </header>

        <main className="page-body">
          {error ? (
            <div role="alert" className="notice notice-bad rp-error">
              <AlertCircle size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <p>{error}</p>
              <button type="button" className="btn btn-danger" onClick={cargarReportes}>
                Intentar nuevamente
              </button>
            </div>
          ) : (
            <section className="card rp-card" aria-label="Lista de reportes" aria-busy={loading}>
              {loading ? (
                <div role="status" aria-live="polite">
                  <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                    Cargando reportes...
                  </span>
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="rp-skel-row" aria-hidden="true">
                      <div className="rp-skel" style={{ flex: 3 }} />
                      <div className="rp-skel" style={{ flex: 2 }} />
                      <div className="rp-skel" style={{ flex: 1 }} />
                      <div className="rp-skel" style={{ flex: 2 }} />
                    </div>
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="rp-empty">
                  <div className="rp-empty-icon" aria-hidden="true"><FileText size={24} /></div>
                  <h2>Todavía no has generado ningún reporte</h2>
                  <p>Genera tu primer reporte de ventas, clientes o riesgo de abandono.</p>
                  <button type="button" className="btn btn-outline" onClick={abrirDropdownHeader}>
                    <Plus size={18} aria-hidden="true" />
                    Generar reporte
                  </button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="table rp-table">
                    <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                      Reportes generados
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Reporte</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Formato</th>
                        <th scope="col">Fecha de generación</th>
                        <th scope="col">Estado</th>
                        <th scope="col" className="num">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r) => {
                        const s = ESTADO_STYLE[r.estado];
                        const f = FORMATO_STYLE[r.formato];
                        return (
                          <tr key={r.id}>
                            <td className="rp-name">{r.nombre}</td>
                            <td>{r.tipo}</td>
                            <td>
                              <span className="chip">
                                <f.Icon size={14} aria-hidden="true" />
                                {f.label}
                              </span>
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.fecha}</td>
                            <td>
                              <span className={s.chip}>
                                <s.Icon size={14} aria-hidden="true" />
                                {s.label}
                              </span>
                            </td>
                            <td>
                              <div className="rp-actions">
                                {r.estado === "listo" && (
                                  <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => descargarReporte(r)}
                                    aria-label={`Descargar ${r.nombre}`}
                                  >
                                    <Download size={16} aria-hidden="true" />
                                    Descargar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => eliminarReporte(r)}
                                  aria-label={`Eliminar ${r.nombre}`}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {!loading && !error && reports.length > 0 && (
            <p className="rp-foot">
              Mostrando {reports.length} {reports.length === 1 ? "reporte" : "reportes"}
            </p>
          )}
        </main>
      </div>

      {openDropdown?.id === "header" && (
        <TipoDropdown
          rect={openDropdown.rect}
          onSelect={(tipo, formato) => generarReporte(tipo, formato)}
        />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} />}
    </div>
  );
}
