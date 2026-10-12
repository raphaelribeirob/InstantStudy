import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { HardPaywallGate } from "./HardPaywallGate";
import { StudySplashIntro } from "./StudySplashIntro";
import { StudyMotionProvider } from "./StudyMotion";
import "./i18n";
import "./styles.css";
import "./refero-theme.css";
import "./orbital-focus.css";
import "./study-motion.css";

const isSoftware = window.location.pathname === "/app" || window.location.pathname.startsWith("/app/");

function ProductApp() {
  const [opening, setOpening] = useState(true);
  return (
    <>
      <div inert={opening} aria-hidden={opening}>
        <HardPaywallGate />
      </div>
      {opening && <StudySplashIntro onComplete={() => setOpening(false)} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudyMotionProvider>
      {isSoftware ? <ProductApp /> : <App />}
    </StudyMotionProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
