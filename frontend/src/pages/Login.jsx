import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { theme } from "../styles/theme";
import logo from "../assets/cyms-logo.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);

      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      const meData = await meRes.json();

      if (!meRes.ok) {
        throw new Error(meData.message || "Failed to load user info");
      }

      const user = meData.user ?? meData;

      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={glowOneStyle} />
      <div style={glowTwoStyle} />

      <div style={cardStyle}>
        <div style={brandRowStyle}>
          <img src={logo} alt="CYMS Logo" style={brandLogoImageStyle} />
        </div>

        <div style={dividerStyle} />

        <div style={heroTextWrapStyle}>
          <h2 style={titleStyle}>Welcome back</h2>
          <p style={subtitleStyle}>
            Sign in to continue to your Construction Yard Management System.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label style={labelStyle} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="system@cyms.com"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={errorBoxStyle} role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={footerStyle}>
          <span>Need help?</span>
          <Link style={linkStyle} to="/support">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  height: "100vh",
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(16px, 4vw, 24px)",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 32%), radial-gradient(circle at bottom right, rgba(22,163,74,0.07), transparent 30%), #f8fafc",
  color: theme.text,
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const glowOneStyle = {
  position: "absolute",
  width: 420,
  height: 420,
  borderRadius: "50%",
  background: "rgba(37,99,235,0.08)",
  filter: "blur(100px)",
  top: -120,
  left: -120,
  pointerEvents: "none",
};

const glowTwoStyle = {
  position: "absolute",
  width: 360,
  height: 360,
  borderRadius: "50%",
  background: "rgba(22,163,74,0.07)",
  filter: "blur(100px)",
  right: -110,
  bottom: -110,
  pointerEvents: "none",
};

const cardStyle = {
  width: "100%",
  maxWidth: 460,
  minWidth: 0,
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(226,232,240,0.85)",
  borderRadius: "clamp(20px, 5vw, 28px)",
  padding: "clamp(22px, 5vw, 34px) clamp(18px, 5vw, 32px)",
  boxShadow:
    "0 24px 70px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
  position: "relative",
  zIndex: 2,
  boxSizing: "border-box",
};

const brandRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
};

const brandLogoImageStyle = {
  width: "100%",
  maxWidth: 165,
  height: "auto",
  objectFit: "contain",
  display: "block",
};

const dividerStyle = {
  height: 1,
  background: theme.border,
  margin: "18px 0 24px",
};

const heroTextWrapStyle = {
  maxWidth: 340,
  margin: "0 auto 4px",
  textAlign: "center",
};

const titleStyle = {
  margin: 0,
  fontSize: "clamp(22px, 5vw, 24px)",
  fontWeight: 900,
  letterSpacing: "-0.04em",
  color: theme.text,
  lineHeight: 1.15,
};

const subtitleStyle = {
  margin: "10px 0 0",
  fontSize: 15,
  lineHeight: 1.6,
  color: theme.muted,
};

const formStyle = {
  marginTop: 22,
  display: "grid",
  gap: 14,
  width: "100%",
  minWidth: 0,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: theme.textSoft,
  marginBottom: 8,
  display: "block",
};

const inputStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "14px 15px",
  borderRadius: 14,
  border: `1px solid ${theme.border}`,
  background: "#f8fafc",
  color: theme.text,
  fontSize: 14,
  outline: "none",
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  marginTop: 6,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
  transition: "all 0.2s ease",
};

const errorBoxStyle = {
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.25)",
  background: theme.dangerSoft,
  padding: "10px 12px",
  color: theme.danger,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.4,
};

const footerStyle = {
  marginTop: 22,
  paddingTop: 18,
  borderTop: `1px solid ${theme.border}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  fontSize: 13,
  color: theme.muted,
};

const linkStyle = {
  color: theme.primary,
  textDecoration: "none",
  fontWeight: 800,
};