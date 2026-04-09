// src/lms.tsx - LMS Entry Point (отдельно от ERP)
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LmsRouter from "./router/lms-router";
import "../css/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/lms">
      <AuthProvider>
        <LmsRouter />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
