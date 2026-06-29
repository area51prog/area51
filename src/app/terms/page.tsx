import Link from "next/link";
import { LogoLockup } from "@/components/Logo";

export const metadata = {
  title: "Terms of Service — Alloqo",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 max-w-3xl w-full mx-auto">
        <Link href="/" className="flex items-center text-heading">
          <LogoLockup className="h-7" />
        </Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-12 py-8">
        <h1 className="text-3xl font-bold text-heading">Terms of Service</h1>
        <p className="text-sm text-foreground/50 mt-2">Last updated 29 June 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Using Alloqo</h2>
            <p>
              Alloqo is a portfolio and watchlist tracking tool for Indian markets. By creating an account you
              agree to use it only for its intended purpose, to keep your login credentials secure, and to not
              attempt to disrupt or abuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Not investment advice</h2>
            <p>
              Alloqo is for informational and educational purposes only. Prices, fundamentals, dividend
              projections, and AI-generated research shown in the app are not investment advice or a
              recommendation to buy or sell any security. You are solely responsible for your own investment
              decisions, and should consult a qualified financial advisor before acting on anything you see here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Data accuracy</h2>
            <p>
              Market data is sourced from third-party providers and may be delayed, incomplete, or occasionally
              incorrect. We work to keep it accurate but make no guarantee of correctness, and Alloqo is not
              liable for decisions made based on data shown in the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Optional broker linking</h2>
            <p>
              If you choose to connect a brokerage account for live pricing, you are responsible for keeping that
              connection secure and for any access you grant. You can disconnect a linked broker at any time from
              your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Account suspension</h2>
            <p>
              We may suspend or terminate accounts that abuse the service, attempt unauthorized access, or violate
              these terms. We&apos;ll make reasonable efforts to notify you before doing so, except in cases of
              serious or repeated abuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of Alloqo after a change means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:sos@alloqo.com" className="text-brand font-medium hover:underline">
                sos@alloqo.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs text-foreground/40 py-8">
        © 2026 Alloqo. For educational purposes only — not investment advice.{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
