"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Card, PriceAreaChart } from "@/components/ui";

type MarketSnapshotPoint = { date: string; value: number };

export default function LandingPage() {
  const [points, setPoints] = useState<MarketSnapshotPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market-snapshot")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        setPoints(body.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-12 py-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-heading">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">B17</span>
          Bot17
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-foreground/70 hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 transition-colors"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 sm:px-12 pt-12 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-heading">
              Indian markets, tracked smarter.
            </h1>
            <p className="text-base text-foreground/60 mt-4 max-w-md">
              Bot17 brings live NSE &amp; BSE pricing, AI-generated equity research, and a dividend calendar together
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

          <Card title="Today's market" className="lg:ml-auto w-full">
            {points === null ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-foreground/40">
                Loading market data…
              </div>
            ) : points.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-foreground/40">
                Market data unavailable
              </div>
            ) : (
              <PriceAreaChart
                data={points}
                valueLabel="Nifty 50"
                valueFormat={(v) => v.toFixed(2)}
              />
            )}
          </Card>
        </section>

        <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-20">
          <h2 className="text-2xl font-bold text-heading text-center">Choose your plan</h2>
          <p className="text-sm text-foreground/60 text-center mt-2">Start free, upgrade whenever you need more.</p>

          <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-3xl mx-auto">
            <Card className="!p-6">
              <h3 className="text-lg font-bold text-heading">Free</h3>
              <ul className="space-y-2.5 mt-4 text-sm text-foreground/70">
                <li>1 watchlist</li>
                <li>Up to 50 items per list</li>
                <li>1 portfolio</li>
                <li>Live NSE &amp; BSE pricing</li>
              </ul>
            </Card>

            <Card className="!p-6 border-brand/40 relative">
              <span className="absolute -top-3 right-6 text-xs font-bold px-2.5 py-1 rounded-md bg-brand/10 text-brand">
                PREMIUM
              </span>
              <h3 className="text-lg font-bold text-heading">Premium</h3>
              <p className="text-xs font-semibold text-foreground/50 mt-1">Coming soon</p>
              <ul className="space-y-2.5 mt-4 text-sm text-foreground/70">
                <li>Up to 5 watchlists</li>
                <li>Up to 100 items per list</li>
                <li>Up to 5 portfolios</li>
                <li>AI equity research &amp; ratings</li>
                <li>Dividend calendar</li>
              </ul>
            </Card>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-foreground/40 py-8 space-y-2">
        <p>© 2026 Bot17. For educational purposes only — not investment advice.</p>
        <Link href="/privacy" className="text-foreground/40 hover:text-foreground/70 hover:underline">
          Privacy Policy
        </Link>
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
