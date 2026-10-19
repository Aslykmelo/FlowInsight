import { API_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
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


const COLOR_SEGMENTO: Record<string, string> = {
  activo: "#1D9E75",
  ocasional: "#EF9F27",
  en_riesgo: "#E24B4A",
};

const LABEL_SEGMENTO: Record<string, string> = {
  activo: "Activo",
  ocasional: "Ocasional",
  en_riesgo: "En riesgo",
};

const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const EXTENSION_OBJETIVO = 4.6;
const RELLENO_CELDA = 0.96;
const COLOR_VACIO = "#c7c7d6";

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
          <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 8, padding: "6px 10px",
            fontSize: 11, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.18)", color: "#333" }}>
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
          fontSize={0.24} color="#1D9E75" anchorX="center" anchorY="middle">
          {dosDigitos(i + 1)}
        </Text>
      ))}

      {/* Ticks numerados eje Segmento (Z) */}
      {segmentosActivos.map((_, i) => (
        <Text key={`sz-${i}`} position={[-offX - 0.7, -offY - 0.7, i * pitchZ - offZ]}
          fontSize={0.24} color="#534AB7" anchorX="center" anchorY="middle">
          {dosDigitos(i + 1)}
        </Text>
      ))}

      {/* Ticks de mes eje Tiempo (Y) */}
      {mesesDelAnio.map((m, i) => (
        <Text key={`ym-${i}`} position={[-offX - 0.7, i * pitchY - offY, -offZ - 0.7]}
          fontSize={0.22} color="#2F6FED" anchorX="right" anchorY="middle">
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

function PillEje({ color, icono, texto, style }: { color: string; icono: string; texto: string; style: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 8, ...style }}>
      <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)", flexShrink: 0 }}>
        {icono}
      </div>
      <span style={{ background: color, color: "#fff", fontSize: 12, fontWeight: 500,
        padding: "6px 14px", borderRadius: 999, boxShadow: "0 4px 10px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}>
        {texto}
      </span>
    </div>
  );
}

const compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat("es-CO");

type Medida = "ingresos" | "cantidad";

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
  const th = { padding: "8px 10px", fontSize: 12, fontWeight: 500, color: "#555", textAlign: "center" as const };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 3, width: "100%", minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>Producto</th>
            {meses.map((m) => (
              <th key={m} style={th}>{NOMBRES_MESES[Number(m.split("-")[1]) - 1]}</th>
            ))}
            <th style={th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => {
            const total = meses.reduce((acc, m) => acc + valor(p, m), 0);
            return (
              <tr key={p}>
                <td style={{ padding: "6px 10px", fontSize: 12, color: "#333", whiteSpace: "nowrap" }}>{p}</td>
                {meses.map((m) => {
                  const v = valor(p, m);
                  const elegido = seleccion?.producto === p && seleccion.mes === m;
                  return (
                    <td key={m} style={{ padding: 0 }}>
                      <button
                        type="button"
                        onClick={() => setSeleccion(elegido ? null : { producto: p, mes: m })}
                        aria-label={`${p}, ${m}: ${formato(v)}`}
                        style={{
                          width: "100%", height: 34, border: elegido ? "2px solid #1B2430" : "none", borderRadius: 6,
                          cursor: v ? "pointer" : "default", fontSize: 11,
                          background: v ? `rgba(83,74,183,${0.1 + (v / maximo) * 0.85})` : "#f3f3f7",
                          color: v / maximo > 0.5 ? "#fff" : "#333",
                        }}
                      >
                        {formato(v)}
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, textAlign: "center", color: "#333" }}>
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

  const botonPestana = (v: "tabla" | "cubo3d", texto: string) => (
    <button
      key={v}
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      style={{ background: vista === v ? "#534AB7" : "#fff", color: vista === v ? "#fff" : "#555",
        border: vista === v ? "none" : "0.5px solid #d0d0d0", borderRadius: 6, padding: "6px 14px",
        fontSize: 13, cursor: "pointer" }}
    >
      {texto}
    </button>
  );

  return (
    <div className="app-shell" style={{ background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div className="app-main">
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Cubo OLAP: ventas por producto, mes y tipo de cliente</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              Cruza qué se vende, cuándo y a qué tipo de cliente, para ver dónde está el negocio
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {anios.map((a) => (
              <button key={a} onClick={() => setAnioSeleccionado(a)}
                style={{ background: anioSeleccionado === a ? "#534AB7" : "transparent",
                  color: anioSeleccionado === a ? "#fff" : "#666",
                  border: anioSeleccionado === a ? "none" : "0.5px solid #e0e0e0",
                  borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer" }}>
                {a}
              </button>
            ))}
          </div>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error ? (
            <p style={{ fontSize: 13, color: "#993C1D" }}>{error}</p>
          ) : (
            <>
              <details style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "12px 16px" }}>
                <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  ¿Qué es este cubo y cómo se lee?
                </summary>
                <div style={{ marginTop: 10, fontSize: 13, color: "#555", lineHeight: 1.65 }}>
                  <p style={{ margin: "0 0 8px" }}>
                    Un cubo OLAP es una forma de ordenar las ventas en tres ejes para poder cruzarlos rápido:
                    <strong> producto</strong> (qué se vende), <strong>tiempo</strong> (en qué mes) y
                    <strong> tipo de cliente</strong> (activo, ocasional o en riesgo, según cuánto lleva sin comprar).
                    Cada casilla guarda lo vendido en la combinación de los tres.
                  </p>
                  <p style={{ margin: "0 0 8px" }}>
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

              {resumen && resumen.total > 0 && (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {[
                    ["Total del año", fmt(resumen.total)],
                    ["Producto líder", `${resumen.producto.nombre} (${pct(resumen.producto.v, resumen.total)})`],
                    ["Mejor mes", `${nombreMes(resumen.mes.nombre)} (${fmt(resumen.mes.v)})`],
                    ["Mes más flojo", resumen.mesFlojo ? `${nombreMes(resumen.mesFlojo.nombre)} (${fmt(resumen.mesFlojo.v)})` : "—"],
                    ["Cliente que más aporta", `${LABEL_SEGMENTO[resumen.segmento.nombre]} (${pct(resumen.segmento.v, resumen.total)})`],
                  ].map(([titulo, valor]) => (
                    <div key={titulo} style={{ flex: "1 1 190px", background: "#fff", border: "0.5px solid #e0e0e0",
                      borderRadius: 12, padding: 14 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{titulo}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{valor}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {botonPestana("tabla", "Tabla de calor")}
                {botonPestana("cubo3d", "Cubo 3D")}
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", marginLeft: 8 }}>
                  Medir en:
                  <select value={medida} onChange={(e) => setMedida(e.target.value as Medida)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #d0d0d0", fontSize: 12 }}>
                    <option value="ingresos">Ingresos ($)</option>
                    <option value="cantidad">Unidades vendidas</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Segmento RFM (recencia):</span>
                {Object.keys(COLOR_SEGMENTO).map((seg) => (
                  <label key={seg} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={segmentosVisibles[seg]} onChange={() => toggleSegmento(seg)} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_SEGMENTO[seg], display: "inline-block" }} />
                    {LABEL_SEGMENTO[seg]}
                  </label>
                ))}
              </div>

              {vista === "tabla" && datos && anioSeleccionado && (
                <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: 12 }}>
                  <TablaCalor
                    productos={datos.productos}
                    meses={mesesDelAnio}
                    mapaValores={mapaValores}
                    segmentos={segmentosActivos}
                    medida={medida}
                    seleccion={seleccion}
                    setSeleccion={setSeleccion}
                  />
                  {detalleSeleccion && seleccion && (
                    <div style={{ marginTop: 12, padding: 12, background: "#F6F5FD", borderRadius: 8, fontSize: 13 }}>
                      <strong>{seleccion.producto}</strong> en {nombreMes(seleccion.mes)} — por tipo de cliente:
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
                        {detalleSeleccion.map((d) => (
                          <span key={d.segmento} style={{ color: "#444" }}>
                            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, marginRight: 6,
                              background: COLOR_SEGMENTO[d.segmento] }} />
                            {LABEL_SEGMENTO[d.segmento]}: {formatoCOP.format(d.ingresos)} ({entero.format(d.cantidad)} u.)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {vista === "cubo3d" && (
              <div style={{ position: "relative", background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12,
                height: 580, overflow: "hidden" }}>
                {loading ? (
                  <p style={{ padding: 16, fontSize: 13, color: "#888" }}>Cargando cubo OLAP...</p>
                ) : datos && anioSeleccionado ? (
                  <>
                    <Canvas camera={{ position: [7, 6.5, 8], fov: 45 }}>
                      <color attach="background" args={["#fafafa"]} />
                      <Escena
                        productos={datos.productos}
                        mesesDelAnio={mesesDelAnio}
                        segmentosActivos={segmentosActivos}
                        mapaValores={mapaValores}
                        hover={hover}
                        setHover={setHover}
                      />
                    </Canvas>

                    <PillEje color="#2F6FED" icono="🕐" texto={`Tiempo (${anioSeleccionado})`}
                      style={{ top: 18, left: 18 }} />
                    <PillEje color="#1D9E75" icono="📦" texto={`Producto (01-${dosDigitos(datos.productos.length)})`}
                      style={{ bottom: 18, left: 18 }} />
                    <PillEje color="#534AB7" icono="👥" texto="Segmento RFM"
                      style={{ bottom: 18, right: 18, flexDirection: "row-reverse" }} />
                  </>
                ) : null}
              </div>
              )}

              {datos && vista === "cubo3d" && (
                <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
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
