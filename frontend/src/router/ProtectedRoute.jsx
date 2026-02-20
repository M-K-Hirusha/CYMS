import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but role missing -> go login (avoid /dashboard loop)
  // This happens when login failed or /me failed
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Role restriction
  if (allowedRoles && allowedRoles.length > 0) {
  const ok = allowedRoles.includes(role);
  if (!ok) {
    return <Navigate to="/unauthorized" replace />;
  }
  }

  return children;
}
