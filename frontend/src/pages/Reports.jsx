import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Download,
  FileSpreadsheet,
  PackageSearch,
  PieChart as PieIcon,
  Wrench,
  X,
} from "lucide-react";
import {
  getToolsSummary,
  getMRSummary,
  getStockSummary,
  getToolMovements,
} from "../services/reportApi";
import { getMRs } from "../services/mrApi";
import { getTools } from "../services/toolApi";
import { getAllYards } from "../services/yardApi";
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
import { useToast } from "../context/ToastContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { theme } from "../styles/theme";

const COLORS = [theme.primary, theme.success, theme.warning, theme.danger, "#8b5cf6"];
const stockPageSize = 5;
const movementPageSize = 5;

export default function Reports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isMobile, isTablet } = useResponsive();

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

  const [mrRows, setMRRows] = useState([]);
  const [yards, setYards] = useState([]);

  const [showToolsDetails, setShowToolsDetails] = useState(false);
  const [showMRDetails, setShowMRDetails] = useState(false);
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [showMovementsDetails, setShowMovementsDetails] = useState(false);

  const [stockSearch, setStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);

  const [movementSearch, setMovementSearch] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementPage, setMovementPage] = useState(1);

  const [downloadModal, setDownloadModal] = useState(null);
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  const [modalYardId, setModalYardId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [preparingDownload, setPreparingDownload] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const chartTimer = setTimeout(() => setChartsReady(true), 150);

    async function loadAll() {
      const results = await Promise.allSettled([
        getToolsSummary(),
        getMRSummary(),
        getStockSummary(),
        getToolMovements(),
        getMRs(),
        getAllYards(),
      ]);

      const [tools, mr, stock, movements, mrsList, yardsList] = results;

      if (mrsList.status === "fulfilled") {
        setMRRows(mrsList.value?.mrs || mrsList.value?.rows || mrsList.value || []);
      }

      if (yardsList.status === "fulfilled") {
        setYards(yardsList.value?.yards || yardsList.value || []);
      }

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
        setMovementsError(movements.reason?.message || "Failed to load tool movements");
      }
      setMovementsLoading(false);
    }

    loadAll();
    return () => clearTimeout(chartTimer);
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
      const material = row._id?.material?.name || row._id?.material?.code || "Deleted Material";
      const code = row._id?.material?.code || "";

      return (
        yard.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q)
      );
    });
  }, [stockRows, stockSearch]);

  const stockTotalPages = Math.ceil(filteredStockRows.length / stockPageSize) || 1;
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
      const tool = row.tool?.name || row.tool?.code || row.tool?._id || row.tool || "";
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

  const movementTotalPages = Math.ceil(filteredMovementRows.length / movementPageSize) || 1;
  const paginatedMovementRows = filteredMovementRows.slice(
    (movementPage - 1) * movementPageSize,
    movementPage * movementPageSize
  );

  const toolChartData =
    toolsSummary?.rows?.map((row) => ({ name: row._id || "UNKNOWN", value: row.count || 0 })) || [];

  const mrChartData = useMemo(() => {
    const rows = Array.isArray(mrRows) ? mrRows : [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const counts = {
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0,
    };

    rows.forEach((mr) => {
      if (!mr?.createdAt) return;

      const createdDate = new Date(mr.createdAt);

      if (createdDate < thirtyDaysAgo) return;

      const status = String(mr.status || "").toUpperCase();

      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });

    return [
      {
        name: "APPROVED",
        value: counts.APPROVED,
      },
      {
        name: "PENDING",
        value: counts.PENDING,
      },
      {
        name: "REJECTED",
        value: counts.REJECTED,
      },
    ];
  }, [mrRows]);

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

  const stockTotalQuantity = stockSummary?.totalQuantity ?? stockSummary?.total ?? 0;

  function openDownloadModal(type) {
    setDownloadModal(type);
    setModalDateFrom("");
    setModalDateTo("");
    setModalYardId("");
    setDownloadComplete(false);
    setProgress(0);
  }

  function addPdfHeader(doc, title) {
    doc.setFontSize(18);
    doc.text(`CYMS - ${title}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    doc.text("Construction Yard Management System", 14, 32);
    doc.setDrawColor(37, 99, 235);
    doc.line(14, 36, 196, 36);
  }

  function isWithinDateRange(createdAt) {
    if (!modalDateFrom && !modalDateTo) return true;
    if (!createdAt) return false;

    const createdDate = new Date(createdAt);
    const fromDate = modalDateFrom ? new Date(`${modalDateFrom}T00:00:00`) : null;
    const toDate = modalDateTo ? new Date(`${modalDateTo}T23:59:59`) : null;

    if (fromDate && createdDate < fromDate) return false;
    if (toDate && createdDate > toDate) return false;
    return true;
  }

  function downloadMRPDF() {
    const doc = new jsPDF("l", "mm", "a4");
    addPdfHeader(doc, "Material Request Report");

    autoTable(doc, {
      startY: 44,
      head: [["Status", "Count"]],
      body: [
        ["Total MRs", mrCounts.total],
        ["Pending", mrCounts.pending],
        ["Approved", mrCounts.approved],
        ["Rejected", mrCounts.rejected],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    const filteredMRRows = (Array.isArray(mrRows) ? mrRows : []).filter((mr) => {
      const mrYardId =
        mr.yard?._id || mr.requestingYard?._id || mr.siteYard?._id || mr.yard || mr.requestingYard || mr.siteYard;

      if (modalYardId && String(mrYardId) !== String(modalYardId)) return false;
      return isWithinDateRange(mr.createdAt);
    });

    const rows = filteredMRRows.map((mr) => [
      mr.mrNo || mr.mrNumber || mr.requestNumber || `MR-${String(mr._id).slice(-6)}`,
      mr.status || "N/A",
      mr.requestedBy?.fullName || mr.requestedBy?.name || mr.createdBy?.fullName || mr.createdBy?.name || "N/A",
      mr.yard?.name || mr.requestingYard?.name || mr.siteYard?.name || mr.yardName || "N/A",
      Array.isArray(mr.items) ? mr.items.length : 0,
      mr.createdAt ? new Date(mr.createdAt).toLocaleString() : "N/A",
    ]);

    doc.setFontSize(14);
    doc.text("MR Detailed List", 14, doc.lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [["MR Number", "Status", "Requested By", "Yard", "Items", "Created Date"]],
      body: rows.length > 0 ? rows : [["No MRs found", "-", "-", "-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("CYMS_Material_Request_Report.pdf");
    showToast("MR report downloaded successfully", "success");
  }

  function downloadStockPDF() {
    const doc = new jsPDF("l", "mm", "a4");
    addPdfHeader(doc, "Stock Summary Report");

    const filteredStockPDFRows = stockRows.filter((row) => {
      const stockYardId = row._id?.yard?._id || row._id?.yard;
      if (modalYardId && String(stockYardId) !== String(modalYardId)) return false;
      return true;
    });

    const rows = filteredStockPDFRows.map((row) => [
      row._id?.yard?.name || row._id?.yard?.code || "N/A",
      row._id?.locationCode || "N/A",
      row._id?.material?.name || row._id?.material?.code || "Deleted Material",
      row._id?.material?.code || "-",
      row.qtyOnHand ?? row.qty ?? 0,
    ]);

    autoTable(doc, {
      startY: 44,
      head: [["Yard", "Location", "Material", "Code", "Qty"]],
      body: rows.length > 0 ? rows : [["No stock found", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("CYMS_Stock_Summary_Report.pdf");
    showToast("Stock PDF downloaded successfully", "success");
  }

  async function downloadToolsPDF() {
    const getYardName = (yard) => {
      if (!yard) return "N/A";
      if (typeof yard === "object") return yard.name || yard.code || "N/A";
      return "N/A";
    };

    const toolsResponse = await getTools();
    const toolsList = Array.isArray(toolsResponse?.items)
      ? toolsResponse.items
      : Array.isArray(toolsResponse?.tools)
      ? toolsResponse.tools
      : Array.isArray(toolsResponse?.data?.items)
      ? toolsResponse.data.items
      : Array.isArray(toolsResponse?.data?.tools)
      ? toolsResponse.data.tools
      : Array.isArray(toolsResponse)
      ? toolsResponse
      : [];

    const doc = new jsPDF("l", "mm", "a4");
    addPdfHeader(doc, "Tools Report");

    autoTable(doc, {
      startY: 44,
      head: [["Metric", "Count"]],
      body: [
        ["Total Tools", toolsCounts.total],
        ["Available", toolsCounts.available],
        ["Issued", toolsCounts.issued],
        ["Maintenance", toolsCounts.maintenance],
        ["Retired", toolsCounts.retired],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    const filteredToolsList = toolsList.filter((tool) => {
      const toolYardId = tool.currentYard?._id || tool.currentYard;
      if (modalYardId && String(toolYardId) !== String(modalYardId)) return false;
      return isWithinDateRange(tool.createdAt);
    });

    const rows = filteredToolsList.map((tool) => [
      tool.code || tool.toolCode || `TOOL-${String(tool._id).slice(-6)}`,
      tool.name || "N/A",
      tool.status || "N/A",
      getYardName(tool.currentYard),
      tool.currentLocationCode || "N/A",
      tool.currentHolder || tool.issuedTo || "-",
    ]);

    doc.setFontSize(14);
    doc.text("Tool Detailed List", 14, doc.lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [["Tool Code", "Name", "Status", "Current Yard", "Location", "Holder"]],
      body: rows.length > 0 ? rows : [["No tools found", "-", "-", "-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("CYMS_Tools_Report.pdf");
    showToast("Tools report downloaded successfully", "success");
  }

  function downloadMovementsPDF() {
    const doc = new jsPDF("l", "mm", "a4");
    addPdfHeader(doc, "Tool Movements Report");

    const filteredMovementPDFRows = movementRows.filter((row) => {
      const fromYardId = row.fromYard?._id || row.fromYard;
      const toYardId = row.toYard?._id || row.toYard;

      if (
        modalYardId &&
        String(fromYardId) !== String(modalYardId) &&
        String(toYardId) !== String(modalYardId)
      ) {
        return false;
      }

      return isWithinDateRange(row.createdAt);
    });

    const rows = filteredMovementPDFRows.map((row) => {
      const tool = row.tool?.name || row.tool?.code || row.tool?._id || row.tool || "N/A";
      const from =
        row.type === "RETURN"
          ? row.issuedTo || row.holder || row.issuedToName || "User"
          : [row.fromYard?.name, row.fromYard?.code, row.fromLocationCode].filter(Boolean).join(" / ") || "N/A";
      const to =
        row.type === "ISSUE"
          ? row.issuedTo || row.holder || row.issuedToName || "User"
          : [row.toYard?.name, row.toYard?.code, row.toLocationCode].filter(Boolean).join(" / ") || "N/A";
      const holder = row.issuedTo || row.holder || row.issuedToName || row.performedBy?.fullName || "-";
      const date = row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A";

      return [row.type || "N/A", tool, from, to, holder, date];
    });

    autoTable(doc, {
      startY: 44,
      head: [["Type", "Tool", "From", "To", "Holder / Issued To", "Date"]],
      body: rows.length > 0 ? rows : [["No movements found", "-", "-", "-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("CYMS_Tool_Movements_Report.pdf");
    showToast("Movements PDF downloaded successfully", "success");
  }

  function downloadStockExcel() {
    const filteredStockExcelRows = stockRows.filter((row) => {
      const stockYardId = row._id?.yard?._id || row._id?.yard;
      if (modalYardId && String(stockYardId) !== String(modalYardId)) return false;
      return true;
    });

    const data = filteredStockExcelRows.map((row) => ({
      Yard: row._id?.yard?.name || row._id?.yard?.code || "N/A",
      Location: row._id?.locationCode || "N/A",
      Material: row._id?.material?.name || row._id?.material?.code || "Deleted Material",
      Code: row._id?.material?.code || "-",
      Quantity: row.qtyOnHand ?? row.qty ?? 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Summary");
    XLSX.writeFile(workbook, "CYMS_Stock_Summary_Report.xlsx");
    showToast("Stock Excel downloaded successfully", "success");
  }

  async function handleDownload() {
    if (modalDateFrom && modalDateTo && modalDateFrom > modalDateTo) {
      showToast("From date cannot be after To date", "error");
      return;
    }

    setPreparingDownload(true);
    setDownloadComplete(false);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 80);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPreparingDownload(false);
      setDownloading(true);

      if (downloadModal === "TOOLS") await downloadToolsPDF();
      if (downloadModal === "MR") downloadMRPDF();
      if (downloadModal === "STOCK") downloadStockPDF();
      if (downloadModal === "MOVEMENTS") downloadMovementsPDF();
      if (downloadModal === "STOCK_EXCEL") downloadStockExcel();

      setProgress(100);
      setDownloading(false);
      setDownloadComplete(true);

      setTimeout(() => {
        setDownloadComplete(false);
        setProgress(0);
        setDownloadModal(null);
      }, 1200);
    } catch (err) {
      console.error(err);
      setDownloadComplete(false);
      setProgress(0);
      showToast("Download failed", "error");
    } finally {
      clearInterval(interval);
      setPreparingDownload(false);
      setDownloading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={getHeaderStyle(isMobile)}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrowStyle}>CYMS Analytics</p>
          <h1 style={getTitleStyle(isMobile)}>
            <BarChart3 size={isMobile ? 26 : 30} />
            Reports & Analytics
          </h1>
          <p style={subtitleStyle}>
            Download PDF and Excel reports for tools, material requests, stock, and movement history.
          </p>
        </div>
      </div>

      <div style={downloadPanelStyle}>
        <div style={getDownloadButtonRowStyle(isMobile)}>
          <ReportDownloadButton label="Tools PDF" disabled={downloading || preparingDownload} onClick={() => openDownloadModal("TOOLS")} />
          <ReportDownloadButton label="MR PDF" disabled={downloading || preparingDownload} onClick={() => openDownloadModal("MR")} />
          <ReportDownloadButton label="Stock PDF" disabled={downloading || preparingDownload} onClick={() => openDownloadModal("STOCK")} />
          <ReportDownloadButton label="Movements PDF" disabled={downloading || preparingDownload} onClick={() => openDownloadModal("MOVEMENTS")} />
          <ReportDownloadButton label="Stock Excel" disabled={downloading || preparingDownload} onClick={() => openDownloadModal("STOCK_EXCEL")} excel />
        </div>
      </div>

      <div style={getTopGridStyle(isMobile, isTablet)}>
        <KpiCard label="Total Tools" value={toolsLoading ? "..." : toolsCounts.total} icon={<Wrench size={20} />} />
        <KpiCard label="Available" value={toolsLoading ? "..." : toolsCounts.available} color={theme.success} icon={<Wrench size={20} />} />
        <KpiCard label="Issued" value={toolsLoading ? "..." : toolsCounts.issued} color={theme.warning} icon={<PackageSearch size={20} />} />
        <KpiCard label="Pending MRs" value={mrLoading ? "..." : mrCounts.pending} color={theme.warning} icon={<ClipboardList size={20} />} />
        <KpiCard label="Stock Quantity" value={stockLoading ? "..." : stockTotalQuantity} icon={<Boxes size={20} />} />
      </div>

      <div style={getChartGridStyle(isMobile, isTablet)}>
        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <h3 style={sectionTitleStyle}>Tools Status</h3>
              <p style={sectionTextStyle}>Current tool status distribution.</p>
            </div>
            <PieIcon size={22} color={theme.primary} />
          </div>

          {toolsLoading ? (
            <p style={mutedTextStyle}>Loading chart...</p>
          ) : toolsError ? (
            <p style={errorTextStyle}>{toolsError}</p>
          ) : chartsReady && toolChartData.length > 0 ? (
            <div style={chartBoxStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={toolChartData} dataKey="value" nameKey="name" outerRadius={isMobile ? 72 : 90} label>
                    {toolChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={mutedTextStyle}>No tool summary data available.</p>
          )}
        </div>

        <div style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <h3 style={sectionTitleStyle}>MR Status - Last 30 Days</h3>

              <p style={sectionTextStyle}>
                Approval status of material requests created within the last 30 days.
              </p>
            </div>
            <ClipboardList size={22} color={theme.primary} />
          </div>

          {mrLoading ? (
            <p style={mutedTextStyle}>Loading chart...</p>
          ) : mrError ? (
            <p style={errorTextStyle}>{mrError}</p>
          ) : chartsReady && mrChartData.length > 0 ? (
            <div style={chartBoxStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mrChartData} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis dataKey="name" stroke={theme.muted} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis stroke={theme.muted} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={mutedTextStyle}>No MR summary data available.</p>
          )}
        </div>
      </div>

      <div style={getSummaryGridStyle(isMobile, isTablet)}>
        <SummaryCard
          title="Tools Summary"
          description="Tool availability and lifecycle overview."
          loading={toolsLoading}
          error={toolsError}
          actionLabel="View Tools"
          onAction={() => navigate("/tools")}
          onDetails={() => setShowToolsDetails(true)}
          isMobile={isMobile}
        >
          <SummaryRow label="Total Tools" value={toolsCounts.total} />
          <SummaryRow label="Available" value={toolsCounts.available} />
          <SummaryRow label="Issued" value={toolsCounts.issued} />
          <SummaryRow label="Maintenance" value={toolsCounts.maintenance} />
          <SummaryRow label="Retired" value={toolsCounts.retired} />
        </SummaryCard>

        <SummaryCard
          title="MR Summary"
          description="Material request approval overview."
          loading={mrLoading}
          error={mrError}
          actionLabel="View MRs"
          onAction={() => navigate("/mrs")}
          onDetails={() => setShowMRDetails(true)}
          isMobile={isMobile}
        >
          <SummaryRow label="Total MRs" value={mrCounts.total} />
          <SummaryRow label="Approved" value={mrCounts.approved} />
          <SummaryRow label="Rejected" value={mrCounts.rejected} />
          <SummaryRow label="Pending" value={mrCounts.pending} />
        </SummaryCard>

        <SummaryCard
          title="Stock Summary"
          description="Current stock quantity and stock record count."
          loading={stockLoading}
          error={stockError}
          actionLabel="View Inventory"
          onAction={() => navigate("/inventory")}
          onDetails={() => setShowStockDetails(true)}
          isMobile={isMobile}
        >
          <SummaryRow label="Total Quantity" value={stockTotalQuantity} />
          <SummaryRow label="Stock Records" value={stockRows.length} />
        </SummaryCard>
      </div>

      <div style={sectionCardStyle}>
        <div style={getSectionHeaderStyle(isMobile)}>
          <div style={{ minWidth: 0 }}>
            <h3 style={sectionTitleStyle}>Tool Movements</h3>
            <p style={sectionTextStyle}>Latest recorded tool movement history.</p>
          </div>

          <div style={getButtonGroupStyle(isMobile)}>
            <button type="button" onClick={() => navigate("/tools")} style={getSecondaryButtonStyle(isMobile)}>
              View Tools
            </button>
            <button type="button" onClick={() => setShowMovementsDetails(true)} style={getDetailsButtonStyle(isMobile)}>
              View Details
            </button>
          </div>
        </div>

        {movementsLoading && <p style={mutedTextStyle}>Loading movements...</p>}
        {movementsError && <p style={errorTextStyle}>{movementsError}</p>}

        {movementRows.length > 0 ? (
          <MovementsTable rows={movementRows.slice(0, 8)} isMobile={isMobile} />
        ) : (
          !movementsLoading && <p style={mutedTextStyle}>No movements found.</p>
        )}
      </div>

      {showToolsDetails && (
        <SimpleModal title="Tools Summary Details" onClose={() => setShowToolsDetails(false)} isMobile={isMobile}>
          <SummaryRow label="Total Tools" value={toolsCounts.total} />
          {toolsSummary?.rows?.map((row) => (
            <SummaryRow key={row._id} label={row._id} value={row.count} />
          ))}
        </SimpleModal>
      )}

      {showMRDetails && (
        <SimpleModal title="MR Summary Details" onClose={() => setShowMRDetails(false)} isMobile={isMobile}>
          <SummaryRow label="Total MRs" value={mrCounts.total} />
          {mrSummary?.rows?.map((row) => (
            <SummaryRow key={row._id} label={row._id} value={row.count} />
          ))}
        </SimpleModal>
      )}

      {showStockDetails && (
        <div style={overlayStyle}>
          <div style={getWideDetailsModalStyle(isMobile)}>
            <ModalHeader title="Stock Summary Details" onClose={() => setShowStockDetails(false)} />

            <input
              type="text"
              placeholder="Search by yard, location, material, or code..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              style={searchInputStyle}
            />

            {stockRows.length > 0 ? (
              <>
                <div style={detailsScrollStyle}>
                  <StockTable rows={paginatedStockRows} isMobile={isMobile} />
                </div>

                <Pagination
                  showing={paginatedStockRows.length}
                  total={filteredStockRows.length}
                  page={stockPage}
                  totalPages={stockTotalPages}
                  onPrev={() => setStockPage((p) => Math.max(p - 1, 1))}
                  onNext={() => setStockPage((p) => Math.min(p + 1, stockTotalPages))}
                  isMobile={isMobile}
                />
              </>
            ) : (
              <p style={mutedTextStyle}>No stock summary data available.</p>
            )}

            <div style={getModalFooterStyle(isMobile)}>
              <button type="button" onClick={() => setShowStockDetails(false)} style={getDetailsButtonStyle(isMobile)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovementsDetails && (
        <div style={overlayStyle}>
          <div style={getWideDetailsModalStyle(isMobile)}>
            <ModalHeader title="Tool Movements Details" onClose={() => setShowMovementsDetails(false)} />

            <div style={getFilterRowStyle(isMobile)}>
              <input
                type="text"
                placeholder="Search tool, from, to..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                style={{ ...searchInputStyle, marginBottom: 0 }}
              />

              <select value={movementType} onChange={(e) => setMovementType(e.target.value)} style={selectStyle}>
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
                <div style={detailsScrollStyle}>
                  <MovementsTable rows={paginatedMovementRows} isMobile={isMobile} />
                </div>

                <Pagination
                  showing={paginatedMovementRows.length}
                  total={filteredMovementRows.length}
                  page={movementPage}
                  totalPages={movementTotalPages}
                  onPrev={() => setMovementPage((p) => Math.max(p - 1, 1))}
                  onNext={() => setMovementPage((p) => Math.min(p + 1, movementTotalPages))}
                  isMobile={isMobile}
                />
              </>
            ) : (
              <p style={mutedTextStyle}>No tool movement data available.</p>
            )}

            <div style={getModalFooterStyle(isMobile)}>
              <button type="button" onClick={() => setShowMovementsDetails(false)} style={getDetailsButtonStyle(isMobile)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {downloadModal && (
        <div style={overlayStyle}>
          <div style={getDetailsModalStyle(isMobile)}>
            <div style={getModalHeaderStyle(isMobile)}>
              <div style={modalTitleRowStyle}>
                <div style={downloadModalIconStyle}>
                  {downloadModal === "STOCK_EXCEL" ? <FileSpreadsheet size={20} /> : <Download size={20} />}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3 style={modalTitleStyle}>{getDownloadTitle(downloadModal)}</h3>
                  <p style={{ ...sectionTextStyle, marginTop: 4 }}>Configure filters before exporting.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={downloading || preparingDownload}
                onClick={() => {
                  if (!downloading && !preparingDownload) setDownloadModal(null);
                }}
                style={{
                  ...closeButtonStyle,
                  opacity: downloading || preparingDownload ? 0.5 : 1,
                  cursor: downloading || preparingDownload ? "not-allowed" : "pointer",
                }}
                className="close-btn"
              >
                <X size={16} />
              </button>
            </div>

            <div style={getDateGridStyle(isMobile)}>
              <DateField label="From Date" value={modalDateFrom} onChange={setModalDateFrom} />
              <DateField label="To Date" value={modalDateTo} onChange={setModalDateTo} />
            </div>

            <div style={quickButtonRowStyle}>
              <QuickButton
                label="Today"
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setModalDateFrom(today);
                  setModalDateTo(today);
                }}
              />
              <QuickButton
                label="Last 7 Days"
                onClick={() => {
                  const today = new Date();
                  const fromDate = new Date();
                  fromDate.setDate(today.getDate() - 7);
                  setModalDateFrom(fromDate.toISOString().split("T")[0]);
                  setModalDateTo(today.toISOString().split("T")[0]);
                }}
              />
              <QuickButton
                label="Last 30 Days"
                onClick={() => {
                  const today = new Date();
                  const fromDate = new Date();
                  fromDate.setDate(today.getDate() - 30);
                  setModalDateFrom(fromDate.toISOString().split("T")[0]);
                  setModalDateTo(today.toISOString().split("T")[0]);
                }}
              />
              <QuickButton
                label="Clear Dates"
                danger
                onClick={() => {
                  setModalDateFrom("");
                  setModalDateTo("");
                }}
              />
            </div>

            <div>
              <label style={dateLabelStyle}>Yard</label>
              <select value={modalYardId} onChange={(e) => setModalYardId(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                <option value="">All Yards</option>
                {yards.map((yard) => (
                  <option key={yard._id} value={yard._id}>
                    {yard.name} {yard.code ? `(${yard.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {(preparingDownload || downloading || downloadComplete) && (
              <div style={{ marginTop: 16 }}>
                <div style={progressTrackStyle}>
                  <div style={{ ...progressFillStyle, width: `${progress}%` }} />
                </div>
                <p style={progressTextStyle}>{progress}% completed</p>
              </div>
            )}

            <div style={getModalFooterStyle(isMobile)}>
              <button
                type="button"
                disabled={downloading || preparingDownload}
                onClick={() => {
                  if (!downloading && !preparingDownload) setDownloadModal(null);
                }}
                style={{
                  ...getSecondaryButtonStyle(isMobile),
                  opacity: downloading || preparingDownload ? 0.5 : 1,
                  cursor: downloading || preparingDownload ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={downloading || preparingDownload}
                onClick={handleDownload}
                style={{
                  ...getDetailsButtonStyle(isMobile),
                  opacity: downloading || preparingDownload ? 0.6 : 1,
                  cursor: downloading || preparingDownload ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {downloadComplete ? (
                  "Completed"
                ) : preparingDownload ? (
                  <>
                    <Spinner size={14} />
                    Preparing...
                  </>
                ) : downloading ? (
                  <>
                    <Spinner size={14} />
                    Downloading...
                  </>
                ) : (
                  "Download"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDownloadTitle(type) {
  const map = {
    TOOLS: "Download Tools Report",
    MR: "Download MR Report",
    STOCK: "Download Stock Report",
    MOVEMENTS: "Download Movements Report",
    STOCK_EXCEL: "Download Stock Excel Report",
  };

  return map[type] || "Download Report";
}

function ReportDownloadButton({ label, onClick, excel, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
      }}
      style={{
        ...downloadButtonStyle,
        borderColor: excel ? theme.success : theme.primaryBorder,
        background: excel ? theme.successSoft : theme.primarySoft,
        color: excel ? theme.success : theme.primary,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : theme.shadow,
      }}
    >
      {excel ? <FileSpreadsheet size={16} /> : <Download size={16} />}
      {label}
    </button>
  );
}

function QuickButton({ label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...quickBtnStyle,
        borderColor: danger ? theme.danger : theme.primaryBorder,
        background: danger ? theme.dangerSoft : theme.primarySoft,
        color: danger ? theme.danger : theme.primary,
      }}
    >
      {label}
    </button>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div>
      <label style={dateLabelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        {!value && <span style={datePlaceholderStyle}>Select date</span>}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...dateInputStyle, color: value ? theme.text : "transparent" }}
        />
      </div>
    </div>
  );
}

function KpiCard({ label, value, color = theme.text, icon }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ ...kpiIconStyle, color }}>{icon}</div>
      <p style={summaryLabelStyle}>{label}</p>
      <h3 style={{ ...summaryValueStyle, color }}>{value}</h3>
    </div>
  );
}

function SummaryCard({ title, description, loading, error, children, actionLabel, onAction, onDetails, isMobile }) {
  return (
    <div style={compactSummaryCardStyle}>
      <div style={summaryCardHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <h3 style={sectionTitleStyle}>{title}</h3>
          <p style={sectionTextStyle}>{description}</p>
        </div>
      </div>

      <div style={{ marginTop: 12, flex: 1 }}>{loading ? <p style={mutedTextStyle}>Loading...</p> : error ? <p style={errorTextStyle}>{error}</p> : children}</div>

      <div style={getSummaryActionsStyle(isMobile)}>
        <button type="button" onClick={onAction} style={getSecondaryButtonStyle(isMobile)}>
          {actionLabel}
        </button>
        <button type="button" onClick={onDetails} style={getDetailsButtonStyle(isMobile)}>
          View Details
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={summaryRowStyle}>
      <span style={{ minWidth: 0 }}>{label}</span>
      <strong style={{ flexShrink: 0 }}>{value}</strong>
    </div>
  );
}

function SimpleModal({ title, onClose, children, isMobile }) {
  return (
    <div style={overlayStyle}>
      <div style={getDetailsModalStyle(isMobile)}>
        <ModalHeader title={title} onClose={onClose} />
        <div style={detailsListStyle}>{children}</div>
        <div style={getModalFooterStyle(isMobile)}>
          <button type="button" onClick={onClose} style={getDetailsButtonStyle(isMobile)} className="close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={modalHeaderStyle}>
      <h3 style={modalTitleStyle}>{title}</h3>
      <button type="button" onClick={onClose} style={closeButtonStyle} className="close-btn">
        <X size={16} />
      </button>
    </div>
  );
}

function StockTable({ rows, isMobile }) {
  if (isMobile) {
    return (
      <div style={mobileTableCardListStyle}>
        {rows.map((row, index) => {
          const yardName = row._id?.yard?.name || row._id?.yard?.code || "N/A";
          const location = row._id?.locationCode || "N/A";
          const materialName = row._id?.material?.name || row._id?.material?.code || "Deleted Material";
          const materialCode = row._id?.material?.code || "-";
          const qty = row.qtyOnHand ?? row.qty ?? 0;

          return (
            <div key={`stock-card-${index}`} style={mobileDataCardStyle}>
              <div style={mobileDataHeaderStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={mobileDataCodeStyle}>{materialCode}</p>
                  <h4 style={mobileDataTitleStyle}>{materialName}</h4>
                </div>
                <span style={qtyBadgeStyle}>{qty}</span>
              </div>
              <div style={mobileInfoGridStyle}>
                <MobileInfo label="Yard" value={yardName} />
                <MobileInfo label="Location" value={location} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={tableScrollStyle}>
      <table style={tableStyle}>
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
          {rows.map((row, index) => (
            <tr key={`stock-${index}`}>
              <td style={tdStyle}>{row._id?.yard?.name || row._id?.yard?.code || "N/A"}</td>
              <td style={tdStyle}>{row._id?.locationCode || "N/A"}</td>
              <td style={tdStyle}>{row._id?.material?.name || row._id?.material?.code || "Deleted Material"}</td>
              <td style={tdStyle}>{row._id?.material?.code || "-"}</td>
              <td style={tdStyle}>
                <strong>{row.qtyOnHand ?? row.qty ?? 0}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ rows, isMobile }) {
  if (isMobile) {
    return (
      <div style={mobileTableCardListStyle}>
        {rows.map((row, index) => {
          const tool = row.tool?.name || row.tool?.code || row.tool?._id || row.tool || "N/A";
          const from = getMovementFrom(row);
          const to = getMovementTo(row);
          const date = row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A";

          return (
            <div key={row._id || index} style={mobileDataCardStyle}>
              <div style={mobileDataHeaderStyle}>
                <div style={{ minWidth: 0 }}>
                  <span style={getMovementBadge(row.type)}>{row.type || "N/A"}</span>
                  <h4 style={{ ...mobileDataTitleStyle, marginTop: 8 }}>{tool}</h4>
                </div>
              </div>
              <div style={mobileInfoGridStyle}>
                <MobileInfo label="From" value={from} />
                <MobileInfo label="To" value={to} />
                <MobileInfo label="Date" value={date} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={tableScrollStyle}>
      <table style={tableStyle}>
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
                <span style={getMovementBadge(row.type)}>{row.type || "N/A"}</span>
              </td>
              <td style={tdStyle}>{row.tool?.name || row.tool?.code || row.tool?._id || row.tool || "N/A"}</td>
              <td style={tdStyle}>{getMovementFrom(row)}</td>
              <td style={tdStyle}>{getMovementTo(row)}</td>
              <td style={tdStyle}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getMovementFrom(row) {
  if (row.type === "RETURN") return row.issuedTo || row.holder || row.issuedToName || "User";
  return [row.fromYard?.name, row.fromYard?.code, row.fromLocationCode].filter(Boolean).join(" / ") || "N/A";
}

function getMovementTo(row) {
  if (row.type === "ISSUE") return row.issuedTo || row.holder || row.issuedToName || "User";
  return [row.toYard?.name, row.toYard?.code, row.toLocationCode].filter(Boolean).join(" / ") || "N/A";
}

function MobileInfo({ label, value }) {
  return (
    <div style={mobileInfoItemStyle}>
      <span style={mobileInfoLabelStyle}>{label}</span>
      <strong style={mobileInfoValueStyle}>{value}</strong>
    </div>
  );
}

function Pagination({ showing, total, page, totalPages, onPrev, onNext, isMobile }) {
  return (
    <div style={getPaginationStyle(isMobile)}>
      <span style={paginationTextStyle}>Showing {showing} of {total} records</span>
      <div style={getPaginationButtonGroupStyle(isMobile)}>
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrev}
          style={{ ...paginationButtonStyle, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
        >
          Prev
        </button>
        <span style={{ color: theme.text, fontSize: 13 }}>Page {page} / {totalPages}</span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={onNext}
          style={{ ...paginationButtonStyle, opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: `2px solid ${theme.primaryBorder}`,
        borderTopColor: theme.primary,
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

function useResponsive() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth));

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    width,
    isMobile: width <= 900,
    isTablet: width > 900 && width <= 1200,
  };
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

const eyebrowStyle = {
  margin: "0 0 6px",
  color: theme.primary,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function getTitleStyle(isMobile) {
  return {
    margin: 0,
    color: theme.text,
    fontSize: isMobile ? 28 : 34,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    display: "flex",
    alignItems: "center",
    gap: 10,
    lineHeight: 1.15,
    minWidth: 0,
    flexWrap: isMobile ? "wrap" : "nowrap",
  };
}

const subtitleStyle = {
  margin: "8px 0 0",
  color: theme.muted,
  lineHeight: 1.5,
  maxWidth: 760,
};

const cardBaseStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 18,
  boxShadow: theme.shadow,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const downloadPanelStyle = {
  ...cardBaseStyle,
  padding: 16,
};

function getDownloadButtonRowStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const downloadButtonStyle = {
  padding: "10px 13px",
  borderRadius: 12,
  border: "1px solid",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontWeight: 850,
  width: "100%",
  minWidth: 0,
  transition: "all 0.2s ease",
};

function getTopGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : isTablet
      ? "repeat(3, minmax(0, 1fr))"
      : "repeat(5, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getChartGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile || isTablet ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getSummaryGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile || isTablet ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const sectionCardStyle = {
  ...cardBaseStyle,
  padding: 20,
  overflow: "hidden",
};

const compactSummaryCardStyle = {
  ...cardBaseStyle,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  minHeight: 270,
};

const kpiCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  minHeight: 118,
};

const kpiIconStyle = {
  color: theme.primary,
  width: 38,
  height: 38,
  borderRadius: 13,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

function getSectionHeaderStyle(isMobile) {
  return {
    ...sectionHeaderStyle,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "flex-start",
  };
}

const summaryCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const sectionTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 19,
  fontWeight: 850,
};

const sectionTextStyle = {
  margin: "6px 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.45,
};

const summaryLabelStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
  fontWeight: 700,
};

const summaryValueStyle = {
  margin: "8px 0 0",
  color: theme.text,
  fontSize: 30,
  fontWeight: 900,
  lineHeight: 1.1,
};

const chartBoxStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: 260,
  minHeight: 260,
  overflow: "hidden",
};

const tableScrollStyle = {
  overflowX: "auto",
  width: "100%",
  maxWidth: "100%",
  WebkitOverflowScrolling: "touch",
};

const tableStyle = {
  width: "100%",
  minWidth: 760,
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "11px 10px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.muted,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "11px 10px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.text,
  fontSize: 13,
  verticalAlign: "top",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.text,
  fontSize: 14,
  minWidth: 0,
};

function getSummaryActionsStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: 8,
    marginTop: 16,
    width: "100%",
  };
}

const secondaryButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "9px 12px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

function getSecondaryButtonStyle(isMobile) {
  return {
    ...secondaryButtonStyle,
    width: isMobile ? "100%" : "auto",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
  };
}

const detailsButtonStyle = {
  border: `1px solid ${theme.primaryBorder}`,
  borderRadius: 10,
  padding: "9px 12px",
  background: theme.primary,
  color: "#ffffff",
  boxShadow: "0 8px 18px rgba(37,99,235,0.22)",
  fontWeight: 850,
  fontSize: 13,
  cursor: "pointer",
};

function getDetailsButtonStyle(isMobile) {
  return {
    ...detailsButtonStyle,
    width: isMobile ? "100%" : "auto",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
  };
}

function getButtonGroupStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    gap: 8,
    width: isMobile ? "100%" : "auto",
  };
}

const mutedTextStyle = {
  color: theme.muted,
  margin: 0,
};

const errorTextStyle = {
  color: theme.danger,
  margin: 0,
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3000,
  padding: 16,
  boxSizing: "border-box",
};

function getDetailsModalStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "100%" : 620,
    maxHeight: isMobile ? "92vh" : "90vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 16 : 22,
    padding: isMobile ? 16 : 22,
    boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
    boxSizing: "border-box",
  };
}

function getWideDetailsModalStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "100%" : 900,
    maxHeight: isMobile ? "92vh" : "90vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 16 : 22,
    padding: isMobile ? 16 : 20,
    boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
    boxSizing: "border-box",
  };
}

const modalHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
  minWidth: 0,
};

function getModalHeaderStyle(isMobile) {
  return {
    ...modalHeaderStyle,
    alignItems: isMobile ? "flex-start" : "center",
  };
}

const modalTitleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
};

const modalTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 850,
  overflowWrap: "anywhere",
};

function getModalFooterStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 24,
    paddingTop: 16,
    borderTop: `1px solid ${theme.border}`,
  };
}

const closeButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: theme.surfaceSoft,
  color: theme.text,
  width: 36,
  height: 36,
  cursor: "pointer",
  fontSize: 14,
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const detailsListStyle = {
  display: "grid",
  gap: 10,
};

const detailsScrollStyle = {
  maxHeight: "55vh",
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 2,
};

const searchInputStyle = {
  marginBottom: 14,
  minWidth: 0,
  padding: "11px 12px",
  width: "100%",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  outline: "none",
  boxSizing: "border-box",
};

function getFilterRowStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 220px",
    gap: 10,
    marginBottom: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const selectStyle = {
  minWidth: 0,
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  outline: "none",
  boxSizing: "border-box",
};

function getPaginationStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "center",
    gap: 12,
    marginTop: 14,
  };
}

function getPaginationButtonGroupStyle(isMobile) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "space-between" : "flex-start",
    gap: 8,
    width: isMobile ? "100%" : "auto",
  };
}

const paginationTextStyle = {
  color: theme.muted,
  fontSize: 13,
};

const paginationButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  padding: "8px 12px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 700,
};

function getDateGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginTop: 18,
  };
}

const dateLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  marginTop: 6,
};

const dateInputStyle = {
  padding: "12px 14px",
  width: "100%",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  outline: "none",
  colorScheme: "light",
  position: "relative",
  zIndex: 3,
  boxSizing: "border-box",
};

const datePlaceholderStyle = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: theme.muted,
  fontSize: 14,
  pointerEvents: "none",
  zIndex: 4,
};

const downloadModalIconStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const quickButtonRowStyle = {
  display: "flex",
  gap: 10,
  marginTop: 14,
  marginBottom: 18,
  flexWrap: "wrap",
};

const quickBtnStyle = {
  padding: "7px 11px",
  borderRadius: 9,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primary,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const progressTrackStyle = {
  height: 8,
  borderRadius: 999,
  background: theme.surfaceSoft,
  overflow: "hidden",
};

const progressFillStyle = {
  height: "100%",
  background: theme.primary,
  transition: "width 0.2s ease",
};

const progressTextStyle = {
  marginTop: 6,
  fontSize: 12,
  color: theme.muted,
};

const mobileTableCardListStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const mobileDataCardStyle = {
  ...cardBaseStyle,
  padding: 14,
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
};

const mobileDataHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  minWidth: 0,
};

const mobileDataCodeStyle = {
  margin: "0 0 5px",
  color: theme.primary,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.04em",
  overflowWrap: "anywhere",
};

const mobileDataTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const qtyBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 42,
  height: 34,
  borderRadius: 999,
  background: theme.primarySoft,
  color: theme.primary,
  border: `1px solid ${theme.primaryBorder}`,
  fontWeight: 900,
  flexShrink: 0,
};

const mobileInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  marginTop: 12,
  width: "100%",
  minWidth: 0,
};

const mobileInfoItemStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  minWidth: 0,
};

const mobileInfoLabelStyle = {
  display: "block",
  marginBottom: 4,
  color: theme.muted,
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const mobileInfoValueStyle = {
  display: "block",
  color: theme.text,
  fontSize: 13,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

function getMovementBadge(type) {
  const base = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    border: "1px solid",
    whiteSpace: "nowrap",
  };

  if (type === "ISSUE") {
    return { ...base, color: theme.warning, background: theme.warningSoft, borderColor: theme.warning };
  }

  if (type === "RETURN") {
    return { ...base, color: theme.primary, background: theme.primarySoft, borderColor: theme.primaryBorder };
  }

  if (type === "TRANSFER") {
    return { ...base, color: "#8b5cf6", background: "rgba(139,92,246,0.10)", borderColor: "rgba(139,92,246,0.28)" };
  }

  if (type === "STATUS_CHANGE") {
    return { ...base, color: theme.danger, background: theme.dangerSoft, borderColor: theme.danger };
  }

  if (type === "CREATE") {
    return { ...base, color: theme.success, background: theme.successSoft, borderColor: theme.success };
  }

  return { ...base, color: theme.muted, background: theme.surfaceSoft, borderColor: theme.border };
}
