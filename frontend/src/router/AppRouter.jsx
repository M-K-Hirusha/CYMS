import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import Unauthorized from "../pages/Unauthorized";
import Reports from "../pages/Reports";
import MRs from "../pages/MRs";
import Tools from "../pages/Tools";
import Materials from "../pages/Materials";
import Inventory from "../pages/Inventory";
import Yards from "../pages/Yards";
import Users from "../pages/Users";
import NotFound from "../pages/NotFound";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mrs"
            element={
              <ProtectedRoute>
                <MRs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <Tools />
              </ProtectedRoute>
            }
          />

          
          <Route
            path="/materials"
            element={
              <ProtectedRoute>
                <Materials />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/yards"
            element={
              <ProtectedRoute
               allowedRoles={["SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN", "SITE_ADMIN"]}>
                <Yards />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute
               allowedRoles={["SYSTEM_ADMIN", "HEAD_OFFICE_ADMIN"]}>
                <Users />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}