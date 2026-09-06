import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

interface ClientePromocion {
  id_cliente: number;
  nombre_cliente: string;
  telefono: string | null;
  dias_sin_comprar: number;
  categoria: "activo" | "ocasional" | "en_riesgo";
}

interface MensajePromocion extends ClientePromocion {
  producto_favorito: string | null;
  mensaje: string;
  link_whatsapp: string | null;
}

const CATEGORIA_STYLE: Record<ClientePromocion["categoria"], { color: string; bg: string; label: string }> = {
  activo: { color: "#0F6E56", bg: "#E1F5EE", label: "Activo" },
  ocasional: { color: "#BA7517", bg: "#FAEEDA", label: "Ocasional" },
  en_riesgo: { color: "#993C1D", bg: "#FAECE7", label: "En riesgo" },
};

const FILTROS: { value: ClientePromocion["categoria"] | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "en_riesgo", label: "En riesgo" },
  { value: "ocasional", label: "Ocasional" },
  { value: "activo", label: "Activo" },
];

const API_URL = "http://localhost:8000";

export default function Promotions() {
  const [clientes, setClientes] = useState<ClientePromocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["value"]>("en_riesgo");
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<MensajePromocion | null>(null);
  const [cargandoMensaje, setCargandoMensaje] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/promociones/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
        return res.json();
      })
      .then((data) => setClientes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const seleccionarCliente = (id: number) => {
    setSeleccionado(id);
    setMensaje(null);
    setCopiado(false);
    setCargandoMensaje(true);
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/promociones/mensaje/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo generar el mensaje");
        return res.json();
      })
      .then((data) => setMensaje(data))
      .catch((err) => setError(err.message))
      .finally(() => setCargandoMensaje(false));
  };

  const copiarMensaje = async () => {
    if (!mensaje) return;
    await navigator.clipboard.writeText(mensaje.mensaje);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const clientesFiltrados = clientes.filter((c) => filtro === "todos" || c.categoria === filtro);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f7", fontFamily: "system-ui,sans-serif" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ background: "#fff", borderBottom: "0.5px solid #e0e0e0",
          padding: "0.875rem 1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Mensajes de promoción</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Selecciona un cliente para generar un mensaje personalizado y copiarlo o enviarlo por WhatsApp
          </p>
        </header>

        <main style={{ padding: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 480px", minWidth: 0, background: "#fff", border: "0.5px solid #e0e0e0",
            borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "0.5px solid #e0e0e0" }}>
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value)}
                  style={{
                    background: filtro === f.value ? "#534AB7" : "transparent",
                    color: filtro === f.value ? "#fff" : "#666",
                    border: filtro === f.value ? "none" : "0.5px solid #e0e0e0",
                    borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p style={{ padding: 16, fontSize: 13, color: "#888" }}>Cargando clientes...</p>
            ) : error ? (
              <p style={{ padding: 16, fontSize: 13, color: "#993C1D" }}>{error}</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9f9f9", borderBottom: "0.5px solid #e0e0e0" }}>
                    {["Cliente", "Teléfono", "Días sin comprar", "Categoría"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                        fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c, i) => {
                    const s = CATEGORIA_STYLE[c.categoria];
                    return (
                      <tr
                        key={c.id_cliente}
                        onClick={() => seleccionarCliente(c.id_cliente)}
                        style={{
                          borderBottom: "0.5px solid #f0f0f0", cursor: "pointer",
                          background: seleccionado === c.id_cliente ? "#EFEDFA" : i % 2 === 0 ? "#fff" : "#fafafa",
                        }}
                      >
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.nombre_cliente}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{c.telefono || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "#555" }}>{c.dias_sin_comprar}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 12, color: s.color, background: s.bg,
                            padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && !error && (
              <p style={{ margin: 0, padding: "10px 16px", fontSize: 12, color: "#aaa" }}>
                Mostrando {clientesFiltrados.length} de {clientes.length} clientes con historial de pedidos
              </p>
            )}
          </div>

          <div style={{ width: 380, background: "#fff", border: "0.5px solid #e0e0e0",
            borderRadius: 12, padding: 20, position: "sticky", top: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 500 }}>Mensaje generado</h3>

            {!seleccionado && (
              <p style={{ fontSize: 13, color: "#888" }}>Selecciona un cliente de la lista para generar su mensaje.</p>
            )}

            {seleccionado && cargandoMensaje && (
              <p style={{ fontSize: 13, color: "#888" }}>Generando mensaje...</p>
            )}

            {mensaje && !cargandoMensaje && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: CATEGORIA_STYLE[mensaje.categoria].color,
                    background: CATEGORIA_STYLE[mensaje.categoria].bg,
                    padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
                    {CATEGORIA_STYLE[mensaje.categoria].label}
                  </span>
                  {mensaje.producto_favorito && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: "#888" }}>
                      Producto favorito: {mensaje.producto_favorito}
                    </span>
                  )}
                </div>

                <textarea
                  readOnly
                  value={mensaje.mensaje}
                  style={{ width: "100%", minHeight: 140, resize: "vertical", fontSize: 13,
                    fontFamily: "system-ui,sans-serif", border: "0.5px solid #e0e0e0",
                    borderRadius: 8, padding: 10, color: "#333", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={copiarMensaje}
                    style={{ flex: 1, background: copiado ? "#0F6E56" : "#534AB7", color: "#fff",
                      border: "none", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontSize: 13 }}
                  >
                    {copiado ? "¡Copiado!" : "Copiar mensaje"}
                  </button>

                  {mensaje.link_whatsapp && (
                    <a
                      href={mensaje.link_whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, background: "#1D9E75", color: "#fff", border: "none",
                        borderRadius: 8, padding: "9px 0", cursor: "pointer", fontSize: 13,
                        textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}
                    >
                      Abrir en WhatsApp
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
