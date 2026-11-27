import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ensureCsrfToken } from "./lib/csrf";
import "./styles/index.css";

/** Establish HttpOnly browser cookie + CSRF token before checkout/payment calls. */
ensureCsrfToken().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
