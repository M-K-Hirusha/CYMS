import { useEffect, useState } from "react";
import { getHealth } from "../services/api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>

      <h3>Backend Status</h3>

      {!data && !error && <p>Checking backend...</p>}

      {error && (
        <p style={{ color: "red" }}>
           Backend not reachable: {error}
        </p>
      )}

      {data && (
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
