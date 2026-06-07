import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { initCapacitorPlugins, isNative } from "./lib/capacitor";

if (isNative) {
  document.body.classList.add("native-safe-area");
}

initCapacitorPlugins();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && !isNative) {
  // An installed/home-screen PWA loads its JS once and rarely cold-starts, so
  // without an explicit update path it can keep executing stale code (and a
  // freshly-deployed fix never reaches the running app). When a new service
  // worker takes control, reload once so the page runs the latest deployed JS.
  // Guard against the first-ever install (no prior controller) to avoid an
  // unnecessary reload on a brand-new visit, and against reload loops.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check immediately and hourly so long-lived PWA sessions pick up new
        // deployments promptly instead of waiting for a manual cold start.
        registration.update().catch(() => {});
        setInterval(
          () => registration.update().catch(() => {}),
          60 * 60 * 1000,
        );
      })
      .catch(() => {});
  };

  // Register without relying solely on the load event — if `load` already
  // fired (e.g. the module script resolved late), the listener would never run.
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register);
  }

  // Independently of the load lifecycle, once a controlling SW is ready ask it
  // to check for a newer deployment. This covers already-controlled sessions.
  navigator.serviceWorker.ready
    .then((registration) => registration.update())
    .catch(() => {});

  // Also re-check for a new deployment whenever the app is brought back to the
  // foreground — the most common moment a returning user opens an installed PWA.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update().catch(() => {});
      });
    }
  });
}
