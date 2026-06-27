import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Bot17",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 max-w-3xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-heading">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">B17</span>
          Bot17
        </Link>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-12 py-8">
        <h1 className="text-3xl font-bold text-heading">Privacy Policy</h1>
        <p className="text-sm text-foreground/50 mt-2">Last updated 27 June 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          <section>
            <h2 className="text-lg font-bold text-heading mb-2">What we collect</h2>
            <p>
              When you create a Bot17 account we collect your name and email address to authenticate you and
              identify your account. Any portfolio, watchlist, or transaction data you enter is stored against
              your account so it can be shown back to you — Bot17 does not require or request access to your
              brokerage account to use these features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Optional broker linking</h2>
            <p>
              If you choose to connect an Upstox account for live pricing, we store only the access tokens needed
              to fetch market quotes on your behalf. You can disconnect this at any time from your account
              settings, and Bot17 continues to work with manually entered data if you never connect a broker.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">How we use your data</h2>
            <p>
              Your data is used solely to provide the Bot17 service to you — showing your watchlists, portfolio
              performance, dividend calendar, and AI-generated research. We do not sell your personal data to
              third parties or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Security</h2>
            <p>
              Authentication is handled by Supabase, and sign-in/sign-up forms are protected by Cloudflare
              Turnstile to prevent automated abuse. Passwords are never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Your choices</h2>
            <p>
              You can update or delete your account data at any time from your account settings, or by
              contacting us directly. Deleting your account removes your stored watchlists, portfolio entries,
              and any linked broker tokens.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-heading mb-2">Contact</h2>
            <p>
              Questions about this policy can be sent to{" "}
              <a href="mailto:sos@bot17.ai" className="text-brand font-medium hover:underline">
                sos@bot17.ai
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs text-foreground/40 py-8">
        © 2026 Bot17. For educational purposes only — not investment advice.
      </footer>
    </div>
  );
}
