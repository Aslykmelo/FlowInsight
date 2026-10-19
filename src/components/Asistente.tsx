import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Asistente de ayuda de FlowInsight. No es un modelo de lenguaje: responde con una base de
// conocimiento escrita a mano sobre la propia aplicación, buscando por palabras clave. Si no
// entiende la pregunta lo dice y ofrece los temas que sí conoce.

interface Tema {
  id: string;
  titulo: string;
  claves: string[];
  respuesta: string;
  ir?: { etiqueta: string; ruta: string };
  soloAdmin?: boolean;
}

const TEMAS: Tema[] = [
  {
    id: "que-es",
    titulo: "¿Qué es FlowInsight?",
    claves: ["que es", "para que sirve", "flowinsight", "aplicacion", "app", "sistema", "proposito"],
    respuesta:
      "FlowInsight es el sistema de análisis de clientes y ventas de W&T Food. Reúne el historial de pedidos, " +
      "muestra cómo van las ventas, estima qué clientes están en riesgo de dejar de comprar y ayuda a contactarlos " +
      "con mensajes de promoción.",
  },
  {
    id: "dashboard",
    titulo: "¿Qué muestra el Dashboard?",
    claves: ["dashboard", "inicio", "indicadores", "kpi", "resumen", "ventas diarias", "grafico"],
    respuesta:
      "El Dashboard es el resumen del negocio: indicadores clave, ventas por día, productos más vendidos, ventas " +
      "por canal y cuántos clientes hay en cada nivel de riesgo.",
    ir: { etiqueta: "Ir al Dashboard", ruta: "/dashboard" },
  },
  {
    id: "cargar",
    titulo: "¿Cómo cargo datos desde Excel?",
    claves: ["cargar", "subir", "excel", "xlsx", "importar", "archivo", "datos nuevos", "columnas"],
    respuesta:
      "En Cargar Excel: 1) confirma que tienes la autorización de los clientes para usar sus datos, 2) elige el " +
      "archivo (.xlsx o .xls, máximo 10 MB), 3) asocia cada campo con la columna de tu archivo y 4) envía. Al final " +
      "te dice cuántos clientes, productos y pedidos nuevos se crearon.",
    ir: { etiqueta: "Ir a Cargar Excel", ruta: "/upload" },
  },
  {
    id: "predicciones",
    titulo: "¿Qué son las Predicciones?",
    claves: ["prediccion", "predicciones", "riesgo", "abandono", "fuga", "proxima compra", "alerta", "ml"],
    respuesta:
      "La pantalla Predicciones lista a los clientes con la fecha estimada de su próxima compra y la probabilidad " +
      "de que dejen de comprar en 90 días. Riesgo bajo: hasta 30 %. Medio: 30 a 60 %. Alto: más de 60 %. Úsala " +
      "como una señal de apoyo; en 'Cómo funciona' se explica qué tan confiable es.",
    ir: { etiqueta: "Ir a Predicciones", ruta: "/predictions" },
  },
  {
    id: "clientes",
    titulo: "¿Cómo busco un cliente?",
    claves: ["cliente", "clientes", "buscar", "historial", "pedidos de un cliente"],
    respuesta:
      "En Clientes está el historial de cada cliente de W&T Food. Puedes buscarlo por nombre o ciudad y abrir su detalle " +
      "para ver sus pedidos.",
    ir: { etiqueta: "Ir a Clientes", ruta: "/clients" },
  },
  {
    id: "reportes",
    titulo: "¿Cómo descargo un informe?",
    claves: ["reporte", "reportes", "informe", "informes", "descargar", "pdf", "excel", "exportar"],
    respuesta:
      "En Reportes elige el tipo (ventas, clientes, riesgo de abandono o predicciones) y el formato (PDF o Excel). " +
      "El PDF trae indicadores, hallazgos, gráficos y el detalle; el Excel trae las tablas para trabajar con ellas. " +
      "Después de generarlo, puedes volver a descargarlo desde la lista cuando quieras.",
    ir: { etiqueta: "Ir a Reportes", ruta: "/reports" },
  },
  {
    id: "promociones",
    titulo: "¿Cómo envío un mensaje de promoción?",
    claves: ["promocion", "promociones", "mensaje", "whatsapp", "enviar", "contactar", "asesor", "pedido", "correo"],
    respuesta:
      "En Promociones filtra por categoría (activo, ocasional o en riesgo), toca un cliente y se genera el mensaje " +
      "con su producto favorito. Puedes copiarlo, abrirlo en WhatsApp o enviarte una vista previa por correo con los " +
      "botones 'Hablar con un asesor' y 'Hacer un pedido'. Solo aparecen clientes que autorizaron el uso de sus datos.",
    ir: { etiqueta: "Ir a Promociones", ruta: "/promotions" },
  },
  {
    id: "mapa",
    titulo: "¿Cómo uso el mapa?",
    claves: ["mapa", "bogota", "localidad", "ubicacion", "donde", "tiendas", "producto que consumen"],
    respuesta:
      "El mapa ubica a los clientes de Bogotá. Elige un producto para ver quién lo compra, toca un punto para ver " +
      "qué consume y cuántos días lleva sin comprar. Los colores indican si está activo, ocasional o en riesgo. " +
      "La ubicación es aproximada dentro de la localidad, porque los datos no traen coordenadas exactas.",
    ir: { etiqueta: "Ir al mapa", ruta: "/sales-map" },
  },
  {
    id: "olap",
    titulo: "¿Qué es el cubo OLAP?",
    claves: ["olap", "cubo", "tabla de calor", "dimension", "producto mes", "cruzar"],
    respuesta:
      "El cubo OLAP cruza tres cosas: qué producto se vende, en qué mes y a qué tipo de cliente. En la tabla de " +
      "calor, entre más oscuro el morado, más se vendió; toca una casilla para ver el detalle por tipo de cliente. " +
      "Hay una vista 3D con los mismos datos.",
    ir: { etiqueta: "Ir al cubo OLAP", ruta: "/olap-cube" },
  },
  {
    id: "rfm",
    titulo: "¿Qué significa RFM?",
    claves: ["rfm", "recencia", "frecuencia", "monetario", "segmento", "activo", "ocasional", "en riesgo"],
    respuesta:
      "RFM resume a cada cliente con tres datos: Recencia (hace cuántos días compró por última vez), Frecuencia " +
      "(cuántos pedidos ha hecho) y valor Monetario (cuánto ha comprado). Aquí se llama 'activo' a quien compró en " +
      "los últimos 30 días, 'ocasional' entre 31 y 90 días y 'en riesgo' a quien lleva más de 90 días sin comprar.",
  },
  {
    id: "modelo",
    titulo: "¿Qué tan confiable es el modelo?",
    claves: ["modelo", "confiable", "precision", "efectividad", "f1", "r2", "acierta", "inteligencia artificial", "ia"],
    respuesta:
      "En 'Cómo funciona' ves la precisión, la cobertura y el F1 reales del modelo. Hoy no alcanza las metas del " +
      "proyecto porque se entrenó con datos simulados, así que conviene usarlo como apoyo y no como dato definitivo. " +
      "El número de días sin comprar es más directo.",
    ir: { etiqueta: "Ver cómo funciona", ruta: "/model" },
  },
  {
    id: "perfil",
    titulo: "¿Cómo cambio mis datos o mi contraseña?",
    claves: ["perfil", "contrasena", "clave", "password", "telefono", "nombre", "cambiar", "cuenta"],
    respuesta:
      "En Mi perfil puedes cambiar tu nombre, tu teléfono y tu contraseña, y ver tu actividad reciente.",
    ir: { etiqueta: "Ir a Mi perfil", ruta: "/profile" },
  },
  {
    id: "olvide",
    titulo: "Olvidé mi contraseña",
    claves: ["olvide", "recuperar", "restablecer", "codigo", "no puedo entrar", "no recuerdo"],
    respuesta:
      "En la pantalla de inicio de sesión toca '¿Olvidaste tu contraseña?'. Te enviamos un código de verificación " +
      "por SMS si tu cuenta tiene teléfono y, si no, a tu correo. El código vence en 10 minutos.",
  },
  {
    id: "usuarios",
    titulo: "¿Cómo creo usuarios?",
    claves: ["usuario", "usuarios", "crear usuario", "rol", "roles", "permisos", "administrador", "acceso"],
    respuesta:
      "Solo el rol Administrador ve la pantalla Usuarios, donde se crean cuentas, se asigna el rol y se desactiva " +
      "el acceso de quien ya no debe entrar.",
    ir: { etiqueta: "Ir a Usuarios", ruta: "/users" },
    soloAdmin: true,
  },
  {
    id: "texto",
    titulo: "Quiero letra más grande",
    claves: ["letra", "texto", "tamano", "grande", "leer", "accesibilidad", "zoom"],
    respuesta:
      "En la parte inferior del menú lateral están los botones A- y A+ para cambiar el tamaño del texto; el " +
      "porcentaje del medio lo restablece.",
  },
  {
    id: "datos-personales",
    titulo: "¿Qué pasa con los datos de los clientes?",
    claves: ["datos personales", "autorizacion", "privacidad", "ley 1581", "habeas", "proteccion"],
    respuesta:
      "FlowInsight solo muestra o contacta a clientes que autorizaron el uso de sus datos (Ley 1581 de 2012). Al " +
      "cargar un Excel debes confirmar que cuentas con esa autorización.",
  },
];

const SUGERIDAS = ["rfm", "reportes", "promociones", "modelo", "mapa"];

const normalizar = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function buscar(pregunta: string, esAdmin: boolean): Tema | null {
  const q = ` ${normalizar(pregunta)} `;
  let mejor: { tema: Tema; puntos: number } | null = null;
  for (const tema of TEMAS) {
    if (tema.soloAdmin && !esAdmin) continue;
    let puntos = 0;
    for (const clave of tema.claves) {
      if (q.includes(` ${clave} `) || (clave.length > 3 && q.includes(clave))) puntos += clave.includes(" ") ? 2 : 1;
    }
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { tema, puntos };
  }
  return mejor ? mejor.tema : null;
}

interface Mensaje {
  de: "yo" | "asistente";
  texto: string;
  ir?: { etiqueta: string; ruta: string };
}

export default function Asistente() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Administrador";
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      de: "asistente",
      texto:
        "Hola, soy el asistente de FlowInsight. Te explico cómo usar la aplicación: escribe tu duda o toca una " +
        "de las preguntas de abajo. (No soy una inteligencia artificial: respondo con la guía de la aplicación.)",
    },
  ]);
  const finRef = useRef<HTMLDivElement>(null);

  const sugeridas = useMemo(() => TEMAS.filter((t) => SUGERIDAS.includes(t.id)), []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  const responder = (pregunta: string, tema: Tema | null) => {
    setMensajes((prev) => [
      ...prev,
      { de: "yo", texto: pregunta },
      tema
        ? { de: "asistente", texto: tema.respuesta, ir: tema.ir }
        : {
            de: "asistente",
            texto:
              "No encontré una respuesta para eso. Puedo ayudarte con: " +
              TEMAS.filter((t) => !t.soloAdmin || esAdmin).map((t) => t.titulo).slice(0, 8).join(" · ") +
              ". Prueba con otras palabras.",
          },
    ]);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const pregunta = entrada.trim();
    if (!pregunta) return;
    setEntrada("");
    responder(pregunta, buscar(pregunta, esAdmin));
  };

  if (!usuario) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        style={{ position: "fixed", right: 20, bottom: 20, zIndex: 1000, width: 54, height: 54, borderRadius: 27,
          border: "none", background: "#534AB7", color: "#fff", fontSize: 24, cursor: "pointer",
          boxShadow: "0 6px 18px rgba(83,74,183,0.45)" }}
      >
        {abierto ? "✕" : "💬"}
      </button>

      {abierto && (
        <section
          role="dialog"
          aria-label="Asistente de ayuda"
          style={{ position: "fixed", right: 20, bottom: 86, zIndex: 1000, width: "min(380px, calc(100vw - 40px))",
            height: "min(520px, calc(100vh - 120px))", background: "#fff", borderRadius: 14,
            border: "0.5px solid #d8d8e4", boxShadow: "0 12px 36px rgba(0,0,0,0.22)", display: "flex",
            flexDirection: "column", overflow: "hidden", fontFamily: "system-ui,sans-serif" }}
        >
          <header style={{ background: "#534AB7", color: "#fff", padding: "12px 16px" }}>
            <strong style={{ fontSize: 15 }}>Asistente FlowInsight</strong>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Te explica cómo usar la aplicación</div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8,
            background: "#F7F7FB" }} aria-live="polite">
            {mensajes.map((m, i) => (
              <div key={i} style={{ alignSelf: m.de === "yo" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ background: m.de === "yo" ? "#534AB7" : "#fff", color: m.de === "yo" ? "#fff" : "#1B2430",
                  border: m.de === "yo" ? "none" : "0.5px solid #e2e2ec", borderRadius: 12, padding: "9px 12px",
                  fontSize: 13, lineHeight: 1.5 }}>
                  {m.texto}
                </div>
                {m.ir && (
                  <button
                    type="button"
                    onClick={() => { navigate(m.ir!.ruta); setAbierto(false); }}
                    style={{ marginTop: 6, background: "#fff", color: "#534AB7", border: "1px solid #534AB7",
                      borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {m.ir.etiqueta}
                  </button>
                )}
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <div style={{ padding: "8px 12px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sugeridas.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => responder(t.titulo, t)}
                style={{ background: "#EFEDFA", color: "#3C3489", border: "none", borderRadius: 999, padding: "4px 10px",
                  fontSize: 11, cursor: "pointer" }}
              >
                {t.titulo}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} style={{ display: "flex", gap: 8, padding: 12 }}>
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Escribe tu duda..."
              aria-label="Escribe tu duda"
              style={{ flex: 1, border: "0.5px solid #cfcfdc", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}
            />
            <button type="submit" style={{ background: "#534AB7", color: "#fff", border: "none", borderRadius: 8,
              padding: "0 14px", fontSize: 13, cursor: "pointer" }}>
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  );
}
