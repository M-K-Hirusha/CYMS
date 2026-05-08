import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  PackagePlus,
  PackageMinus,
  ArrowRightLeft,
  Search,
  RotateCcw,
  Warehouse,
  MapPin,
  Layers3,
  MoreHorizontal,
} from "lucide-react";
import { getAllYards } from "../services/yardApi";
import { getMaterials } from "../services/materialApi";
import {
  getStock,
  receiveStock,
  issueStock,
  transferStock,
} from "../services/inventoryApi";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { theme } from "../styles/theme";

export default function Inventory() {
  const { showToast } = useToast();

  const [yards, setYards] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedYardId, setSelectedYardId] = useState("");
  const [stock, setStock] = useState([]);

  const [loading, setLoading] = useState(false);
  const [yardsLoading, setYardsLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const [receiving, setReceiving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);

  const [openActionId, setOpenActionId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const actionMenuRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  const pageSize = 10;

  const [receiveForm, setReceiveForm] = useState({
    materialId: "",
    locationCode: "",
    qty: "",
    note: "",
  });

  const [issueForm, setIssueForm] = useState({
    stockId: "",
    qty: "",
    note: "",
  });

  const [transferForm, setTransferForm] = useState({
    fromYardId: "",
    fromLocationCode: "",
    toYardId: "",
    toLocationCode: "",
    materialId: "",
    qty: "",
    note: "",
  });

  const role = localStorage.getItem("role");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const canReceive = role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";

  const canIssue =
    role === "SYSTEM_ADMIN" ||
    role === "HEAD_OFFICE_ADMIN" ||
    role === "SITE_ADMIN" ||
    role === "SITE_STAFF";

  const canTransfer = role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";

  const selectedYard = yards.find((yard) => yard._id === selectedYardId);

  const locationOptionsForSelectedYard =
    selectedYard?.locations?.filter((loc) => loc.isActive !== false) || [];

  const fallbackLocationCode =
    selectedYard?.type === "MAIN" ? "MAIN_STORE" : "SITE_STORE";

  function getYardById(yardId) {
    return yards.find((yard) => yard._id === yardId);
  }

  function getActiveLocationsForYard(yardId) {
    const yard = getYardById(yardId);
    return yard?.locations?.filter((loc) => loc.isActive !== false) || [];
  }

  function getFallbackLocationForYard(yardId) {
    const yard = getYardById(yardId);
    return yard?.type === "MAIN" ? "MAIN_STORE" : "SITE_STORE";
  }

  function getYardName(yardId) {
    const yard = getYardById(yardId);
    if (!yard) return "-";
    return `${yard.name || "Unnamed Yard"} (${yard.type || "-"})`;
  }

  function getMaterialById(materialId) {
    return materials.find((material) => material._id === materialId);
  }

  function getStockMaterialId(item) {
    return item?.material?._id || item?.material;
  }

  async function loadStockForYard(yardId) {
    try {
      setLoading(true);
      setError("");

      const data = await getStock(yardId);
      setStock(data.stock || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load stock");
      showToast("Failed to load stock", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadYards() {
      try {
        if (role === "SITE_ADMIN" || role === "SITE_STAFF") {
          const assignedYardId =
            user.assignedYard?._id ||
            user.assignedYard ||
            user.yard?._id ||
            user.yard;

          if (assignedYardId) {
            const assignedYardObject =
              typeof user.assignedYard === "object"
                ? user.assignedYard
                : typeof user.yard === "object"
                ? user.yard
                : null;

            const siteYard = {
              _id: assignedYardId,
              name: assignedYardObject?.name || "My Site Yard",
              type: assignedYardObject?.type || "SITE",
              isActive: assignedYardObject?.isActive ?? true,
              locations: assignedYardObject?.locations || [
                { code: "SITE_STORE", name: "Site Store", isActive: true },
              ],
            };

            setYards([siteYard]);
            setSelectedYardId(assignedYardId);
          }

          return;
        }

        const data = await getAllYards();
        const loadedYards = (data.yards || data || []).filter(
          (yard) => yard.isActive !== false
        );

        setYards(loadedYards);

        if (loadedYards.length > 0) {
          setSelectedYardId(loadedYards[0]._id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load yards");
        showToast("Failed to load yards", "error");
      } finally {
        setYardsLoading(false);
      }
    }

    loadYards();
  }, []);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const data = await getMaterials();
        setMaterials(Array.isArray(data) ? data : data.data || data.rows || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load materials");
        showToast("Failed to load materials", "error");
      } finally {
        setMaterialsLoading(false);
      }
    }

    loadMaterials();
  }, []);

  useEffect(() => {
    if (!selectedYardId) return;

    loadStockForYard(selectedYardId);

    const defaultLocation =
      locationOptionsForSelectedYard[0]?.code || fallbackLocationCode;

    setReceiveForm((prev) => ({
      ...prev,
      locationCode: defaultLocation,
    }));

    setTransferForm((prev) => ({
      ...prev,
      fromYardId: selectedYardId,
      fromLocationCode: defaultLocation,
    }));
  }, [selectedYardId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, locationFilter, selectedYardId]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
      setOpenActionId(null);
      setActionMenuPosition(null);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target)
      ) {
        setOpenActionId(null);
        setActionMenuPosition(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locationOptions = useMemo(() => {
    return ["ALL", ...new Set(stock.map((s) => s.locationCode).filter(Boolean))];
  }, [stock]);

  const filteredStock = useMemo(() => {
    return stock.filter((s) => {
      const q = search.trim().toLowerCase();
      const yardName = selectedYard?.name || "";

      const matchesSearch =
        !q ||
        s.material?.name?.toLowerCase().includes(q) ||
        s.material?.code?.toLowerCase().includes(q) ||
        s.material?.unit?.toLowerCase().includes(q) ||
        s.locationCode?.toLowerCase().includes(q) ||
        yardName.toLowerCase().includes(q);

      const matchesLocation =
        locationFilter === "ALL" || s.locationCode === locationFilter;

      return matchesSearch && matchesLocation;
    });
  }, [stock, search, locationFilter, selectedYard]);

  const inventoryStats = useMemo(() => {
    const totalQuantity = stock.reduce(
      (sum, item) => sum + Number(item.qtyOnHand || 0),
      0
    );

    return {
      totalItems: stock.length,
      totalQuantity,
      mainYardStock: selectedYard?.type === "MAIN" ? totalQuantity : 0,
      siteYardStock: selectedYard?.type === "SITE" ? totalQuantity : 0,
    };
  }, [stock, selectedYard]);

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / pageSize));

  const paginatedStock = filteredStock.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function closeActionMenu() {
    setOpenActionId(null);
    setActionMenuPosition(null);
    setHoveredAction(null);
  }

  function toggleActionMenu(itemId, event) {
    if (openActionId === itemId) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const left = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12
    );
    const hasBottomSpace = window.innerHeight - rect.bottom > 120;
    const top = hasBottomSpace ? rect.bottom + 8 : Math.max(12, rect.top - 112);

    setOpenActionId(itemId);
    setActionMenuPosition({ top, left, width: menuWidth });
  }

  function resetReceiveForm() {
    setReceiveForm({
      materialId: "",
      locationCode:
        locationOptionsForSelectedYard[0]?.code || fallbackLocationCode,
      qty: "",
      note: "",
    });
  }

  function resetIssueForm(stockItem = null) {
    setIssueForm({
      stockId: stockItem?._id || "",
      qty: "",
      note: "",
    });
  }

  function resetTransferForm(stockItem = null) {
    setTransferForm({
      fromYardId: selectedYardId,
      fromLocationCode:
        stockItem?.locationCode ||
        locationOptionsForSelectedYard[0]?.code ||
        fallbackLocationCode,
      toYardId: "",
      toLocationCode: "",
      materialId: stockItem?.material?._id || stockItem?.material || "",
      qty: "",
      note: "",
    });
  }

  function openReceiveModal() {
    resetReceiveForm();
    setReceiveModalOpen(true);
  }

  function openIssueModal(stockItem = null) {
    resetIssueForm(stockItem);
    setIssueModalOpen(true);
    closeActionMenu();
  }

  function openTransferModal(stockItem = null) {
    resetTransferForm(stockItem);
    setTransferModalOpen(true);
    closeActionMenu();
  }

  function resetFilters() {
    setSearch("");
    setLocationFilter("ALL");
  }

  function handleReceiveStock(e) {
    e.preventDefault();

    if (!selectedYardId) {
      showToast("Please select a yard", "error");
      return;
    }

    if (!receiveForm.materialId) {
      showToast("Please select a material", "error");
      return;
    }

    if (!receiveForm.locationCode) {
      showToast("Please select a location", "error");
      return;
    }

    if (!receiveForm.qty || Number(receiveForm.qty) <= 0) {
      showToast("Quantity must be greater than 0", "error");
      return;
    }

    setConfirmReceive(true);
  }

  async function confirmReceiveStock() {
    try {
      if (!selectedYardId) {
        showToast("Please select a yard", "error");
        setConfirmReceive(false);
        return;
      }

      setReceiving(true);

      const qty = Number(receiveForm.qty);
      const material = getMaterialById(receiveForm.materialId);

      setStock((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            getStockMaterialId(item) === receiveForm.materialId &&
            item.locationCode === receiveForm.locationCode
        );

        if (existingIndex >= 0) {
          return prev.map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  qtyOnHand: Number(item.qtyOnHand || 0) + qty,
                }
              : item
          );
        }

        return [
          {
            _id: `temp-${Date.now()}`,
            material: material || receiveForm.materialId,
            locationCode: receiveForm.locationCode,
            qtyOnHand: qty,
          },
          ...prev,
        ];
      });

      await receiveStock({
        yardId: selectedYardId,
        locationCode: receiveForm.locationCode,
        materialId: receiveForm.materialId,
        qty,
        note: receiveForm.note || undefined,
      });

      await loadStockForYard(selectedYardId);

      resetReceiveForm();
      setReceiveModalOpen(false);
      setConfirmReceive(false);

      showToast("Stock received successfully", "success");
    } catch (err) {
      console.error(err);
      await loadStockForYard(selectedYardId);
      showToast(err.message || "Failed to receive stock", "error");
    } finally {
      setReceiving(false);
    }
  }

  function handleIssueStock(e) {
    e.preventDefault();

    const selectedStock = stock.find((s) => s._id === issueForm.stockId);

    if (!selectedStock) {
      showToast("Please select a stock item", "error");
      return;
    }

    if (!issueForm.qty || Number(issueForm.qty) <= 0) {
      showToast("Quantity must be greater than 0", "error");
      return;
    }

    if (Number(issueForm.qty) > Number(selectedStock.qtyOnHand || 0)) {
      showToast(`Not enough stock. Available: ${selectedStock.qtyOnHand}`, "error");
      return;
    }

    setConfirmIssue(true);
  }

  async function confirmIssueStock() {
    try {
      const selectedStock = stock.find((s) => s._id === issueForm.stockId);

      if (!selectedStock) {
        showToast("Please select a stock item", "error");
        setConfirmIssue(false);
        return;
      }

      setIssuing(true);

      const qty = Number(issueForm.qty);

      setStock((prev) =>
        prev
          .map((item) =>
            item._id === issueForm.stockId
              ? {
                  ...item,
                  qtyOnHand: Number(item.qtyOnHand || 0) - qty,
                }
              : item
          )
          .filter((item) => Number(item.qtyOnHand || 0) > 0)
      );

      await issueStock({
        yardId: selectedYardId,
        locationCode: selectedStock.locationCode,
        materialId: selectedStock.material?._id || selectedStock.material,
        qty,
        note: issueForm.note || undefined,
      });

      await loadStockForYard(selectedYardId);

      resetIssueForm();
      setIssueModalOpen(false);
      setConfirmIssue(false);

      showToast("Stock issued successfully", "success");
    } catch (err) {
      console.error(err);
      await loadStockForYard(selectedYardId);
      showToast(err.message || "Failed to issue stock", "error");
    } finally {
      setIssuing(false);
    }
  }

  function handleTransferStock(e) {
    e.preventDefault();

    if (!transferForm.fromYardId) {
      showToast("Please select from yard", "error");
      return;
    }

    if (!transferForm.fromLocationCode) {
      showToast("Please select from location", "error");
      return;
    }

    if (!transferForm.toYardId) {
      showToast("Please select to yard", "error");
      return;
    }

    if (!transferForm.toLocationCode) {
      showToast("Please select to location", "error");
      return;
    }

    if (!transferForm.materialId) {
      showToast("Please select material", "error");
      return;
    }

    if (!transferForm.qty || Number(transferForm.qty) <= 0) {
      showToast("Quantity must be greater than 0", "error");
      return;
    }

    const samePlace =
      transferForm.fromYardId === transferForm.toYardId &&
      transferForm.fromLocationCode === transferForm.toLocationCode;

    if (samePlace) {
      showToast("From and To locations cannot be the same", "error");
      return;
    }

    const sourceStock = stock.find(
      (item) =>
        getStockMaterialId(item) === transferForm.materialId &&
        item.locationCode === transferForm.fromLocationCode
    );

    if (transferForm.fromYardId === selectedYardId) {
      if (!sourceStock) {
        showToast("Selected material is not available in the from location", "error");
        return;
      }

      if (Number(transferForm.qty) > Number(sourceStock.qtyOnHand || 0)) {
        showToast(`Not enough stock. Available: ${sourceStock.qtyOnHand}`, "error");
        return;
      }
    }

    setConfirmTransfer(true);
  }

  async function confirmTransferStock() {
    try {
      setTransferring(true);

      const qty = Number(transferForm.qty);

      setStock((prev) => {
        let updated = [...prev];

        if (transferForm.fromYardId === selectedYardId) {
          updated = updated
            .map((item) =>
              getStockMaterialId(item) === transferForm.materialId &&
              item.locationCode === transferForm.fromLocationCode
                ? {
                    ...item,
                    qtyOnHand: Number(item.qtyOnHand || 0) - qty,
                  }
                : item
            )
            .filter((item) => Number(item.qtyOnHand || 0) > 0);
        }

        if (transferForm.toYardId === selectedYardId) {
          const existingIndex = updated.findIndex(
            (item) =>
              getStockMaterialId(item) === transferForm.materialId &&
              item.locationCode === transferForm.toLocationCode
          );

          if (existingIndex >= 0) {
            updated = updated.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    qtyOnHand: Number(item.qtyOnHand || 0) + qty,
                  }
                : item
            );
          } else {
            const material = getMaterialById(transferForm.materialId);
            updated = [
              {
                _id: `temp-${Date.now()}`,
                material: material || transferForm.materialId,
                locationCode: transferForm.toLocationCode,
                qtyOnHand: qty,
              },
              ...updated,
            ];
          }
        }

        return updated;
      });

      await transferStock({
        fromYardId: transferForm.fromYardId,
        fromLocationCode: transferForm.fromLocationCode,
        toYardId: transferForm.toYardId,
        toLocationCode: transferForm.toLocationCode,
        materialId: transferForm.materialId,
        qty,
        note: transferForm.note || undefined,
      });

      await loadStockForYard(selectedYardId);

      resetTransferForm();
      setTransferModalOpen(false);
      setConfirmTransfer(false);

      showToast("Stock transferred successfully", "success");
    } catch (err) {
      console.error(err);
      await loadStockForYard(selectedYardId);
      showToast(err.message || "Failed to transfer stock", "error");
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div style={headerTextBoxStyle}>
          <p style={eyebrowStyle}>CYMS Operations</p>
          <h2 style={getPageTitleStyle(isMobile)}>
            <Boxes size={isMobile ? 25 : 30} />
            Inventory
          </h2>
          <p style={pageSubtitleStyle}>
            Monitor stock quantities, receive materials, issue stock, and transfer
            inventory between active yard locations.
          </p>
        </div>

        <div style={getActionButtonRowStyle(isMobile)}>
          {canReceive && selectedYardId && (
            <button type="button" onClick={openReceiveModal} style={getButtonStyle(createButtonStyle, isMobile)}>
              <PackagePlus size={16} />
              Receive Stock
            </button>
          )}

          {canIssue && selectedYardId && (
            <button
              type="button"
              onClick={() => openIssueModal()}
              style={getButtonStyle(secondaryActionButtonStyle, isMobile)}
            >
              <PackageMinus size={16} />
              Issue Stock
            </button>
          )}

          {canTransfer && selectedYardId && (
            <button
              type="button"
              onClick={() => openTransferModal()}
              style={getButtonStyle(warningActionButtonStyle, isMobile)}
            >
              <ArrowRightLeft size={16} />
              Transfer Stock
            </button>
          )}
        </div>
      </div>

      <div style={getKpiGridStyle(isMobile)}>
        <KpiCard
          label="Selected Yard Items"
          value={loading ? "..." : inventoryStats.totalItems}
          icon={<Layers3 size={20} />}
        />
        <KpiCard
          label="Selected Yard Quantity"
          value={loading ? "..." : inventoryStats.totalQuantity}
          icon={<Boxes size={20} />}
          color="#16a34a"
        />
        <KpiCard
          label="Selected Main Stock"
          value={loading ? "..." : inventoryStats.mainYardStock}
          icon={<Warehouse size={20} />}
          color="#2563eb"
        />
        <KpiCard
          label="Selected Site Stock"
          value={loading ? "..." : inventoryStats.siteYardStock}
          icon={<MapPin size={20} />}
          color="#d97706"
        />
      </div>

      <div style={getFilterCardStyle(isMobile)}>
        <div style={fieldBoxStyle}>
          <label style={labelStyle}>Selected Yard</label>
          <select
            value={selectedYardId}
            onChange={(e) => {
              setSelectedYardId(e.target.value);
              resetFilters();
              closeActionMenu();
            }}
            style={inputStyle}
            disabled={yardsLoading || role === "SITE_ADMIN" || role === "SITE_STAFF"}
          >
            {yardsLoading && <option value="">Loading yards...</option>}
            {!yardsLoading && yards.length === 0 && (
              <option value="">No active yards available</option>
            )}

            {yards.map((yard) => (
              <option key={yard._id} value={yard._id}>
                {yard.name} ({yard.type})
              </option>
            ))}
          </select>
        </div>

        <div style={fieldBoxStyle}>
          <label style={labelStyle}>Search</label>
          <div style={searchInputWrapStyle}>
            <Search size={16} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Search material, code, unit, yard, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
        </div>

        <div style={fieldBoxStyle}>
          <label style={labelStyle}>Location</label>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={inputStyle}
            disabled={!selectedYardId}
          >
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc === "ALL" ? "All Locations" : loc}
              </option>
            ))}
          </select>
        </div>

        <div style={filterActionBoxStyle}>
          <button type="button" onClick={resetFilters} style={getButtonStyle(secondaryButtonStyle, isMobile)}>
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </div>

      {loading && (
        <div style={skeletonCardStyle}>
          <p style={loadingTextStyle}>Loading stock records...</p>
          <div style={skeletonLineStyle} />
          <div style={{ ...skeletonLineStyle, width: "75%" }} />
          <div style={{ ...skeletonLineStyle, width: "55%" }} />
        </div>
      )}

      {error && <p style={errorTextStyle}>{error}</p>}

      {!loading && !error && selectedYardId && (
        <div style={tableCardStyle}>
          <div style={getTableHeaderStyle(isMobile)}>
            <div style={headerTextBoxStyle}>
              <h3 style={tableTitleStyle}>Stock Register</h3>
              <p style={tableSubtitleStyle}>
                Showing {paginatedStock.length} of {filteredStock.length} stock
                records for {selectedYard?.name || "selected yard"}.
              </p>
            </div>

            <span style={recordBadgeStyle}>{filteredStock.length} records</span>
          </div>

          {isMobile ? (
            <div style={mobileCardListStyle}>
              {filteredStock.length === 0 ? (
                <div style={emptyMobileCardStyle}>No stock records found.</div>
              ) : (
                paginatedStock.map((item) => (
                  <StockMobileCard
                    key={item._id}
                    item={item}
                    selectedYardId={selectedYardId}
                    getYardName={getYardName}
                    canIssue={canIssue}
                    canTransfer={canTransfer}
                    toggleActionMenu={toggleActionMenu}
                  />
                ))
              )}
            </div>
          ) : (
            <div style={desktopTableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Material Code</th>
                    <th style={thStyle}>Material Name</th>
                    <th style={thStyle}>Yard</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={emptyStyle}>
                        No stock records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedStock.map((item) => (
                      <tr key={item._id}>
                        <td style={tdStyle}>{item.material?.code || "-"}</td>
                        <td style={tdStyle}>{item.material?.name || "-"}</td>
                        <td style={tdStyle}>{getYardName(selectedYardId)}</td>
                        <td style={tdStyle}>
                          <span style={locationBadgeStyle}>{item.locationCode || "-"}</span>
                        </td>
                        <td style={tdStyle}>{item.material?.unit || "-"}</td>
                        <td style={tdStyle}>
                          <strong style={qtyTextStyle}>{item.qtyOnHand ?? 0}</strong>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={(event) => toggleActionMenu(item._id, event)}
                            style={actionMenuButtonStyle}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div style={getPaginationStyle(isMobile)}>
            <span style={paginationTextStyle}>
              Showing {paginatedStock.length} of {filteredStock.length} records
            </span>

            <div style={paginationButtonGroupStyle}>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={getDisabledButtonStyle(secondaryButtonStyle, currentPage === 1, isMobile)}
              >
                Previous
              </button>

              <span style={paginationTextStyle}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                style={getDisabledButtonStyle(secondaryButtonStyle, currentPage === totalPages, isMobile)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {openActionId && actionMenuPosition && (
        <div
          ref={actionMenuRef}
          style={{
            ...fixedActionMenuStyle,
            top: actionMenuPosition.top,
            left: actionMenuPosition.left,
            width: actionMenuPosition.width,
          }}
        >
          {canIssue && (
            <button
              type="button"
              onClick={() => {
                const item = stock.find((s) => s._id === openActionId);
                openIssueModal(item);
              }}
              style={getActionMenuItemStyle(hoveredAction === `${openActionId}-issue`)}
              onMouseEnter={() => setHoveredAction(`${openActionId}-issue`)}
              onMouseLeave={() => setHoveredAction(null)}
            >
              <PackageMinus size={14} />
              Issue
            </button>
          )}

          {canTransfer && (
            <button
              type="button"
              onClick={() => {
                const item = stock.find((s) => s._id === openActionId);
                openTransferModal(item);
              }}
              style={getActionMenuItemStyle(hoveredAction === `${openActionId}-transfer`)}
              onMouseEnter={() => setHoveredAction(`${openActionId}-transfer`)}
              onMouseLeave={() => setHoveredAction(null)}
            >
              <ArrowRightLeft size={14} />
              Transfer
            </button>
          )}

          {!canIssue && !canTransfer && (
            <span style={noActionTextStyle}>No actions</span>
          )}
        </div>
      )}

      {receiveModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={getModalCardStyle(isMobile)}>
            <div style={modalHeaderStyle}>
              <div style={headerTextBoxStyle}>
                <h3 style={modalTitleStyle}>Receive Stock</h3>
                <p style={pageSubtitleStyle}>
                  Add stock quantity into the selected yard location.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!receiving) setReceiveModalOpen(false);
                }}
                style={modalCloseButtonStyle}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiveStock}>
              <div style={getFormGridStyle(isMobile)}>
                <Field label="Material">
                  <select
                    value={receiveForm.materialId}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        materialId: e.target.value,
                      })
                    }
                    style={inputStyle}
                    disabled={materialsLoading || receiving}
                  >
                    <option value="">
                      {materialsLoading ? "Loading materials..." : "Select material"}
                    </option>

                    {materials.map((material) => (
                      <option key={material._id} value={material._id}>
                        {material.name} {material.code ? `(${material.code})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Location">
                  <select
                    value={receiveForm.locationCode}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        locationCode: e.target.value,
                      })
                    }
                    style={inputStyle}
                    disabled={receiving}
                  >
                    {locationOptionsForSelectedYard.length > 0 ? (
                      locationOptionsForSelectedYard.map((loc) => (
                        <option key={loc.code} value={loc.code}>
                          {loc.name ? `${loc.name} (${loc.code})` : loc.code}
                        </option>
                      ))
                    ) : (
                      <option value={fallbackLocationCode}>
                        {fallbackLocationCode}
                      </option>
                    )}
                  </select>
                </Field>

                <Field label="Quantity">
                  <input
                    type="number"
                    value={receiveForm.qty}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, qty: e.target.value })
                    }
                    placeholder="Enter quantity"
                    style={inputStyle}
                    min="1"
                    disabled={receiving}
                  />
                </Field>

                <Field label="Note">
                  <input
                    type="text"
                    value={receiveForm.note}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, note: e.target.value })
                    }
                    placeholder="Optional note"
                    style={inputStyle}
                    disabled={receiving}
                  />
                </Field>
              </div>

              <ModalActions isMobile={isMobile}>
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  style={getButtonStyle(secondaryButtonStyle, isMobile)}
                  disabled={receiving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={getButtonStyle(createButtonStyle, isMobile)}
                  disabled={receiving || materialsLoading}
                >
                  {receiving ? (
                    <>
                      <Spinner size={14} />
                      Receiving...
                    </>
                  ) : (
                    "Receive Stock"
                  )}
                </button>
              </ModalActions>
            </form>
          </div>
        </div>
      )}

      {issueModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={getModalCardStyle(isMobile)}>
            <div style={modalHeaderStyle}>
              <div style={headerTextBoxStyle}>
                <h3 style={modalTitleStyle}>Issue Stock</h3>
                <p style={pageSubtitleStyle}>
                  Deduct stock from the selected yard and location.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!issuing) setIssueModalOpen(false);
                }}
                style={modalCloseButtonStyle}
                disabled={issuing}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueStock}>
              <div style={getFormGridStyle(isMobile)}>
                <div style={fullWidthFieldStyle}>
                  <Field label="Stock Item">
                    <select
                      value={issueForm.stockId}
                      onChange={(e) =>
                        setIssueForm({ ...issueForm, stockId: e.target.value })
                      }
                      style={inputStyle}
                      disabled={issuing}
                    >
                      <option value="">Select stock item</option>

                      {stock.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.material?.name || "Material"} •{" "}
                          {item.material?.code || "-"} • {item.locationCode} •
                          Available: {item.qtyOnHand}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Quantity">
                  <input
                    type="number"
                    value={issueForm.qty}
                    onChange={(e) =>
                      setIssueForm({ ...issueForm, qty: e.target.value })
                    }
                    placeholder="Enter quantity"
                    style={inputStyle}
                    min="1"
                    disabled={issuing}
                  />
                </Field>

                <div style={fullWidthFieldStyle}>
                  <Field label="Note">
                    <input
                      type="text"
                      value={issueForm.note}
                      onChange={(e) =>
                        setIssueForm({ ...issueForm, note: e.target.value })
                      }
                      placeholder="Optional note"
                      style={inputStyle}
                      disabled={issuing}
                    />
                  </Field>
                </div>
              </div>

              <ModalActions isMobile={isMobile}>
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  style={getButtonStyle(secondaryButtonStyle, isMobile)}
                  disabled={issuing}
                >
                  Cancel
                </button>

                <button type="submit" style={getButtonStyle(dangerButtonStyle, isMobile)} disabled={issuing}>
                  {issuing ? (
                    <>
                      <Spinner size={14} />
                      Issuing...
                    </>
                  ) : (
                    "Issue Stock"
                  )}
                </button>
              </ModalActions>
            </form>
          </div>
        </div>
      )}

      {transferModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={getModalCardStyle(isMobile)}>
            <div style={modalHeaderStyle}>
              <div style={headerTextBoxStyle}>
                <h3 style={modalTitleStyle}>Transfer Stock</h3>
                <p style={pageSubtitleStyle}>
                  Move stock from one active yard location to another.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!transferring) setTransferModalOpen(false);
                }}
                style={modalCloseButtonStyle}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferStock}>
              <div style={getFormGridStyle(isMobile)}>
                <Field label="From Yard">
                  <select
                    value={transferForm.fromYardId}
                    onChange={(e) => {
                      const yardId = e.target.value;
                      const locations = getActiveLocationsForYard(yardId);

                      setTransferForm({
                        ...transferForm,
                        fromYardId: yardId,
                        fromLocationCode:
                          locations[0]?.code || getFallbackLocationForYard(yardId),
                      });
                    }}
                    style={inputStyle}
                    disabled={transferring}
                  >
                    <option value="">Select from yard</option>
                    {yards.map((yard) => (
                      <option key={yard._id} value={yard._id}>
                        {yard.name} ({yard.type})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="From Location">
                  <select
                    value={transferForm.fromLocationCode}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        fromLocationCode: e.target.value,
                      })
                    }
                    style={inputStyle}
                    disabled={!transferForm.fromYardId || transferring}
                  >
                    {!transferForm.fromYardId && (
                      <option value="">Select from yard first</option>
                    )}

                    {getActiveLocationsForYard(transferForm.fromYardId).map(
                      (loc) => (
                        <option key={loc.code} value={loc.code}>
                          {loc.name ? `${loc.name} (${loc.code})` : loc.code}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="To Yard">
                  <select
                    value={transferForm.toYardId}
                    onChange={(e) => {
                      const yardId = e.target.value;
                      const locations = getActiveLocationsForYard(yardId);

                      setTransferForm({
                        ...transferForm,
                        toYardId: yardId,
                        toLocationCode:
                          locations[0]?.code || getFallbackLocationForYard(yardId),
                      });
                    }}
                    style={inputStyle}
                    disabled={transferring}
                  >
                    <option value="">Select to yard</option>
                    {yards.map((yard) => (
                      <option key={yard._id} value={yard._id}>
                        {yard.name} ({yard.type})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="To Location">
                  <select
                    value={transferForm.toLocationCode}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        toLocationCode: e.target.value,
                      })
                    }
                    style={inputStyle}
                    disabled={!transferForm.toYardId || transferring}
                  >
                    {!transferForm.toYardId && (
                      <option value="">Select to yard first</option>
                    )}

                    {getActiveLocationsForYard(transferForm.toYardId).map(
                      (loc) => (
                        <option key={loc.code} value={loc.code}>
                          {loc.name ? `${loc.name} (${loc.code})` : loc.code}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="Material">
                  <select
                    value={transferForm.materialId}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        materialId: e.target.value,
                      })
                    }
                    style={inputStyle}
                    disabled={materialsLoading || transferring}
                  >
                    <option value="">
                      {materialsLoading ? "Loading materials..." : "Select material"}
                    </option>

                    {materials.map((material) => (
                      <option key={material._id} value={material._id}>
                        {material.name} {material.code ? `(${material.code})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantity">
                  <input
                    type="number"
                    value={transferForm.qty}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, qty: e.target.value })
                    }
                    placeholder="Enter quantity"
                    style={inputStyle}
                    min="1"
                    disabled={transferring}
                  />
                </Field>

                <div style={fullWidthFieldStyle}>
                  <Field label="Note">
                    <input
                      type="text"
                      value={transferForm.note}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, note: e.target.value })
                      }
                      placeholder="Optional note"
                      style={inputStyle}
                      disabled={transferring}
                    />
                  </Field>
                </div>
              </div>

              <ModalActions isMobile={isMobile}>
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  style={getButtonStyle(secondaryButtonStyle, isMobile)}
                  disabled={transferring}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={getButtonStyle(warningActionButtonStyle, isMobile)}
                  disabled={transferring || materialsLoading}
                >
                  {transferring ? (
                    <>
                      <Spinner size={14} />
                      Transferring...
                    </>
                  ) : (
                    "Transfer Stock"
                  )}
                </button>
              </ModalActions>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmIssue}
        title="Confirm Issue"
        message="Are you sure you want to issue this stock quantity?"
        loading={issuing}
        onCancel={() => {
          if (!issuing) setConfirmIssue(false);
        }}
        onConfirm={confirmIssueStock}
      />
      <ConfirmModal
        open={confirmTransfer}
        title="Confirm Transfer"
        message="Are you sure you want to transfer this stock quantity?"
        loading={transferring}
        onCancel={() => {
          if (!transferring) setConfirmTransfer(false);
        }}
        onConfirm={confirmTransferStock}
      />
      <ConfirmModal
        open={confirmReceive}
        title="Confirm Receive"
        message="Are you sure you want to receive this stock quantity?"
        loading={receiving}
        onCancel={() => {
          if (!receiving) setConfirmReceive(false);
        }}
        onConfirm={confirmReceiveStock}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={fieldBoxStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ children, isMobile }) {
  return <div style={getFormFooterStyle(isMobile)}>{children}</div>;
}

function KpiCard({ label, value, icon, color = theme.text }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ ...kpiIconStyle, color }}>{icon}</div>
      <p style={kpiLabelStyle}>{label}</p>
      <h3 style={{ ...kpiValueStyle, color }}>{value}</h3>
    </div>
  );
}

function StockMobileCard({
  item,
  selectedYardId,
  getYardName,
  canIssue,
  canTransfer,
  toggleActionMenu,
}) {
  return (
    <div style={stockMobileCardStyle}>
      <div style={mobileCardTopRowStyle}>
        <div style={headerTextBoxStyle}>
          <p style={mobileCardCodeStyle}>{item.material?.code || "No code"}</p>
          <h4 style={mobileCardTitleStyle}>{item.material?.name || "Material"}</h4>
        </div>

        {(canIssue || canTransfer) && (
          <button
            type="button"
            onClick={(event) => toggleActionMenu(item._id, event)}
            style={actionMenuButtonStyle}
          >
            <MoreHorizontal size={16} />
            
          </button>
        )}
      </div>

      <div style={mobileInfoGridStyle}>
        <MobileInfo label="Yard" value={getYardName(selectedYardId)} />
        <MobileInfo label="Location" value={item.locationCode || "-"} badge />
        <MobileInfo label="Unit" value={item.material?.unit || "-"} />
        <MobileInfo label="Quantity" value={item.qtyOnHand ?? 0} strong />
      </div>
    </div>
  );
}

function MobileInfo({ label, value, strong = false, badge = false }) {
  return (
    <div style={mobileInfoBoxStyle}>
      <span style={mobileInfoLabelStyle}>{label}</span>
      {badge ? (
        <span style={locationBadgeStyle}>{value}</span>
      ) : (
        <strong style={strong ? mobileInfoStrongStyle : mobileInfoValueStyle}>
          {value}
        </strong>
      )}
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(147,197,253,0.35)",
        borderTopColor: "#93c5fd",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

const cardBaseStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 18,
  boxShadow: theme.shadow,
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
};

const headerTextBoxStyle = {
  minWidth: 0,
  maxWidth: "100%",
};

function getPageHeaderStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "flex-start",
    justifyContent: "space-between",
    gap: 16,
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

function getPageTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? 28 : 34,
    fontWeight: 900,
    color: theme.text,
    letterSpacing: "-0.04em",
    display: "flex",
    alignItems: "center",
    gap: 10,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    minWidth: 0,
  };
}

const pageSubtitleStyle = {
  margin: "8px 0 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.5,
};

function getActionButtonRowStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "stretch",
    justifyContent: "flex-end",
    gap: 10,
    width: isMobile ? "100%" : "auto",
    flexWrap: "wrap",
    flexShrink: 0,
  };
}

function getKpiGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    minWidth: 0,
  };
}

const kpiCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  minHeight: 108,
  minWidth: 0,
  boxSizing: "border-box",
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

const kpiLabelStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
  fontWeight: 700,
};

const kpiValueStyle = {
  margin: "8px 0 0",
  fontSize: 30,
  fontWeight: 900,
};

function getFilterCardStyle(isMobile) {
  return {
    ...cardBaseStyle,
    padding: 16,
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1.4fr 2fr 1fr auto",
    gap: 12,
    alignItems: "end",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  };
}

const fieldBoxStyle = {
  minWidth: 0,
  maxWidth: "100%",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const searchInputWrapStyle = {
  position: "relative",
  minWidth: 0,
};

const searchIconStyle = {
  position: "absolute",
  left: 13,
  top: "50%",
  transform: "translateY(-50%)",
  color: theme.muted,
};

const searchInputStyle = {
  ...inputStyle,
  paddingLeft: 40,
};

const filterActionBoxStyle = {
  display: "flex",
  alignItems: "flex-end",
  minWidth: 0,
};

const createButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.primary,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(37,99,235,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const secondaryButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const secondaryActionButtonStyle = {
  border: `1px solid rgba(15,23,42,0.08)`,
  borderRadius: 10,
  padding: "12px 16px",
  background: "#dbeafe",
  color: "#1e3a8a",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
  boxShadow: "0 8px 20px rgba(37,99,235,0.10)",
};

const warningActionButtonStyle = {
  border: `1px solid rgba(245,158,11,0.25)`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.warningSoft,
  color: theme.warning,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const dangerButtonStyle = {
  border: `1px solid rgba(239,68,68,0.22)`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.dangerSoft,
  color: theme.danger,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

function getButtonStyle(baseStyle, isMobile) {
  return {
    ...baseStyle,
    width: isMobile ? "100%" : baseStyle.width || "auto",
    maxWidth: "100%",
    boxSizing: "border-box",
  };
}

function getDisabledButtonStyle(baseStyle, disabled, isMobile) {
  return {
    ...getButtonStyle(baseStyle, isMobile),
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const tableCardStyle = {
  ...cardBaseStyle,
  padding: 20,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "visible",
};

function getTableHeaderStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "flex-start",
    gap: 16,
    marginBottom: 16,
    minWidth: 0,
  };
}

const tableTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 900,
};

const tableSubtitleStyle = {
  margin: "6px 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.5,
};

const recordBadgeStyle = {
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primary,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
  alignSelf: "flex-start",
};

const desktopTableWrapStyle = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: 860,
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.text,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "13px 16px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.textSoft,
  fontSize: 14,
  verticalAlign: "middle",
};

const qtyTextStyle = {
  color: theme.text,
  fontWeight: 900,
};

const locationBadgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  color: theme.textSoft,
  fontSize: 12,
  fontWeight: 800,
};

const emptyStyle = {
  padding: "22px 16px",
  textAlign: "center",
  color: theme.muted,
};

const actionIconButtonStyle = {
  ...secondaryButtonStyle,
  padding: "6px 10px",
  fontSize: 12,
};

const actionMenuButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "8px 12px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const fixedActionMenuStyle = {
  position: "fixed",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  zIndex: 1500,
  boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
  overflow: "hidden",
};

const actionMenuItemStyle = {
  width: "100%",
  padding: "11px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: theme.text,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const noActionTextStyle = {
  display: "block",
  padding: "9px 10px",
  color: theme.muted,
  fontSize: 13,
};

function getActionMenuItemStyle(isHovered) {
  return {
    ...actionMenuItemStyle,
    background: isHovered ? theme.surfaceSoft : "transparent",
  };
}

function getPaginationStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "flex-end",
    alignItems: isMobile ? "stretch" : "center",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  };
}

const paginationButtonGroupStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const paginationTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 600,
};

const mobileCardListStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const stockMobileCardStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  background: theme.surface,
  padding: 14,
  boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
  minWidth: 0,
};

const mobileCardTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const mobileCardCodeStyle = {
  margin: "0 0 4px",
  color: theme.primary,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const mobileCardTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.3,
  wordBreak: "break-word",
};

const mobileInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const mobileInfoBoxStyle = {
  minWidth: 0,
  padding: 10,
  borderRadius: 12,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
};

const mobileInfoLabelStyle = {
  display: "block",
  marginBottom: 5,
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
};

const mobileInfoValueStyle = {
  color: theme.textSoft,
  fontSize: 13,
  fontWeight: 800,
  wordBreak: "break-word",
};

const mobileInfoStrongStyle = {
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
};




const emptyMobileCardStyle = {
  padding: 20,
  textAlign: "center",
  color: theme.muted,
  border: `1px dashed ${theme.border}`,
  borderRadius: 14,
  background: theme.surfaceSoft,
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

function getModalCardStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "100%" : 760,
    maxHeight: "88vh",
    overflowY: "auto",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 18 : 22,
    padding: isMobile ? 16 : 22,
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
};

const modalTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 900,
};

const modalCloseButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  background: theme.surfaceSoft,
  color: theme.text,
  width: 34,
  height: 34,
  cursor: "pointer",
  fontSize: 18,
  flexShrink: 0,
};

function getFormGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 16,
    width: "100%",
    minWidth: 0,
  };
}

const fullWidthFieldStyle = {
  gridColumn: "1 / -1",
  minWidth: 0,
};

function getFormFooterStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    justifyContent: "flex-end",
    alignItems: "stretch",
    gap: 10,
    marginTop: 24,
    paddingTop: 16,
    borderTop: `1px solid ${theme.border}`,
  };
}

const skeletonCardStyle = {
  ...cardBaseStyle,
  padding: 20,
};

const loadingTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
};

const errorTextStyle = {
  color: theme.danger,
  fontSize: 14,
  fontWeight: 600,
};

const skeletonLineStyle = {
  height: 14,
  width: "100%",
  borderRadius: 999,
  background: theme.surfaceSoft,
  marginTop: 12,
};
