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

const API_URL = "http://localhost:8000";

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
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: color, color: "#fff",
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Cubo OLAP 3D</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              Ingresos por Producto × Tiempo × Segmento RFM — arrastra para rotar, scroll para zoom
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
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Segmento RFM (recencia):</span>
                {Object.keys(COLOR_SEGMENTO).map((seg) => (
                  <label key={seg} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={segmentosVisibles[seg]} onChange={() => toggleSegmento(seg)} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_SEGMENTO[seg], display: "inline-block" }} />
                    {LABEL_SEGMENTO[seg]}
                  </label>
                ))}
              </div>

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

              {datos && (
                <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
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
