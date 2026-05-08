import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// ─── Types ────────────────────────────────────────────
interface UploadState {
  status: "idle" | "dragging" | "uploading" | "success" | "error";
  fileName?: string;
  progress: number;
  message?: string;
}

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

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setState(prev => ({ ...prev, progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setState({ status: "success", fileName: file.name, progress: 100,
          message: "Archivo procesado correctamente. Dashboard actualizado." });
      }
    }, 400);

    // Cuando tengas FastAPI listo, reemplaza el intervalo con:
    // const form = new FormData();
    // form.append("file", file);
    // await axios.post("http://localhost:8000/upload", form);
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
                <button onClick={() => navigate("/")} style={{ background:"#534AB7", color:"#fff",
                  border:"none", borderRadius:8,
                  padding:"8px 20px", cursor:"pointer", fontSize:14 }}>
                  Ver dashboard →
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {state.status === "error" && (
            <div style={{ width:"100%", maxWidth:560, background:"#FAECE7",
              border:"0.5px solid #F0997B", borderRadius:12, padding:"1.25rem",
              display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:500, color:"#993C1D" }}>Error</p>
                <p style={{ margin:0, fontSize:13, color:"#993C1D" }}>{state.message}</p>
              </div>
              <button onClick={reset} style={{ marginLeft:"auto", background:"transparent",
                border:"none", cursor:"pointer", fontSize:20, color:"#993C1D" }}>×</button>
            </div>
          )}

          {/* Instrucciones */}
          <div style={{ width:"100%", maxWidth:560, background:"#fff",
            border:"0.5px solid #e0e0e0", borderRadius:12, padding:"1.25rem" }}>
            <p style={{ margin:"0 0 12px", fontSize:14, fontWeight:500 }}>
              ¿Cómo debe estar estructurado el archivo?
            </p>
            {[
              { col:"A", desc:"Fecha del pedido (DD/MM/AAAA)" },
              { col:"B", desc:"ID o nombre del cliente" },
              { col:"C", desc:"Producto o categoría" },
              { col:"D", desc:"Cantidad" },
              { col:"E", desc:"Valor total de la venta" },
            ].map(row => (
              <div key={row.col} style={{ display:"flex", alignItems:"center",
                gap:12, padding:"6px 0", borderBottom:"0.5px solid #f0f0f0" }}>
                <span style={{ background:"#EEEDFE", color:"#534AB7",
                  borderRadius:6, padding:"2px 10px", fontSize:12,
                  fontWeight:500, minWidth:28, textAlign:"center" }}>
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