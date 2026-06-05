import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "web" | "ios" | "android"
export const isIOS = platform === "ios";
export const isAndroid = platform === "android";
export const isWeb = platform === "web";

export async function initCapacitorPlugins() {
  if (!isNative) return;

  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const { SplashScreen } = await import("@capacitor/splash-screen");
  const { App } = await import("@capacitor/app");

  try {
    // Edge-to-edge: WebView extends under the status bar so the header
    // background fills behind it. CSS env(safe-area-inset-top) then pushes
    // the tappable header content below the status bar overlay.
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Light icons/text on the dark app background.
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
  }

  App.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  });
}
