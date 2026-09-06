import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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

const API_URL = "http://localhost:8000";
const CENTRO_BOGOTA: [number, number] = [4.66, -74.1];

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function SalesMap() {
  const [datos, setDatos] = useState<VentaLocalidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/dashboard/ventas-por-localidad`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el mapa de ventas");
        return res.json();
      })
      .then((data) => setDatos(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxIngresos = Math.max(1, ...datos.map((d) => d.ingresos));
  const radioDe = (ingresos: number) => 8 + Math.sqrt(ingresos / maxIngresos) * 32;
  const colorDe = (ingresos: number) => {
    const intensidad = ingresos / maxIngresos;
    if (intensidad > 0.66) return "#534AB7";
    if (intensidad > 0.33) return "#7C74D6";
    return "#B7B2EA";
  };

  const totalIngresos = datos.reduce((acc, d) => acc + d.ingresos, 0);
  const localidadTop = [...datos].sort((a, b) => b.ingresos - a.ingresos)[0];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Mapa de ventas de Bogotá</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Ingresos y clientes agrupados por localidad
          </p>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error ? (
            <p style={{ fontSize: 13, color: "#993C1D" }}>{error}</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", background: "#fff", border: "0.5px solid #e0e0e0",
                  borderRadius: 12, padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Ingresos totales</p>
                  <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500 }}>
                    {loading ? "..." : formatoCOP.format(totalIngresos)}
                  </p>
                </div>
                <div style={{ flex: "1 1 200px", background: "#fff", border: "0.5px solid #e0e0e0",
                  borderRadius: 12, padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Localidades con ventas</p>
                  <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500 }}>
                    {loading ? "..." : datos.length}
                  </p>
                </div>
                <div style={{ flex: "1 1 200px", background: "#fff", border: "0.5px solid #e0e0e0",
                  borderRadius: 12, padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Localidad líder</p>
                  <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500 }}>
                    {loading ? "..." : localidadTop?.localidad ?? "—"}
                  </p>
                </div>
              </div>

              <div style={{ background: "#fff", border: "0.5px solid #e0e0e0",
                borderRadius: 12, overflow: "hidden", height: 520 }}>
                {loading ? (
                  <p style={{ padding: 16, fontSize: 13, color: "#888" }}>Cargando mapa...</p>
                ) : (
                  <MapContainer center={CENTRO_BOGOTA} zoom={11} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {datos.map((d) => (
                      <CircleMarker
                        key={d.localidad}
                        center={[d.lat, d.lng]}
                        radius={radioDe(d.ingresos)}
                        pathOptions={{ color: colorDe(d.ingresos), fillColor: colorDe(d.ingresos), fillOpacity: 0.6 }}
                      >
                        <Popup>
                          <strong>{d.localidad}</strong>
                          <br />
                          Clientes: {d.total_clientes}
                          <br />
                          Pedidos: {d.total_pedidos}
                          <br />
                          Ingresos: {formatoCOP.format(d.ingresos)}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
