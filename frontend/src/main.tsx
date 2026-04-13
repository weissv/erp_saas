// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { DemoProvider } from "./contexts/DemoContext";
import { DemoBanner } from "./components/DemoBanner";
import AppRouter from "./router";
import LandingPage from "./pages/LandingPage";
import { resolveHost } from "./lib/host";
import "../css/index.css"; // Tailwind

const hostInfo = resolveHost();

function App() {
  // Marketing landing page — no providers, no router
  if (hostInfo.kind === "marketing") {
    return <LandingPage />;
  }

  const isDemo = hostInfo.kind === "demo";

  return (
    <BrowserRouter>
      <DemoProvider isDemo={isDemo}>
        <TenantProvider>
          <AuthProvider>
            <PermissionsProvider>
              <DemoBanner />
              <AppRouter />
            </PermissionsProvider>
          </AuthProvider>
        </TenantProvider>
      </DemoProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
