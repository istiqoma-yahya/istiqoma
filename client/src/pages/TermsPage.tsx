import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{t("terms.pageTitle")}</h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-10 space-y-8 text-sm leading-relaxed">
        <div>
          <p className="text-muted-foreground">
            <strong>{t("terms.effectiveDateLabel")}</strong> {t("terms.effectiveDate")}
          </p>
          <p className="text-muted-foreground mt-1">
            <strong>{t("terms.appNameLabel")}</strong> Istiqoma
          </p>
        </div>

        <p>{t("terms.intro")}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s1.heading")}</h2>
          <p>{t("terms.s1.intro")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("terms.s1.item1")}</li>
            <li>{t("terms.s1.item2")}</li>
            <li>{t("terms.s1.item3")}</li>
            <li>{t("terms.s1.item4")}</li>
            <li>{t("terms.s1.item5")}</li>
            <li>{t("terms.s1.item6")}</li>
          </ul>
          <p>{t("terms.s1.suspension")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s2.heading")}</h2>
          <p>
            {t("terms.s2.pre")}
            <strong>{t("terms.s2.strong")}</strong>
            {t("terms.s2.mid")}
            <a
              href="https://quran.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {t("terms.s2.linkText")}
            </a>
            {t("terms.s2.after")}
            <strong>{t("terms.s2.notModified")}</strong>
            {t("terms.s2.rest")}
            <a
              href="https://quran.com/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {t("terms.s2.qfTosLink")}
            </a>
            {t("terms.s2.end")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s3.heading")}</h2>
          <p>{t("terms.s3.body1")}</p>
          <p>{t("terms.s3.body2")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s4.heading")}</h2>
          <p>
            {t("terms.s4.body1Pre")}
            <strong>{t("terms.s4.body1AsIs")}</strong>
            {t("terms.s4.body1Mid")}
            <strong>{t("terms.s4.body1AsAvail")}</strong>
            {t("terms.s4.body1Post")}
          </p>
          <p>{t("terms.s4.body2")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            {t("terms.s5.heading")}
          </h2>
          <p>{t("terms.s5.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s6.heading")}</h2>
          <p>{t("terms.s6.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s7.heading")}</h2>
          <p>{t("terms.s7.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s8.heading")}</h2>
          <p>
            {t("terms.s8.pre")}
            <Link
              href="/privacy"
              className="text-primary underline underline-offset-2"
            >
              {t("terms.s8.link")}
            </Link>
            {t("terms.s8.post")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("terms.s9.heading")}</h2>
          <p>
            {t("terms.s9.pre")}
            <a
              href="mailto:appistiqoma@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              appistiqoma@gmail.com
            </a>
            {t("terms.s9.post")}
          </p>
        </section>

        <div className="border-t border-border pt-6 text-muted-foreground">
          <p>
            {t("terms.seeAlso")}{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              {t("terms.privacyLink")}
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
