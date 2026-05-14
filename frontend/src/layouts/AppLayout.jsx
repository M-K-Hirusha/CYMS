import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../assets/cyms-logo.png";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  ShieldCheck,
  UserCog,
  Wrench,
  UserCircle,
  Mail,
  BadgeCheck,
  X,
  Menu,
} from "lucide-react";
import { theme } from "../styles/theme";
import ConfirmModal from "../components/ConfirmModal";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [hoveredNav, setHoveredNav] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = localStorage.getItem("role");

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen && isMobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const navItems = useMemo(() => {
    const items = [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
      },

      ...(role !== "SITE_STAFF"
        ? [
            {
              to: "/reports",
              label: "Reports",
              icon: <BarChart3 size={18} />,
            },
          ]
        : []),

      {
        to: "/mrs",
        label: "Material Requests",
        icon: <ClipboardList size={18} />,
      },
      {
        to: "/tools",
        label: "Tools",
        icon: <Wrench size={18} />,
      },
      {
        to: "/materials",
        label: "Materials",
        icon: <Package size={18} />,
      },
      {
        to: "/inventory",
        label: "Inventory",
        icon: <Boxes size={18} />,
      },
    ];

    if (role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN") {
      items.push({
        to: "/yards",
        label: "Yards",
        icon: <Building2 size={18} />,
      });

      items.push({
        to: "/users",
        label: "Users",
        icon: <UserCog size={18} />,
      });
    }

    if (role === "SITE_ADMIN") {
      items.push({
        to: "/yards",
        label: "Yards",
        icon: <Building2 size={18} />,
      });
    }

    return items;
  }, [role]);

  const currentPageLabel = useMemo(() => {
    const match = navItems.find((item) => location.pathname.startsWith(item.to));
    return match?.label || "CYMS";
  }, [location.pathname, navItems]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    setShowAccountModal(false);
    setConfirmLogout(false);
    setSidebarOpen(false);
    setToken(null);
    navigate("/login");
  };

  return (
    <div style={layoutStyle}>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          style={sidebarOverlayStyle}
        />
      )}

      <aside style={getSidebarStyle(isMobile, sidebarOpen)}>
        <div>
          <div style={mobileSidebarHeaderStyle}>
            <div style={brandCardStyle}>
              <img src={logo} alt="CYMS Logo" style={brandLogoImageStyle} />
            </div>

            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                style={mobileCloseButtonStyle}
                className="close-btn"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <nav style={navStyle}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => isMobile && setSidebarOpen(false)}
                onMouseEnter={() => setHoveredNav(item.to)}
                onMouseLeave={() => setHoveredNav(null)}
                style={({ isActive }) =>
                  getNavLinkStyle(isActive, hoveredNav === item.to)
                }
              >
                <span style={navIconWrapStyle}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={bottomSectionStyle}>
          {token && (
            <button
              type="button"
              onClick={() => setShowAccountModal(true)}
              style={accountButtonStyle}
            >
              <div style={accountAvatarStyle}>
                {(user?.fullName || "U").charAt(0).toUpperCase()}
              </div>

              <div style={{ minWidth: 0, textAlign: "left" }}>
                <p style={accountSmallTextStyle}>Account</p>
                <strong style={accountNameStyle}>{user?.fullName || "User"}</strong>
              </div>

              <UserCircle
                size={20}
                style={{ color: theme.primary, marginLeft: "auto", flexShrink: 0 }}
              />
            </button>
          )}

          {token ? (
            <button
              type="button"
              onClick={() => {
                setShowAccountModal(false);
                setConfirmLogout(true);
              }}
              style={logoutButtonStyle}
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={loginButtonStyle}
            >
              <LogIn size={17} />
              Login
            </button>
          )}
        </div>
      </aside>

      <div style={contentShellStyle}>
        <header style={getTopbarStyle(isMobile)}>
          <div style={topbarLeftStyle}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                style={hamburgerButtonStyle}
              >
                <Menu size={21} />
              </button>
            )}

            <div style={{ minWidth: 0 }}>
              <h1 style={getSystemTitleStyle(isMobile)}>
                Construction Yard Management System
              </h1>
              <p style={breadcrumbStyle}>{currentPageLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => token && setShowAccountModal(true)}
            style={topbarPillStyle}
          >
            <ShieldCheck size={15} />
            {formatRole(role || "GUEST")}
          </button>
        </header>

        <main style={getMainStyle(isMobile)}>
          <div style={mainInnerStyle}>
            <Outlet />
          </div>
        </main>
      </div>

      {showAccountModal && (
        <div style={accountOverlayStyle}>
          <div style={getAccountModalStyle(isMobile)}>
            <div style={accountModalHeaderStyle}>
              <div>
                <p style={brandEyebrowStyle}>CYMS ACCOUNT</p>
                <h3 style={accountModalTitleStyle}>Account Details</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                style={accountCloseButtonStyle}
                className="close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div style={getAccountProfileStyle(isMobile)}>
              <div style={accountLargeAvatarStyle}>
                {(user?.fullName || "U").charAt(0).toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <h4 style={accountFullNameStyle}>{user?.fullName || "User"}</h4>
                <p style={accountEmailStyle}>{user?.email || "No email available"}</p>
              </div>
            </div>

            <div style={getAccountDetailsGridStyle(isMobile)}>
              <AccountInfo icon={<UserCircle size={18} />} label="Name" value={user?.fullName || "User"} />
              <AccountInfo icon={<Mail size={18} />} label="Email" value={user?.email || "-"} />
              <AccountInfo icon={<BadgeCheck size={18} />} label="Role" value={formatRole(role || "USER")} />
              <AccountInfo icon={<ShieldCheck size={18} />} label="Permission Code" value={role || "USER"} />
            </div>

            <div style={getAccountModalFooterStyle(isMobile)}>
              <button type="button" onClick={() => setShowAccountModal(false)} style={secondaryButtonStyle}>
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  setConfirmLogout(true);
                }}
                style={accountLogoutButtonStyle}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout from CYMS?"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}

function AccountInfo({ icon, label, value }) {
  return (
    <div style={accountInfoStyle}>
      <div style={accountInfoIconStyle}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={accountInfoLabelStyle}>{label}</p>
        <strong style={accountInfoValueStyle}>{value}</strong>
      </div>
    </div>
  );
}

function formatRole(value = "") {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getNavLinkStyle(isActive, isHovered) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    transition: "all 0.2s ease",
    background: isActive ? theme.primary : isHovered ? theme.surfaceSoft : "transparent",
    color: isActive ? "#ffffff" : theme.textSoft,
    border: isActive
      ? `1px solid ${theme.primary}`
      : `1px solid ${isHovered ? theme.border : "transparent"}`,
    boxShadow: isActive ? "0 8px 18px rgba(37,99,235,0.18)" : "none",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const layoutStyle = {
  display: "flex",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: "100vh",
  overflow: "hidden",
  background: theme.bg,
  color: theme.text,
  position: "fixed",
  inset: 0,
  isolation: "isolate",
};

function getSidebarStyle(isMobile, sidebarOpen) {
  return {
    width: isMobile ? "min(86vw, 310px)" : 285,
    minWidth: isMobile ? "min(86vw, 310px)" : 285,
    maxWidth: "100%",
    height: "100vh",
    background: theme.surface,
    borderRight: `1px solid ${theme.border}`,
    padding: isMobile ? 18 : 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: isMobile
      ? "18px 0 55px rgba(15,23,42,0.28)"
      : "4px 0 18px rgba(15,23,42,0.04)",
    overflowY: "auto",
    overflowX: "hidden",
    position: isMobile ? "fixed" : "relative",
    top: 0,
    left: 0,
    zIndex: isMobile ? 1500 : 0,
    transform: isMobile
      ? sidebarOpen
        ? "translateX(0)"
        : "translateX(-105%)"
      : "translateX(0)",
    transition: "transform 0.25s ease",
  };
}

const sidebarOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  border: "none",
  background: "rgba(15,23,42,0.45)",
  cursor: "pointer",
};

const mobileSidebarHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const mobileCloseButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const brandCardStyle = {
  padding: "0 0 10px",
  marginBottom: 10,
  borderBottom: `1px solid ${theme.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const brandLogoImageStyle = {
  width: "100%",
  maxWidth: 170,
  height: "auto",
  objectFit: "contain",
  display: "block",
};

const brandEyebrowStyle = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: theme.muted,
  fontWeight: 800,
};

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingTop: 8,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const navIconWrapStyle = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const bottomSectionStyle = {
  display: "grid",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const logoutButtonStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.2s ease",
};

const loginButtonStyle = {
  ...logoutButtonStyle,
  border: `1px solid ${theme.primary}`,
  background: theme.primary,
  color: "#ffffff",
};

const contentShellStyle = {
  flex: 1,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  position: "relative",
  zIndex: 1,
};

function getTopbarStyle(isMobile) {
  return {
    minHeight: isMobile ? 68 : 76,
    borderBottom: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: isMobile ? "0 14px" : "0 28px",
    background: theme.surface,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const topbarLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const hamburgerButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 13,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

function getSystemTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? 15 : 21,
    fontWeight: 900,
    color: theme.text,
    letterSpacing: "-0.03em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  };
}

const breadcrumbStyle = {
  margin: "5px 0 0",
  fontSize: 13,
  color: theme.muted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const topbarPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 12px",
  borderRadius: 999,
  background: theme.primarySoft,
  color: theme.primary,
  border: `1px solid ${theme.primaryBorder}`,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
  flexShrink: 0,
};

function getMainStyle(isMobile) {
  return {
    flex: 1,
    padding: isMobile ? 16 : 28,
    background: theme.bg,
    overflowY: "auto",
    overflowX: "clip",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const mainInnerStyle = {
  width: "100%",
  maxWidth: 1450,
  minWidth: 0,
  margin: "0 auto",
  overflow: "visible",
};

const accountButtonStyle = {
  width: "100%",
  padding: 13,
  borderRadius: 18,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 11,
  boxShadow: theme.shadow,
  minWidth: 0,
};

const accountAvatarStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  background: theme.primary,
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  flexShrink: 0,
};

const accountSmallTextStyle = {
  margin: 0,
  fontSize: 12,
  color: theme.muted,
};

const accountNameStyle = {
  display: "block",
  color: theme.text,
  fontSize: 14,
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const accountOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
  padding: 16,
  backdropFilter: "blur(6px)",
};

function getAccountModalStyle(isMobile) {
  return {
    width: isMobile ? "100%" : "min(96vw, 620px)",
    maxWidth: "620px",
    maxHeight: "92vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 18 : 24,
    padding: isMobile ? 16 : 22,
    boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
  };
}

const accountModalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 18,
};

const accountModalTitleStyle = {
  margin: "5px 0 0",
  color: theme.text,
  fontSize: 24,
  fontWeight: 900,
};

const accountCloseButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

function getAccountProfileStyle(isMobile) {
  return {
    display: "flex",
    alignItems: isMobile ? "flex-start" : "center",
    flexDirection: isMobile ? "column" : "row",
    gap: 16,
    padding: 16,
    borderRadius: 18,
    background: theme.surfaceSoft,
    border: `1px solid ${theme.border}`,
    marginBottom: 16,
    minWidth: 0,
  };
}

const accountLargeAvatarStyle = {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: theme.primary,
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  fontSize: 26,
  flexShrink: 0,
};

const accountFullNameStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 900,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const accountEmailStyle = {
  margin: "5px 0 0",
  color: theme.muted,
  fontSize: 14,
  wordBreak: "break-word",
};

function getAccountDetailsGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 12,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const accountInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  minWidth: 0,
};

const accountInfoIconStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: theme.primarySoft,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const accountInfoLabelStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
};

const accountInfoValueStyle = {
  display: "block",
  marginTop: 3,
  color: theme.text,
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function getAccountModalFooterStyle(isMobile) {
  return {
    marginTop: 18,
    paddingTop: 16,
    borderTop: `1px solid ${theme.border}`,
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    justifyContent: "flex-end",
    gap: 10,
  };
}

const accountLogoutButtonStyle = {
  border: "1px solid #fecaca",
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
};