import { useNavigate, useLocation } from "react-router-dom";

const NAV = [
  { emoji:"📊", label:"Dashboard",    path:"/dashboard"    },
  { emoji:"📁", label:"Cargar Excel", path:"/upload"       },
  { emoji:"🤖", label:"Predicciones", path:"/predictions"  },
  { emoji:"👥", label:"Clientes",     path:"/clients"      },
];
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside style={{ width:220, minHeight:"100vh", background:"#16163a",
      display:"flex", flexDirection:"column", padding:"1.5rem 0", flexShrink:0 }}>
      <div style={{ padding:"0 1.25rem 1.5rem" }}>
        <p style={{ margin:0, fontSize:19, fontWeight:500, color:"#fff" }}>🔮 FlowInsight</p>
        <p style={{ margin:"4px 0 0", fontSize:11, color:"#8888aa" }}>W&T Food S.A.S</p>
      </div>
      <nav style={{ flex:1 }}>
        {NAV.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.label}
              onClick={() => navigate(item.path)}
              style={{ width:"100%",
                background: active ? "rgba(83,74,183,0.2)":"transparent",
                border:"none", borderLeft: active ? "3px solid #534AB7":"3px solid transparent",
                color: active ? "#fff":"#8888aa", padding:"10px 1.25rem",
                textAlign:"left", cursor:"pointer", fontSize:14,
                display:"flex", alignItems:"center", gap:10 }}>
              <span>{item.emoji}</span><span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"1rem 1.25rem", borderTop:"0.5px solid #2a2a4a",
        display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:"#534AB7",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, color:"#fff", fontWeight:500, flexShrink:0 }}>AD</div>
      </div>
    </aside>
  );
}