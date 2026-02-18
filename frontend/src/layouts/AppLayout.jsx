import { Outlet, Link } from "react-router-dom";

export default function AppLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          padding: 16,
          borderRight: "1px solid #eee",
          background: "#f5f5f5",
        }}
      >
        <h2>CYMS</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
