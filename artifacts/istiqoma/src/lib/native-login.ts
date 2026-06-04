import { isNative } from "@/lib/capacitor";

async function openBrowser(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

export async function openNativeLogin(): Promise<void> {
  if (isNative) {
    const url = `${window.location.origin}/api/login?native=1`;
    await openBrowser(url);
  } else {
    window.location.href = "/api/login";
  }
}

export async function openNativeLoginWithProvider(provider: string): Promise<void> {
  if (isNative) {
    const url = `${window.location.origin}/api/login?native=1&provider=${encodeURIComponent(provider)}`;
    await openBrowser(url);
  } else {
    window.location.href = `/api/login?provider=${encodeURIComponent(provider)}`;
  }
}

export async function openNativeBrowser(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}
