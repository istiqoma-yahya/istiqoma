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
    // Light icons/text on the dark app background.
    // setBackgroundColor is intentionally omitted: on iOS it pushes the WebView
    // out of edge-to-edge mode, creating a gap below the bottom nav bar.
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
