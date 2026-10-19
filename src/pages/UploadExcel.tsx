import { API_URL } from "../config";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import {
  AlertCircle, ArrowRight, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
type Status = "idle" | "dragging" | "configurando" | "uploading" | "success" | "error";

interface UploadState {
  status: Status;
  file: File | null;
  progress: number;
  message?: string;
}

interface CampoSistema {
  key: string;
  label: string;
}


// Oculta visualmente pero deja perceptible para lectores de pantalla
// y alcanzable con Tab (a diferencia de display:none).
const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
};

// Campos que el backend espera recibir mapeados
const CAMPOS_SISTEMA: CampoSistema[] = [
  { key: "cliente_nombre",  label: "Nombre del cliente" },
  { key: "cliente_correo",  label: "Correo del cliente" },
  { key: "producto_nombre", label: "Nombre del producto" },
  { key: "producto_precio", label: "Precio unitario" },
  { key: "cantidad",        label: "Cantidad" },
];

// Mock de las columnas que traería el Excel — cuando el backend esté
// listo, esto vendrá de POST /upload/preview a partir del archivo real.
const COLUMNAS_DETECTADAS_MOCK = [
  "Nombre Cliente",
  "Correo",
  "Producto",
  "Precio Unit.",
  "Cantidad Comprada",
];

const INSTRUCCIONES = [
  { col: "cliente_nombre", desc: "Nombre del cliente" },
  { col: "cliente_correo", desc: "Correo del cliente (identifica si ya existe)" },
  { col: "producto_nombre", desc: "Nombre del producto" },
  { col: "producto_precio", desc: "Precio unitario del producto" },
  { col: "cantidad", desc: "Cantidad comprada" },
];

const PASOS = ["Elegir archivo", "Asociar columnas", "Cargar"];

// Convierte "Filas procesadas: 10 · Clientes nuevos: 2" en pares etiqueta/valor
const partesResumen = (mensaje?: string) =>
  (mensaje ?? "")
    .split(" · ")
    .map((parte) => {
      const i = parte.lastIndexOf(": ");
      return i === -1 ? { etiqueta: parte, valor: "" } : { etiqueta: parte.slice(0, i), valor: parte.slice(i + 2) };
    })
    .filter((p) => p.etiqueta);

// Estilos propios de esta pantalla (el resto sale de design.css)
const PAGE_CSS = `
  @keyframes ux-spin { to { transform: rotate(360deg); } }
  .ux-spin { animation: ux-spin 0.8s linear infinite; }
  .ux-col { width: 100%; max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--s-5); }
  .ux-steps { display: flex; gap: var(--s-2); margin: 0; padding: 0; list-style: none; }
  .ux-step { flex: 1; display: flex; align-items: center; gap: var(--s-2); min-width: 0; padding-top: var(--s-2);
    border-top: 3px solid var(--c-line-strong); font-size: 13px; font-weight: 600; color: var(--c-muted); }
  .ux-step[data-state="done"], .ux-step[data-state="current"] { border-top-color: var(--c-primary); }
  .ux-step[data-state="current"] { color: var(--c-ink); }
  .ux-step-n { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center;
    justify-content: center; font-size: 12px; font-variant-numeric: tabular-nums; background: var(--c-line); color: var(--c-ink-2); }
  .ux-step[data-state="current"] .ux-step-n, .ux-step[data-state="done"] .ux-step-n { background: var(--c-primary); color: #fff; }
  @media (max-width: 480px) { .ux-step-label { display: none; } .ux-step[data-state="current"] .ux-step-label { display: inline; } }
  .ux-consent { display: flex; align-items: flex-start; gap: var(--s-3); padding: var(--s-4); cursor: pointer;
    background: var(--c-warn-soft); border: 1px solid var(--c-accent); border-radius: var(--r-md);
    font-size: 14px; line-height: 1.5; color: var(--c-warn); }
  .ux-consent input { flex-shrink: 0; width: 20px; height: 20px; margin: 2px 0 0; cursor: pointer; accent-color: var(--c-primary); }
  .ux-drop { display: flex; flex-direction: column; align-items: center; gap: var(--s-3); padding: var(--s-6) var(--s-5);
    text-align: center; border: 2px dashed var(--c-line-strong); border-radius: var(--r-lg); background: var(--c-surface);
    cursor: pointer; transition: background 0.15s, border-color 0.15s; }
  .ux-drop:hover, .ux-drop:focus-within { border-color: var(--c-primary); }
  .ux-drop:focus-within { outline: 2px solid var(--c-primary); outline-offset: 2px; }
  .ux-drop[data-over="true"] { border-color: var(--c-primary); background: var(--c-primary-soft); }
  .ux-drop[data-locked="true"] { cursor: not-allowed; background: var(--c-bg); }
  .ux-drop[data-locked="true"]:hover { border-color: var(--c-line-strong); }
  .ux-drop-icon { width: 56px; height: 56px; border-radius: var(--r-md); display: flex; align-items: center;
    justify-content: center; background: var(--c-primary-soft); color: var(--c-primary); }
  .ux-drop[data-locked="true"] .ux-drop-icon { background: var(--c-line); color: var(--c-muted); }
  .ux-drop-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--c-ink); }
  .ux-drop-sub { margin: 0; font-size: 14px; color: var(--c-muted); }
  .ux-drop .btn[aria-disabled="true"] { opacity: 1; background: var(--c-line); border-color: var(--c-line); color: var(--c-muted); cursor: not-allowed; }
  .ux-hint { font-size: 12px; font-weight: 600; color: var(--c-muted); background: var(--c-bg);
    border: 1px solid var(--c-line); padding: 4px 12px; border-radius: 999px; }
  .ux-file { display: flex; align-items: center; gap: var(--s-2); margin: 0 0 var(--s-4); font-size: 14px;
    color: var(--c-muted); word-break: break-word; }
  .ux-maprow { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: var(--s-3);
    padding: var(--s-3) 0; border-bottom: 1px solid var(--c-line); }
  .ux-maprow label { font-size: 14px; font-weight: 600; color: var(--c-ink); }
  .ux-maprow .input[aria-invalid="true"] { border-color: var(--c-bad); }
  @media (max-width: 520px) { .ux-maprow { grid-template-columns: 1fr; gap: var(--s-2); } }
  .ux-btns { display: flex; gap: var(--s-3); flex-wrap: wrap; margin-top: var(--s-5); }
  .ux-btns .btn { flex: 1 1 140px; }
  .ux-progress-head { display: flex; justify-content: space-between; gap: var(--s-3); margin-bottom: var(--s-2);
    font-size: 14px; color: var(--c-ink-2); }
  .ux-progress-head span:first-child { display: flex; align-items: center; gap: var(--s-2); min-width: 0; word-break: break-word; }
  .ux-progress-head span:last-child { font-weight: 700; color: var(--c-primary); font-variant-numeric: tabular-nums; }
  .ux-track { height: 8px; border-radius: 99px; background: var(--c-line); overflow: hidden; }
  .ux-bar { height: 100%; border-radius: 99px; background: var(--c-primary); transition: width 0.3s; }
  .ux-processing { display: flex; align-items: center; gap: var(--s-3); font-size: 14px; color: var(--c-ink-2); }
  .ux-result { display: flex; flex-direction: column; align-items: center; gap: var(--s-3); text-align: center; }
  .ux-result h2 { margin: 0; font-size: 18px; }
  .ux-result-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .ux-stats { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s-3); margin: var(--s-2) 0 0; }
  .ux-stat { background: var(--c-bg); border: 1px solid var(--c-line); border-radius: var(--r-sm); padding: var(--s-3); text-align: left; }
  .ux-stat dt { margin: 0; font-size: 12px; font-weight: 600; color: var(--c-muted); }
  .ux-stat dd { margin: 2px 0 0; font-size: 20px; font-weight: 700; color: var(--c-ink); font-variant-numeric: tabular-nums; }
  .ux-error { display: flex; align-items: flex-start; gap: var(--s-3); flex-wrap: wrap; padding: var(--s-4); font-size: 14px; }
  .ux-error p { margin: 0; flex: 1 1 240px; font-weight: 600; }
  .ux-cols { list-style: none; margin: 0; padding: 0; }
  .ux-cols li { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-2) var(--s-3); padding: var(--s-2) 0; border-bottom: 1px solid var(--c-line); }
  .ux-cols li:last-child { border-bottom: none; }
  .ux-cols code { min-width: 140px; text-align: center; font-family: inherit; font-size: 12px; font-weight: 700; }
  .ux-cols span { font-size: 14px; color: var(--c-ink-2); }
`;

// ─── Upload Page ──────────────────────────────────────
export default function UploadExcel() {
  const [state, setState] = useState<UploadState>({ status: "idle", file: null, progress: 0 });
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [mapeoError, setMapeoError] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const navigate = useNavigate();

  const handleFile = useCallback((file: File) => {
    if (!autorizado) return; // sin autorización confirmada, no se procesa ningún archivo

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState({ status: "error", file: null, progress: 0, message: "Solo se aceptan archivos .xlsx o .xls" });
      return;
    }
    setMapeo({});
    setMapeoError("");
    setState({ status: "configurando", file, progress: 0 });
  }, [autorizado]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!autorizado) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile, autorizado]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Envío real al backend: archivo + mapeo de columnas
  const subirArchivo = useCallback(async (file: File, mapeoColumnas: Record<string, string>) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ status: "error", file, progress: 0, message: "No hay sesión iniciada." });
      return;
    }

    setState({ status: "uploading", file, progress: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapeo_columnas", JSON.stringify(mapeoColumnas));

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (evento) => {
          if (!evento.total) return;
          const progreso = Math.round((evento.loaded * 100) / evento.total);
          setState((prev) => ({ ...prev, progress: progreso }));
        },
      });

      const data = response.data;
      const resumen =
            `Filas procesadas: ${data.filas_procesadas} · ` +
            `Clientes nuevos: ${data.clientes_creados} · ` +
            `Productos nuevos: ${data.productos_creados} · ` +
            `Pedidos creados: ${data.pedidos_creados}` +
            (data.filas_con_error > 0 ? ` · Filas con error: ${data.filas_con_error}` : "") +
            (data.filas_duplicadas > 0 ? ` · Duplicadas (omitidas): ${data.filas_duplicadas}` : "");

      setState({ status: "success", file, progress: 100, message: resumen });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;

      if (axiosError.response?.status === 401) {
        navigate("/");
        return;
      }

      setState({
        status: "error",
        file,
        progress: 0,
        message: axiosError.response?.data?.detail || "No fue posible procesar el archivo.",
      });
    }
  }, [navigate]);

  const confirmarYSubir = () => {
    const faltantes = CAMPOS_SISTEMA.filter((c) => !mapeo[c.key]);
    if (faltantes.length > 0) {
      setMapeoError("Debes asociar todas las columnas antes de continuar.");
      return;
    }
    if (!state.file) return;
    setMapeoError("");
    subirArchivo(state.file, mapeo);
  };

  const reintentar = () => {
    if (state.file) subirArchivo(state.file, mapeo);
  };

  const reset = () => {
    setMapeo({});
    setMapeoError("");
    setState({ status: "idle", file: null, progress: 0 });
  };

  const enConfiguracionOSubida = state.status === "configurando" || state.status === "uploading";

  // Paso actual del proceso (0 = elegir archivo, 1 = asociar columnas, 2 = cargar)
  const pasoActual =
    state.status === "configurando" ? 1 : state.status === "uploading" || state.status === "success" ? 2 : 0;
  const resumen = partesResumen(state.message);

  return (
    <div className="app-shell">
      <style>{PAGE_CSS}</style>
      <Sidebar />

      {/* Main */}
      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Cargar archivo Excel</h1>
            <p>Sube el archivo de ventas para actualizar el dashboard</p>
          </div>
        </header>

        <main className="page-body">
          <div className="ux-col">

            <ol className="ux-steps" aria-label="Pasos para cargar el archivo">
              {PASOS.map((paso, i) => {
                const estado = i < pasoActual || state.status === "success" ? "done" : i === pasoActual ? "current" : "todo";
                return (
                  <li key={paso} className="ux-step" data-state={estado} aria-current={estado === "current" ? "step" : undefined}>
                    <span className="ux-step-n" aria-hidden="true">{i + 1}</span>
                    <span className="ux-step-label">{paso}</span>
                  </li>
                );
              })}
            </ol>

            {/* Confirmación de autorización de datos */}
            {!enConfiguracionOSubida && state.status !== "success" && (
              <label htmlFor="autorizacion" className="ux-consent">
                <input
                  type="checkbox"
                  id="autorizacion"
                  checked={autorizado}
                  onChange={(e) => setAutorizado(e.target.checked)}
                />
                <span>
                  Confirmo que cuento con la <strong>autorización expresa</strong> de los clientes incluidos
                  en este archivo para el tratamiento de sus datos personales, conforme a la Ley 1581 de 2012.
                </span>
              </label>
            )}

            {/* Drop zone */}
            {(state.status === "idle" || state.status === "dragging") && (
              <label
                htmlFor="file-input"
                className="ux-drop"
                data-over={state.status === "dragging"}
                data-locked={!autorizado}
                onDragOver={(e) => { e.preventDefault(); if (autorizado) setState((p) => ({ ...p, status:"dragging" })); }}
                onDragLeave={() => setState((p) => ({ ...p, status:"idle" }))}
                onDrop={handleDrop}
              >
                <span className="ux-drop-icon" aria-hidden="true"><UploadCloud size={28} /></span>
                <p className="ux-drop-title">
                  {autorizado ? "Arrastra tu archivo aquí" : "Marca la casilla de autorización para continuar"}
                </p>
                <p className="ux-drop-sub">o haz clic para seleccionarlo</p>
                <span className="btn btn-primary" aria-hidden="true" aria-disabled={!autorizado}>
                  Seleccionar archivo
                </span>
                <span className="ux-hint">.xlsx / .xls — máx. 10 MB</span>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={!autorizado}
                  style={srOnly}
                  onChange={handleInput}
                />
              </label>
            )}

            {/* Configurar columnas */}
            {state.status === "configurando" && state.file && (
              <section className="card" aria-labelledby="cfg-titulo">
                <h2 id="cfg-titulo">Configurar columnas</h2>
                <p className="ux-file">
                  <FileSpreadsheet size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span>{state.file.name} — asocia cada campo con la columna correspondiente del archivo</span>
                </p>

                {CAMPOS_SISTEMA.map((campo) => (
                  <div key={campo.key} className="ux-maprow">
                    <label htmlFor={`campo-${campo.key}`}>{campo.label}</label>
                    <select
                      id={`campo-${campo.key}`}
                      className="input"
                      value={mapeo[campo.key] ?? ""}
                      aria-describedby={mapeoError ? "mapeo-error" : undefined}
                      aria-invalid={Boolean(mapeoError && !mapeo[campo.key])}
                      onChange={(e) => setMapeo((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                    >
                      <option value="">-- Selecciona una columna --</option>
                      {COLUMNAS_DETECTADAS_MOCK.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {mapeoError && (
                  <div id="mapeo-error" role="alert" aria-live="assertive" className="notice notice-bad"
                    style={{ marginTop: "var(--s-4)", display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                    <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                    {mapeoError}
                  </div>
                )}

                <div className="ux-btns">
                  <button type="button" onClick={reset} className="btn">
                    Cancelar
                  </button>
                  <button type="button" onClick={confirmarYSubir} className="btn btn-primary">
                    Confirmar y subir
                  </button>
                </div>
              </section>
            )}

            {/* Progreso / procesando */}
            {state.status === "uploading" && (
              <section className="card" aria-label="Progreso de la carga">
                {state.progress < 100 ? (
                  <>
                    <div className="ux-progress-head">
                      <span>
                        <FileSpreadsheet size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                        {state.file?.name}
                      </span>
                      <span>{state.progress}%</span>
                    </div>
                    <div
                      className="ux-track"
                      role="progressbar"
                      aria-label="Progreso de la carga del archivo"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={state.progress}
                    >
                      <div className="ux-bar" style={{ width: `${state.progress}%` }} />
                    </div>
                  </>
                ) : (
                  <div role="status" aria-live="polite" className="ux-processing">
                    <Loader2 size={24} className="ux-spin" aria-hidden="true" style={{ color: "var(--c-primary)" }} />
                    Procesando archivo en el servidor...
                  </div>
                )}
              </section>
            )}

            {/* Éxito */}
            {state.status === "success" && (
              <section role="status" aria-live="polite" className="card ux-result">
                <span className="ux-result-icon" aria-hidden="true"
                  style={{ background: "var(--c-ok-soft)", color: "var(--c-ok)" }}>
                  <CheckCircle2 size={32} />
                </span>
                <h2 style={{ color: "var(--c-ok)" }}>¡Archivo cargado exitosamente!</h2>
                <dl className="ux-stats">
                  {resumen.map((p) => (
                    <div key={p.etiqueta} className="ux-stat">
                      <dt>{p.etiqueta}</dt>
                      {p.valor && <dd>{p.valor}</dd>}
                    </div>
                  ))}
                </dl>
                <div className="ux-btns" style={{ width: "100%" }}>
                  <button type="button" onClick={reset} className="btn btn-outline">
                    Cargar otro archivo
                  </button>
                  <button type="button" onClick={() => navigate("/dashboard")} className="btn btn-primary">
                    Ver dashboard
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </section>
            )}

            {/* Error */}
            {state.status === "error" && (
              <div role="alert" aria-live="assertive" className="notice notice-bad ux-error">
                <AlertCircle size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <p>{state.message || "No fue posible procesar el archivo."}</p>
                <button type="button" className="btn btn-danger" onClick={state.file ? reintentar : reset}>
                  {state.file ? "Reintentar" : "Elegir otro archivo"}
                </button>
              </div>
            )}

            {/* Instrucciones — solo antes de elegir un archivo */}
            {!enConfiguracionOSubida && state.status !== "success" && (
              <section className="card" aria-labelledby="instr-titulo">
                <h2 id="instr-titulo">¿Cómo debe estar estructurado el archivo?</h2>
                <ul className="ux-cols">
                  {INSTRUCCIONES.map((row) => (
                    <li key={row.col}>
                      <code className="chip">{row.col}</code>
                      <span>{row.desc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
