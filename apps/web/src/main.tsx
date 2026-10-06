import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SoftwareApp } from "./SoftwareApp";
import "./styles.css";

const isSoftware = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isSoftware ? <SoftwareApp /> : <App />}
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
