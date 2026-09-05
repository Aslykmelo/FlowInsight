import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as CJTooltip,
  Legend as CJLegend,
} from "chart.js";

import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, CJTooltip, CJLegend);

// ============================================================
// TIPOS
// ============================================================

interface KPI {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  color: string;
  bg: string;
}

interface SalesPoint {
  mes: string;
  ventas: number;
  prediccion: number;
}

interface ApiKPI {
  total_pedidos: number;
  total_clientes: number;
  ingresos_totales: number;
  ticket_promedio: number;
  clientes_activos: number;
}

interface ApiSale {
  fecha: string;
  total_pedidos: number;
  ingresos: number;
}

interface ChurnRisk {
  bajo_riesgo: number;
  riesgo_medio: number;
  alto_riesgo: number;
}

// ============================================================
// URL DEL BACKEND
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// COMPONENTE KPI
// ============================================================

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e0e0e0",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 13,
          color: "#888",
        }}
      >
        {kpi.label}
      </p>

      <p
        style={{
          margin: "0 0 8px",
          fontSize: 26,
          fontWeight: 500,
          color: kpi.color,
        }}
      >
        {kpi.value}
      </p>

      <span
        style={{
          fontSize: 12,
          color: kpi.positive ? "#0F6E56" : "#993C1D",
          background: kpi.positive ? "#E1F5EE" : "#FAECE7",
          padding: "2px 8px",
          borderRadius: 6,
        }}
      >
        {kpi.delta}
      </span>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const [kpis, setKpis] = useState<ApiKPI | null>(null);

  const [salesData, setSalesData] = useState<SalesPoint[]>([]);

  const [churnRisk, setChurnRisk] =
    useState<ChurnRisk | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

// ============================================================
// CARGAR DATOS DEL BACKEND
// ============================================================

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setError("No hay sesión iniciada.");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // ======================================================
        // 1. OBTENER KPIs
        // ======================================================

        const kpiResponse = await fetch(
          `${API_URL}/dashboard/kpis`,
          {
            method: "GET",
            headers,
          }
        );

        if (!kpiResponse.ok) {
          throw new Error(
            `Error al obtener KPIs: ${kpiResponse.status}`
          );
        }

        const kpiData: ApiKPI =
          await kpiResponse.json();

        setKpis(kpiData);

        // ======================================================
        // 2. OBTENER VENTAS MENSUALES
        // ======================================================

        const salesResponse = await fetch(
          `${API_URL}/dashboard/sales`,
          {
            method: "GET",
            headers,
          }
        );

        if (!salesResponse.ok) {
          throw new Error(
            `Error al obtener ventas: ${salesResponse.status}`
          );
        }

        const salesApiData: ApiSale[] =
          await salesResponse.json();

        // ======================================================
        // 3. TRANSFORMAR VENTAS
        // ======================================================

        const nombresMeses = [
          "Ene",
          "Feb",
          "Mar",
          "Abr",
          "May",
          "Jun",
          "Jul",
          "Ago",
          "Sep",
          "Oct",
          "Nov",
          "Dic",
        ];

        const datosGrafica: SalesPoint[] =
          salesApiData.map((item) => {
            const partes = item.fecha.split("-");

            const numeroMes = Number(partes[1]);

            const mes =
              nombresMeses[numeroMes - 1] ||
              item.fecha;

            const ventas = Number(item.ingresos);

            // ==================================================
            // PREDICCIÓN TEMPORAL
            // ==================================================
            // Esto NO crea datos en la BD.
            // Solamente permite mantener la gráfica
            // mientras conectamos el modelo ML real.

            const prediccion = Math.round(
              ventas * 0.94
            );

            return {
              mes,
              ventas,
              prediccion,
            };
          });

        setSalesData(datosGrafica);

        // ======================================================
        // 4. OBTENER RIESGO DE ABANDONO DESDE LA BD
        // ======================================================

        const churnResponse = await fetch(
          `${API_URL}/dashboard/churn-risk`,
          {
            method: "GET",
            headers,
          }
        );

        if (!churnResponse.ok) {
          throw new Error(
            `Error al obtener riesgo de abandono: ${churnResponse.status}`
          );
        }

        const churnData: ChurnRisk =
          await churnResponse.json();

        // ======================================================
        // IMPORTANTE:
        // Estos valores vienen directamente del backend.
        // No se generan ni se insertan desde React.
        // ======================================================

        setChurnRisk(churnData);

      } catch (err) {
        console.error(
          "Error cargando Dashboard:",
          err
        );

        setError(
          "No fue posible cargar la información del dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarDashboard();
  }, []);

// ============================================================
// FORMATEAR MONEDA
// ============================================================

  const formatoMoneda = (valor: number) => {
    return valor.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
    });
  };

// ============================================================
// DATOS DE LOS KPI
// ============================================================

  const KPI_DATA: KPI[] = kpis
    ? [
        {
          label: "Total clientes",

          value:
            kpis.total_clientes.toLocaleString(
              "es-CO"
            ),

          delta: "Clientes Registrados",

          positive: true,

          color: "#534AB7",

          bg: "#EEEDFE",
        },

        {
          label: "Ventas del mes",

          value:
            salesData.length > 0
              ? formatoMoneda(
                  salesData[
                    salesData.length - 1
                  ].ventas
                )
              : formatoMoneda(0),

          delta: "Ventas Registradas",

          positive: true,

          color: "#0F6E56",

          bg: "#E1F5EE",
        },

        {
          label: "Ticket promedio",

          value: formatoMoneda(
            kpis.ticket_promedio
          ),

          delta: "Promedio por pedido",

          positive: true,

          color: "#BA7517",

          bg: "#FAEEDA",
        },

        {
          label: "Ingresos totales",

          value: formatoMoneda(
            kpis.ingresos_totales
          ),

          delta: "Ventas Totales",

          positive: true,

          color: "#0F6E56",

          bg: "#E1F5EE",
        },
      ]
    : [];

// ============================================================
// DATOS DEL RIESGO DE ABANDONO
// ============================================================

  const DONUT_DATA = {
    labels: [
      "Bajo riesgo",
      "Riesgo medio",
      "Alto riesgo",
    ],

    datasets: [
      {
        data: churnRisk
          ? [
              churnRisk.bajo_riesgo,
              churnRisk.riesgo_medio,
              churnRisk.alto_riesgo,
            ]
          : [0, 0, 0],

        backgroundColor: [
          "#1D9E75",
          "#EF9F27",
          "#E24B4A",
        ],

        borderWidth: 0,
      },
    ],
  };

// ============================================================
// LISTA DE RIESGOS
// ============================================================

  const RIESGO_DATA = [
    {
      label: "Bajo riesgo",

      value:
        churnRisk?.bajo_riesgo ?? 0,

      color: "#1D9E75",
    },

    {
      label: "Riesgo medio",

      value:
        churnRisk?.riesgo_medio ?? 0,

      color: "#EF9F27",
    },

    {
      label: "Alto riesgo",

      value:
        churnRisk?.alto_riesgo ?? 0,

      color: "#E24B4A",
    },
  ];

// ============================================================
// LOADING
// ============================================================

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f5f5f7",
          fontFamily:
            "system-ui, sans-serif",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LoadingSpinner message="Cargando información del dashboard..." />
        </div>
      </div>
    );
  }

// ============================================================
// ERROR
// ============================================================

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f5f5f7",
          fontFamily:
            "system-ui, sans-serif",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.5rem",
          }}
        >
          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

// ============================================================
// INTERFAZ
// ============================================================

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f5f7",
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header
          style={{
            background: "#fff",
            borderBottom:
              "0.5px solid #e0e0e0",
            padding:
              "0.875rem 1.5rem",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#888",
              }}
            >
              {new Date().toLocaleDateString(
                "es-CO",
                {
                  dateStyle: "long",
                }
              )}
            </p>
          </div>

          <button
            onClick={() => {
              window.location.href =
                "/upload";
            }}
            style={{
              background: "#534AB7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            + Cargar Excel
          </button>
        </header>

        {/* ====================================================
            CONTENIDO
        ==================================================== */}

        <main
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >

          {/* ==================================================
              KPIs
          ================================================== */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {KPI_DATA.map((kpi) => (
              <KPICard
                key={kpi.label}
                kpi={kpi}
              />
            ))}
          </section>

          {/* ==================================================
              VENTAS REALES VS PREDICCIÓN
          ================================================== */}

          <div
            style={{
              background: "#fff",
              border:
                "0.5px solid #e0e0e0",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <h2
              style={{
                margin: "0 0 1rem",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              Ventas reales vs Predicción ML
            </h2>

            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <LineChart
                data={salesData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />

                <XAxis
                  dataKey="mes"
                  tick={{
                    fontSize: 13,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 13,
                  }}
                  tickFormatter={(value) =>
                    `$${(
                      value / 1000
                    ).toFixed(0)}k`
                  }
                />

                <Tooltip
                  formatter={(
                    value: number,
                    name: string
                  ) => [
                    formatoMoneda(value),
                    name,
                  ]}
                />

                <Legend />

                {/* VENTAS REALES */}

                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="#534AB7"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Ventas reales"
                />

                {/* PREDICCIÓN */}

                <Line
                  type="monotone"
                  dataKey="prediccion"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 4 }}
                  name="Predicción (ML)"
                />
              </LineChart>
            </ResponsiveContainer>

            <p
              style={{
                margin:
                  "10px 0 0",
                fontSize: 12,
                color: "#999",
              }}
            >
              * La predicción mostrada
              actualmente es temporal y será
              reemplazada por el modelo de
              Machine Learning.
            </p>
          </div>

          {/* ==================================================
              VENTAS MENSUALES + RIESGO
          ================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 340px",
              gap: "1.25rem",
            }}
          >

            {/* =================================================
                VENTAS MENSUALES
            ================================================= */}

            <div
              style={{
                background: "#fff",
                border:
                  "0.5px solid #e0e0e0",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 1rem",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                Ventas mensuales
              </h2>

              <ResponsiveContainer
                width="100%"
                height={240}
              >
                <BarChart
                  data={salesData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                  />

                  <XAxis
                    dataKey="mes"
                    tick={{
                      fontSize: 13,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 13,
                    }}
                    tickFormatter={(value) =>
                      `$${(
                        value / 1000
                      ).toFixed(0)}k`
                    }
                  />

                  <Tooltip
                    formatter={(
                      value: number
                    ) => [
                      formatoMoneda(value),
                      "Ventas",
                    ]}
                  />

                  <Bar
                    dataKey="ventas"
                    fill="#534AB7"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* =================================================
                RIESGO DE ABANDONO
            ================================================= */}

            <div
              style={{
                background: "#fff",
                border:
                  "0.5px solid #e0e0e0",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 1rem",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                Riesgo de abandono
              </h2>

              {/* DONUT */}

              <div
                style={{
                  maxWidth: 200,
                  margin: "0 auto",
                }}
              >
                <Doughnut
                  data={DONUT_DATA}
                  options={{
                    plugins: {
                      legend: {
                        position:
                          "bottom",

                        labels: {
                          font: {
                            size: 12,
                          },

                          padding: 12,
                        },
                      },
                    },

                    cutout: "68%",
                  }}
                />
              </div>

              {/* DATOS */}

              <div
                style={{
                  marginTop:
                    "1rem",

                  display: "flex",

                  flexDirection:
                    "column",

                  gap: 8,
                }}
              >
                {RIESGO_DATA.map(
                  (r) => (
                    <div
                      key={r.label}
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap: 6,

                          color: "#555",
                        }}
                      >
                        <span
                          style={{
                            width: 8,

                            height: 8,

                            borderRadius:
                              "50%",

                            background:
                              r.color,

                            display:
                              "inline-block",
                          }}
                        />

                        {r.label}
                      </span>

                      <span
                        style={{
                          fontWeight: 500,
                        }}
                      >
                        {r.value} clientes
                      </span>
                    </div>
                  )
                )}
              </div>

              <p
                style={{
                  margin:
                    "15px 0 0",

                  fontSize: 11,

                  color: "#999",

                  textAlign: "center",
                }}
              >
                Datos obtenidos de la
                base de datos
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}