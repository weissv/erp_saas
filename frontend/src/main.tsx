// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import AppRouter from "./router";
import "../css/index.css"; // Tailwind

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <PermissionsProvider>
            <AppRouter />
          </PermissionsProvider>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  </React.StrictMode>
);
