import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SoftwareApp } from "./SoftwareApp";
import { StudySplashIntro } from "./StudySplashIntro";
import "./i18n";
import "./styles.css";
import "./refero-theme.css";
import "./orbital-focus.css";

const isSoftware = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");

function ProductApp() {
  const [opening, setOpening] = useState(true);
  return (
    <>
      <div inert={opening} aria-hidden={opening}>
        <SoftwareApp />
      </div>
      {opening && <StudySplashIntro onComplete={() => setOpening(false)} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isSoftware ? <ProductApp /> : <App />}
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
