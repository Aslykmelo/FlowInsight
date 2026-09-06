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

const PRODUCT_SPACING = 1.6;
const MONTH_SPACING = 1.6;
const SEGMENT_GAP = 0.32;
const BAR_SIZE = 0.26;
const MAX_ALTURA = 6;

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function siglaProducto(productos: string[], nombre: string): string {
  return `P${productos.indexOf(nombre) + 1}`;
}

function Barra({
  x,
  z,
  altura,
  color,
  celda,
  hover,
  setHover,
}: {
  x: number;
  z: number;
  altura: number;
  color: string;
  celda: Celda;
  hover: Celda | null;
  setHover: (c: Celda | null) => void;
}) {
  const activo = hover === celda;
  return (
    <mesh
      position={[x, altura / 2, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(celda);
      }}
      onPointerOut={() => setHover(null)}
    >
      <boxGeometry args={[BAR_SIZE, Math.max(altura, 0.02), BAR_SIZE]} />
      <meshStandardMaterial color={color} emissive={activo ? color : "#000000"} emissiveIntensity={activo ? 0.6 : 0} />
      {activo && (
        <Html position={[0, altura / 2 + 0.3, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 8, padding: "6px 10px",
            fontSize: 11, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", color: "#333" }}>
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
  celdas,
  hover,
  setHover,
}: {
  productos: string[];
  mesesDelAnio: string[];
  celdas: Celda[];
  hover: Celda | null;
  setHover: (c: Celda | null) => void;
}) {
  const maxIngresos = Math.max(1, ...celdas.map((c) => c.ingresos));

  const centroX = ((productos.length - 1) * PRODUCT_SPACING) / 2;
  const centroZ = ((mesesDelAnio.length - 1) * MONTH_SPACING) / 2;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} />

      {/* Piso de referencia */}
      <gridHelper args={[Math.max(productos.length, mesesDelAnio.length) * 1.8, 20, "#ccc", "#e5e5e5"]}
        position={[centroX, 0, centroZ]} />

      {/* Etiquetas de producto (eje X) */}
      {productos.map((p, i) => (
        <Text key={p} position={[i * PRODUCT_SPACING - centroX, -0.35, -1 - centroZ]}
          fontSize={0.22} color="#666" anchorX="center" anchorY="middle" rotation={[-Math.PI / 2.5, 0, 0]}>
          {siglaProducto(productos, p)}
        </Text>
      ))}

      {/* Etiquetas de mes (eje Z) */}
      {mesesDelAnio.map((m, i) => (
        <Text key={m} position={[-1 - centroX, -0.35, i * MONTH_SPACING - centroZ]}
          fontSize={0.22} color="#666" anchorX="center" anchorY="middle" rotation={[-Math.PI / 2.5, 0, 0]}>
          {NOMBRES_MESES[Number(m.split("-")[1]) - 1]}
        </Text>
      ))}

      {celdas.map((c) => {
        const productoIdx = productos.indexOf(c.producto);
        const mesIdx = mesesDelAnio.indexOf(c.mes);
        if (productoIdx === -1 || mesIdx === -1) return null;

        const segmentos = Object.keys(COLOR_SEGMENTO);
        const segIdx = segmentos.indexOf(c.segmento);
        const x = productoIdx * PRODUCT_SPACING - centroX + (segIdx - 1) * SEGMENT_GAP;
        const z = mesIdx * MONTH_SPACING - centroZ;
        const altura = (c.ingresos / maxIngresos) * MAX_ALTURA;

        return (
          <Barra key={`${c.producto}-${c.mes}-${c.segmento}`} x={x} z={z} altura={altura}
            color={COLOR_SEGMENTO[c.segmento]} celda={c} hover={hover} setHover={setHover} />
        );
      })}

      <OrbitControls enableDamping dampingFactor={0.1} minDistance={5} maxDistance={40} />
    </>
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
  const [hover, setHover] = useState<Celda | null>(null);

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

  const celdasFiltradas = useMemo(() => {
    if (!datos || !anioSeleccionado) return [];
    return datos.celdas.filter(
      (c) => c.mes.startsWith(anioSeleccionado) && segmentosVisibles[c.segmento]
    );
  }, [datos, anioSeleccionado, segmentosVisibles]);

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
              Ingresos por Producto × Mes × Segmento RFM — arrastra para rotar, scroll para zoom
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

              <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12,
                height: 560, overflow: "hidden" }}>
                {loading ? (
                  <p style={{ padding: 16, fontSize: 13, color: "#888" }}>Cargando cubo OLAP...</p>
                ) : datos && anioSeleccionado ? (
                  <Canvas camera={{ position: [14, 11, 16], fov: 45 }}>
                    <color attach="background" args={["#fafafa"]} />
                    <Escena
                      productos={datos.productos}
                      mesesDelAnio={mesesDelAnio}
                      celdas={celdasFiltradas}
                      hover={hover}
                      setHover={setHover}
                    />
                  </Canvas>
                ) : null}
              </div>

              {datos && (
                <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
                  Eje X: producto (sigla, ver lista abajo) · Eje Z: mes de {anioSeleccionado} · Altura: ingresos ·
                  Color: segmento RFM. {datos.productos.map((p, i) => `P${i + 1}=${p}`).join(" · ")}
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
