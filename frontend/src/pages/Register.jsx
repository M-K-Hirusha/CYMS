import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { registerUser } from "../services/authApi";
import { theme } from "../styles/theme";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await registerUser({ fullName, email, password });

      localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={glowStyle} />

      <div style={cardStyle}>
        <div style={iconWrapStyle}>
          <UserPlus size={34} />
        </div>

        <p style={eyebrowStyle}>CYMS ACCOUNT</p>
        <h2 style={titleStyle}>Create Account</h2>
        <p style={subtitleStyle}>
          Register a new account to access the Construction Yard Management
          System.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Password (min 8 chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {error && <div style={errorStyle}>{error}</div>}

          <button
            disabled={loading}
            type="submit"
            style={{
              ...primaryButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p style={footerTextStyle}>
          Already have an account?{" "}
          <Link to="/login" style={linkStyle}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: theme.bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
  overflow: "hidden",
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
  maxWidth: 440,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 26,
  padding: 34,
  boxShadow: "0 30px 80px rgba(15,23,42,0.10)",
  position: "relative",
  zIndex: 2,
};

const iconWrapStyle = {
  width: 64,
  height: 64,
  borderRadius: 18,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
};

const eyebrowStyle = {
  margin: 0,
  color: theme.primary,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
};

const titleStyle = {
  margin: "8px 0 8px",
  color: theme.text,
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: "-0.04em",
};

const subtitleStyle = {
  margin: "0 0 24px",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.6,
};

const formStyle = {
  display: "grid",
  gap: 12,
};

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 14,
  outline: "none",
};

const errorStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: theme.dangerSoft,
  border: "1px solid rgba(239,68,68,0.22)",
  color: theme.danger,
  fontSize: 13,
  fontWeight: 700,
};

const primaryButtonStyle = {
  marginTop: 4,
  width: "100%",
  border: "none",
  borderRadius: 12,
  padding: "13px 16px",
  background: theme.primary,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
};

const footerTextStyle = {
  margin: "18px 0 0",
  color: theme.muted,
  fontSize: 14,
  textAlign: "center",
};

const linkStyle = {
  color: theme.primary,
  fontWeight: 800,
};