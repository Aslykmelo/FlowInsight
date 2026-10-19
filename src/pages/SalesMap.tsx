import { API_URL } from "../config";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { MapPin, RefreshCw } from "lucide-react";
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

const entero = new Intl.NumberFormat("es-CO");

// Colores de la paleta para los marcadores (Leaflet los escribe como atributos SVG, por eso van en hex).
// "texto" es la variable CSS legible sobre fondo claro, para el texto de popups y ranking.
const PALETA = { ok: "#0f6e56", ocasional: "#e8a33d", riesgo: "#a33a1e", primary: "#534ab7", ink: "#1b2430" };

// Estado del cliente (mismos umbrales que Promociones: 30 y 90 días).
const estadoDe = (dias: number) =>
  dias <= 30
    ? { color: PALETA.ok, texto: "var(--c-ok)", corto: "Activo", label: "Activo (compró en los últimos 30 días)" }
    : dias <= 90
      ? { color: PALETA.ocasional, texto: "var(--c-warn)", corto: "Ocasional", label: "Ocasional (31 a 90 días sin comprar)" }
      : { color: PALETA.riesgo, texto: "var(--c-bad)", corto: "En riesgo", label: "En riesgo (más de 90 días sin comprar)" };

const punto = (color: string): React.CSSProperties => ({
  display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0,
});

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
    return i > 0.66 ? "#534ab7" : i > 0.33 ? "#7c74d6" : "#b7b2ea";
  };

  const totalIngresos = clientes.reduce(
    (acc, c) => acc + (producto ? c.productos.find((p) => p.nombre === producto)?.ingresos ?? 0 : c.ingresos),
    0
  );
  const localidadTop = [...localidades].sort((a, b) => b.ingresos - a.ingresos)[0];
  const ranking = [...clientes]
    .sort((a, b) => (producto ? (cantidadDe(b) ?? 0) - (cantidadDe(a) ?? 0) : b.ingresos - a.ingresos))
    .slice(0, 8);
  const rankingLocalidades = [...localidades].sort((a, b) => b.ingresos - a.ingresos).slice(0, 8);

  const kpi = (titulo: string, valor: string) => (
    <div className="kpi">
      <p className="kpi-label">{titulo}</p>
      <p className="kpi-value" style={{ overflowWrap: "anywhere" }}>{loading ? "…" : valor}</p>
    </div>
  );

  const botonVista = (v: Vista, texto: string) => (
    <button
      key={v}
      type="button"
      className={`btn${vista === v ? " btn-primary" : ""}`}
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
    >
      {texto}
    </button>
  );

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <header className="page-header">
          <div>
            <h1>Mapa de clientes y productos</h1>
            <p>Dónde están los clientes de Bogotá, qué producto consumen y quiénes llevan más tiempo sin comprar</p>
          </div>
        </header>

        <main className="page-body">
          {error ? (
            <div className="notice notice-bad" role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 240px" }}>{error}. Revisa tu conexión e inténtalo de nuevo.</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => window.location.reload()}>
                <RefreshCw size={14} aria-hidden="true" /> Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "var(--s-4)" }}>
                {kpi(producto ? `Ingresos de ${producto}` : "Ingresos de los clientes", formatoCOP.format(totalIngresos))}
                {kpi("Clientes en el mapa", entero.format(clientes.length))}
                {kpi("Localidad líder", localidadTop?.localidad ?? "—")}
              </div>

              <div className="notice notice-warn" style={{ display: "flex", gap: "var(--s-3)", alignItems: "flex-start", lineHeight: 1.6 }}>
                <MapPin size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0 }}>
                  <strong>Sobre la ubicación:</strong> los datos cargados traen la localidad y la dirección de cada
                  cliente, pero no sus coordenadas. Cada punto se coloca dentro de su localidad (a unos 1,2 km
                  como máximo del centro) y siempre en el mismo lugar; por eso la ubicación es aproximada, no la
                  puerta exacta del negocio. Solo aparecen los clientes que autorizaron el uso de sus datos
                  {mapa && mapa.clientes_sin_autorizacion > 0
                    ? ` (${mapa.clientes_sin_autorizacion} no autorizaron y no se muestran)`
                    : ""}.
                </p>
              </div>

              <div style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div role="group" aria-label="Vista del mapa" style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
                  {botonVista("clientes", "Clientes")}
                  {botonVista("localidades", "Resumen por localidad")}
                </div>
                {vista === "clientes" && (
                  <div style={{ flex: "0 1 280px", minWidth: "min(100%, 200px)" }}>
                    <label className="field-label" htmlFor="mapa-producto">Producto</label>
                    <select
                      id="mapa-producto"
                      className="input"
                      value={producto}
                      onChange={(e) => { setProducto(e.target.value); setSeleccionado(null); }}
                    >
                      <option value="">Todos los productos</option>
                      {(mapa?.productos_disponibles ?? []).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "var(--s-5)", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div
                  className="card"
                  role="region"
                  aria-label="Mapa de Bogotá"
                  style={{ flex: "2 1 460px", minWidth: 0, padding: 0, overflow: "hidden", position: "relative",
                    isolation: "isolate", height: "clamp(360px, 62vh, 560px)" }}
                >
                  {loading ? (
                    <p role="status" style={{ margin: 0, padding: "var(--s-5)", fontSize: 14, color: "var(--c-muted)" }}>
                      Cargando mapa…
                    </p>
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
                              <div style={{ fontFamily: "var(--font)", fontSize: 13, lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>
                                <strong>{d.localidad}</strong><br />
                                Clientes: {d.total_clientes}<br />
                                Pedidos: {d.total_pedidos}<br />
                                Ingresos: {formatoCOP.format(d.ingresos)}
                              </div>
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
                                color: elegido ? PALETA.ink : estado.color, fillColor: estado.color,
                                fillOpacity: 0.75, weight: elegido ? 3 : 1.5,
                              }}
                            >
                              <Tooltip>{c.nombre_cliente}</Tooltip>
                              <Popup>
                                <div style={{ fontFamily: "var(--font)", fontSize: 13, lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>
                                  <strong>{c.nombre_cliente}</strong><br />
                                  {c.localidad}{c.direccion ? ` · ${c.direccion}` : ""}<br />
                                  <span style={{ color: estado.texto, fontWeight: 600 }}>
                                    {estado.corto}: {c.dias_sin_comprar} días sin comprar
                                  </span><br />
                                  Pedidos: {c.pedidos} · Compras: {formatoCOP.format(c.ingresos)}
                                  <div style={{ marginTop: 6, fontWeight: 600 }}>Qué consume</div>
                                  {c.productos.slice(0, 4).map((p) => (
                                    <div key={p.nombre}>{p.nombre}: {p.cantidad} und.</div>
                                  ))}
                                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--c-muted)" }}>
                                    Ubicación aproximada dentro de la localidad
                                  </div>
                                </div>
                              </Popup>
                            </CircleMarker>
                          );
                        })}
                    </MapContainer>
                  )}
                </div>

                <aside className="card" style={{ flex: "1 1 280px", minWidth: 0, padding: "var(--s-4)" }}>
                  {vista === "clientes" ? (
                    <>
                      <h2 style={{ margin: 0, fontSize: 16 }}>
                        {producto ? `Mayores compradores de ${producto}` : "Clientes con más compras"}
                      </h2>
                      <p style={{ margin: "var(--s-1) 0 var(--s-3)", fontSize: 13, color: "var(--c-muted)" }}>
                        Toca uno para resaltarlo en el mapa
                      </p>
                      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {ranking.map((c, i) => {
                          const estado = estadoDe(c.dias_sin_comprar);
                          const activo = seleccionado === c.id_cliente;
                          return (
                            <li key={c.id_cliente} style={{ borderBottom: "1px solid var(--c-line)" }}>
                              <button
                                type="button"
                                onClick={() => setSeleccionado(c.id_cliente)}
                                aria-pressed={activo}
                                style={{ display: "block", width: "100%", minHeight: 56, textAlign: "left", cursor: "pointer",
                                  background: activo ? "var(--c-primary-soft)" : "transparent", color: "var(--c-ink)",
                                  border: "none", borderRadius: "var(--r-sm)", padding: "var(--s-2) var(--s-3)" }}
                              >
                                <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>
                                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}.</span> {c.nombre_cliente}
                                </span>
                                <span style={{ display: "block", fontSize: 13, color: "var(--c-muted)", fontVariantNumeric: "tabular-nums" }}>
                                  {c.localidad} ·{" "}
                                  {producto
                                    ? `${cantidadDe(c)} und. de ${producto}`
                                    : `${c.producto_principal ?? "—"} · ${formatoCOP.format(c.ingresos)}`}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                                  color: estado.texto }}>
                                  <span aria-hidden="true" style={punto(estado.color)} />
                                  {estado.corto} · {c.dias_sin_comprar} días sin comprar
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                      {ranking.length === 0 && !loading && (
                        <p className="notice" style={{ margin: 0 }}>
                          {producto ? "Ningún cliente consume este producto." : "Todavía no hay clientes para mostrar en el mapa."}
                        </p>
                      )}

                      <h3 style={{ margin: "var(--s-5) 0 var(--s-2)", fontSize: 14 }}>Colores del mapa</h3>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
                        {[5, 60, 120].map((d) => {
                          const e = estadoDe(d);
                          return (
                            <li key={d} style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", fontSize: 13, color: "var(--c-ink-2)" }}>
                              <span aria-hidden="true" style={punto(e.color)} />
                              {e.label}
                            </li>
                          );
                        })}
                      </ul>
                      <p style={{ margin: "var(--s-3) 0 0", fontSize: 13, color: "var(--c-muted)" }}>
                        El tamaño del punto crece con el valor de las compras.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 style={{ margin: 0, fontSize: 16 }}>Cómo leer el mapa</h2>
                      <p style={{ margin: "var(--s-2) 0 var(--s-4)", fontSize: 14, color: "var(--c-ink-2)", lineHeight: 1.6 }}>
                        Cada círculo es una localidad: entre más grande y oscuro, más ingresos. Toca un círculo
                        para ver clientes, pedidos e ingresos.
                      </p>
                      <h3 style={{ margin: "0 0 var(--s-2)", fontSize: 14 }}>Localidades con más ingresos</h3>
                      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {rankingLocalidades.map((d, i) => (
                          <li key={d.localidad} style={{ display: "flex", justifyContent: "space-between", gap: "var(--s-3)",
                            padding: "var(--s-2) 0", borderBottom: "1px solid var(--c-line)", fontSize: 13,
                            fontVariantNumeric: "tabular-nums" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", minWidth: 0 }}>
                              <span aria-hidden="true" style={punto(colorLocalidad(d.ingresos))} />
                              <span>{i + 1}. {d.localidad}</span>
                            </span>
                            <span style={{ color: "var(--c-muted)", whiteSpace: "nowrap" }}>{formatoCOP.format(d.ingresos)}</span>
                          </li>
                        ))}
                      </ol>
                      {rankingLocalidades.length === 0 && !loading && (
                        <p className="notice" style={{ margin: 0 }}>Todavía no hay ventas por localidad.</p>
                      )}
                    </>
                  )}
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
