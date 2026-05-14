import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Server,
  Wrench,
  Database,
} from "lucide-react";
import { getHealth } from "../services/api";
import {
  getToolsSummary,
  getMRSummary,
  getStockSummary,
} from "../services/reportApi";
import { theme } from "../styles/theme";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [tools, setTools] = useState(null);
  const [mrs, setMrs] = useState(null);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const navigate = useNavigate();

  const isMobile = screenWidth <= 900;
  const isTablet = screenWidth > 900 && screenWidth <= 1200;

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

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

      setLoading(false);
    }

    loadAll();
  }, []);

  const backendOnline = Boolean(health);

  const availableTools = tools?.byStatus?.AVAILABLE ?? tools?.available ?? 0;
  const issuedTools = tools?.byStatus?.ISSUED ?? tools?.issued ?? 0;
  const maintenanceTools =
    tools?.byStatus?.MAINTENANCE ?? tools?.maintenance ?? 0;
  const retiredTools = tools?.byStatus?.RETIRED ?? tools?.retired ?? 0;

  const pendingMRs = mrs?.byStatus?.PENDING ?? mrs?.pending ?? 0;
  const approvedMRs = mrs?.byStatus?.APPROVED ?? mrs?.approved ?? 0;
  const rejectedMRs = mrs?.byStatus?.REJECTED ?? mrs?.rejected ?? 0;

  const totalTools = tools?.total ?? 0;
  const totalMRs = mrs?.total ?? 0;
  const totalStockQuantity = stock?.totalQuantity ?? stock?.total ?? 0;
  const stockRecords =
    stock?.records ??
    stock?.stockRecords ??
    stock?.totalRecords ??
    stock?.recordCount ??
    stock?.rows?.length ??
    0;

  return (
    <div style={pageStyle}>
      <div style={getHeaderStyle(isMobile)}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>CYMS Overview</p>

          <div style={getTitleRowStyle(isMobile)}>
            <LayoutDashboard
              size={isMobile ? 22 : 26}
              color={theme.textSoft}
              strokeWidth={2.2}
            />

            <h1 style={getTitleStyle(isMobile)}>Dashboard</h1>
          </div>

          <p style={subtitleStyle}>
            Track material requests, stock levels, tool availability, and key
            yard operations.
          </p>
        </div>

        <div
          style={{
            ...statusPillStyle,
            width: isMobile ? "100%" : "auto",
            justifyContent: "center",
            background: backendOnline ? theme.successSoft : theme.dangerSoft,
            borderColor: backendOnline ? theme.success : theme.danger,
            color: backendOnline ? theme.success : theme.danger,
          }}
        >
          <Server size={16} />
          {backendOnline ? "Backend Online" : "Backend Offline"}
        </div>
      </div>

      <div style={getStatsGridStyle(isMobile, isTablet)}>
        <StatCard
          label="Total Tools"
          value={totalTools}
          icon={<Wrench size={21} />}
          loading={loading}
          isMobile={isMobile}
        />

        <StatCard
          label="Total Material Requests"
          value={totalMRs}
          icon={<ClipboardList size={21} />}
          loading={loading}
          isMobile={isMobile}
        />

        <StatCard
          label="Total Stock Quantity"
          value={totalStockQuantity}
          icon={<Database size={21} />}
          loading={loading}
          isMobile={isMobile}
        />

        <StatCard
          label="Pending MRs"
          value={pendingMRs}
          icon={<AlertCircle size={21} />}
          loading={loading}
          highlight={pendingMRs > 0}
          isMobile={isMobile}
        />
      </div>

      <div style={getContentGridStyle(isMobile, isTablet)}>
        <SummaryPanel
          title="Material Request Summary"
          text="Current approval status of material requests."
          buttonLabel="View All"
          onClick={() => navigate("/mrs")}
          loading={loading}
          isMobile={isMobile}
        >
          <InfoRow label="Pending Requests" value={pendingMRs} />
          <InfoRow label="Approved Requests" value={approvedMRs} />
          <InfoRow label="Rejected Requests" value={rejectedMRs} />
          <InfoRow label="Total Requests" value={totalMRs} />
        </SummaryPanel>

        <SummaryPanel
          title="Tools Summary"
          text="Tool availability and operational status."
          buttonLabel="View All"
          onClick={() => navigate("/tools")}
          loading={loading}
          isMobile={isMobile}
        >
          <InfoRow label="Available Tools" value={availableTools} />
          <InfoRow label="Issued Tools" value={issuedTools} />
          <InfoRow label="Maintenance Tools" value={maintenanceTools} />
          <InfoRow label="Retired Tools" value={retiredTools} />
        </SummaryPanel>
      </div>

      <div style={getContentGridStyle(isMobile, isTablet)}>
        <SummaryPanel
          title="Stock Summary"
          text="Overall stock quantity and number of stock records."
          buttonLabel="View All"
          onClick={() => navigate("/inventory")}
          loading={loading}
          isMobile={isMobile}
        >
          <InfoRow label="Total Stock Quantity" value={totalStockQuantity} />
          <InfoRow label="Stock Records" value={stockRecords} />
          <InfoRow
            label="Average Qty per Record"
            value={
              stockRecords > 0
                ? Math.round(totalStockQuantity / stockRecords)
                : 0
            }
          />
        </SummaryPanel>

        <div style={panelStyle}>
          <div style={getPanelHeaderStyle(isMobile)}>
            <div style={{ minWidth: 0 }}>
              <h3 style={panelTitleStyle}>Action Checklist</h3>
              <p style={panelTextStyle}>
                Quick operational reminders for daily management.
              </p>
            </div>
            <CheckCircle2 size={22} color={theme.success} />
          </div>

          {loading ? (
            <SkeletonLines />
          ) : (
            <div style={checklistStyle}>
              <ChecklistItem
                good={pendingMRs === 0}
                text={
                  pendingMRs === 0
                    ? "No pending material requests"
                    : `${pendingMRs} material request(s) awaiting approval`
                }
              />
              <ChecklistItem
                good={maintenanceTools === 0}
                text={
                  maintenanceTools === 0
                    ? "No tools in maintenance"
                    : `${maintenanceTools} tool(s) currently in maintenance`
                }
              />
              <ChecklistItem
                good={backendOnline}
                text={
                  backendOnline
                    ? "Backend connection is healthy"
                    : "Backend connection needs attention"
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ title, text, buttonLabel, onClick, loading, children, isMobile }) {
  return (
    <div style={panelStyle}>
      <div style={getPanelHeaderStyle(isMobile)}>
        <div style={{ minWidth: 0 }}>
          <h3 style={panelTitleStyle}>{title}</h3>
          <p style={panelTextStyle}>{text}</p>
        </div>
        <ActionButton label={buttonLabel} onClick={onClick} isMobile={isMobile} />
      </div>

      {loading ? <SkeletonLines /> : <div style={summaryListStyle}>{children}</div>}
    </div>
  );
}

function StatCard({ label, value, icon, loading, highlight, isMobile }) {
  return (
    <div
      style={{
        ...statCardStyle,
        padding: isMobile ? 14 : 18,
        minHeight: isMobile ? 108 : 128,
        borderColor: highlight ? theme.warning : theme.border,
      }}
    >
      <div style={statTopStyle}>
        <div
          style={{
            ...statIconStyle,
            color: highlight ? theme.warning : theme.primary,
            background: highlight ? theme.warningSoft : theme.primarySoft,
            borderColor: highlight ? theme.warning : theme.primaryBorder,
          }}
        >
          {icon}
        </div>
      </div>

      <p style={statLabelStyle}>{label}</p>

      {loading ? (
        <div style={skeletonNumberStyle} />
      ) : (
        <h2 style={getStatValueStyle(isMobile)}>{value}</h2>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

function ChecklistItem({ good, text }) {
  return (
    <div
      style={{
        ...checkItemStyle,
        borderColor: good ? theme.success : theme.warning,
        background: good ? theme.successSoft : theme.warningSoft,
      }}
    >
      <span
        style={{
          ...checkDotStyle,
          background: good ? theme.success : theme.warning,
        }}
      />
      <span style={checkTextStyle}>{text}</span>
    </div>
  );
}

function SkeletonLines() {
  return (
    <div style={{ display: "grid", gap: 10, width: "100%", minWidth: 0 }}>
      <div style={skeletonLineStyle} />
      <div style={{ ...skeletonLineStyle, width: "75%" }} />
      <div style={{ ...skeletonLineStyle, width: "55%" }} />
    </div>
  );
}

function ActionButton({ label, onClick, isMobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...actionButtonStyle,
        width: isMobile ? "100%" : "auto",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.primary;
        e.currentTarget.style.color = "#ffffff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.primarySoft;
        e.currentTarget.style.color = theme.primary;
      }}
    >
      {label}
    </button>
  );
}

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
};

function getHeaderStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: isMobile ? "stretch" : "flex-start",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getTitleRowStyle(isMobile) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    width: "100%",
    minWidth: 0,
  };
}

function getTitleStyle(isMobile) {
  return {
    margin: 0,
    color: theme.text,
    fontSize: isMobile ? 28 : 34,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1.1,
  };
}

const eyebrowStyle = {
  margin: "0 0 6px",
  color: theme.primary,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const subtitleStyle = {
  margin: "8px 0 0",
  color: theme.muted,
  lineHeight: 1.5,
  maxWidth: 720,
};

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid",
  fontWeight: 900,
  whiteSpace: "nowrap",
  minWidth: 0,
};

const cardBaseStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 18,
  boxShadow: theme.shadow,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

function getStatsGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : isTablet
        ? "repeat(2, minmax(0, 1fr))"
        : "repeat(4, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const statCardStyle = {
  ...cardBaseStyle,
};

const statTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const statIconStyle = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: `1px solid ${theme.primaryBorder}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const statLabelStyle = {
  color: theme.muted,
  margin: "14px 0 7px",
  fontSize: 14,
};

function getStatValueStyle(isMobile) {
  return {
    margin: 0,
    color: theme.text,
    fontSize: isMobile ? 26 : 31,
    fontWeight: 950,
    lineHeight: 1.1,
    overflowWrap: "anywhere",
  };
}

function getContentGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 1fr",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const panelStyle = {
  ...cardBaseStyle,
  padding: 20,
};

function getPanelHeaderStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "flex-start",
    gap: 12,
    marginBottom: 18,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const panelTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 19,
};

const panelTextStyle = {
  margin: "6px 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.45,
};

const summaryListStyle = {
  display: "grid",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const infoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "11px 0",
  borderBottom: `1px solid ${theme.border}`,
  width: "100%",
  minWidth: 0,
};

const infoLabelStyle = {
  color: theme.muted,
  minWidth: 0,
};

const infoValueStyle = {
  color: theme.text,
  textAlign: "right",
  flexShrink: 0,
};

const checklistStyle = {
  display: "grid",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const checkItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 13px",
  borderRadius: 14,
  border: "1px solid",
  width: "100%",
  minWidth: 0,
};

const checkDotStyle = {
  width: 9,
  height: 9,
  borderRadius: 999,
  flexShrink: 0,
};

const checkTextStyle = {
  color: theme.text,
  fontWeight: 750,
  fontSize: 14,
  minWidth: 0,
};

const actionButtonStyle = {
  padding: "6px 12px",
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primary,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",
};

const skeletonLineStyle = {
  height: 14,
  width: "100%",
  borderRadius: 999,
  background: `linear-gradient(90deg, ${theme.surfaceSoft}, ${theme.border}, ${theme.surfaceSoft})`,
};

const skeletonNumberStyle = {
  height: 34,
  width: 72,
  borderRadius: 10,
  background: `linear-gradient(90deg, ${theme.surfaceSoft}, ${theme.border}, ${theme.surfaceSoft})`,
};