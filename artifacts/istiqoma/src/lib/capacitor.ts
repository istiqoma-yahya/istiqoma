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
    // Light icons/text for the dark (#0a0a0a) app background.
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
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
