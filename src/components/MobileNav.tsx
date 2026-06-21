"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Eye, Briefcase, FileSearch, CalendarClock, History, Lock } from "lucide-react";
import clsx from "clsx";
import { useProfile } from "@/lib/useProfile";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, premium: false },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Eye, premium: false },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Briefcase, premium: false },
  { href: "/dashboard/transactions", label: "Transactions", icon: History, premium: false },
  { href: "/dashboard/research", label: "Research", icon: FileSearch, premium: true },
  { href: "/dashboard/dividends", label: "Dividends", icon: CalendarClock, premium: true },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { isPremium } = useProfile();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {NAV.map(({ href, label, icon: Icon, premium }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        const locked = premium && !isPremium;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-brand" : "text-foreground/50"
            )}
          >
            <Icon size={19} />
            {label}
            {locked && <Lock size={10} className="absolute top-1.5 right-1/3 text-foreground/40" />}
          </Link>
        );
      })}
    </nav>
  );
}
