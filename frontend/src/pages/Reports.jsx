import { useEffect, useMemo, useState } from "react";
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
  const [chartsReady, setChartsReady] = useState(false);

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

  const [showToolsDetails, setShowToolsDetails] = useState(false);
  const [showMRDetails, setShowMRDetails] = useState(false);
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [showMovementsDetails, setShowMovementsDetails] = useState(false);

  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const stockPageSize = 5;

  const [movementSearch, setMovementSearch] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const movementPageSize = 5;

  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 150);

    async function loadAll() {
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
    }

    loadAll();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setStockPage(1);
  }, [stockSearch, showStockDetails]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementSearch, movementType, showMovementsDetails]);

  const stockRows = Array.isArray(stockSummary?.rows) ? stockSummary.rows : [];

  const movementRows = Array.isArray(toolMovements?.rows)
    ? toolMovements.rows
    : Array.isArray(toolMovements?.items)
    ? toolMovements.items
    : Array.isArray(toolMovements)
    ? toolMovements
    : [];

  const filteredStockRows = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return stockRows;

    return stockRows.filter((row) => {
      const yard = row._id?.yard?.name || row._id?.yard?.code || "";
      const location = row._id?.locationCode || "";
      const material =
        row._id?.material?.name ||
        row._id?.material?.code ||
        "Deleted Material";
      const code = row._id?.material?.code || "";

      return (
        yard.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q)
      );
    });
  }, [stockRows, stockSearch]);

  const stockTotalPages =
    Math.ceil(filteredStockRows.length / stockPageSize) || 1;

  const paginatedStockRows = filteredStockRows.slice(
    (stockPage - 1) * stockPageSize,
    stockPage * stockPageSize
  );

  const filteredMovementRows = useMemo(() => {
    let data = movementRows;

    if (movementType) {
      data = data.filter((row) => row.type === movementType);
    }

    const q = movementSearch.trim().toLowerCase();
    if (!q) return data;

    return data.filter((row) => {
      const tool =
        row.tool?.name || row.tool?.code || row.tool?._id || row.tool || "";

      const from = [row.fromYard?.name, row.fromYard?.code, row.fromLocationCode]
        .filter(Boolean)
        .join(" ");

      const to = [row.toYard?.name, row.toYard?.code, row.toLocationCode]
        .filter(Boolean)
        .join(" ");

      const type = row.type || "";

      return (
        tool.toLowerCase().includes(q) ||
        from.toLowerCase().includes(q) ||
        to.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q)
      );
    });
  }, [movementRows, movementSearch, movementType]);

  const movementTotalPages =
    Math.ceil(filteredMovementRows.length / movementPageSize) || 1;

  const paginatedMovementRows = filteredMovementRows.slice(
    (movementPage - 1) * movementPageSize,
    movementPage * movementPageSize
  );

  const toolChartData =
    toolsSummary?.rows?.map((row) => ({
      name: row._id || "UNKNOWN",
      value: row.count || 0,
    })) || [];

  const mrChartData =
    mrSummary?.rows?.map((row) => ({
      name: row._id || "UNKNOWN",
      value: row.count || 0,
    })) || [];

  const toolsCounts = useMemo(() => {
    const rows = Array.isArray(toolsSummary?.rows) ? toolsSummary.rows : [];
    const getCount = (status) =>
      rows.find((row) => String(row._id).toUpperCase() === status)?.count || 0;

    return {
      total: toolsSummary?.total || 0,
      available: getCount("AVAILABLE"),
      issued: getCount("ISSUED"),
      maintenance: getCount("MAINTENANCE"),
      retired: getCount("RETIRED"),
    };
  }, [toolsSummary]);

  const mrCounts = useMemo(() => {
    const rows = Array.isArray(mrSummary?.rows) ? mrSummary.rows : [];
    const getCount = (status) =>
      rows.find((row) => String(row._id).toUpperCase() === status)?.count || 0;

    return {
      total: mrSummary?.total || 0,
      approved: getCount("APPROVED"),
      rejected: getCount("REJECTED"),
      pending: getCount("PENDING"),
    };
  }, [mrSummary]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#fff" }}>
          Reports & Analytics
        </h1>
        <p style={{ margin: "10px 0 0", color: "#94a3b8" }}>
          View tools summary, MR summary, stock summary, and tool movement
          analytics.
        </p>
      </div>

      <div style={topGridStyle}>
        <KpiCard
          label="Total Tools"
          value={toolsLoading ? "..." : toolsCounts.total}
        />
        <KpiCard
          label="Available"
          value={toolsLoading ? "..." : toolsCounts.available}
          color="#4ade80"
        />
        <KpiCard
          label="Issued"
          value={toolsLoading ? "..." : toolsCounts.issued}
          color="#fbbf24"
        />
        <KpiCard
          label="Maintenance"
          value={toolsLoading ? "..." : toolsCounts.maintenance}
          color="#60a5fa"
        />
        <KpiCard
          label="Retired"
          value={toolsLoading ? "..." : toolsCounts.retired}
          color="#f87171"
        />
      </div>

      <div style={chartGridStyle}>
        <div style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Tools Status</h3>

          {toolsLoading ? (
            <p>Loading chart...</p>
          ) : toolsError ? (
            <p style={{ color: "#ef4444" }}>{toolsError}</p>
          ) : chartsReady && toolChartData.length > 0 ? (
            <div style={chartBoxStyle}>
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
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
          <h3 style={sectionTitleStyle}>MR Status</h3>

          {mrLoading ? (
            <p>Loading chart...</p>
          ) : mrError ? (
            <p style={{ color: "#ef4444" }}>{mrError}</p>
          ) : chartsReady && mrChartData.length > 0 ? (
            <div style={chartBoxStyle}>
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

      <div style={summaryGridStyle}>
        <SummaryCard
          title="Tools Summary"
          loading={toolsLoading}
          error={toolsError}
        >
          <SummaryRow label="Total Tools" value={toolsCounts.total} />
          <SummaryRow label="Available" value={toolsCounts.available} />
          <SummaryRow label="Issued" value={toolsCounts.issued} />
          <SummaryRow label="Maintenance" value={toolsCounts.maintenance} />
          <SummaryRow label="Retired" value={toolsCounts.retired} />
          <FooterButton onClick={() => setShowToolsDetails(true)} />
        </SummaryCard>

        <SummaryCard title="MR Summary" loading={mrLoading} error={mrError}>
          <SummaryRow label="Total MRs" value={mrCounts.total} />
          <SummaryRow label="Approved" value={mrCounts.approved} />
          <SummaryRow label="Rejected" value={mrCounts.rejected} />
          <SummaryRow label="Pending" value={mrCounts.pending} />
          <FooterButton onClick={() => setShowMRDetails(true)} />
        </SummaryCard>

        <SummaryCard
          title="Stock Summary"
          loading={stockLoading}
          error={stockError}
        >
          <SummaryRow label="Total Quantity" value={stockSummary?.total || 0} />
          <SummaryRow label="Stock Records" value={stockRows.length} />
          <FooterButton onClick={() => setShowStockDetails(true)} />
        </SummaryCard>
      </div>

      <div style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            Tool Movements (Latest)
          </h3>

          <button
            type="button"
            onClick={() => setShowMovementsDetails(true)}
            style={detailsButtonStyle}
          >
            View Details
          </button>
        </div>

        {movementsLoading && <p>Loading...</p>}
        {movementsError && <p style={{ color: "#ef4444" }}>{movementsError}</p>}

        {movementRows.length > 0 ? (
          <MovementsTable rows={movementRows.slice(0, 8)} />
        ) : (
          !movementsLoading && <p>No movements found.</p>
        )}
      </div>

      {showToolsDetails && (
        <SimpleModal
          title="Tools Summary Details"
          onClose={() => setShowToolsDetails(false)}
        >
          <SummaryRow label="Total Tools" value={toolsCounts.total} />
          {toolsSummary?.rows?.map((row) => (
            <SummaryRow key={row._id} label={row._id} value={row.count} />
          ))}
        </SimpleModal>
      )}

      {showMRDetails && (
        <SimpleModal
          title="MR Summary Details"
          onClose={() => setShowMRDetails(false)}
        >
          <SummaryRow label="Total MRs" value={mrCounts.total} />
          {mrSummary?.rows?.map((row) => (
            <SummaryRow key={row._id} label={row._id} value={row.count} />
          ))}
        </SimpleModal>
      )}

      {showStockDetails && (
        <div style={overlayStyle}>
          <div style={wideDetailsModalStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>Stock Summary Details</h3>
              <button
                type="button"
                onClick={() => setShowStockDetails(false)}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by yard, location, material, or code..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              style={searchInputStyle}
            />

            {stockRows.length > 0 ? (
              <>
                <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                  <StockTable rows={paginatedStockRows} />
                </div>

                <Pagination
                  showing={paginatedStockRows.length}
                  total={filteredStockRows.length}
                  page={stockPage}
                  totalPages={stockTotalPages}
                  onPrev={() => setStockPage((p) => Math.max(p - 1, 1))}
                  onNext={() =>
                    setStockPage((p) => Math.min(p + 1, stockTotalPages))
                  }
                />
              </>
            ) : (
              <p>No stock summary data available.</p>
            )}

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setShowStockDetails(false)}
                style={detailsButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovementsDetails && (
        <div style={overlayStyle}>
          <div style={wideDetailsModalStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>Tool Movements Details</h3>
              <button
                type="button"
                onClick={() => setShowMovementsDetails(false)}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <div style={filterRowStyle}>
              <input
                type="text"
                placeholder="Search tool, from, to..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                style={{ ...searchInputStyle, marginBottom: 0, flex: 1 }}
              />

              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Types</option>
                <option value="CREATE">CREATE</option>
                <option value="ISSUE">ISSUE</option>
                <option value="RETURN">RETURN</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              </select>
            </div>

            {movementRows.length > 0 ? (
              <>
                <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                  <MovementsTable rows={paginatedMovementRows} />
                </div>

                <Pagination
                  showing={paginatedMovementRows.length}
                  total={filteredMovementRows.length}
                  page={movementPage}
                  totalPages={movementTotalPages}
                  onPrev={() => setMovementPage((p) => Math.max(p - 1, 1))}
                  onNext={() =>
                    setMovementPage((p) =>
                      Math.min(p + 1, movementTotalPages)
                    )
                  }
                />
              </>
            ) : (
              <p>No tool movement data available.</p>
            )}

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => setShowMovementsDetails(false)}
                style={detailsButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color = "#ffffff" }) {
  return (
    <div style={summaryCardBase}>
      <p style={summaryLabelStyle}>{label}</p>
      <h3 style={{ ...summaryValueStyle, color }}>{value}</h3>
    </div>
  );
}

function SummaryCard({ title, loading, error, children }) {
  return (
    <div style={compactSummaryCardStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "#ef4444" }}>{error}</p>
      ) : (
        children
      )}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={summaryRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FooterButton({ onClick }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: 16 }}>
      <button type="button" onClick={onClick} style={detailsButtonStyle}>
        View Details
      </button>
    </div>
  );
}

function SimpleModal({ title, onClose, children }) {
  return (
    <div style={overlayStyle}>
      <div style={detailsModalStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}>{title}</h3>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={detailsListStyle}>{children}</div>

        <div style={modalFooterStyle}>
          <button type="button" onClick={onClose} style={detailsButtonStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StockTable({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Yard</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Material</th>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Qty</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => {
            const yardName =
              row._id?.yard?.name || row._id?.yard?.code || "N/A";
            const location = row._id?.locationCode || "N/A";
            const materialName =
              row._id?.material?.name ||
              row._id?.material?.code ||
              "Deleted Material";
            const materialCode = row._id?.material?.code || "-";
            const qty = row.qtyOnHand ?? row.qty ?? 0;

            return (
              <tr key={`stock-${index}`}>
                <td style={tdStyle}>{yardName}</td>
                <td style={tdStyle}>{location}</td>
                <td style={tdStyle}>{materialName}</td>
                <td style={tdStyle}>{materialCode}</td>
                <td style={tdStyle}>
                  <strong>{qty}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Tool</th>
            <th style={thStyle}>From</th>
            <th style={thStyle}>To</th>
            <th style={thStyle}>Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index}>
              <td style={tdStyle}>
                <span style={getMovementBadge(row.type)}>
                  {row.type || "N/A"}
                </span>
              </td>

              <td style={tdStyle}>
                {row.tool?.name ||
                  row.tool?.code ||
                  row.tool?._id ||
                  row.tool ||
                  "N/A"}
              </td>

              <td style={tdStyle}>
                {[row.fromYard?.name, row.fromYard?.code, row.fromLocationCode]
                  .filter(Boolean)
                  .join(" / ") || "N/A"}
              </td>

              <td style={tdStyle}>
                {[row.toYard?.name, row.toYard?.code, row.toLocationCode]
                  .filter(Boolean)
                  .join(" / ") || "N/A"}
              </td>

              <td style={tdStyle}>
                {row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ showing, total, page, totalPages, onPrev, onNext }) {
  return (
    <div style={paginationStyle}>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>
        Showing {showing} of {total} records
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrev}
          style={{
            ...paginationButtonStyle,
            opacity: page === 1 ? 0.5 : 1,
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>

        <span style={{ color: "#e2e8f0", fontSize: 13 }}>
          Page {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={page === totalPages}
          onClick={onNext}
          style={{
            ...paginationButtonStyle,
            opacity: page === totalPages ? 0.5 : 1,
            cursor: page === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const chartGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const sectionCardStyle = {
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 20,
  background: "#0f172a",
  overflow: "hidden",
};

const summaryCardBase = {
  borderRadius: 16,
  padding: 18,
  border: "1px solid #1f2937",
  background: "#0f172a",
};

const compactSummaryCardStyle = {
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 20,
  background: "#0f172a",
  display: "flex",
  flexDirection: "column",
  minHeight: 250,
};

const chartBoxStyle = {
  width: "100%",
  height: 250,
  minHeight: 250,
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 12,
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 700,
};

const summaryLabelStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
};

const summaryValueStyle = {
  margin: "10px 0 0 0",
  color: "#ffffff",
  fontSize: 28,
  fontWeight: 800,
};

const thStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #1f2937",
  color: "#94a3b8",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #1f2937",
  color: "#e2e8f0",
  fontSize: 13,
  verticalAlign: "top",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  paddingBottom: 8,
  borderBottom: "1px solid #1f2937",
  color: "#e2e8f0",
  fontSize: 14,
};

const detailsButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const detailsModalStyle = {
  width: "100%",
  maxWidth: 520,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
};

const wideDetailsModalStyle = {
  width: "100%",
  maxWidth: 900,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const modalTitleStyle = {
  margin: 0,
  color: "#ffffff",
  fontSize: 20,
  fontWeight: 700,
};

const modalFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 20,
};

const closeButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#1e293b",
  color: "#ffffff",
  width: 34,
  height: 34,
  cursor: "pointer",
  fontSize: 14,
};

const detailsListStyle = {
  display: "grid",
  gap: 10,
};

const searchInputStyle = {
  marginBottom: 14,
  padding: "10px 12px",
  width: "100%",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#e2e8f0",
  outline: "none",
};

const filterRowStyle = {
  display: "flex",
  gap: 10,
  marginBottom: 14,
  flexWrap: "wrap",
};

const selectStyle = {
  minWidth: 170,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#e2e8f0",
  outline: "none",
};

const paginationStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
};

const paginationButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
};

function getMovementBadge(type) {
  const base = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid",
    whiteSpace: "nowrap",
  };

  if (type === "ISSUE") {
    return {
      ...base,
      color: "#fbbf24",
      background: "rgba(245,158,11,0.15)",
      borderColor: "rgba(245,158,11,0.35)",
    };
  }

  if (type === "RETURN") {
    return {
      ...base,
      color: "#60a5fa",
      background: "rgba(59,130,246,0.15)",
      borderColor: "rgba(59,130,246,0.35)",
    };
  }

  if (type === "TRANSFER") {
    return {
      ...base,
      color: "#c084fc",
      background: "rgba(168,85,247,0.15)",
      borderColor: "rgba(168,85,247,0.35)",
    };
  }

  if (type === "STATUS_CHANGE") {
    return {
      ...base,
      color: "#f87171",
      background: "rgba(239,68,68,0.15)",
      borderColor: "rgba(239,68,68,0.35)",
    };
  }

  if (type === "CREATE") {
    return {
      ...base,
      color: "#4ade80",
      background: "rgba(34,197,94,0.15)",
      borderColor: "rgba(34,197,94,0.35)",
    };
  }

  return {
    ...base,
    color: "#cbd5e1",
    background: "rgba(148,163,184,0.15)",
    borderColor: "rgba(148,163,184,0.35)",
  };
}