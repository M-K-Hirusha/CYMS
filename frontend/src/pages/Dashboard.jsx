import { useEffect, useState } from "react";
import { getHealth } from "../services/api";
import {
  getToolsSummary,
  getMRSummary,
  getStockSummary,
} from "../services/reportApi";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [tools, setTools] = useState(null);
  const [mrs, setMrs] = useState(null);
  const [stock, setStock] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const results = await Promise.allSettled([
          getHealth(),
          getToolsSummary(),
          getMRSummary(),
          getStockSummary(),
        ]);

        const [healthRes, toolsRes, mrRes, stockRes] = results;

        if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        if (toolsRes.status === "fulfilled") setTools(toolsRes.value);
        if (mrRes.status === "fulfilled") setMrs(mrRes.value);
        if (stockRes.status === "fulfilled") setStock(stockRes.value);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const cardStyle = {
    background: "#020617",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 16,
  };

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: "#94a3b8", marginBottom: 20 }}>
        Overview of system activity and resources
      </p>

      {loading && <p>Loading dashboard...</p>}

      {/* STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>Total Tools</p>
          <h2>{tools?.total ?? "-"}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>Total MRs</p>
          <h2>{mrs?.total ?? "-"}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>Stock Items</p>
          <h2>{stock?.total ?? "-"}</h2>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#94a3b8" }}>Backend Status</p>
          <h2 style={{ color: health ? "#22c55e" : "#ef4444" }}>
            {health ? "Online" : "Offline"}
          </h2>
        </div>
      </div>

      {/* HEALTH DETAILS */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 10 }}>Backend Details</h3>

        {health ? (
          <div style={{ fontSize: 14, color: "#cbd5e1" }}>
            <p>Status: {health.status}</p>
            <p>Environment: {health.environment}</p>
            <p>
              Time:{" "}
              {health.timestamp
                ? new Date(health.timestamp).toLocaleString()
                : "-"}
            </p>
          </div>
        ) : (
          <p style={{ color: "#ef4444" }}>Backend not reachable</p>
        )}
      </div>
    </div>
  );
}