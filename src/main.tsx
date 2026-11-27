import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

/** Establish HttpOnly browser session cookie before checkout/payment calls. */
fetch("/api/session", { credentials: "include", cache: "no-store" }).catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
