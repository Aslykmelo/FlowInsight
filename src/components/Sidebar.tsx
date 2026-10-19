import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTextSize } from "../context/TextSizeContext";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, FileUp, Sparkles, Users, FileText, Megaphone, MapPinned, Boxes, Brain,
  Settings, UserRound, Menu, X, type LucideIcon,
} from "lucide-react";

const NAV: { icon: LucideIcon; label: string; path: string; soloAdmin?: boolean }[] = [
  { icon: LayoutDashboard, label: "Dashboard",     path: "/dashboard"   },
  { icon: FileUp,          label: "Cargar Excel",  path: "/upload"      },
  { icon: Sparkles,        label: "Predicciones",  path: "/predictions" },
  { icon: Users,           label: "Clientes",      path: "/clients"     },
  { icon: FileText,        label: "Reportes",      path: "/reports"     },
  { icon: Megaphone,       label: "Promociones",   path: "/promotions"  },
  { icon: MapPinned,       label: "Mapa Bogotá",   path: "/sales-map"   },
  { icon: Boxes,           label: "Cubo OLAP",     path: "/olap-cube"   },
  { icon: Brain,           label: "Cómo funciona", path: "/model"       },
  { icon: Settings,        label: "Usuarios",      path: "/users", soloAdmin: true },
  { icon: UserRound,       label: "Mi perfil",     path: "/profile"     },
];

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("") || "?";


// ─── Control de tamaño de texto (accesibilidad) ────────
function TextSizeControl() {
  const { scale, increase, decrease, reset } = useTextSize();
  const porcentaje = Math.round(scale * 100);

  return (
    <div style={{ padding:"0 1.25rem 1rem", display:"flex", flexDirection:"column", gap:6 }}>
      <p style={{ margin:0, fontSize:11, color:"var(--c-sidebar-text)" }}>Tamaño de texto</p>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <button
          type="button"
          onClick={decrease}
          aria-label="Reducir tamaño de texto"
          style={{ width:40, height:40, borderRadius:8, border:"1px solid var(--c-sidebar-line)",
            background:"rgba(255,255,255,0.05)", color:"#fff", cursor:"pointer",
            fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>
          A-
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Restablecer tamaño de texto"
          title="Restablecer"
          style={{ flex:1, height:40, borderRadius:8, border:"1px solid var(--c-sidebar-line)",
            background:"rgba(255,255,255,0.05)", color:"var(--c-sidebar-text)", cursor:"pointer",
            fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {porcentaje}%
        </button>
        <button
          type="button"
          onClick={increase}
          aria-label="Aumentar tamaño de texto"
          style={{ width:40, height:40, borderRadius:8, border:"1px solid var(--c-sidebar-line)",
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
  const [abierto, setAbierto] = useState(false);
  const { usuario, esAdmin, cerrarSesion } = useAuth();

  const salir = () => {
    cerrarSesion();
    navigate("/", { replace: true });
  };

  const irA = (path: string) => {
    navigate(path);
    setAbierto(false); // en movil, navegar cierra el menu
  };

  return (
    <>
      <div className="sidebar-topbar" aria-hidden="true">FlowInsight</div>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      <div
        className={`sidebar-backdrop${abierto ? " sidebar-open" : ""}`}
        onClick={() => setAbierto(false)}
      />

      <aside
        aria-label="Navegación principal"
        className={`sidebar${abierto ? " sidebar-open" : ""}`}
        style={{ width:232, minHeight:"100vh",
        display:"flex", flexDirection:"column", padding:"1.25rem 0", flexShrink:0 }}>
        <div style={{ padding:"0 1.25rem 1rem" }}>
          <p style={{ margin:0, fontSize:19, fontWeight:700, color:"#fff", letterSpacing:"-0.01em",
            display:"flex", alignItems:"center", gap:10 }}>
            <span aria-hidden="true" style={{ width:30, height:30, borderRadius:9, background:"var(--c-primary)",
              display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
              <Sparkles size={17} color="#fff" />
            </span>
            FlowInsight
          </p>
          <p style={{ margin:"6px 0 0 40px", fontSize:11, color:"var(--c-sidebar-text)" }}>W&T Food S.A.S</p>
        </div>
        <nav style={{ flex:1 }}>
          {NAV.filter(item => !item.soloAdmin || esAdmin).map(item => {
            const active = location.pathname === item.path;
            return (
              <button key={item.label}
                type="button"
                className="nav-item"
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                onClick={() => irA(item.path)}>
                <item.icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <TextSizeControl />

        <div style={{ padding:"1rem 1.25rem", borderTop:"1px solid var(--c-sidebar-line)",
          display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div aria-hidden="true" style={{ width:34, height:34, borderRadius:"50%", background:"var(--c-primary)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, color:"#fff", fontWeight:500, flexShrink:0 }}>
              {iniciales(usuario?.nombre_usuario ?? "")}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ margin:0, fontSize:13, color:"#fff", overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {usuario?.nombre_usuario ?? "Usuario"}
              </p>
              <p style={{ margin:0, fontSize:11, color:"var(--c-sidebar-text)" }}>{usuario?.rol ?? ""}</p>
            </div>
          </div>
          <button type="button" onClick={salir}
            style={{ width:"100%", background:"rgba(255,255,255,0.05)", color:"#e4e4f2",
              border:"1px solid var(--c-sidebar-line)", borderRadius:8, minHeight:40, padding:"10px 0",
              cursor:"pointer", fontSize:13 }}>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
