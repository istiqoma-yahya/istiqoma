import { useEffect } from "react";

const SITE_NAME = "Istiqoma";
const SITE_ORIGIN = "https://istiqoma.com";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/apple-touch-icon.png`;

type PageMetaOptions = {
  title: string;
  description: string;
  /** Path-only (e.g. "/quran/2"). Will be combined with the apex origin. */
  canonicalPath?: string;
  /** Locale tag for og:locale (e.g. "en", "id", "ms"). */
  locale?: string;
  /** Defaults to `${title} | Istiqoma` unless the title already contains "Istiqoma". */
  rawTitle?: boolean;
  ogImage?: string;
};

function setMeta(selector: string, create: () => HTMLMetaElement | HTMLLinkElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setMetaName(name: string, content: string) {
  setMeta(
    `meta[name="${name}"]`,
    () => {
      const m = document.createElement("meta");
      m.setAttribute("name", name);
      return m;
    },
    "content",
    content,
  );
}

function setMetaProperty(property: string, content: string) {
  setMeta(
    `meta[property="${property}"]`,
    () => {
      const m = document.createElement("meta");
      m.setAttribute("property", property);
      return m;
    },
    "content",
    content,
  );
}

function setCanonical(href: string) {
  setMeta(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement("link");
      l.setAttribute("rel", "canonical");
      return l;
    },
    "href",
    href,
  );
}

const LOCALE_TO_OG: Record<string, string> = {
  en: "en_US",
  id: "id_ID",
  ms: "ms_MY",
};

/**
 * Sets the page title, description, canonical, OG, and Twitter Card tags
 * on client-side navigation so search engines and social crawlers see the
 * right metadata for the current route.
 */
export function usePageMeta({
  title,
  description,
  canonicalPath,
  locale = "en",
  rawTitle = false,
  ogImage = DEFAULT_OG_IMAGE,
}: PageMetaOptions) {
  useEffect(() => {
    const fullTitle =
      rawTitle || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    setMetaName("description", description);

    const path = canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    const canonical = `${SITE_ORIGIN}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;
    setCanonical(canonical);

    setMetaProperty("og:title", fullTitle);
    setMetaProperty("og:description", description);
    setMetaProperty("og:url", canonical);
    setMetaProperty("og:type", "website");
    setMetaProperty("og:site_name", SITE_NAME);
    setMetaProperty("og:image", ogImage);
    setMetaProperty("og:locale", LOCALE_TO_OG[locale] ?? "en_US");

    setMetaName("twitter:card", "summary");
    setMetaName("twitter:title", fullTitle);
    setMetaName("twitter:description", description);
    setMetaName("twitter:image", ogImage);

    const html = document.documentElement;
    if (locale) html.setAttribute("lang", locale);
  }, [title, description, canonicalPath, locale, rawTitle, ogImage]);
}
