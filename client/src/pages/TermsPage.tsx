import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-10 space-y-8 text-sm leading-relaxed">
        <div>
          <p className="text-muted-foreground">
            <strong>Effective date:</strong> May 10, 2026
          </p>
          <p className="text-muted-foreground mt-1">
            <strong>App name:</strong> Istiqoma
          </p>
        </div>

        <p>
          Welcome to Istiqoma. By accessing or using the app, you agree to be
          bound by these Terms of Service ("Terms"). Please read them carefully.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Acceptable Use</h2>
          <p>You agree to use Istiqoma only for lawful purposes and in a way that:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Does not violate any applicable local, national, or international law or regulation.</li>
            <li>Does not attempt to gain unauthorized access to any part of the service, its servers, or any connected systems.</li>
            <li>Does not interfere with, disrupt, or overburden the app's infrastructure.</li>
            <li>Does not submit false, misleading, or harmful content.</li>
            <li>Does not reverse-engineer, decompile, or attempt to extract the source code of the application.</li>
            <li>Does not use the app for any commercial purpose without our prior written consent.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Qur'an Content Attribution</h2>
          <p>
            The Qur'an text, translations, and audio content displayed in
            Istiqoma are sourced from the{" "}
            <strong>Quran Foundation</strong> via the{" "}
            <a
              href="https://quran.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Quran.com
            </a>{" "}
            API. This content is presented as-is and is{" "}
            <strong>not modified</strong> by Istiqoma in any way. All rights to
            the Qur'an content remain with the Quran Foundation and the
            respective translation authors. Use of this content is governed by
            the{" "}
            <a
              href="https://quran.com/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Quran Foundation Terms of Service
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. User Content</h2>
          <p>
            You retain ownership of any content you create within the app (deed
            logs, targets, notes, etc.). By submitting content, you grant us a
            limited, non-exclusive license to store and display it solely for the
            purpose of providing the service to you.
          </p>
          <p>
            You are responsible for the accuracy and appropriateness of content
            you submit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Disclaimers</h2>
          <p>
            Istiqoma is provided on an <strong>"as is"</strong> and{" "}
            <strong>"as available"</strong> basis without warranties of any kind,
            either express or implied. We do not warrant that the service will be
            uninterrupted, error-free, or free of viruses or other harmful
            components.
          </p>
          <p>
            The app is a spiritual habit-tracking tool. It does not constitute
            religious, legal, medical, or financial advice. Prayer time
            calculations are estimates and should be verified against local
            sources.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            5. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, Istiqoma and its operators
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of or related to your
            use of the app, even if we have been advised of the possibility of
            such damages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Governing Law &amp; Disputes</h2>
          <p>
            These Terms are governed by and construed in accordance with
            applicable law. Any dispute arising out of or relating to these Terms
            or your use of Istiqoma shall first be attempted to be resolved
            through good-faith negotiation. If unresolved, disputes may be
            submitted to binding arbitration or the courts of competent
            jurisdiction. Where Quran Foundation terms require New York
            jurisdiction for disputes related to their API content, those terms
            take precedence for such matters.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of
            material changes via an in-app banner or by updating the effective
            date above. Continued use of the app after changes become effective
            constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Privacy</h2>
          <p>
            Our{" "}
            <Link
              href="/privacy"
              className="text-primary underline underline-offset-2"
            >
              Privacy Policy
            </Link>{" "}
            explains how we collect, use, and protect your personal data. By
            using Istiqoma, you acknowledge that you have read and understood our
            Privacy Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a
              href="mailto:privacy@istiqoma.app"
              className="text-primary underline underline-offset-2"
            >
              privacy@istiqoma.app
            </a>
            .
          </p>
        </section>

        <div className="border-t border-border pt-6 text-muted-foreground">
          <p>
            See also our{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
