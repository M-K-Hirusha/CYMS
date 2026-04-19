import { useEffect, useState } from "react";
import {
  getToolsSummary,
  getMRSummary,
  getStockSummary,
  getToolMovements,
} from "../services/reportApi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function Reports() {
  const [toolsSummary, setToolsSummary] = useState(null);
  const [toolsError, setToolsError] = useState("");
  const [toolsLoading, setToolsLoading] = useState(true);

  const [mrSummary, setMRSummary] = useState(null);
  const [mrError, setMRError] = useState("");
  const [mrLoading, setMRLoading] = useState(true);

  const [stockSummary, setStockSummary] = useState(null);
  const [stockError, setStockError] = useState("");
  const [stockLoading, setStockLoading] = useState(true);

  const [toolMovements, setToolMovements] = useState(null);
  const [movementsError, setMovementsError] = useState("");
  const [movementsLoading, setMovementsLoading] = useState(true);

  const toolChartData =
    toolsSummary?.rows?.map((row) => ({
      name: row._id,
      value: row.count,
    })) || [];

  const mrChartData =
    mrSummary?.rows?.map((row) => ({
      name: row._id,
      value: row.count,
    })) || [];

  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    const loadAll = async () => {
      const results = await Promise.allSettled([
        getToolsSummary(),
        getMRSummary(),
        getStockSummary(),
        getToolMovements(),
      ]);

      const [tools, mr, stock, movements] = results;

      if (tools.status === "fulfilled") {
        setToolsSummary(tools.value);
        setToolsError("");
      } else {
        setToolsError(tools.reason?.message || "Failed to load tools summary");
      }
      setToolsLoading(false);

      if (mr.status === "fulfilled") {
        setMRSummary(mr.value);
        setMRError("");
      } else {
        setMRError(mr.reason?.message || "Failed to load MR summary");
      }
      setMRLoading(false);

      if (stock.status === "fulfilled") {
        setStockSummary(stock.value);
        setStockError("");
      } else {
        setStockError(stock.reason?.message || "Failed to load stock summary");
      }
      setStockLoading(false);

      if (movements.status === "fulfilled") {
        setToolMovements(movements.value);
        setMovementsError("");
      } else {
        setMovementsError(
          movements.reason?.message || "Failed to load tool movements"
        );
      }
      setMovementsLoading(false);
    };

    loadAll();
  }, []);

  const sectionCardStyle = {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 16,
    background: "#020617",
    overflow: "hidden",
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Reports & Analytics
      </h1>

      <p style={{ marginBottom: 20, color: "#94a3b8" }}>
        This page shows tools summary, MR summary, stock summary, and tool
        movement analytics.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Tools Status</h3>

          {toolsLoading ? (
            <p>Loading chart...</p>
          ) : toolsError ? (
            <p style={{ color: "#ef4444" }}>{toolsError}</p>
          ) : toolChartData.length > 0 ? (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={toolChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={85}
                    label
                  >
                    {toolChartData.map((_, index) => (
                      <Cell
                        key={`tool-slice-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>No tool summary data available.</p>
          )}
        </div>

        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>MR Status</h3>

          {mrLoading ? (
            <p>Loading chart...</p>
          ) : mrError ? (
            <p style={{ color: "#ef4444" }}>{mrError}</p>
          ) : mrChartData.length > 0 ? (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mrChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p>No MR summary data available.</p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Tools Summary</h3>

          {toolsLoading && <p>Loading...</p>}
          {toolsError && <p style={{ color: "#ef4444" }}>{toolsError}</p>}

          {toolsSummary && (
            <>
              <p>
                Total Tools: <strong>{toolsSummary.total}</strong>
              </p>

              {toolsSummary.rows?.map((row) => (
                <p key={row._id}>
                  {row._id}: <strong>{row.count}</strong>
                </p>
              ))}
            </>
          )}
        </div>

        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>MR Summary</h3>

          {mrLoading && <p>Loading...</p>}
          {mrError && <p style={{ color: "#ef4444" }}>{mrError}</p>}

          {mrSummary && (
            <>
              <p>
                Total MRs: <strong>{mrSummary.total}</strong>
              </p>

              {mrSummary.rows?.map((row) => (
                <p key={row._id}>
                  {row._id}: <strong>{row.count}</strong>
                </p>
              ))}
            </>
          )}
        </div>

        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Stock Summary</h3>

          {stockLoading && <p>Loading...</p>}
          {stockError && <p style={{ color: "#ef4444" }}>{stockError}</p>}

          {stockSummary && (
            <>
              <p>
                Total Items: <strong>{stockSummary.total}</strong>
              </p>

              {stockSummary.rows?.map((row, index) => (
                <div
                  key={`${
                    row._id.yard?._id || row._id.yard
                  }-${row._id.locationCode}-${
                    row._id.material?._id || row._id.material
                  }-${index}`}
                  style={{
                    marginBottom: 14,
                    paddingBottom: 14,
                    borderBottom: "1px solid #1f2937",
                  }}
                >
                  <p>
                    Yard:{" "}
                    <strong>
                      {row._id.yard?.name || row._id.yard?.code || "N/A"}
                    </strong>
                  </p>
                  <p>
                    Location: <strong>{row._id.locationCode || "N/A"}</strong>
                  </p>
                  <p>
                    Material:{" "}
                    <strong>
                      {row._id.material?.name ||
                        row._id.material?.code ||
                        "N/A"}
                    </strong>
                  </p>
                  <p>
                    Qty: <strong>{row.qtyOnHand ?? row.qty ?? 0}</strong>
                  </p>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={sectionCardStyle}>
          <h3 style={{ marginTop: 0 }}>Tool Movements</h3>

          {movementsLoading && <p>Loading...</p>}
          {movementsError && (
            <p style={{ color: "#ef4444" }}>{movementsError}</p>
          )}

          {toolMovements && (
            <>
              {toolMovements.rows && toolMovements.rows.length > 0 ? (
                toolMovements.rows.map((row, index) => (
                  <div
                    key={row._id || index}
                    style={{
                      marginBottom: 14,
                      paddingBottom: 14,
                      borderBottom: "1px solid #1f2937",
                    }}
                  >
                    <p>
                      Type: <strong>{row.type || "N/A"}</strong>
                    </p>
                    <p>
                      Tool:{" "}
                      <strong>
                        {row.tool?.name ||
                          row.tool?.code ||
                          row.tool?._id ||
                          row.tool ||
                          "N/A"}
                      </strong>
                    </p>
                    <p>
                      From:{" "}
                      <strong>
                        {row.fromLocationCode ||
                          row.fromYard?.name ||
                          row.fromYard?.code ||
                          row.fromYard ||
                          "N/A"}
                      </strong>
                    </p>
                    <p>
                      To:{" "}
                      <strong>
                        {row.toLocationCode ||
                          row.toYard?.name ||
                          row.toYard?.code ||
                          row.toYard ||
                          "N/A"}
                      </strong>
                    </p>
                    <p>
                      Date:{" "}
                      <strong>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "N/A"}
                      </strong>
                    </p>
                  </div>
                ))
              ) : (
                <p>No movements found.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}