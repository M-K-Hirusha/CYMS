import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Unauthorized</h1>
      <p>You don’t have permission to view this page.</p>
      <Link to="/dashboard">Go back to dashboard</Link>
    </div>
  );
}
