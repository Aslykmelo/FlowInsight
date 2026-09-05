import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface Report {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  estado: "listo" | "generando" | "error";
}

interface Formato {
  value: "pdf" | "xlsx" | "csv";
  label: string;
}

interface DropdownState {
  id: string;
  rect: DOMRect;
}

// ─── Mock data — reportes de W&T Food ────────────────
const REPORTS: Report[] = [
  { id: "REP001", nombre: "Ventas de abril 2026",        tipo: "Ventas mensuales",     fecha: "01/05/2026", estado: "listo"     },
  { id: "REP002", nombre: "Clientes en riesgo - Q2",      tipo: "Riesgo de abandono",   fecha: "28/04/2026", estado: "listo"     },
  { id: "REP003", nombre: "Predicciones ML - Mayo",       tipo: "Predicciones",         fecha: "30/04/2026", estado: "generando" },
  { id: "REP004", nombre: "Historial de clientes",        tipo: "Clientes",             fecha: "15/04/2026", estado: "listo"     },
  { id: "REP005", nombre: "Ventas de marzo 2026",         tipo: "Ventas mensuales",     fecha: "01/04/2026", estado: "error"     },
];

const ESTADO_STYLE: Record<Report["estado"], { color: string; bg: string; label: string }> = {
  listo:     { color: "#0F6E56", bg: "#E1F5EE", label: "Listo"     },
  generando: { color: "#BA7517", bg: "#FAEEDA", label: "Generando" },
  error:     { color: "#993C1D", bg: "#FAECE7", label: "Error"     },
};

const FORMATOS: Formato[] = [
  { value: "pdf",  label: "PDF"            },
  { value: "xlsx", label: "Excel (.xlsx)"  },
  { value: "csv",  label: "CSV"            },
];

// ─── Selector de formato (dropdown vía portal) ────────
function FormatDropdown({
  rect,
  onSelect,
}: {
  rect: DOMRect;
  onSelect: (formato: Formato) => void;
}) {
  return createPortal(
    <div
      data-format-dropdown
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 170),
        width: 170,
        background: "#fff",
        border: "0.5px solid #e0e0e0",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
        zIndex: 1000,
      }}
    >
      {FORMATOS.map((f, idx) => (
        <button
          key={f.value}
          onClick={() => onSelect(f)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "transparent",
            border: "none",
            borderBottom: idx < FORMATOS.length - 1 ? "0.5px solid #f0f0f0" : "none",
            padding: "9px 14px",
            fontSize: 13,
            color: "#333",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {f.label}
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
      <span style={{ fontSize: 16 }}>⬇️</span>
      <span style={{ fontSize: 13, color: "#0F6E56", fontWeight: 500 }}>{message}</span>
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────
export default function Reports() {
  const [openDropdown, setOpenDropdown] = useState<DropdownState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cerrar el dropdown al hacer click fuera (pero no si el click
  // fue en el propio botón que lo abre, o dentro del menú)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-format-dropdown]") && !target.closest("[data-format-trigger]")) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const toggleDropdown = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown?.id === id) {
      setOpenDropdown(null);
      return;
    }
    setOpenDropdown({ id, rect: e.currentTarget.getBoundingClientRect() });
  };

  // La descarga real la maneja el backend en:
  // GET /reports/{id}/download?format={formato}
  const exportarReporte = (id: string, formato: Formato) => {
    console.log(`GET /reports/${id}/download?format=${formato.value}`);
    mostrarToast(`Descargando reporte en ${formato.label}...`);
    setOpenDropdown(null);
  };

  const generarReporte = (formato: Formato) => {
    console.log(`POST /reports/generate?format=${formato.value}`);
    mostrarToast(`Generando reporte en ${formato.label}...`);
    setOpenDropdown(null);
  };

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
            data-format-trigger
            onClick={(e) => toggleDropdown("header", e)}
            style={{ background: "#534AB7", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 14 }}
          >
            + Generar reporte
          </button>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9", borderBottom: "0.5px solid #e0e0e0" }}>
                  {["ID", "Reporte", "Tipo", "Fecha de generación", "Estado", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                      fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORTS.map((r, i) => {
                  const s = ESTADO_STYLE[r.estado];
                  return (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #f0f0f0",
                      background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "12px 16px", color: "#888", fontWeight: 500 }}>{r.id}</td>
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
                            data-format-trigger
                            onClick={(e) => toggleDropdown(r.id, e)}
                            style={{ background: "transparent", border: "0.5px solid #534AB7",
                              borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                              fontSize: 12, color: "#534AB7", fontWeight: 500 }}
                          >
                            Exportar ▾
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#bbb" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
            Mostrando {REPORTS.length} reportes
          </p>
        </main>
      </div>

      {openDropdown && (
        <FormatDropdown
          rect={openDropdown.rect}
          onSelect={(formato) =>
            openDropdown.id === "header"
              ? generarReporte(formato)
              : exportarReporte(openDropdown.id, formato)
          }
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
