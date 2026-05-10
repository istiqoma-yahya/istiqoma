import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
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
          <p className="text-muted-foreground mt-1">
            <strong>Contact:</strong>{" "}
            <a
              href="mailto:privacy@istiqoma.app"
              className="text-primary underline underline-offset-2"
            >
              privacy@istiqoma.app
            </a>{" "}
            — we respond within 30 days.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. About This Policy</h2>
          <p>
            Istiqoma ("we", "our", or "the app") is a spiritual self-improvement
            application for Muslims. It uses the{" "}
            <strong>Quran Foundation (QF) APIs</strong> and displays Qur'an
            content sourced from{" "}
            <a
              href="https://quran.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Quran.com
            </a>
            . This Privacy Policy explains how we collect, use, and protect your
            personal information, and describes your rights under applicable
            privacy law including the GDPR.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Data We Collect</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Data
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Source
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3">Email address</td>
                  <td className="p-3">Google / Replit OAuth</td>
                  <td className="p-3">Account identification</td>
                </tr>
                <tr>
                  <td className="p-3">Display name &amp; avatar</td>
                  <td className="p-3">Google / Replit OAuth or user input</td>
                  <td className="p-3">Profile display</td>
                </tr>
                <tr>
                  <td className="p-3">Username &amp; hashed PIN</td>
                  <td className="p-3">User-created during sign-up</td>
                  <td className="p-3">Alternative authentication</td>
                </tr>
                <tr>
                  <td className="p-3">
                    <strong className="text-amber-600 dark:text-amber-400">
                      Deed logs &amp; religious practice data
                    </strong>
                  </td>
                  <td className="p-3">User input</td>
                  <td className="p-3">
                    Core feature — tracking good deeds and spiritual progress
                  </td>
                </tr>
                <tr>
                  <td className="p-3">Qur'an bookmarks &amp; reading position</td>
                  <td className="p-3">User interaction</td>
                  <td className="p-3">Continue-reading feature</td>
                </tr>
                <tr>
                  <td className="p-3">Memorization progress</td>
                  <td className="p-3">User interaction</td>
                  <td className="p-3">Hafalan tracking</td>
                </tr>
                <tr>
                  <td className="p-3">Targets &amp; onboarding answers</td>
                  <td className="p-3">User input</td>
                  <td className="p-3">Personalized goals</td>
                </tr>
                <tr>
                  <td className="p-3">Push subscription endpoint &amp; keys</td>
                  <td className="p-3">Browser Web Push API</td>
                  <td className="p-3">Sending prayer &amp; deed reminders</td>
                </tr>
                <tr>
                  <td className="p-3">
                    Approximate location (latitude/longitude)
                  </td>
                  <td className="p-3">Browser Geolocation API (opt-in)</td>
                  <td className="p-3">
                    Calculating local prayer times (Sholat reminders)
                  </td>
                </tr>
                <tr>
                  <td className="p-3">Session data</td>
                  <td className="p-3">Server-generated</td>
                  <td className="p-3">Keeping you signed in (1-week TTL)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">
            We do <strong>not</strong> use cookies for advertising, run
            third-party analytics scripts, or collect data beyond what is listed
            above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            3. Sensitive Data &amp; GDPR Consent
          </h2>
          <p>
            Deed logs and religious practice data (such as prayers performed,
            Qur'an recitation, fasting, and acts of worship) constitute{" "}
            <strong>special category (sensitive) personal data</strong> under
            Article 9 of the GDPR. We rely on your{" "}
            <strong>explicit, freely given consent</strong> before processing
            this information. You may withdraw consent at any time by deleting
            your account (see Section 8).
          </p>
          <p>
            <strong>How we collect consent:</strong> Before any religious data
            is stored, every new user must actively check two boxes on a
            dedicated consent screen:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              "I consent to Istiqoma storing my religious practice data to power
              app features."
            </li>
            <li>"I confirm I am 13 years of age or older."</li>
          </ul>
          <p>
            The Continue button remains disabled until both boxes are ticked.
            Existing users who signed up before this feature was introduced are
            shown the same consent prompt on their next login and cannot access
            the app until they confirm.
          </p>
          <p>
            <strong>Age requirement:</strong> Istiqoma is not intended for users
            under 13 years of age. Sign-up is blocked for anyone who does not
            confirm they meet the minimum age requirement via the self-declaration
            checkbox described above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>To operate the app and provide its features to you.</li>
            <li>To send push notifications you opt into (reminders, alerts).</li>
            <li>To calculate prayer times based on your location.</li>
            <li>To power leaderboards and community targets (aggregated).</li>
            <li>
              We do <strong>not</strong> use your data to build advertising
              profiles.
            </li>
            <li>
              We do <strong>not</strong> sell your data to third parties.
            </li>
            <li>
              We do <strong>not</strong> use your data to train AI models without
              your separate, explicit consent.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Sub-Processors</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-border rounded-lg text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Sub-processor
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Role
                  </th>
                  <th className="text-left p-3 font-semibold border-b border-border">
                    Privacy Policy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-medium">Supabase</td>
                  <td className="p-3">Database hosting (PostgreSQL)</td>
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
                  <td className="p-3">Application hosting &amp; OAuth identity</td>
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
                  <td className="p-3 font-medium">Web Push (browser standard)</td>
                  <td className="p-3">
                    Push notification delivery via your browser's push service
                    (e.g. Google FCM for Chrome, Mozilla Autopush for Firefox)
                  </td>
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
                  <td className="p-3 font-medium">Quran Foundation / Quran.com</td>
                  <td className="p-3">
                    Qur'an text, audio, and verse data (read-only API)
                  </td>
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
          <h2 className="text-xl font-bold">6. Security</h2>
          <p>
            We take the security of your personal data seriously and implement
            the following measures:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>TLS in transit:</strong> All communication between your
              device and our servers is encrypted via HTTPS.
            </li>
            <li>
              <strong>Encrypted at rest:</strong> Your data is stored on
              Supabase-managed PostgreSQL instances, which use encryption at
              rest.
            </li>
            <li>
              <strong>Access controls:</strong> Database access is restricted to
              application service accounts with minimal required permissions.
              Direct human access is audited and limited.
            </li>
            <li>
              <strong>Secret rotation:</strong> Application secrets (API keys,
              VAPID keys, database credentials) are rotated on a cadence
              consistent with <strong>Security Rule 6.9</strong> requirements.
            </li>
            <li>
              <strong>Security incident response:</strong> We commit to
              acknowledging confirmed security incidents within{" "}
              <strong>24 hours</strong> and notifying affected users as required
              by applicable law.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            7. International Data Transfers
          </h2>
          <p>
            Istiqoma is hosted on infrastructure operated by Replit and Supabase,
            which may process data in data centers outside your country of
            residence (including the United States and the European Economic
            Area). Where required by law, these transfers are governed by{" "}
            <strong>Standard Contractual Clauses (SCCs)</strong> or equivalent
            safeguards adopted by each sub-processor. Please refer to the
            sub-processor privacy policies linked above for details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you have the following rights
            regarding your personal data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>Access &amp; correction:</strong> View and update your
              profile information directly in the app (Profile page).
            </li>
            <li>
              <strong>Revoke OAuth token:</strong> You can revoke Istiqoma's
              access to your Google account at any time via{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                myaccount.google.com/permissions
              </a>
              . Once Quran Foundation OAuth integration is active, you can also
              revoke that token at the{" "}
              <a
                href="https://quran.com/oauth/revoke"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Quran Foundation OAuth Revocation endpoint
              </a>
              .
            </li>
            <li>
              <strong>Data deletion:</strong> You can delete your account and all
              associated data using the "Delete My Account" feature in the app
              settings. We will hard-delete your personal data within{" "}
              <strong>30 days</strong> of your request, and purge it from backups
              within <strong>90 days</strong>.
            </li>
            <li>
              <strong>QF account deletion:</strong> If your associated Quran
              Foundation account is deleted, your linked data in Istiqoma will
              also be deleted.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a
              href="mailto:privacy@istiqoma.app"
              className="text-primary underline underline-offset-2"
            >
              privacy@istiqoma.app
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Children</h2>
          <p>
            Istiqoma is not directed at children under the age of 13. We do not
            knowingly collect personal information from children under 13. If you
            believe a child under 13 has provided us with personal information,
            please contact us and we will delete it promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of significant changes via an in-app banner or by updating the
            effective date above. Continued use of the app after changes
            constitutes your acceptance of the updated policy.
          </p>
        </section>

        <div className="border-t border-border pt-6 text-muted-foreground">
          <p>
            See also our{" "}
            <Link href="/terms" className="text-primary underline underline-offset-2">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
