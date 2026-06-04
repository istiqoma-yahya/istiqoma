import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.istiqoma.app",
  appName: "Istiqoma",
  webDir: "dist/public",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "small",
      spinnerColor: "#10b981",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0a0a0a",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ios: {
    contentInset: "always",
    scheme: "istiqoma",
    backgroundColor: "#0a0a0a",
  },
  android: {
    backgroundColor: "#0a0a0a",
    allowMixedContent: false,
  },
};

export default config;
