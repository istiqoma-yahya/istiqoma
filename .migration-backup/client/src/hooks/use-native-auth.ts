import { useEffect } from "react";
import { useLocation } from "wouter";
import { isNative } from "@/lib/capacitor";
import { queryClient } from "@/lib/queryClient";

export function useNativeAuth() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isNative) return;

    let appHandle: { remove: () => void } | null = null;

    const reauthHandler = async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({
          url: `${window.location.origin}/api/login?native=1`,
          presentationStyle: "popover",
        });
      } catch (err) {
        console.error("[native-auth] reauth-needed open error:", err);
      }
    };

    async function init() {
      const { App } = await import("@capacitor/app");

      appHandle = await App.addListener("appUrlOpen", async (data: { url: string }) => {
        const url = data.url;
        try {
          const { Browser } = await import("@capacitor/browser");

          if (url.startsWith("istiqoma://auth/done")) {
            const parsed = new URL(url);
            const token = parsed.searchParams.get("token");
            await Browser.close();
            if (token) {
              await fetch(
                `/api/auth/native-session?token=${encodeURIComponent(token)}`,
                { credentials: "include" },
              );
            }
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            navigate("/");
          } else if (url.startsWith("istiqoma://auth/failed")) {
            await Browser.close();
            navigate("/");
          } else if (url.startsWith("istiqoma://qf/done")) {
            await Browser.close();
            await queryClient.invalidateQueries({ queryKey: ["/api/qf/status"] });
            await queryClient.invalidateQueries({ queryKey: ["/api/quran/bookmarks"] });
          } else if (url.startsWith("istiqoma://qf/failed")) {
            await Browser.close();
          }
        } catch (err) {
          console.error("[native-auth] appUrlOpen handler error:", err);
          try {
            const { Browser } = await import("@capacitor/browser");
            await Browser.close();
          } catch {}
        }
      });
    }

    window.addEventListener("istiqoma:reauth-needed", reauthHandler);
    init().catch(console.error);

    return () => {
      appHandle?.remove();
      window.removeEventListener("istiqoma:reauth-needed", reauthHandler);
    };
  }, [navigate]);
}
