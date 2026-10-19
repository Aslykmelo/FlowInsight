import { API_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";

interface VentaLocalidad {
  localidad: string;
  lat: number;
  lng: number;
  total_clientes: number;
  total_pedidos: number;
  ingresos: number;
}

interface ProductoCliente {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

interface PuntoCliente {
  id_cliente: number;
  nombre_cliente: string;
  localidad: string;
  direccion: string | null;
  lat: number;
  lng: number;
  ubicacion_aproximada: boolean;
  pedidos: number;
  ingresos: number;
  dias_sin_comprar: number;
  producto_principal: string | null;
  productos: ProductoCliente[];
}

interface MapaClientes {
  productos_disponibles: string[];
  clientes: PuntoCliente[];
  clientes_sin_autorizacion: number;
}

type Vista = "clientes" | "localidades";

const CENTRO_BOGOTA: [number, number] = [4.66, -74.1];

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// Color por estado del cliente (mismos umbrales que Promociones: 30 y 90 días).
const estadoDe = (dias: number) =>
  dias <= 30
    ? { color: "#0F6E56", label: "Activo (compró en los últimos 30 días)" }
    : dias <= 90
      ? { color: "#BA7517", label: "Ocasional (31 a 90 días sin comprar)" }
      : { color: "#993C1D", label: "En riesgo (más de 90 días sin comprar)" };

const tarjeta = { background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12 } as const;

export default function SalesMap() {
  const [vista, setVista] = useState<Vista>("clientes");
  const [localidades, setLocalidades] = useState<VentaLocalidad[]>([]);
  const [mapa, setMapa] = useState<MapaClientes | null>(null);
  const [producto, setProducto] = useState("");
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    Promise.all([
      fetch(`${API_URL}/dashboard/ventas-por-localidad`, { headers }),
      fetch(`${API_URL}/dashboard/mapa-clientes`, { headers }),
    ])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error("No se pudo cargar el mapa de ventas");
        setLocalidades(await a.json());
        setMapa(await b.json());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const clientes = useMemo(
    () =>
      (mapa?.clientes ?? []).filter(
        (c) => !producto || c.productos.some((p) => p.nombre === producto)
      ),
    [mapa, producto]
  );

  const cantidadDe = (c: PuntoCliente) =>
    producto ? c.productos.find((p) => p.nombre === producto)?.cantidad ?? 0 : null;

  const maxIngresosCliente = Math.max(1, ...clientes.map((c) => c.ingresos));
  const maxIngresosLoc = Math.max(1, ...localidades.map((d) => d.ingresos));
  const radioLocalidad = (ing: number) => 8 + Math.sqrt(ing / maxIngresosLoc) * 32;
  const colorLocalidad = (ing: number) => {
    const i = ing / maxIngresosLoc;
    return i > 0.66 ? "#534AB7" : i > 0.33 ? "#7C74D6" : "#B7B2EA";
  };

  const totalIngresos = clientes.reduce(
    (acc, c) => acc + (producto ? c.productos.find((p) => p.nombre === producto)?.ingresos ?? 0 : c.ingresos),
    0
  );
  const localidadTop = [...localidades].sort((a, b) => b.ingresos - a.ingresos)[0];
  const ranking = [...clientes]
    .sort((a, b) => (producto ? (cantidadDe(b) ?? 0) - (cantidadDe(a) ?? 0) : b.ingresos - a.ingresos))
    .slice(0, 8);

  const kpi = (titulo: string, valor: string) => (
    <div style={{ ...tarjeta, flex: "1 1 200px", padding: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{titulo}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500 }}>{loading ? "..." : valor}</p>
    </div>
  );

  const botonVista = (v: Vista, texto: string) => (
    <button
      key={v}
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      style={{
        background: vista === v ? "#534AB7" : "#fff", color: vista === v ? "#fff" : "#555",
        border: vista === v ? "none" : "0.5px solid #d0d0d0", borderRadius: 6, padding: "6px 14px",
        fontSize: 13, cursor: "pointer",
      }}
    >
      {texto}
    </button>
  );

  return (
    <div className="app-shell" style={{ background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div className="app-main">
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0", padding: "0.875rem 1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Mapa de clientes y productos</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Dónde están los clientes de Bogotá, qué producto consumen y quiénes llevan más tiempo sin comprar
          </p>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error ? (
            <p style={{ fontSize: 13, color: "#993C1D" }}>{error}</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {kpi(producto ? `Ingresos de ${producto}` : "Ingresos de los clientes", formatoCOP.format(totalIngresos))}
                {kpi("Clientes en el mapa", String(clientes.length))}
                {kpi("Localidad líder", localidadTop?.localidad ?? "—")}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {botonVista("clientes", "Clientes")}
                {botonVista("localidades", "Resumen por localidad")}
                {vista === "clientes" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555",
                    marginLeft: 8 }}>
                    Producto:
                    <select
                      value={producto}
                      onChange={(e) => { setProducto(e.target.value); setSeleccionado(null); }}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "0.5px solid #d0d0d0", fontSize: 13,
                        maxWidth: 260 }}
                    >
                      <option value="">Todos los productos</option>
                      {(mapa?.productos_disponibles ?? []).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ ...tarjeta, flex: "2 1 520px", minWidth: 0, overflow: "hidden", height: 540 }}>
                  {loading ? (
                    <p style={{ padding: 16, fontSize: 13, color: "#888" }}>Cargando mapa...</p>
                  ) : (
                    <MapContainer center={CENTRO_BOGOTA} zoom={11} style={{ height: "100%", width: "100%" }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {vista === "localidades" &&
                        localidades.map((d) => (
                          <CircleMarker
                            key={d.localidad}
                            center={[d.lat, d.lng]}
                            radius={radioLocalidad(d.ingresos)}
                            pathOptions={{ color: colorLocalidad(d.ingresos), fillColor: colorLocalidad(d.ingresos), fillOpacity: 0.6 }}
                          >
                            <Popup>
                              <strong>{d.localidad}</strong><br />
                              Clientes: {d.total_clientes}<br />
                              Pedidos: {d.total_pedidos}<br />
                              Ingresos: {formatoCOP.format(d.ingresos)}
                            </Popup>
                          </CircleMarker>
                        ))}

                      {vista === "clientes" &&
                        clientes.map((c) => {
                          const estado = estadoDe(c.dias_sin_comprar);
                          const elegido = seleccionado === c.id_cliente;
                          return (
                            <CircleMarker
                              key={c.id_cliente}
                              center={[c.lat, c.lng]}
                              radius={elegido ? 13 : 5 + Math.sqrt(c.ingresos / maxIngresosCliente) * 8}
                              eventHandlers={{ click: () => setSeleccionado(c.id_cliente) }}
                              pathOptions={{
                                color: elegido ? "#1B2430" : estado.color, fillColor: estado.color,
                                fillOpacity: 0.75, weight: elegido ? 3 : 1.5,
                              }}
                            >
                              <Tooltip>{c.nombre_cliente}</Tooltip>
                              <Popup>
                                <strong>{c.nombre_cliente}</strong><br />
                                {c.localidad}{c.direccion ? ` · ${c.direccion}` : ""}<br />
                                <span style={{ color: estado.color }}>{c.dias_sin_comprar} días sin comprar</span><br />
                                Pedidos: {c.pedidos} · Compras: {formatoCOP.format(c.ingresos)}
                                <div style={{ marginTop: 6, fontWeight: 600 }}>Qué consume</div>
                                {c.productos.slice(0, 4).map((p) => (
                                  <div key={p.nombre}>{p.nombre}: {p.cantidad} und.</div>
                                ))}
                                <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>
                                  Ubicación aproximada dentro de la localidad
                                </div>
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                    </MapContainer>
                  )}
                </div>

                <div style={{ ...tarjeta, flex: "1 1 280px", padding: 16 }}>
                  {vista === "clientes" ? (
                    <>
                      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500 }}>
                        {producto ? `Mayores compradores de ${producto}` : "Clientes con más compras"}
                      </h3>
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#888" }}>
                        Toca uno para resaltarlo en el mapa
                      </p>
                      {ranking.map((c, i) => (
                        <button
                          key={c.id_cliente}
                          onClick={() => setSeleccionado(c.id_cliente)}
                          style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                            background: seleccionado === c.id_cliente ? "#EFEDFA" : "transparent",
                            border: "none", borderBottom: "0.5px solid #f0f0f0", padding: "8px 6px" }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{i + 1}. {c.nombre_cliente}</span>
                          <span style={{ display: "block", fontSize: 12, color: "#777" }}>
                            {c.localidad} ·{" "}
                            {producto
                              ? `${cantidadDe(c)} und. de ${producto}`
                              : `${c.producto_principal ?? "—"} · ${formatoCOP.format(c.ingresos)}`}
                          </span>
                        </button>
                      ))}
                      {ranking.length === 0 && !loading && (
                        <p style={{ fontSize: 13, color: "#888" }}>Ningún cliente consume este producto.</p>
                      )}

                      <h4 style={{ margin: "16px 0 6px", fontSize: 13, fontWeight: 500 }}>Colores</h4>
                      {[5, 60, 120].map((d) => {
                        const e = estadoDe(d);
                        return (
                          <p key={d} style={{ margin: "0 0 4px", fontSize: 12, color: "#555" }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5,
                              background: e.color, marginRight: 8 }} />
                            {e.label}
                          </p>
                        );
                      })}
                      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>
                        El tamaño del punto crece con el valor de las compras.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>Cómo leer el mapa</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                        Cada círculo es una localidad: entre más grande y oscuro, más ingresos. Toca un círculo
                        para ver clientes, pedidos e ingresos.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                <strong>Sobre la ubicación:</strong> los datos cargados traen la localidad y la dirección de cada
                cliente, pero no sus coordenadas. Cada punto se coloca dentro de su localidad (a unos 1,2 km
                como máximo del centro) y siempre en el mismo lugar; por eso la ubicación es aproximada, no la
                puerta exacta del negocio. Solo aparecen los clientes que autorizaron el uso de sus datos
                {mapa && mapa.clientes_sin_autorizacion > 0
                  ? ` (${mapa.clientes_sin_autorizacion} no autorizaron y no se muestran)`
                  : ""}.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
