import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Wrench,
  LifeBuoy,
  LogIn,
  Info,
  CheckCircle2,
} from "lucide-react";
import { theme } from "../styles/theme";
import logo from "../assets/cyms-logo.png";

export default function Support() {
  const navigate = useNavigate();

  return (
    <div style={pageStyle}>
      <div style={glowOneStyle} />
      <div style={glowTwoStyle} />

      <section style={shellStyle} className="support-shell">
        <div style={leftPanelStyle}>
          <img src={logo} alt="CYMS Logo" style={logoStyle} />

          <div style={heroIconStyle}>
            <LifeBuoy size={42} strokeWidth={2.2} />
          </div>

          <p style={eyebrowStyle}>CYMS SUPPORT CENTER</p>

          <h1 style={titleStyle}>How can we help?</h1>

          <p style={subtitleStyle}>
            Get help with login access, account permissions, password reset
            requests, and technical issues related to CYMS.
          </p>

          <div style={noticeBoxStyle}>
            <Info size={18} />
            <span>
              For urgent operational issues, contact your administrator
              immediately.
            </span>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={secondaryButtonStyle}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={primaryButtonStyle}
            >
              <LogIn size={16} />
              Back to Login
            </button>
          </div>
        </div>

        <div style={rightPanelStyle}>
          <SupportCard
            icon={<ShieldCheck size={24} />}
            label="System Support"
            title="Administrator Access"
            text="For account activation, permission changes, blocked access, or password reset support."
            accent="blue"
          />

          <SupportCard
            icon={<Mail size={24} />}
            label="Developer Contact"
            title="hirusha.contact@gmail.com"
            text="For technical support, bug reports, UI issues, export problems, or system-related inquiries."
            accent="green"
            email
          />

          <SupportCard
            icon={<Wrench size={24} />}
            label="Technical Assistance"
            title="System Troubleshooting"
            text="When reporting issues, include screenshots, error messages, user role, page name, and steps to reproduce."
            accent="orange"
          />

          <div style={checklistBoxStyle}>
            <div style={checklistHeaderStyle}>
              <CheckCircle2 size={19} color={theme.success} />
              <strong>Before contacting support</strong>
            </div>

            <ul style={listStyle}>
              <li>Check your email and password carefully.</li>
              <li>Confirm your account role has page access.</li>
              <li>Take a screenshot of any error message.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupportCard({ icon, label, title, text, accent, email }) {
  const colors = getAccentColors(accent);

  return (
    <div style={supportCardStyle}>
      <div
        style={{
          ...supportIconStyle,
          background: colors.bg,
          borderColor: colors.border,
          color: colors.color,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <p style={{ ...cardLabelStyle, color: colors.color }}>{label}</p>

        {email ? (
          <a
            href={`mailto:${title}`}
            style={emailStyle}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.primary;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.text;
            }}
          >
            {title}
          </a>
        ) : (
          <h3 style={cardTitleStyle}>{title}</h3>
        )}

        <div style={{ ...smallLineStyle, background: colors.color }} />

        <p style={cardTextStyle}>{text}</p>
      </div>
    </div>
  );
}

function getAccentColors(type) {
  if (type === "green") {
    return {
      color: theme.success,
      bg: theme.successSoft,
      border: "rgba(22,163,74,0.22)",
    };
  }

  if (type === "orange") {
    return {
      color: theme.warning,
      bg: theme.warningSoft,
      border: "rgba(245,158,11,0.24)",
    };
  }

  return {
    color: theme.primary,
    bg: theme.primarySoft,
    border: theme.primaryBorder,
  };
}

const pageStyle = {
  height: "100vh",
  width: "100%",
  padding: "clamp(16px, 4vw, 34px)",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 30%), radial-gradient(circle at bottom right, rgba(22,163,74,0.08), transparent 30%), #f8fafc",
  position: "fixed",
  inset: 0,
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const glowOneStyle = {
  position: "absolute",
  width: 460,
  height: 460,
  borderRadius: "50%",
  background: "rgba(37,99,235,0.10)",
  filter: "blur(110px)",
  top: -150,
  left: -150,
  pointerEvents: "none",
};

const glowTwoStyle = {
  position: "absolute",
  width: 430,
  height: 430,
  borderRadius: "50%",
  background: "rgba(22,163,74,0.09)",
  filter: "blur(120px)",
  right: -150,
  bottom: -150,
  pointerEvents: "none",
};

const shellStyle = {
  width: "100%",
  maxWidth: 1180,
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.9fr) minmax(360px, 1.1fr)",
  gap: 20,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: 32,
  padding: "clamp(18px, 3vw, 26px)",
  boxShadow:
    "0 30px 90px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.78)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  position: "relative",
  zIndex: 2,
  boxSizing: "border-box",
};

const leftPanelStyle = {
  borderRadius: 26,
  padding: "clamp(22px, 4vw, 38px)",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(239,246,255,0.70))",
  border: `1px solid ${theme.border}`,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minWidth: 0,
};

const rightPanelStyle = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};

const logoStyle = {
  width: "100%",
  maxWidth: 190,
  height: "auto",
  objectFit: "contain",
  display: "block",
  marginBottom: 34,
};

const heroIconStyle = {
  width: 92,
  height: 92,
  borderRadius: 28,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 16px 36px rgba(37,99,235,0.12)",
  marginBottom: 24,
};

const eyebrowStyle = {
  margin: 0,
  color: theme.primary,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const titleStyle = {
  margin: "14px 0 0",
  color: theme.text,
  fontSize: "clamp(38px, 5vw, 58px)",
  fontWeight: 950,
  letterSpacing: "-0.06em",
  lineHeight: 0.98,
};

const subtitleStyle = {
  margin: "20px 0 0",
  color: theme.textSoft,
  fontSize: 16,
  lineHeight: 1.7,
  maxWidth: 520,
};

const noticeBoxStyle = {
  marginTop: 28,
  padding: "14px 16px",
  borderRadius: 16,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  color: theme.text,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  lineHeight: 1.5,
  fontSize: 14,
};

const buttonRowStyle = {
  display: "flex",
  gap: 12,
  marginTop: 30,
  flexWrap: "wrap",
};

const supportCardStyle = {
  display: "flex",
  gap: 18,
  padding: "22px",
  borderRadius: 24,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
  minWidth: 0,
};

const supportIconStyle = {
  width: 58,
  height: 58,
  borderRadius: 18,
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cardLabelStyle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const cardTitleStyle = {
  margin: "6px 0 0",
  color: theme.text,
  fontSize: 20,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const emailStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginTop: 6,
  fontSize: 18,
  fontWeight: 800,
  color: theme.text,
  textDecoration: "none",
  overflowWrap: "anywhere",
  transition: "all 0.2s ease",
};

const smallLineStyle = {
  width: 42,
  height: 2,
  borderRadius: 999,
  marginTop: 10,
};

const cardTextStyle = {
  margin: "12px 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.6,
};

const checklistBoxStyle = {
  padding: 18,
  borderRadius: 22,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
};

const checklistHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: theme.text,
  fontSize: 15,
};

const listStyle = {
  margin: "12px 0 0",
  paddingLeft: 22,
  color: theme.muted,
  lineHeight: 1.8,
  fontSize: 14,
};

const primaryButtonStyle = {
  padding: "13px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const secondaryButtonStyle = {
  padding: "13px 20px",
  borderRadius: 14,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};