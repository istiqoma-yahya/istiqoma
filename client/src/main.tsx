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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
