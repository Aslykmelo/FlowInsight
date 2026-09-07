import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import Sidebar from "../components/Sidebar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

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

const API_URL = "http://127.0.0.1:8000";

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

// ─── Upload Page ──────────────────────────────────────
export default function UploadExcel() {
  const [state, setState] = useState<UploadState>({ status: "idle", file: null, progress: 0 });
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [mapeoError, setMapeoError] = useState("");
  const navigate = useNavigate();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState({ status: "error", file: null, progress: 0, message: "Solo se aceptan archivos .xlsx o .xls" });
      return;
    }
    setMapeo({});
    setMapeoError("");
    setState({ status: "configurando", file, progress: 0 });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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
        (data.filas_con_error > 0 ? ` · Filas con error: ${data.filas_con_error}` : "");

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

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f5f5f7", fontFamily:"system-ui,sans-serif" }}>
      <Sidebar />

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <header style={{ background:"#fff", borderBottom:"0.5px solid #e0e0e0",
          padding:"0.875rem 1.5rem", display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:500 }}>Cargar archivo Excel</h1>
            <p style={{ margin:0, fontSize:13, color:"#888" }}>
              Sube el archivo de ventas para actualizar el dashboard
            </p>
          </div>
        </header>

        <main style={{ padding:"2rem", display:"flex", flexDirection:"column",
          alignItems:"center", gap:"1.5rem" }}>

          {/* Drop zone */}
          {(state.status === "idle" || state.status === "dragging") && (
            <label
              htmlFor="file-input"
              onDragOver={(e) => { e.preventDefault(); setState((p) => ({ ...p, status:"dragging" })); }}
              onDragLeave={() => setState((p) => ({ ...p, status:"idle" }))}
              onDrop={handleDrop}
              style={{
                width:"100%", maxWidth:560,
                border: state.status === "dragging" ? "2px dashed #534AB7" : "2px dashed #ccc",
                borderRadius:16, padding:"3rem 2rem",
                display:"flex", flexDirection:"column", alignItems:"center", gap:16,
                background: state.status === "dragging" ? "#EEEDFE" : "#fff",
                transition:"all 0.2s", cursor:"pointer",
              }}
            >
              <span aria-hidden="true" style={{ fontSize:48 }}>📂</span>
              <p style={{ margin:0, fontSize:16, fontWeight:500, color:"#333" }}>
                Arrastra tu archivo aquí
              </p>
              <p style={{ margin:0, fontSize:13, color:"#888" }}>
                o haz clic para seleccionarlo
              </p>
              <span style={{ fontSize:12, color:"#aaa",
                background:"#f5f5f7", padding:"4px 12px", borderRadius:20 }}>
                .xlsx / .xls — máx. 10 MB
              </span>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                style={srOnly}
                onChange={handleInput}
              />
            </label>
          )}

          {/* Configurar columnas */}
          {state.status === "configurando" && state.file && (
            <div style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.5rem" }}>
              <p style={{ margin:"0 0 4px", fontSize:15, fontWeight:500 }}>Configurar columnas</p>
              <p style={{ margin:"0 0 16px", fontSize:13, color:"#888" }}>
                <span aria-hidden="true">📄</span> {state.file.name} — asocia cada campo con la columna correspondiente del archivo
              </p>

              {CAMPOS_SISTEMA.map((campo) => (
                <div key={campo.key} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"8px 0", borderBottom:"0.5px solid #f0f0f0" }}>
                  <label htmlFor={`campo-${campo.key}`} style={{ flex:1, fontSize:13, color:"#333", fontWeight:500 }}>
                    {campo.label}
                  </label>
                  <select
                    id={`campo-${campo.key}`}
                    value={mapeo[campo.key] ?? ""}
                    aria-describedby={mapeoError ? "mapeo-error" : undefined}
                    aria-invalid={Boolean(mapeoError && !mapeo[campo.key])}
                    onChange={(e) => setMapeo((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                    style={{ flex:1, border:"0.5px solid #e0e0e0", borderRadius:8, padding:"7px 10px",
                      fontSize:13, outline:"none", background:"#fff", boxSizing:"border-box" }}
                  >
                    <option value="">-- Selecciona una columna --</option>
                    {COLUMNAS_DETECTADAS_MOCK.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ))}

              {mapeoError && (
                <div id="mapeo-error" role="alert" aria-live="assertive"
                  style={{ background:"#FAECE7", border:"0.5px solid #E24B4A", borderRadius:8,
                  padding:"10px 14px", fontSize:13, color:"#993C1D", marginTop:14 }}>
                  <span aria-hidden="true">⚠️</span> {mapeoError}
                </div>
              )}

              <div style={{ display:"flex", gap:12, marginTop:18 }}>
                <button onClick={reset} style={{ flex:1, background:"#fff", color:"#555",
                  border:"0.5px solid #e0e0e0", borderRadius:8, padding:"10px", cursor:"pointer", fontSize:14 }}>
                  Cancelar
                </button>
                <button onClick={confirmarYSubir} style={{ flex:1, background:"#534AB7", color:"#fff",
                  border:"none", borderRadius:8, padding:"10px", cursor:"pointer", fontSize:14, fontWeight:500 }}>
                  Confirmar y subir
                </button>
              </div>
            </div>
          )}

          {/* Progreso / procesando */}
          {state.status === "uploading" && (
            <div style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12,
              padding: state.progress < 100 ? "1.5rem" : 0 }}>
              {state.progress < 100 ? (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:14, color:"#555" }}><span aria-hidden="true">📄</span> {state.file?.name}</span>
                    <span style={{ fontSize:14, fontWeight:500, color:"#534AB7" }}>{state.progress}%</span>
                  </div>
                  <div style={{ background:"#f0f0f0", borderRadius:99, height:8 }}>
                    <div style={{ background:"#534AB7", borderRadius:99, height:8,
                      width:`${state.progress}%`, transition:"width 0.3s" }} />
                  </div>
                </>
              ) : (
                <LoadingSpinner message="Procesando archivo en el servidor..." />
              )}
            </div>
          )}

          {/* Éxito */}
          {state.status === "success" && (
            <div role="status" aria-live="polite" style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12, padding:"2rem",
              display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
              <span aria-hidden="true" style={{ fontSize:52 }}>✅</span>
              <p style={{ margin:0, fontSize:17, fontWeight:500, color:"#0F6E56" }}>
                ¡Archivo cargado exitosamente!
              </p>
              <p style={{ margin:0, fontSize:13, color:"#888", textAlign:"center" }}>
                {state.message}
              </p>
              <div style={{ display:"flex", gap:12, marginTop:8 }}>
                <button onClick={reset} style={{ background:"#fff", color:"#534AB7",
                  border:"1px solid #534AB7", borderRadius:8,
                  padding:"8px 20px", cursor:"pointer", fontSize:14 }}>
                  Cargar otro archivo
                </button>
                <button onClick={() => navigate("/dashboard")} style={{ background:"#534AB7", color:"#fff",
                  border:"none", borderRadius:8,
                  padding:"8px 20px", cursor:"pointer", fontSize:14 }}>
                  Ver dashboard →
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {state.status === "error" && (
            <div style={{ width:"100%", maxWidth:560 }}>
              <ErrorMessage
                message={state.message || "No fue posible procesar el archivo."}
                onRetry={state.file ? reintentar : reset}
              />
            </div>
          )}

          {/* Instrucciones — solo antes de elegir un archivo */}
          {!enConfiguracionOSubida && state.status !== "success" && (
            <div style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
              <p style={{ margin:"0 0 12px", fontSize:14, fontWeight:500 }}>
                ¿Cómo debe estar estructurado el archivo?
              </p>
              {[
                { col:"cliente_nombre", desc:"Nombre del cliente" },
                { col:"cliente_correo", desc:"Correo del cliente (identifica si ya existe)" },
                { col:"producto_nombre", desc:"Nombre del producto" },
                { col:"producto_precio", desc:"Precio unitario del producto" },
                { col:"cantidad", desc:"Cantidad comprada" },
              ].map(row => (
                <div key={row.col} style={{ display:"flex", alignItems:"center",
                  gap:12, padding:"6px 0", borderBottom:"0.5px solid #f0f0f0" }}>
                  <span style={{ background:"#EEEDFE", color:"#534AB7",
                    borderRadius:6, padding:"2px 10px", fontSize:12,
                    fontWeight:500, minWidth:120, textAlign:"center" }}>
                    {row.col}
                  </span>
                  <span style={{ fontSize:13, color:"#555" }}>{row.desc}</span>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
