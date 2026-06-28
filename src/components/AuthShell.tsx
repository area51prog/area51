import { ReactNode } from "react";
import { TrendingUp, ShieldCheck, CalendarClock, Sparkles } from "lucide-react";
import { LogoLockup } from "@/components/Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-navy text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.35),transparent_50%)]" />
        <div className="relative z-10">
          <LogoLockup className="h-7" />
        </div>
        <div className="relative z-10 space-y-8 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Indian markets, tracked smarter.
          </h2>
          <div className="space-y-5 text-sm text-white/80">
            <Feature icon={<TrendingUp size={18} />} text="Live NSE & BSE pricing across your watchlist and portfolio" />
            <Feature icon={<Sparkles size={18} />} text="AI-generated equity research with ratings & target prices" />
            <Feature icon={<CalendarClock size={18} />} text="Dividend calendar with projected income for every holding" />
            <Feature icon={<ShieldCheck size={18} />} text="Your data stays yours — manual portfolio entry, no brokerage linking required" />
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/40">© 2026 Alloqo. For educational purposes only — not investment advice.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center text-heading mb-8">
            <LogoLockup className="h-7" />
          </div>
          <h1 className="text-2xl font-bold text-heading">{title}</h1>
          <p className="text-sm text-foreground/60 mt-1 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-white/10">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
