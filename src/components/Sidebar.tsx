import { useNavigate, useLocation } from "react-router-dom";
import type { CSSProperties } from "react";
import { useTextSize } from "../context/TextSizeContext";

const NAV = [
  { emoji:"📊", label:"Dashboard",    path:"/dashboard"    },
  { emoji:"📁", label:"Cargar Excel", path:"/upload"       },
  { emoji:"🤖", label:"Predicciones", path:"/predictions"  },
  { emoji:"👥", label:"Clientes",     path:"/clients"      },
  { emoji:"📄", label:"Reportes",     path:"/reports"      },
  { emoji:"🎯", label:"Promociones",  path:"/promotions"   },
  { emoji:"🗺️", label:"Mapa Bogotá",  path:"/sales-map"    },
  { emoji:"📦", label:"Cubo OLAP 3D", path:"/olap-cube"    },
  { emoji:"⚙️", label:"Usuarios",     path:"/users"        },
];

// Oculta el emoji decorativo al lector de pantalla y deja que el
// texto visible de al lado sea lo único que se anuncie.
const emojiStyle: CSSProperties = { fontSize: 14 };

// ─── Control de tamaño de texto (accesibilidad) ────────
function TextSizeControl() {
  const { scale, increase, decrease, reset } = useTextSize();
  const porcentaje = Math.round(scale * 100);

  return (
    <div style={{ padding:"0 1.25rem 1rem", display:"flex", flexDirection:"column", gap:6 }}>
      <p style={{ margin:0, fontSize:11, color:"#8888aa" }}>Tamaño de texto</p>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <button
          type="button"
          onClick={decrease}
          aria-label="Reducir tamaño de texto"
          style={{ width:28, height:28, borderRadius:6, border:"0.5px solid #2a2a4a",
            background:"rgba(255,255,255,0.05)", color:"#fff", cursor:"pointer",
            fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>
          A-
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Restablecer tamaño de texto"
          title="Restablecer"
          style={{ flex:1, height:28, borderRadius:6, border:"0.5px solid #2a2a4a",
            background:"rgba(255,255,255,0.05)", color:"#8888aa", cursor:"pointer",
            fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {porcentaje}%
        </button>
        <button
          type="button"
          onClick={increase}
          aria-label="Aumentar tamaño de texto"
          style={{ width:28, height:28, borderRadius:6, border:"0.5px solid #2a2a4a",
            background:"rgba(255,255,255,0.05)", color:"#fff", cursor:"pointer",
            fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>
          A+
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      aria-label="Navegación principal"
      style={{ width:220, minHeight:"100vh", background:"#16163a",
      display:"flex", flexDirection:"column", padding:"1.5rem 0", flexShrink:0 }}>
      <div style={{ padding:"0 1.25rem 1.5rem" }}>
        <p style={{ margin:0, fontSize:19, fontWeight:500, color:"#fff" }}>
          <span aria-hidden="true">🔮</span> FlowInsight
        </p>
        <p style={{ margin:"4px 0 0", fontSize:11, color:"#8888aa" }}>W&T Food S.A.S</p>
      </div>
      <nav style={{ flex:1 }}>
        {NAV.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.label}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              onClick={() => navigate(item.path)}
              style={{ width:"100%",
                background: active ? "rgba(83,74,183,0.2)":"transparent",
                border:"none", borderLeft: active ? "3px solid #534AB7":"3px solid transparent",
                color: active ? "#fff":"#8888aa", padding:"10px 1.25rem",
                textAlign:"left", cursor:"pointer", fontSize:14,
                display:"flex", alignItems:"center", gap:10 }}>
              <span aria-hidden="true" style={emojiStyle}>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <TextSizeControl />

      <div style={{ padding:"1rem 1.25rem", borderTop:"0.5px solid #2a2a4a",
        display:"flex", alignItems:"center", gap:10 }}>
        <div role="img" aria-label="Usuario administrador" style={{ width:34, height:34, borderRadius:"50%", background:"#534AB7",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, color:"#fff", fontWeight:500, flexShrink:0 }}>AD</div>
      </div>
    </aside>
  );
}