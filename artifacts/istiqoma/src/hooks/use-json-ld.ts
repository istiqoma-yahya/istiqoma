import { useEffect } from "react";

const SCRIPT_ID = "page-json-ld";

/**
 * Injects (or updates) a single `<script type="application/ld+json">` element
 * in the document `<head>` for the current page. Pass `null` to remove it.
 */
export function useJsonLd(data: Record<string, unknown> | null) {
  useEffect(() => {
    if (!data) {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) existing.remove();
      return;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, [JSON.stringify(data)]);
}
