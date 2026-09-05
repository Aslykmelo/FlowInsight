import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ErrorMessage from "../components/ErrorMessage";

// ─── Types ────────────────────────────────────────────
interface UploadState {
  status: "idle" | "dragging" | "uploading" | "success" | "error";
  fileName?: string;
  progress: number;
  message?: string;
}

const API_URL = "http://127.0.0.1:8000";

// ─── Upload Page ──────────────────────────────────────
export default function UploadExcel() {
  const [state, setState] = useState<UploadState>({ status: "idle", progress: 0 });
  const navigate = useNavigate();

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState({ status: "error", progress: 0, message: "Solo se aceptan archivos .xlsx o .xls" });
      return;
    }

    setState({ status: "uploading", fileName: file.name, progress: 0 });

    const token = localStorage.getItem("token");
    if (!token) {
      setState({ status: "error", progress: 0, message: "No hay sesión iniciada." });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Progreso real de la subida
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setState(prev => ({ ...prev, progress }));
      }
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // respuesta no era JSON válido
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        const resumen =
          `Filas procesadas: ${data.filas_procesadas} · ` +
          `Clientes nuevos: ${data.clientes_creados} · ` +
          `Productos nuevos: ${data.productos_creados} · ` +
          `Pedidos creados: ${data.pedidos_creados}` +
          (data.filas_con_error > 0 ? ` · Filas con error: ${data.filas_con_error}` : "");

        setState({
          status: "success",
          fileName: file.name,
          progress: 100,
          message: resumen,
        });
      } else {
        setState({
          status: "error",
          progress: 0,
          message: data.detail || "No fue posible procesar el archivo.",
        });
      }
    };

    xhr.onerror = () => {
      setState({ status: "error", progress: 0, message: "No fue posible conectar con el servidor." });
    };

    xhr.send(formData);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, status: "idle" }));
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => setState({ status: "idle", progress: 0 });

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
          {state.status !== "success" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setState(p => ({ ...p, status:"dragging" })); }}
              onDragLeave={() => setState(p => ({ ...p, status:"idle" }))}
              onDrop={handleDrop}
              style={{
                width:"100%", maxWidth:560,
                border: state.status === "dragging" ? "2px dashed #534AB7" : "2px dashed #ccc",
                borderRadius:16, padding:"3rem 2rem",
                display:"flex", flexDirection:"column", alignItems:"center", gap:16,
                background: state.status === "dragging" ? "#EEEDFE" : "#fff",
                transition:"all 0.2s", cursor:"pointer",
              }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <span style={{ fontSize:48 }}>📂</span>
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
              <input id="file-input" type="file" accept=".xlsx,.xls"
                style={{ display:"none" }} onChange={handleInput} />
            </div>
          )}

          {/* Progreso */}
          {state.status === "uploading" && (
            <div style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.5rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:14, color:"#555" }}>📄 {state.fileName}</span>
                <span style={{ fontSize:14, fontWeight:500, color:"#534AB7" }}>{state.progress}%</span>
              </div>
              <div style={{ background:"#f0f0f0", borderRadius:99, height:8 }}>
                <div style={{ background:"#534AB7", borderRadius:99, height:8,
                  width:`${state.progress}%`, transition:"width 0.3s" }} />
              </div>
              <p style={{ margin:"12px 0 0", fontSize:13, color:"#888" }}>
                Procesando datos...
              </p>
            </div>
          )}

          {/* Éxito */}
          {state.status === "success" && (
            <div style={{ width:"100%", maxWidth:560, background:"#fff",
              border:"0.5px solid #e0e0e0", borderRadius:12, padding:"2rem",
              display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
              <span style={{ fontSize:52 }}>✅</span>
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
                onRetry={reset}
              />
            </div>
          )}

          {/* Instrucciones */}
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

        </main>
      </div>
    </div>
  );
}