import { theme } from "../styles/theme";

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={iconStyle}>!</div>

        <h3 style={titleStyle}>{title}</h3>

        <div style={dividerStyle} />

        <p style={messageStyle}>{message}</p>

        <div style={buttonRowStyle}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...confirmButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (loading) return;
              e.currentTarget.style.background = "#b91c1c";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.danger;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ✓ {loading ? "Processing..." : "Confirm"}
          </button>

          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              ...cancelButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (loading) return;
              e.currentTarget.style.background = theme.primarySoft;
              e.currentTarget.style.borderColor = theme.primaryBorder;
              e.currentTarget.style.color = theme.primary;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.surfaceSoft;
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.text;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            × Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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
};

const modalStyle = {
  width: 430,
  maxWidth: "90vw",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 22,
  padding: "30px 28px",
  boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
  textAlign: "center",
};

const iconStyle = {
  width: 58,
  height: 58,
  margin: "0 auto 18px",
  borderRadius: "50%",
  background: theme.dangerSoft,
  border: "2px solid rgba(239,68,68,0.25)",
  color: theme.danger,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
  fontWeight: 900,
};

const titleStyle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
  color: theme.text,
};

const dividerStyle = {
  height: 1,
  background: theme.border,
  margin: "18px 0",
};

const messageStyle = {
  margin: 0,
  color: theme.textSoft,
  fontSize: 15,
  lineHeight: 1.6,
};

const buttonRowStyle = {
  marginTop: 28,
  display: "flex",
  justifyContent: "center",
  gap: 14,
};

const confirmButtonStyle = {
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  background: theme.danger,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(239,68,68,0.18)",
  transition: "all 0.2s ease",
};

const cancelButtonStyle = {
  padding: "12px 20px",
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 0.2s ease",
};