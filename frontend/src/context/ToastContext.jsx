import { createContext, useContext, useState, useCallback } from "react";
import { theme } from "../styles/theme";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && <div style={toastStyle(toast.type)}>{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function toastStyle(type) {
  const isSuccess = type === "success";

  return {
    position: "fixed",
    top: 24,
    right: 24,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 18px",
    borderRadius: 999,
    minWidth: 240,
    background: isSuccess ? theme.successSoft : theme.dangerSoft,
    color: isSuccess ? theme.success : theme.danger,
    border: isSuccess
      ? "1px solid rgba(22,163,74,0.25)"
      : "1px solid rgba(239,68,68,0.25)",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: 0.2,
    backdropFilter: "blur(10px)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
    animation: "toastSlideIn 0.28s ease",
  };
}