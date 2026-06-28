"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronDown, LogOut, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { LogoLockup } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import MarketTicker from "@/components/landing/MarketTicker";
import NavSearch from "@/components/landing/NavSearch";
import MarketMovers from "@/components/landing/MarketMovers";
import ResearchTeaser from "@/components/landing/ResearchTeaser";
import DividendTeaser from "@/components/landing/DividendTeaser";

export default function LandingPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketTicker />
      <header className="flex items-center justify-between gap-4 px-6 sm:px-12 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center text-heading flex-none">
          <LogoLockup className="h-7" />
        </div>
        <div className="hidden sm:block flex-1 max-w-xs">
          <NavSearch />
        </div>
        <nav className="flex items-center gap-4 flex-none">
          {!loading && user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground"
              >
                Account
                <ChevronDown size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-line rounded-lg shadow-lg z-30 overflow-hidden">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2.5 text-sm hover:bg-background"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-down hover:bg-background text-left"
                  >
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-foreground/70 hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 sm:px-12 pt-12 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-heading">
              Indian markets, tracked smarter.
            </h1>
            <p className="text-base text-foreground/60 mt-4 max-w-md">
              Alloqo brings live NSE &amp; BSE pricing, AI-generated equity research, and a dividend calendar together
              in one clean dashboard — no brokerage linking required.
            </p>
            <div className="flex items-center gap-3 mt-8">
              <Link
                href="/signup"
                className="rounded-lg bg-brand text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand/90 transition-colors"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-line bg-surface text-foreground text-sm font-semibold px-5 py-2.5 hover:bg-background transition-colors"
              >
                Log in
              </Link>
            </div>
            <div className="space-y-4 mt-10 text-sm text-foreground/70">
              <Feature icon={<TrendingUp size={16} />} text="Live NSE & BSE pricing across your watchlist and portfolio" />
              <Feature icon={<Sparkles size={16} />} text="AI-generated equity research that helps know a stock better" />
              <Feature icon={<CalendarClock size={16} />} text="Dividend calendar with projected income for every holding" />
              <Feature icon={<ShieldCheck size={16} />} text="Your data stays yours — manual portfolio entry, no brokerage linking" />
            </div>
          </div>

          <div className="lg:ml-auto w-full">
            <MarketMovers />
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-16">
          <ResearchTeaser />
        </section>

        <DividendTeaser />

        <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-20">
          <h2 className="text-2xl font-bold text-heading text-center">Choose your plan</h2>
          <p className="text-sm text-foreground/60 text-center mt-2">Start free, upgrade whenever you need more.</p>

          <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-3xl mx-auto">
            <Card className="!p-6">
              <h3 className="text-lg font-bold text-heading">Free</h3>
              <ul className="space-y-2.5 mt-4 text-sm text-foreground/70">
                <li>1 watchlist</li>
                <li>1 portfolio</li>
                <li>Up to 50 items per list</li>
                <li>Live NSE &amp; BSE pricing</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center rounded-lg bg-brand text-white text-sm font-semibold px-5 py-2.5 mt-6 hover:bg-brand/90 transition-colors"
              >
                Sign up
              </Link>
            </Card>

            <Card className="!p-6 border-brand/40 relative">
              <span className="absolute -top-3 right-6 text-xs font-bold px-2.5 py-1 rounded-md bg-brand/10 text-brand">
                PREMIUM
              </span>
              <h3 className="text-lg font-bold text-heading">Premium</h3>
              <p className="text-xs font-semibold text-foreground/50 mt-1">Coming soon</p>
              <ul className="space-y-2.5 mt-4 text-sm text-foreground/70">
                <li>Up to 5 watchlists</li>
                <li>Up to 5 portfolios</li>
                <li>Up to 100 items per list</li>
                <li>AI equity research &amp; ratings</li>
                <li>Dividend calendar</li>
                <li>Advanced portfolio analytics</li>
              </ul>
              <button
                disabled
                className="block w-full text-center rounded-lg bg-foreground/15 text-foreground/40 text-sm font-semibold px-5 py-2.5 mt-6 cursor-not-allowed"
              >
                Sign up
              </button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-navy text-center text-xs text-white/50 py-6">
        <p>
          © 2026 Alloqo. Not an Investment Advice.{" "}
          <Link href="/privacy" className="text-white/50 hover:text-white hover:underline">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-brand-light text-brand">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
