import { Link } from "react-router-dom";
import { SearchX, ArrowLeft, Home } from "lucide-react";
import { theme } from "../styles/theme";

export default function NotFound() {
  return (
    <div style={pageStyle}>
      <div style={glowStyle} />

      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <SearchX size={46} />
        </div>

        <p style={eyebrowStyle}>404 ERROR</p>

        <h1 style={titleStyle}>Page Not Found</h1>

        <p style={descriptionStyle}>
          The page you are looking for does not exist, was moved,
          or the URL is incorrect.
        </p>

        <div style={buttonRowStyle}>
          <Link
            to="/dashboard"
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Home size={16} />
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primarySoft;
              e.currentTarget.style.borderColor = theme.primaryBorder;
              e.currentTarget.style.color = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.surfaceSoft;
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.text;
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  height: "100vh",
  minHeight: "100vh",
  width: "100%",
  background: theme.bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  overflow: "hidden",
  position: "fixed",
  inset: 0,
  boxSizing: "border-box",
};

const glowStyle = {
  position: "absolute",
  width: 420,
  height: 420,
  borderRadius: "50%",
  background: "rgba(37,99,235,0.08)",
  filter: "blur(100px)",
};

const cardStyle = {
  width: "100%",
  maxWidth: 580,
  padding: "52px 40px",
  borderRadius: 28,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  boxShadow: "0 30px 80px rgba(15,23,42,0.10)",
  position: "relative",
  zIndex: 2,
  textAlign: "center",
};

const iconWrapStyle = {
  width: 90,
  height: 90,
  margin: "0 auto 24px",
  borderRadius: 24,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrowStyle = {
  margin: 0,
  color: theme.primary,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.14em",
};

const titleStyle = {
  margin: "12px 0 14px",
  color: theme.text,
  fontSize: 42,
  fontWeight: 900,
  letterSpacing: "-0.04em",
};

const descriptionStyle = {
  margin: 0,
  color: theme.textSoft,
  fontSize: 15,
  lineHeight: 1.7,
};

const buttonRowStyle = {
  marginTop: 34,
  display: "flex",
  justifyContent: "center",
  gap: 14,
  flexWrap: "wrap",
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "13px 18px",
  borderRadius: 12,
  border: "none",
  background: theme.primary,
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 800,
  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
  transition: "all 0.2s ease",
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "13px 18px",
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};