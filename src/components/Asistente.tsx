import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CircleCheck, Info, MessageCircle, Send, TriangleAlert, X } from "lucide-react";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import {
  SUGERIDAS, TEMAS, pideClientesPrioritarios, reconocerClientes, responder, responderTema,
  type ClienteBasico, type Respuesta,
} from "./asistenteMotor";

// Asistente de FlowInsight. Hace dos cosas:
//  1) Orienta sobre el uso de la aplicación, entendiendo preguntas en lenguaje sencillo (asistenteMotor.ts).
//  2) Ayuda a decidir sobre un cliente: si la pregunta menciona a uno, analiza su historial real de compras y la
//     predicción del modelo y propone qué hacer (reglas del backend: app/core/decision_cliente.py).
// No es un modelo de lenguaje generativo ni una red neuronal, y lo dice.

interface Senal { texto: string; tono: "ok" | "info" | "atencion" | "alerta" }
interface Analisis {
  id_cliente: number;
  nombre_cliente: string;
  categoria: string | null;
  dias_sin_comprar: number | null;
  prioridad: "alta" | "media" | "baja" | "no_contactar";
  titulo: string;
  recomendacion: string;
  pasos: string[];
  senales: Senal[];
  confianza: "alta" | "media" | "baja";
  aviso: string;
  puede_contactar: boolean;
}
interface Prioritario {
  id_cliente: number;
  nombre_cliente: string;
  categoria: string | null;
  dias_sin_comprar: number | null;
  prioridad: Analisis["prioridad"];
  titulo: string;
}

interface Mensaje {
  de: "yo" | "asistente";
  texto: string;
  pasos?: string[];
  ir?: { etiqueta: string; ruta: string };
  sugerencias?: { id: string; titulo: string }[];
  analisis?: Analisis;
  prioritarios?: Prioritario[];
  elegirCliente?: ClienteBasico[];
}

const PRIORIDAD: Record<Analisis["prioridad"], { chip: string; etiqueta: string }> = {
  alta: { chip: "chip chip-bad", etiqueta: "Prioridad alta" },
  media: { chip: "chip chip-warn", etiqueta: "Prioridad media" },
  baja: { chip: "chip chip-ok", etiqueta: "Prioridad baja" },
  no_contactar: { chip: "chip chip-neutral", etiqueta: "No contactar" },
};
const CATEGORIA: Record<string, string> = { activo: "Activo", ocasional: "Ocasional", en_riesgo: "En riesgo" };

const BIENVENIDA: Mensaje = {
  de: "asistente",
  texto:
    "Buen día. Soy el asistente de FlowInsight. Puedo orientarle sobre cómo usar la aplicación y ayudarle a decidir " +
    "qué hacer con un cliente: escriba, por ejemplo, \"¿qué opinas de Panadería Rojas?\" o \"¿a quién llamo primero?\". " +
    "Respondo con los datos reales de la aplicación; no soy una inteligencia artificial generativa.",
};

const chipBtn: React.CSSProperties = {
  minHeight: 36, background: "var(--c-primary-soft)", color: "var(--c-primary-hover)",
  border: "1px solid var(--c-primary-line)", borderRadius: 999, padding: "0 var(--s-3)", fontSize: 13,
  fontWeight: 600, textAlign: "left",
};

function TarjetaAnalisis({ a, onPreparar }: { a: Analisis; onPreparar: () => void }) {
  const p = PRIORIDAD[a.prioridad];
  const icono = (tono: Senal["tono"]) =>
    tono === "ok" ? <CircleCheck size={15} aria-hidden="true" style={{ color: "var(--c-ok)", flexShrink: 0, marginTop: 3 }} />
    : tono === "alerta" ? <TriangleAlert size={15} aria-hidden="true" style={{ color: "var(--c-bad)", flexShrink: 0, marginTop: 3 }} />
    : tono === "atencion" ? <TriangleAlert size={15} aria-hidden="true" style={{ color: "var(--c-warn)", flexShrink: 0, marginTop: 3 }} />
    : <Info size={15} aria-hidden="true" style={{ color: "var(--c-muted)", flexShrink: 0, marginTop: 3 }} />;
  return (
    <div style={{ marginTop: "var(--s-2)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)", alignItems: "center", marginBottom: "var(--s-2)" }}>
        <span className={p.chip}>{p.etiqueta}</span>
        {a.categoria && <span className="chip chip-neutral">{CATEGORIA[a.categoria] ?? a.categoria}</span>}
      </div>
      <p style={{ margin: "0 0 var(--s-2)", fontWeight: 700 }}>{a.titulo}</p>
      <p style={{ margin: "0 0 var(--s-3)" }}>{a.recomendacion}</p>
      <p style={{ margin: "0 0 var(--s-1)", fontWeight: 600, fontSize: 13, color: "var(--c-muted)" }}>Lo que muestran sus datos</p>
      <ul style={{ margin: "0 0 var(--s-3)", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {a.senales.map((s) => (
          <li key={s.texto} style={{ display: "flex", gap: 8, fontSize: 13 }}>
            {icono(s.tono)}<span>{s.texto}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "0 0 var(--s-1)", fontWeight: 600, fontSize: 13, color: "var(--c-muted)" }}>Qué haría</p>
      <ol style={{ margin: "0 0 var(--s-3)", paddingLeft: 20, fontSize: 13 }}>
        {a.pasos.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}
      </ol>
      <p style={{ margin: "0 0 var(--s-2)", fontSize: 12, color: "var(--c-muted)" }}>
        Confiabilidad de la lectura: {a.confianza}. {a.aviso}
      </p>
      {a.puede_contactar && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onPreparar} style={{ minHeight: 40 }}>
          Preparar mensaje para este cliente
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function Asistente() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === "Administrador";
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [ultimoTema, setUltimoTema] = useState<string | undefined>(undefined);
  const [clientes, setClientes] = useState<ClienteBasico[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([BIENVENIDA]);
  const finRef = useRef<HTMLDivElement>(null);
  const clientesCargados = useRef(false);

  const iniciales = useMemo(() => TEMAS.filter((t) => SUGERIDAS.includes(t.id)), []);
  const cabecera = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, escribiendo, abierto]);

  // Los nombres de clientes se cargan una sola vez, al abrir el asistente por primera vez
  useEffect(() => {
    if (!abierto || clientesCargados.current || !usuario) return;
    clientesCargados.current = true;
    fetch(`${API_URL}/asistente/clientes`, { headers: cabecera() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ClienteBasico[]) => setClientes(d))
      .catch(() => { clientesCargados.current = false; });
  }, [abierto, usuario]);

  const agregar = (m: Mensaje) => setMensajes((prev) => [...prev, m]);

  const analizarCliente = async (c: ClienteBasico) => {
    try {
      const r = await fetch(`${API_URL}/asistente/cliente/${c.id_cliente}`, { headers: cabecera() });
      if (!r.ok) throw new Error();
      const a: Analisis = await r.json();
      agregar({ de: "asistente", texto: `Esto es lo que veo sobre ${a.nombre_cliente}:`, analisis: a });
      setUltimoTema(undefined);
    } catch {
      agregar({ de: "asistente", texto: "No pude consultar los datos de ese cliente en este momento. Intente de nuevo en unos segundos." });
    }
  };

  const mostrarPrioritarios = async () => {
    try {
      const r = await fetch(`${API_URL}/asistente/prioridades?limite=5`, { headers: cabecera() });
      if (!r.ok) throw new Error();
      const lista: Prioritario[] = await r.json();
      agregar({
        de: "asistente",
        texto: lista.length
          ? "Estos son los clientes que contactaría primero, ordenados por urgencia y por lo que compran. " +
            "Toque uno para ver el análisis completo."
          : "No encontré clientes con historial para priorizar.",
        prioritarios: lista,
      });
    } catch {
      agregar({ de: "asistente", texto: "No pude consultar las prioridades en este momento. Intente de nuevo en unos segundos." });
    }
  };

  const contestar = async (pregunta: string, accion: () => Promise<void> | void) => {
    agregar({ de: "yo", texto: pregunta });
    setEscribiendo(true);
    await new Promise((res) => setTimeout(res, 450)); // pausa breve: da tiempo de leer y se siente conversación
    await accion();
    setEscribiendo(false);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const pregunta = entrada.trim();
    if (!pregunta || escribiendo) return;
    setEntrada("");
    contestar(pregunta, async () => {
      const candidatos = reconocerClientes(pregunta, clientes);
      if (candidatos.length === 1) return analizarCliente(candidatos[0]);
      if (candidatos.length > 1) {
        return agregar({
          de: "asistente",
          texto: "Encontré más de un cliente con ese nombre. ¿A cuál se refiere?",
          elegirCliente: candidatos,
        });
      }
      if (pideClientesPrioritarios(pregunta)) return mostrarPrioritarios();
      const r: Respuesta = responder(pregunta, esAdmin, ultimoTema);
      if (r.temaId) setUltimoTema(r.temaId);
      agregar({ de: "asistente", ...r });
    });
  };

  const elegirTema = (id: string, titulo: string) => {
    if (escribiendo) return;
    const tema = TEMAS.find((t) => t.id === id);
    if (!tema) return;
    contestar(titulo, () => {
      const r = responderTema(tema, true, esAdmin);
      setUltimoTema(tema.id);
      agregar({ de: "asistente", ...r });
    });
  };

  const elegirClienteAnalisis = (c: ClienteBasico) => {
    if (escribiendo) return;
    contestar(`¿Qué opina de ${c.nombre_cliente}?`, () => analizarCliente(c));
  };

  const irAPromociones = (id: number) => {
    navigate(`/promotions?cliente=${id}`);
    setAbierto(false);
  };

  if (!usuario) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente de ayuda"}
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 90, width: 56, height: 56, borderRadius: "50%",
          border: "none", background: "var(--c-primary)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-2)" }}
      >
        {abierto ? <X size={24} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}
      </button>

      {abierto && (
        <section
          role="dialog"
          aria-label="Asistente de FlowInsight"
          onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}
          style={{ position: "fixed", right: 16, bottom: 88, zIndex: 90, width: "min(420px, calc(100vw - 32px))",
            height: "min(600px, calc(100vh - 112px))", background: "var(--c-surface)", borderRadius: "var(--r-lg)",
            border: "1px solid var(--c-line-strong)", boxShadow: "var(--shadow-2)", display: "flex",
            flexDirection: "column", overflow: "hidden", fontFamily: "var(--font)" }}
        >
          <header style={{ background: "var(--c-primary)", color: "#fff", padding: "var(--s-3) var(--s-4)" }}>
            <strong style={{ fontSize: 16 }}>Asistente de FlowInsight</strong>
            <div style={{ fontSize: 13, color: "var(--c-primary-soft)" }}>
              Orienta sobre la aplicación y apoya decisiones sobre clientes
            </div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: "var(--s-3)", display: "flex", flexDirection: "column",
            gap: "var(--s-3)", background: "var(--c-bg)" }} aria-live="polite">
            {mensajes.map((m, i) => (
              <div key={i} style={{ alignSelf: m.de === "yo" ? "flex-end" : "flex-start", maxWidth: "94%" }}>
                <div style={{ background: m.de === "yo" ? "var(--c-primary)" : "var(--c-surface)",
                  color: m.de === "yo" ? "#fff" : "var(--c-ink)",
                  border: m.de === "yo" ? "1px solid var(--c-primary)" : "1px solid var(--c-line)",
                  borderRadius: "var(--r-md)", padding: "var(--s-2) var(--s-3)", fontSize: 14, lineHeight: 1.55,
                  whiteSpace: "pre-line" }}>
                  {m.texto}
                  {m.pasos && (
                    <ol style={{ margin: "var(--s-2) 0 0", paddingLeft: 20 }}>
                      {m.pasos.map((p) => <li key={p} style={{ marginBottom: 4 }}>{p}</li>)}
                    </ol>
                  )}
                  {m.analisis && (
                    <div style={{ whiteSpace: "normal" }}>
                      <TarjetaAnalisis a={m.analisis} onPreparar={() => irAPromociones(m.analisis!.id_cliente)} />
                    </div>
                  )}
                </div>
                {m.ir && (
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={() => { navigate(m.ir!.ruta); setAbierto(false); }}
                    style={{ marginTop: "var(--s-2)", minHeight: 40 }}>
                    {m.ir.etiqueta}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                )}
                {(m.prioritarios || m.elegirCliente) && (
                  <div style={{ marginTop: "var(--s-2)", display: "grid", gap: "var(--s-2)" }}>
                    {(m.prioritarios ?? m.elegirCliente!.map((c) => ({
                      id_cliente: c.id_cliente, nombre_cliente: c.nombre_cliente, categoria: null,
                      dias_sin_comprar: null, prioridad: "media" as const, titulo: "",
                    }))).map((c) => (
                      <button key={c.id_cliente} type="button" onClick={() => elegirClienteAnalisis(c)}
                        style={{ ...chipBtn, borderRadius: "var(--r-md)", padding: "var(--s-2) var(--s-3)", width: "100%" }}>
                        <span style={{ display: "block" }}>{c.nombre_cliente}</span>
                        {c.dias_sin_comprar !== null && (
                          <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--c-muted)" }}>
                            {CATEGORIA[c.categoria ?? ""] ?? ""} · {c.dias_sin_comprar} días sin comprar · {PRIORIDAD[c.prioridad].etiqueta.toLowerCase()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {m.sugerencias && m.sugerencias.length > 0 && (
                  <div style={{ marginTop: "var(--s-2)", display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
                    {m.sugerencias.map((s) => (
                      <button key={s.id} type="button" onClick={() => elegirTema(s.id, s.titulo)} style={chipBtn}>
                        {s.titulo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {escribiendo && (
              <div role="status" style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--c-muted)",
                padding: "var(--s-1) var(--s-3)" }}>
                Analizando…
              </div>
            )}
            <div ref={finRef} />
          </div>

          {mensajes.length === 1 && (
            <div style={{ padding: "var(--s-2) var(--s-3) 0", display: "flex", gap: "var(--s-2)", overflowX: "auto" }}>
              <button type="button" onClick={() => contestar("¿A quién llamo primero?", mostrarPrioritarios)}
                style={{ ...chipBtn, flexShrink: 0, minHeight: 40, whiteSpace: "nowrap" }}>
                ¿A quién llamo primero?
              </button>
              {iniciales.map((t) => (
                <button key={t.id} type="button" onClick={() => elegirTema(t.id, t.titulo)}
                  style={{ ...chipBtn, flexShrink: 0, minHeight: 40, whiteSpace: "nowrap" }}>
                  {t.titulo}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={enviar} style={{ display: "flex", gap: "var(--s-2)", padding: "var(--s-3)" }}>
            <input
              className="input"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pregunte o nombre un cliente…"
              aria-label="Escriba su pregunta o el nombre de un cliente"
              autoComplete="off"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="submit" className="btn btn-primary" disabled={escribiendo} style={{ flexShrink: 0 }}>
              <Send size={16} aria-hidden="true" />
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  );
}
