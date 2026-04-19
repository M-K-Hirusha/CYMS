import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1) Login request
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem("token", data.token);

      // 2) Get current user (role) using token
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

      // Save role
      localStorage.setItem("role", user.role);

      // 3) Redirect (CYMS roles)
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      width: "100%",
      display: "grid",
      placeItems: "center",
      padding: 24,
      backgroundColor: "#F6F7FB", // ✅ solid background (no transparency issues)
      color: "#1444b1",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    },

    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: "#FFFFFF", // ✅ solid card background
      border: "1px solid rgba(15, 23, 42, 0.10)",
      borderRadius: 16,
      padding: 24,
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    },

    title: {
      margin: 0,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: "#0F172A",
    },

    subtitle: {
      margin: "6px 0 0 0",
      fontSize: 13.5,
      lineHeight: 1.4,
      color: "rgba(15, 23, 42, 0.65)",
    },

    form: {
      marginTop: 18,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },

    label: {
      fontSize: 13,
      fontWeight: 700,
      color: "rgba(15, 23, 42, 0.80)",
      marginBottom: 6,
      display: "block",
    },

    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.14)",
      backgroundColor: "#FFFFFF",
      color: "#0F172A",
      fontSize: 14.5,
      outline: "none",
      transition: "box-shadow 150ms ease, border-color 150ms ease",
    },

    button: {
      marginTop: 6,
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.12)",
      backgroundColor: "#0F172A", // ✅ strong CTA
      color: "#FFFFFF",
      fontSize: 14.5,
      fontWeight: 800,
      cursor: "pointer",
      transition: "transform 120ms ease, opacity 120ms ease",
    },

    errorBox: {
      marginTop: 8,
      borderRadius: 12,
      border: "1px solid rgba(220, 38, 38, 0.25)",
      backgroundColor: "rgba(220, 38, 38, 0.08)",
      padding: "10px 12px",
      color: "rgba(185, 28, 28, 1)",
      fontSize: 13.5,
      lineHeight: 1.35,
    },

    footer: {
      marginTop: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      color: "rgba(15, 23, 42, 0.65)",
    },

    link: {
      color: "#0F172A",
      textDecoration: "none",
      fontWeight: 800,
    },

    divider: {
      marginTop: 16,
      height: 1,
      width: "100%",
      backgroundColor: "rgba(15, 23, 42, 0.08)",
    },
  };

  const focusOn = (e) => {
    e.target.style.borderColor = "rgba(15, 23, 42, 0.35)";
    e.target.style.boxShadow = "0 0 0 4px rgba(15, 23, 42, 0.08)";
  };

  const focusOff = (e) => {
    e.target.style.borderColor = "rgba(15, 23, 42, 0.14)";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to continue to CYMS.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <div>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <button
            style={styles.button}
            type="submit"
            onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
          >
            Sign in
          </button>

          {error && (
            <div style={styles.errorBox} role="alert" aria-live="polite">
              {error}
            </div>
          )}
        </form>

        <div style={styles.divider} />

        <div style={styles.footer}>
          <span>Need help?</span>
          <Link style={styles.link} to="/unauthorized">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}