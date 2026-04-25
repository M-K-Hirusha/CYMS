import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    setToken(null);
    navigate("/login");
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "block",
    padding: "12px 14px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 15,
    transition: "all 0.2s ease",
    background: isActive ? "#2563eb" : "transparent",
    color: isActive ? "#ffffff" : "#cbd5e1",
    border: isActive ? "1px solid #2563eb" : "1px solid transparent",
  });

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <aside
        style={{
          width: 260,
          background: "#111827",
          borderRight: "1px solid #1f2937",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#94a3b8",
              }}
            >
              Construction Yard
            </p>
            <h2
              style={{
                margin: "8px 0 0 0",
                fontSize: 28,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              CYMS
            </h2>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <NavLink to="/dashboard" style={navLinkStyle}>
              Dashboard
            </NavLink>

            <NavLink to="/reports" style={navLinkStyle}>
              Reports
            </NavLink>

            <NavLink to="/mrs" style={navLinkStyle}>
              Material Requests
            </NavLink>

            <NavLink to="/tools" style={navLinkStyle}>
              Tools
            </NavLink>

            <NavLink to="/materials" style={navLinkStyle}>
              Materials
            </NavLink>
          </nav>
        </div>

        <div>
          {token ? (
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Login
            </button>
          )}
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <header
          style={{
            height: 72,
            borderBottom: "1px solid #1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            background: "#0f172a",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              Construction Yard Management System
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Final Year Project Dashboard
            </p>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: 28,
            background: "#020617",
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}