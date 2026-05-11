import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
          <h1 className="text-lg font-semibold">{t("privacy.pageTitle")}</h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-10 space-y-8 text-sm leading-relaxed">
        <div>
          <p className="text-muted-foreground">
            <strong>{t("privacy.effectiveDateLabel")}</strong> {t("privacy.effectiveDate")}
          </p>
          <p className="text-muted-foreground mt-1">
            <strong>{t("privacy.appNameLabel")}</strong> Istiqoma
          </p>
          <p className="text-muted-foreground mt-1">
            <strong>{t("privacy.contactLabel")}</strong>{" "}
            <a
              href="mailto:appistiqoma@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              appistiqoma@gmail.com
            </a>{" "}
            {t("privacy.contactSuffix")}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s1.heading")}</h2>
          <p>
            {t("privacy.s1.pre")}
            <strong>{t("privacy.s1.strong")}</strong>
            {t("privacy.s1.mid")}
            <a
              href="https://quran.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Quran.com
            </a>
            {t("privacy.s1.post")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s2.heading")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s2.colData")}
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s2.colSource")}
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s2.colPurpose")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3">{t("privacy.s2.row1Data")}</td>
                  <td className="p-3">{t("privacy.s2.row1Source")}</td>
                  <td className="p-3">{t("privacy.s2.row1Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row2Data")}</td>
                  <td className="p-3">{t("privacy.s2.row2Source")}</td>
                  <td className="p-3">{t("privacy.s2.row2Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row3Data")}</td>
                  <td className="p-3">{t("privacy.s2.row3Source")}</td>
                  <td className="p-3">{t("privacy.s2.row3Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">
                    <strong className="text-amber-600 dark:text-amber-400">
                      {t("privacy.s2.row4Data")}
                    </strong>
                  </td>
                  <td className="p-3">{t("privacy.s2.row4Source")}</td>
                  <td className="p-3">{t("privacy.s2.row4Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row5Data")}</td>
                  <td className="p-3">{t("privacy.s2.row5Source")}</td>
                  <td className="p-3">{t("privacy.s2.row5Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row6Data")}</td>
                  <td className="p-3">{t("privacy.s2.row6Source")}</td>
                  <td className="p-3">{t("privacy.s2.row6Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row7Data")}</td>
                  <td className="p-3">{t("privacy.s2.row7Source")}</td>
                  <td className="p-3">{t("privacy.s2.row7Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row8Data")}</td>
                  <td className="p-3">{t("privacy.s2.row8Source")}</td>
                  <td className="p-3">{t("privacy.s2.row8Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row9Data")}</td>
                  <td className="p-3">{t("privacy.s2.row9Source")}</td>
                  <td className="p-3">{t("privacy.s2.row9Purpose")}</td>
                </tr>
                <tr>
                  <td className="p-3">{t("privacy.s2.row10Data")}</td>
                  <td className="p-3">{t("privacy.s2.row10Source")}</td>
                  <td className="p-3">{t("privacy.s2.row10Purpose")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">
            {t("privacy.s2.notePre")}
            <strong>{t("privacy.s2.notWord")}</strong>
            {t("privacy.s2.notePost")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            {t("privacy.s3.heading")}
          </h2>
          <p>
            {t("privacy.s3.body1Pre")}
            <strong>{t("privacy.s3.body1Strong1")}</strong>
            {t("privacy.s3.body1Mid")}
            <strong>{t("privacy.s3.body1Strong2")}</strong>
            {t("privacy.s3.body1Post")}
          </p>
          <p>
            <strong>{t("privacy.s3.body2Label")}</strong>
            {t("privacy.s3.body2Rest")}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("privacy.s3.check1")}</li>
            <li>{t("privacy.s3.check2")}</li>
          </ul>
          <p>{t("privacy.s3.body3")}</p>
          <p>
            <strong>{t("privacy.s3.body4Label")}</strong>
            {t("privacy.s3.body4Rest")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s4.heading")}</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("privacy.s4.item1")}</li>
            <li>{t("privacy.s4.item2")}</li>
            <li>{t("privacy.s4.item3")}</li>
            <li>{t("privacy.s4.item4")}</li>
            <li>
              {t("privacy.s4.item5Pre")}
              <strong>{t("privacy.s4.item5Not")}</strong>
              {t("privacy.s4.item5Post")}
            </li>
            <li>
              {t("privacy.s4.item6Pre")}
              <strong>{t("privacy.s4.item6Not")}</strong>
              {t("privacy.s4.item6Post")}
            </li>
            <li>
              {t("privacy.s4.item7Pre")}
              <strong>{t("privacy.s4.item7Not")}</strong>
              {t("privacy.s4.item7Post")}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s5.heading")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s5.colProcessor")}
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s5.colRole")}
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    {t("privacy.s5.colPolicy")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-medium">Supabase</td>
                  <td className="p-3">{t("privacy.s5.supabaseRole")}</td>
                  <td className="p-3">
                    <a
                      href="https://supabase.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      supabase.com/privacy
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Replit</td>
                  <td className="p-3">{t("privacy.s5.replitRole")}</td>
                  <td className="p-3">
                    <a
                      href="https://replit.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      replit.com/privacy
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">{t("privacy.s5.webpushName")}</td>
                  <td className="p-3">{t("privacy.s5.webpushRole")}</td>
                  <td className="p-3">
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Google (Chrome)
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://www.mozilla.org/en-US/privacy/mozilla-websites/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Mozilla (Firefox)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">{t("privacy.s5.qfName")}</td>
                  <td className="p-3">{t("privacy.s5.qfRole")}</td>
                  <td className="p-3">
                    <a
                      href="https://quran.com/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      quran.com/privacy-policy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s6.heading")}</h2>
          <p>{t("privacy.s6.intro")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>{t("privacy.s6.item1Label")}</strong>
              {t("privacy.s6.item1Rest")}
            </li>
            <li>
              <strong>{t("privacy.s6.item2Label")}</strong>
              {t("privacy.s6.item2Rest")}
            </li>
            <li>
              <strong>{t("privacy.s6.item3Label")}</strong>
              {t("privacy.s6.item3Rest")}
            </li>
            <li>
              <strong>{t("privacy.s6.item4Label")}</strong>
              {t("privacy.s6.item4Pre")}
              <strong>{t("privacy.s6.item4Strong")}</strong>
              {t("privacy.s6.item4End")}
            </li>
            <li>
              <strong>{t("privacy.s6.item5Label")}</strong>
              {t("privacy.s6.item5Pre")}
              <strong>{t("privacy.s6.item5Strong")}</strong>
              {t("privacy.s6.item5Post")}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            {t("privacy.s7.heading")}
          </h2>
          <p>
            {t("privacy.s7.bodyPre")}
            <strong>{t("privacy.s7.bodyStrong")}</strong>
            {t("privacy.s7.bodyPost")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s8.heading")}</h2>
          <p>{t("privacy.s8.intro")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>{t("privacy.s8.item1Label")}</strong>
              {t("privacy.s8.item1Rest")}
            </li>
            <li>
              <strong>{t("privacy.s8.item2Label")}</strong>
              {t("privacy.s8.item2Pre")}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {t("privacy.s8.item2LinkGoogle")}
              </a>
              {t("privacy.s8.item2Mid")}
              <a
                href="https://quran.com/oauth/revoke"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {t("privacy.s8.item2LinkQF")}
              </a>
              {t("privacy.s8.item2Post")}
            </li>
            <li>
              <strong>{t("privacy.s8.item3Label")}</strong>
              {t("privacy.s8.item3Pre")}
              <strong>{t("privacy.s8.item3Strong1")}</strong>
              {t("privacy.s8.item3Mid")}
              <strong>{t("privacy.s8.item3Strong2")}</strong>
              {t("privacy.s8.item3Post")}
            </li>
            <li>
              <strong>{t("privacy.s8.item4Label")}</strong>
              {t("privacy.s8.item4Rest")}
            </li>
          </ul>
          <p>
            {t("privacy.s8.contactPre")}
            <a
              href="mailto:appistiqoma@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              appistiqoma@gmail.com
            </a>
            {t("privacy.s8.contactPost")}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s9.heading")}</h2>
          <p>{t("privacy.s9.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("privacy.s10.heading")}</h2>
          <p>{t("privacy.s10.body")}</p>
        </section>

        <div className="border-t border-border pt-6 text-muted-foreground">
          <p>
            {t("privacy.seeAlso")}{" "}
            <Link href="/terms" className="text-primary underline underline-offset-2">
              {t("privacy.termsLink")}
            </Link>
            .
          </p>
        </div>

        <div
          className="rounded-lg border border-border bg-muted/40 p-5 space-y-2"
          data-testid="section-privacy-contact"
        >
          <h2 className="text-base font-semibold text-foreground">{t("privacyContact.heading")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("privacyContact.body")}{" "}
            <a
              href="mailto:appistiqoma@gmail.com"
              className="text-primary underline underline-offset-2 font-medium"
              data-testid="link-privacy-email"
            >
              {t("privacyContact.email")}
            </a>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            {t("privacyContact.responseNote")}
          </p>
        </div>
      </main>
    </div>
  );
}
