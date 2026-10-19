import { API_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import { Box, CircleHelp, Clock, Package, RefreshCw, Table2, Users } from "lucide-react";
import Sidebar from "../components/Sidebar";

interface Celda {
  producto: string;
  mes: string;
  segmento: string;
  ingresos: number;
  cantidad: number;
}

interface CuboData {
  productos: string[];
  meses: string[];
  segmentos: string[];
  celdas: Celda[];
}


// Colores de la paleta (design.css): ok, acento y error. En el cubo 3D se usan en hex.
const COLOR_SEGMENTO: Record<string, string> = {
  activo: "#0f6e56",
  ocasional: "#e8a33d",
  en_riesgo: "#a33a1e",
};

// Color de cada eje (se repite en las etiquetas de la escena y en las píldoras).
const COLOR_EJE = { tiempo: "#1f5fd1", producto: "#1e40af", segmento: "#3d4654" };

const LABEL_SEGMENTO: Record<string, string> = {
  activo: "Activo",
  ocasional: "Ocasional",
  en_riesgo: "En riesgo",
};

const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const EXTENSION_OBJETIVO = 4.6;
const RELLENO_CELDA = 0.96;
const COLOR_VACIO = "#d3d7e0";

function aclararColor(hex: string, factor: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mezclar = (canal: number) => Math.round(canal + (255 - canal) * factor);
  return `rgb(${mezclar(r)}, ${mezclar(g)}, ${mezclar(b)})`;
}

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dosDigitos = (n: number) => String(n).padStart(2, "0");

interface CeldaGrid {
  x: number;
  y: number;
  z: number;
  producto: string;
  mes: string;
  segmento: string;
  ingresos: number;
  cantidad: number;
  vacio: boolean;
}

function Cubelet({
  celda,
  tamano,
  intensidad,
  hover,
  setHover,
}: {
  celda: CeldaGrid;
  tamano: [number, number, number];
  intensidad: number;
  hover: CeldaGrid | null;
  setHover: (c: CeldaGrid | null) => void;
}) {
  const activo = hover === celda;
  // La intensidad de venta se ve en el tono del color (mas palido = menos
  // venta), no en la transparencia, para que el bloque se vea solido.
  const color = celda.vacio ? COLOR_VACIO : aclararColor(COLOR_SEGMENTO[celda.segmento], 0.55 - intensidad * 0.5);
  const opacidad = celda.vacio ? 0.55 : 1;

  return (
    <mesh
      position={[celda.x, celda.y, celda.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!celda.vacio) setHover(celda);
      }}
      onPointerOut={() => setHover(null)}
    >
      <boxGeometry args={tamano} />
      <meshStandardMaterial
        color={activo ? COLOR_SEGMENTO[celda.segmento] : color}
        transparent
        opacity={opacidad}
        roughness={0.45}
        metalness={0.05}
        emissive={activo ? COLOR_SEGMENTO[celda.segmento] : "#000000"}
        emissiveIntensity={activo ? 0.5 : 0}
      />
      {activo && (
        <Html position={[0, tamano[1], 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-line-strong)", borderRadius: 8, padding: "6px 10px",
            fontSize: 12, whiteSpace: "nowrap", boxShadow: "var(--shadow-2)", color: "var(--c-ink)",
            fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums" }}>
            <strong>{celda.producto}</strong>
            <br />
            {celda.mes} · {LABEL_SEGMENTO[celda.segmento]}
            <br />
            {formatoCOP.format(celda.ingresos)} ({celda.cantidad} u.)
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Escena({
  productos,
  mesesDelAnio,
  segmentosActivos,
  mapaValores,
  hover,
  setHover,
}: {
  productos: string[];
  mesesDelAnio: string[];
  segmentosActivos: string[];
  mapaValores: Map<string, { ingresos: number; cantidad: number }>;
  hover: CeldaGrid | null;
  setHover: (c: CeldaGrid | null) => void;
}) {
  const nx = productos.length;
  const ny = mesesDelAnio.length;
  const nz = segmentosActivos.length;

  // Pitch independiente por eje: la cantidad de divisiones real no es
  // igual en los 3 ejes (12 productos x 12 meses x 3 segmentos), pero
  // escalando cada eje a la misma extension total el bloque resultante
  // se ve como un cubo en vez de una lamina plana.
  const pitchX = EXTENSION_OBJETIVO / Math.max(nx - 1, 1);
  const pitchY = EXTENSION_OBJETIVO / Math.max(ny - 1, 1);
  const pitchZ = EXTENSION_OBJETIVO / Math.max(nz - 1, 1);

  const offX = ((nx - 1) * pitchX) / 2;
  const offY = ((ny - 1) * pitchY) / 2;
  const offZ = ((nz - 1) * pitchZ) / 2;

  const tamanoCelda: [number, number, number] = [
    pitchX * RELLENO_CELDA,
    pitchY * RELLENO_CELDA,
    pitchZ * RELLENO_CELDA,
  ];

  const celdas: CeldaGrid[] = useMemo(() => {
    const lista: CeldaGrid[] = [];
    productos.forEach((producto, xi) => {
      mesesDelAnio.forEach((mes, yi) => {
        segmentosActivos.forEach((segmento, zi) => {
          const valor = mapaValores.get(`${producto}|${mes}|${segmento}`);
          lista.push({
            x: xi * pitchX - offX,
            y: yi * pitchY - offY,
            z: zi * pitchZ - offZ,
            producto,
            mes,
            segmento,
            ingresos: valor?.ingresos ?? 0,
            cantidad: valor?.cantidad ?? 0,
            vacio: !valor,
          });
        });
      });
    });
    return lista;
  }, [productos, mesesDelAnio, segmentosActivos, mapaValores, offX, offY, offZ, pitchX, pitchY, pitchZ]);

  const maxIngresos = Math.max(1, ...celdas.map((c) => c.ingresos));

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <directionalLight position={[-10, -5, -10]} intensity={0.35} />

      {/* Ticks numerados eje Producto (X) */}
      {productos.map((_, i) => (
        <Text key={`px-${i}`} position={[i * pitchX - offX, -offY - 0.7, -offZ - 0.7]}
          fontSize={0.24} color={COLOR_EJE.producto} anchorX="center" anchorY="middle">
          {dosDigitos(i + 1)}
        </Text>
      ))}

      {/* Ticks numerados eje Segmento (Z) */}
      {segmentosActivos.map((_, i) => (
        <Text key={`sz-${i}`} position={[-offX - 0.7, -offY - 0.7, i * pitchZ - offZ]}
          fontSize={0.24} color={COLOR_EJE.segmento} anchorX="center" anchorY="middle">
          {dosDigitos(i + 1)}
        </Text>
      ))}

      {/* Ticks de mes eje Tiempo (Y) */}
      {mesesDelAnio.map((m, i) => (
        <Text key={`ym-${i}`} position={[-offX - 0.7, i * pitchY - offY, -offZ - 0.7]}
          fontSize={0.22} color={COLOR_EJE.tiempo} anchorX="right" anchorY="middle">
          {NOMBRES_MESES[Number(m.split("-")[1]) - 1]}
        </Text>
      ))}

      {celdas.map((c) => (
        <Cubelet
          key={`${c.producto}-${c.mes}-${c.segmento}`}
          celda={c}
          tamano={tamanoCelda}
          intensidad={c.ingresos / maxIngresos}
          hover={hover}
          setHover={setHover}
        />
      ))}

      <OrbitControls enableDamping dampingFactor={0.1} minDistance={4} maxDistance={40} />
    </>
  );
}

function PillEje({ color, icono, texto, style }: { color: string; icono: React.ReactNode; texto: string; style: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(50% - 20px)", ...style }}>
      <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-1)", flexShrink: 0 }}>
        {icono}
      </div>
      <span style={{ background: color, color: "#fff", fontSize: 12, fontWeight: 600, lineHeight: 1.3,
        padding: "6px 12px", borderRadius: 16, boxShadow: "var(--shadow-1)" }}>
        {texto}
      </span>
    </div>
  );
}

const compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-CO");

type Medida = "ingresos" | "cantidad";

// Escala de la tabla de calor en 6 pasos de azul. Cada paso tiene un texto (oscuro o blanco)
// con contraste de al menos 4.5:1; por eso la escala es escalonada y no continua.
const NIVELES_CALOR = [
  { hasta: 0.1, t: 0.12, claro: true },
  { hasta: 0.25, t: 0.3, claro: true },
  { hasta: 0.45, t: 0.5, claro: true },
  { hasta: 0.65, t: 0.65, claro: true },
  { hasta: 0.85, t: 0.88, claro: false },
  { hasta: Infinity, t: 1, claro: false },
];
const mezclaAzul = (t: number) =>
  `rgb(${Math.round(255 - (255 - 30) * t)}, ${Math.round(255 - (255 - 64) * t)}, ${Math.round(255 - (255 - 175) * t)})`;
const nivelCalor = (ratio: number) => NIVELES_CALOR.find((n) => ratio <= n.hasta) ?? NIVELES_CALOR[NIVELES_CALOR.length - 1];

function TablaCalor({
  productos, meses, mapaValores, segmentos, medida, seleccion, setSeleccion,
}: {
  productos: string[];
  meses: string[];
  mapaValores: Map<string, { ingresos: number; cantidad: number }>;
  segmentos: string[];
  medida: Medida;
  seleccion: { producto: string; mes: string } | null;
  setSeleccion: (s: { producto: string; mes: string } | null) => void;
}) {
  const valor = (producto: string, mes: string) =>
    segmentos.reduce((acc, seg) => acc + (mapaValores.get(`${producto}|${mes}|${seg}`)?.[medida] ?? 0), 0);

  const maximo = Math.max(1, ...productos.flatMap((p) => meses.map((m) => valor(p, m))));
  const formato = (v: number) => (v === 0 ? "—" : medida === "ingresos" ? `$ ${compacto.format(v)}` : entero.format(v));
  const th: React.CSSProperties = { padding: "8px 6px", fontSize: 12, fontWeight: 700, color: "var(--c-muted)",
    textAlign: "center", textTransform: "uppercase", letterSpacing: "0.03em" };

  return (
    <div className="table-scroll">
      <table style={{ borderCollapse: "separate", borderSpacing: 3, width: "100%", minWidth: 880, fontVariantNumeric: "tabular-nums" }}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Tabla de calor: {medida === "ingresos" ? "ingresos" : "unidades vendidas"} por producto y mes
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: "var(--c-surface)", zIndex: 1 }}>Producto</th>
            {meses.map((m) => (
              <th key={m} scope="col" style={th}>{NOMBRES_MESES[Number(m.split("-")[1]) - 1]}</th>
            ))}
            <th scope="col" style={th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => {
            const total = meses.reduce((acc, m) => acc + valor(p, m), 0);
            return (
              <tr key={p}>
                <th scope="row" style={{ padding: "6px 10px 6px 0", fontSize: 13, fontWeight: 600, color: "var(--c-ink)",
                  whiteSpace: "nowrap", textAlign: "left", position: "sticky", left: 0, background: "var(--c-surface)", zIndex: 1 }}>
                  {p}
                </th>
                {meses.map((m) => {
                  const v = valor(p, m);
                  const elegido = seleccion?.producto === p && seleccion.mes === m;
                  const nivel = nivelCalor(v / maximo);
                  return (
                    <td key={m} style={{ padding: 0 }}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(elegido ? null : { producto: p, mes: m })}
                        aria-label={`${p}, ${m}: ${formato(v)}`}
                        aria-pressed={elegido}
                        style={{
                          width: "100%", minWidth: 58, minHeight: 40, whiteSpace: "nowrap", border: elegido ? "2px solid var(--c-ink)" : "2px solid transparent",
                          borderRadius: 6, cursor: v ? "pointer" : "default", fontSize: 12, fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          background: v ? mezclaAzul(nivel.t) : "var(--c-bg)",
                          color: v ? (nivel.claro ? "var(--c-ink)" : "#fff") : "var(--c-muted)",
                        }}
                      >
                        {formato(v)}
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "6px 6px", fontSize: 13, fontWeight: 700, textAlign: "center", color: "var(--c-ink)" }}>
                  {formato(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const PUNTO_SEG = (seg: string): React.CSSProperties => ({
  display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: COLOR_SEGMENTO[seg], flexShrink: 0,
});

export default function OlapCube() {
  const [datos, setDatos] = useState<CuboData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string | null>(null);
  const [segmentosVisibles, setSegmentosVisibles] = useState<Record<string, boolean>>({
    activo: true,
    ocasional: true,
    en_riesgo: true,
  });
  const [hover, setHover] = useState<CeldaGrid | null>(null);
  const [vista, setVista] = useState<"tabla" | "cubo3d">("tabla");
  const [medida, setMedida] = useState<Medida>("ingresos");
  const [seleccion, setSeleccion] = useState<{ producto: string; mes: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/olap/cubo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el cubo OLAP");
        return res.json();
      })
      .then((data: CuboData) => {
        setDatos(data);
        const anios = Array.from(new Set(data.meses.map((m) => m.split("-")[0]))).sort();
        setAnioSeleccionado(anios[anios.length - 1] ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const anios = useMemo(() => {
    if (!datos) return [];
    return Array.from(new Set(datos.meses.map((m) => m.split("-")[0]))).sort();
  }, [datos]);

  const mesesDelAnio = useMemo(() => {
    if (!datos || !anioSeleccionado) return [];
    return datos.meses.filter((m) => m.startsWith(anioSeleccionado));
  }, [datos, anioSeleccionado]);

  const segmentosActivos = useMemo(() => {
    if (!datos) return [];
    return datos.segmentos.filter((s) => segmentosVisibles[s]);
  }, [datos, segmentosVisibles]);

  const mapaValores = useMemo(() => {
    const mapa = new Map<string, { ingresos: number; cantidad: number }>();
    if (!datos || !anioSeleccionado) return mapa;
    for (const c of datos.celdas) {
      if (!c.mes.startsWith(anioSeleccionado)) continue;
      mapa.set(`${c.producto}|${c.mes}|${c.segmento}`, { ingresos: c.ingresos, cantidad: c.cantidad });
    }
    return mapa;
  }, [datos, anioSeleccionado]);

  const toggleSegmento = (seg: string) => {
    setSegmentosVisibles((prev) => ({ ...prev, [seg]: !prev[seg] }));
  };

  // Lectura automatica del cubo: todo sale de los mismos datos que se dibujan, no hay cifras aparte.
  const resumen = useMemo(() => {
    if (!datos || mesesDelAnio.length === 0) return null;
    const suma = (filtro: (c: Celda) => boolean) =>
      datos.celdas.filter((c) => c.mes.startsWith(anioSeleccionado ?? "") && filtro(c))
        .reduce((acc, c) => acc + c[medida], 0);
    const visibles = (c: Celda) => segmentosVisibles[c.segmento];
    const total = suma(visibles);
    const porProducto = datos.productos.map((p) => ({ nombre: p, v: suma((c) => visibles(c) && c.producto === p) }));
    const porMes = mesesDelAnio.map((m) => ({ nombre: m, v: suma((c) => visibles(c) && c.mes === m) }));
    const porSegmento = datos.segmentos.map((sg) => ({ nombre: sg, v: suma((c) => c.segmento === sg) }));
    const mayor = (l: { nombre: string; v: number }[]) => [...l].sort((a, b) => b.v - a.v)[0];
    const mesesConVenta = porMes.filter((m) => m.v > 0);
    const menor = [...mesesConVenta].sort((a, b) => a.v - b.v)[0];
    return { total, producto: mayor(porProducto), mes: mayor(porMes), mesFlojo: menor, segmento: mayor(porSegmento) };
  }, [datos, anioSeleccionado, mesesDelAnio, medida, segmentosVisibles]);

  const nombreMes = (m: string) => NOMBRES_MESES[Number(m.split("-")[1]) - 1];
  const fmt = (v: number) => (medida === "ingresos" ? formatoCOP.format(v) : `${entero.format(v)} unidades`);
  const pct = (v: number, total: number) => (total > 0 ? `${Math.round((v / total) * 100)} %` : "0 %");

  const detalleSeleccion = useMemo(() => {
    if (!seleccion) return null;
    return (datos?.segmentos ?? []).map((sg) => {
      const c = mapaValores.get(`${seleccion.producto}|${seleccion.mes}|${sg}`);
      return { segmento: sg, ingresos: c?.ingresos ?? 0, cantidad: c?.cantidad ?? 0 };
    });
  }, [seleccion, datos, mapaValores]);

  const botonPestana = (v: "tabla" | "cubo3d", texto: string, icono: React.ReactNode) => (
    <button
      key={v}
      type="button"
      className={`btn${vista === v ? " btn-primary" : ""}`}
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
    >
      {icono}
      {texto}
    </button>
  );

  const sinDatos = !!datos && (datos.productos.length === 0 || datos.celdas.length === 0);
  const kpisResumen: [string, string][] = resumen && resumen.total > 0
    ? [
        ["Total del año", fmt(resumen.total)],
        ["Producto líder", `${resumen.producto.nombre} (${pct(resumen.producto.v, resumen.total)})`],
        ["Mejor mes", `${nombreMes(resumen.mes.nombre)} (${fmt(resumen.mes.v)})`],
        ["Mes más flojo", resumen.mesFlojo ? `${nombreMes(resumen.mesFlojo.nombre)} (${fmt(resumen.mesFlojo.v)})` : "—"],
        ["Cliente que más aporta", `${LABEL_SEGMENTO[resumen.segmento.nombre]} (${pct(resumen.segmento.v, resumen.total)})`],
      ]
    : [];

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Cubo OLAP: ventas por producto, mes y tipo de cliente</h1>
            <p>Cruza qué se vende, cuándo y a qué tipo de cliente, para ver dónde está el negocio</p>
          </div>

          {anios.length > 0 && (
            <div role="group" aria-label="Año" style={{ display: "flex", gap: "var(--s-2)", alignItems: "center" }}>
              {anios.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`btn${anioSeleccionado === a ? " btn-primary" : ""}`}
                  aria-pressed={anioSeleccionado === a}
                  onClick={() => setAnioSeleccionado(a)}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="page-body" style={{ gap: "var(--s-4)" }}>
          {error ? (
            <div className="notice notice-bad" role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 240px" }}>{error}. Revisa tu conexión e inténtalo de nuevo.</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => window.location.reload()}>
                <RefreshCw size={14} aria-hidden="true" /> Reintentar
              </button>
            </div>
          ) : (
            <>
              <details className="card" style={{ padding: "var(--s-2) var(--s-4)" }}>
                <summary style={{ cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", gap: "var(--s-2)",
                  fontSize: 14, fontWeight: 600 }}>
                  <CircleHelp size={18} aria-hidden="true" style={{ color: "var(--c-primary)" }} />
                  ¿Qué es este cubo y cómo se lee?
                </summary>
                <div style={{ padding: "var(--s-2) 0 var(--s-3)", fontSize: 14, color: "var(--c-ink-2)", lineHeight: 1.65 }}>
                  <p style={{ margin: "0 0 var(--s-2)" }}>
                    Un cubo OLAP es una forma de ordenar las ventas en tres ejes para poder cruzarlos rápido:
                    <strong> producto</strong> (qué se vende), <strong>tiempo</strong> (en qué mes) y
                    <strong> tipo de cliente</strong> (activo, ocasional o en riesgo, según cuánto lleva sin comprar).
                    Cada casilla guarda lo vendido en la combinación de los tres.
                  </p>
                  <p style={{ margin: "0 0 var(--s-2)" }}>
                    En la tabla de calor, cada fila es un producto y cada columna un mes: entre más oscuro el
                    morado, más se vendió. Toca una casilla para ver cómo se reparte entre los tipos de cliente.
                  </p>
                  <p style={{ margin: 0 }}>
                    Con los filtros haces las operaciones típicas de un cubo: elegir un <em>año</em> o un
                    <em> tipo de cliente</em> (cortar), cambiar entre <em>ingresos</em> y <em>unidades</em>, o tocar
                    una casilla para bajar al detalle. La vista 3D muestra los mismos datos como un bloque.
                  </p>
                </div>
              </details>

              {kpisResumen.length > 0 && (
                <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "var(--s-4)" }}>
                  {kpisResumen.map(([titulo, valor]) => (
                    <div key={titulo} className="kpi">
                      <p className="kpi-label">{titulo}</p>
                      <p className="kpi-value" style={{ fontSize: 20, lineHeight: 1.3, overflowWrap: "anywhere" }}>{valor}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="card" style={{ padding: "var(--s-4)", display: "flex", gap: "var(--s-5)", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <span className="field-label" id="olap-vista-etq">Vista</span>
                  <div role="group" aria-labelledby="olap-vista-etq" style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
                    {botonPestana("tabla", "Tabla de calor", <Table2 size={16} aria-hidden="true" />)}
                    {botonPestana("cubo3d", "Cubo 3D", <Box size={16} aria-hidden="true" />)}
                  </div>
                </div>

                <div style={{ minWidth: "min(100%, 200px)" }}>
                  <label className="field-label" htmlFor="olap-medida">Medir en</label>
                  <select id="olap-medida" className="input" value={medida} onChange={(e) => setMedida(e.target.value as Medida)}>
                    <option value="ingresos">Ingresos ($)</option>
                    <option value="cantidad">Unidades vendidas</option>
                  </select>
                </div>

                <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
                  <legend className="field-label" style={{ padding: 0 }}>Tipo de cliente (segmento RFM, según recencia)</legend>
                  <div style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap" }}>
                    {Object.keys(COLOR_SEGMENTO).map((seg) => (
                      <label key={seg} style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", fontSize: 14,
                        minHeight: 40, cursor: "pointer", color: "var(--c-ink)" }}>
                        <input type="checkbox" checked={segmentosVisibles[seg]} onChange={() => toggleSegmento(seg)}
                          style={{ width: 18, height: 18, accentColor: "var(--c-primary)", margin: 0 }} />
                        <span aria-hidden="true" style={PUNTO_SEG(seg)} />
                        {LABEL_SEGMENTO[seg]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {loading && (
                <div className="card" role="status" style={{ color: "var(--c-muted)", fontSize: 14 }}>
                  Cargando cubo OLAP…
                </div>
              )}

              {sinDatos && (
                <div className="notice" role="status">
                  Todavía no hay ventas cargadas para armar el cubo. Carga un archivo de Excel desde “Cargar Excel” para verlo aquí.
                </div>
              )}

              {datos && !sinDatos && segmentosActivos.length === 0 && (
                <div className="notice notice-warn" role="status">
                  Activa al menos un tipo de cliente para ver las ventas.
                </div>
              )}

              {vista === "tabla" && datos && !sinDatos && anioSeleccionado && (
                <div className="card" style={{ padding: "var(--s-4)" }}>
                  <TablaCalor
                    productos={datos.productos}
                    meses={mesesDelAnio}
                    mapaValores={mapaValores}
                    segmentos={segmentosActivos}
                    medida={medida}
                    seleccion={seleccion}
                    setSeleccion={setSeleccion}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", flexWrap: "wrap", marginTop: "var(--s-3)",
                    fontSize: 12, color: "var(--c-muted)" }}>
                    <span>Menos</span>
                    {NIVELES_CALOR.map((n) => (
                      <span key={n.t} aria-hidden="true" style={{ width: 24, height: 12, borderRadius: 3, background: mezclaAzul(n.t) }} />
                    ))}
                    <span>Más {medida === "ingresos" ? "ingresos" : "unidades"}</span>
                  </div>
                  {detalleSeleccion && seleccion && (
                    <div role="status" style={{ marginTop: "var(--s-4)", padding: "var(--s-3) var(--s-4)", background: "var(--c-primary-soft)",
                      border: "1px solid var(--c-primary-line)", borderRadius: "var(--r-sm)", fontSize: 14, color: "var(--c-ink)" }}>
                      <strong>{seleccion.producto}</strong> en {nombreMes(seleccion.mes)} — por tipo de cliente:
                      <ul style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap", margin: "var(--s-2) 0 0", padding: 0,
                        listStyle: "none", fontVariantNumeric: "tabular-nums" }}>
                        {detalleSeleccion.map((d) => (
                          <li key={d.segmento} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-ink-2)" }}>
                            <span aria-hidden="true" style={PUNTO_SEG(d.segmento)} />
                            {LABEL_SEGMENTO[d.segmento]}: {formatoCOP.format(d.ingresos)} ({entero.format(d.cantidad)} u.)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {vista === "cubo3d" && datos && !sinDatos && anioSeleccionado && (
                <div
                  role="group"
                  aria-label="Cubo 3D de ventas. Los mismos datos están disponibles en la tabla de calor."
                  className="card"
                  style={{ position: "relative", padding: 0, height: "clamp(420px, 72vh, 600px)", overflow: "hidden", isolation: "isolate" }}
                >
                  <Canvas camera={{ position: [9, 8.5, 10], fov: 45 }}>
                    <color attach="background" args={["#f6f7fb"]} />
                    <Escena
                      productos={datos.productos}
                      mesesDelAnio={mesesDelAnio}
                      segmentosActivos={segmentosActivos}
                      mapaValores={mapaValores}
                      hover={hover}
                      setHover={setHover}
                    />
                  </Canvas>

                  <PillEje color={COLOR_EJE.tiempo} icono={<Clock size={16} />} texto={`Tiempo (${anioSeleccionado})`}
                    style={{ top: 16, left: 16 }} />
                  <PillEje color={COLOR_EJE.producto} icono={<Package size={16} />} texto={`Producto (01-${dosDigitos(datos.productos.length)})`}
                    style={{ bottom: 16, left: 16 }} />
                  <PillEje color={COLOR_EJE.segmento} icono={<Users size={16} />} texto="Segmento RFM"
                    style={{ bottom: 16, right: 16, flexDirection: "row-reverse" }} />
                </div>
              )}

              {datos && !sinDatos && vista === "cubo3d" && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--c-muted)", lineHeight: 1.6 }}>
                  Arrastra para rotar y usa la rueda para acercar.{" "}
                  Cada celda es un cubo del OLAP; las apagadas no tuvieron ventas. Intensidad de color = ingresos.{" "}
                  {datos.productos.map((p, i) => `${dosDigitos(i + 1)}=${p}`).join(" · ")}
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
