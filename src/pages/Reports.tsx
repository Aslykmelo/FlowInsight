import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import EmptyState from "../components/EmptyState";

// ─── Types ────────────────────────────────────────────
interface Report {
  id: number;
  nombre: string;
  tipo: string;
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

const API_URL = "http://127.0.0.1:8000";

const ESTADO_STYLE: Record<Report["estado"], { color: string; bg: string; label: string }> = {
  listo:     { color: "#0F6E56", bg: "#E1F5EE", label: "Listo"     },
  generando: { color: "#BA7517", bg: "#FAEEDA", label: "Generando" },
  error:     { color: "#993C1D", bg: "#FAECE7", label: "Error"     },
};

// El backend por ahora solo genera .xlsx, así que el selector
// ofrece los tipos de reporte disponibles, no formatos de archivo.
const TIPOS: TipoReporte[] = [
  { value: "ventas",       label: "Ventas mensuales"   },
  { value: "clientes",     label: "Historial de clientes" },
  { value: "riesgo",       label: "Riesgo de abandono" },
  { value: "predicciones", label: "Predicciones ML"    },
];

const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.value, t.label])
);

// ─── Selector de tipo de reporte (dropdown vía portal) ─
function TipoDropdown({
  rect,
  onSelect,
}: {
  rect: DOMRect;
  onSelect: (tipo: TipoReporte) => void;
}) {
  return createPortal(
    <div
      data-format-dropdown
      role="menu"
      aria-label="Tipos de reporte"
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 200),
        width: 200,
        background: "#fff",
        border: "0.5px solid #e0e0e0",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      {TIPOS.map((t, idx) => (
        <button
          key={t.value}
          role="menuitem"
          onClick={() => onSelect(t)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            borderBottom: idx < TIPOS.length - 1 ? "0.5px solid #f0f0f0" : "none",
            padding: "9px 14px",
            fontSize: 13,
            color: "#333",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {t.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

// ─── Toast de confirmación ────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#E1F5EE",
        border: "0.5px solid #0F6E56",
        borderRadius: 12,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 1100,
        animation: "flowinsight-toast-in 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes flowinsight-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span aria-hidden="true" style={{ fontSize: 16 }}>⬇️</span>
      <span style={{ fontSize: 13, color: "#0F6E56", fontWeight: 500 }}>{message}</span>
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
  const [toast, setToast] = useState<string | null>(null);
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

  // Cerrar el dropdown al hacer click fuera, o con Escape desde el teclado
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-format-dropdown]") && !target.closest("[data-format-trigger]")) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenDropdown(null);
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

  const mostrarToast = (mensaje: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(mensaje);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const toggleDropdown = (id: number | "header", e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown?.id === id) {
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown({ id, rect: e.currentTarget.getBoundingClientRect() });
  };

  // Permite abrir el mismo dropdown del header desde el botón del Empty State
  const abrirDropdownHeader = () => {
    const rect = headerButtonRef.current?.getBoundingClientRect();
    if (rect) setOpenDropdown({ id: "header", rect });
  };

  // ───────────────────────────────────────────
  // GENERAR REPORTE (POST /reports/generate)
  // ───────────────────────────────────────────
  const generarReporte = async (tipo: TipoReporte) => {
    setOpenDropdown(null);

    const token = localStorage.getItem("token");
    if (!token) {
      mostrarToast("No hay sesión iniciada.");
      return;
    }

    setGenerando(true);
    mostrarToast(`Generando reporte de ${tipo.label}...`);

    try {
      const response = await fetch(`${API_URL}/reports/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tipo: tipo.value, formato: "xlsx" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}`);
      }

      mostrarToast(`Reporte de ${tipo.label} generado correctamente.`);
      await cargarReportes(); // refresca la tabla con el nuevo reporte
    } catch (err) {
      console.error(err);
      mostrarToast(
        err instanceof Error ? err.message : "No fue posible generar el reporte."
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
      mostrarToast("No hay sesión iniciada.");
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
      a.download = `${report.nombre}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      mostrarToast(`Descargando ${report.nombre}...`);
    } catch (err) {
      console.error(err);
      mostrarToast("No fue posible descargar el reporte.");
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
      mostrarToast("No hay sesión iniciada.");
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

      mostrarToast(`"${report.nombre}" fue eliminado.`);
      await cargarReportes(); // refresca la tabla
    } catch (err) {
      console.error(err);
      mostrarToast("No fue posible eliminar el reporte.");
    }
  };

  // ───────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 18, color: "#666" }}>
          Cargando reportes...
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────
  // ERROR
  // ───────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center",
          flexDirection: "column", gap: 10 }}>
          <h2>Error</h2>
          <p style={{ color: "#777" }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ background: "#534AB7", color: "#fff",
            border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}>
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Reportes</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              Reportes generados de W&T Food S.A.S
            </p>
          </div>

          <button
            ref={headerButtonRef}
            data-format-trigger
            onClick={(e) => toggleDropdown("header", e)}
            disabled={generando}
            style={{ background: "#534AB7", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px", cursor: generando ? "default" : "pointer",
              fontSize: 14, opacity: generando ? 0.7 : 1 }}
          >
            {generando ? "Generando..." : "+ Generar reporte"}
          </button>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9", borderBottom: "0.5px solid #e0e0e0" }}>
                  {["Reporte", "Tipo", "Fecha de generación", "Estado", "", ""].map((h, i) => (
                    <th key={`${h}-${i}`} style={{ padding: "10px 16px", textAlign: "left",
                      fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState
                      icon="📄"
                      title="Todavía no has generado ningún reporte"
                      description="Genera tu primer reporte de ventas, clientes o riesgo de abandono."
                      actionLabel="Generar reporte"
                      onAction={abrirDropdownHeader}
                    />
                  </td></tr>
                ) : reports.map((r, i) => {
                  const s = ESTADO_STYLE[r.estado];
                  return (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.nombre}</td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>{r.tipo}</td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>{r.fecha}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, color: s.color, background: s.bg,
                          padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {r.estado === "listo" ? (
                          <button
                            onClick={() => descargarReporte(r)}
                            style={{ background: "transparent", border: "0.5px solid #534AB7",
                              borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                              fontSize: 12, color: "#534AB7", fontWeight: 500 }}
                          >
                            Descargar
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#bbb" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => eliminarReporte(r)}
                          style={{ background: "transparent", border: "0.5px solid #E24B4A",
                            borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                            fontSize: 12, color: "#E24B4A", fontWeight: 500 }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
            Mostrando {reports.length} reportes
          </p>
        </main>
      </div>

      {openDropdown?.id === "header" && (
        <TipoDropdown
          rect={openDropdown.rect}
          onSelect={(tipo) => generarReporte(tipo)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}