// src/lms.tsx - LMS Entry Point (отдельно от ERP)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { AuthProvider } from "./contexts/AuthContext";
import { DemoProvider } from "./contexts/DemoContext";
import { resolveHost } from "./lib/host";
import LmsRouter from "./router/lms-router";
import "../css/index.css";

const isDemoHost = resolveHost().kind === "demo";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/lms">
      <DemoProvider isDemo={isDemoHost}>
        <TenantProvider>
          <AuthProvider>
            <LmsRouter />
          </AuthProvider>
        </TenantProvider>
      </DemoProvider>
    </BrowserRouter>
  </React.StrictMode>
);
