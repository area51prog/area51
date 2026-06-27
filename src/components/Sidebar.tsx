"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  Briefcase,
  FileSearch,
  CalendarClock,
  History,
  BarChart3,
  Settings,
  LifeBuoy,
  Lock,
  Shield,
} from "lucide-react";
import clsx from "clsx";
import { useProfile } from "@/lib/useProfile";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, premium: false },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Eye, premium: false },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Briefcase, premium: false },
  { href: "/dashboard/transactions", label: "Transactions", icon: History, premium: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, premium: true },
  { href: "/dashboard/research", label: "Research", icon: FileSearch, premium: true },
  { href: "/dashboard/dividends", label: "Dividends", icon: CalendarClock, premium: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isPremium, isAdmin } = useProfile();

  return (
    <aside className="hidden md:flex w-60 flex-none flex-col border-r border-line bg-surface">
      <div className="h-16 flex items-center gap-2 px-6 font-bold text-lg text-heading tracking-tight">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs">
          B17
        </span>
        Bot17
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, premium }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          const locked = premium && !isPremium;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-light text-brand"
                  : "text-foreground/60 hover:bg-background hover:text-foreground"
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {locked && <Lock size={14} className="text-foreground/40" />}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4 space-y-0.5">
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/dashboard/admin")
                ? "bg-brand-light text-brand"
                : "text-foreground/60 hover:bg-background hover:text-foreground"
            )}
          >
            <Shield size={18} />
            Admin Console
          </Link>
        )}
        <Link
          href="/dashboard/settings"
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/settings")
              ? "bg-brand-light text-brand"
              : "text-foreground/60 hover:bg-background hover:text-foreground"
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
        <Link
          href="/dashboard/support"
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/support")
              ? "bg-brand-light text-brand"
              : "text-foreground/60 hover:bg-background hover:text-foreground"
          )}
        >
          <LifeBuoy size={18} />
          Support
        </Link>
      </div>
    </aside>
  );
}
