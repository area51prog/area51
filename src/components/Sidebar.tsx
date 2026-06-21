"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  Briefcase,
  FileSearch,
  CalendarClock,
  Settings,
  LifeBuoy,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Eye },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/dashboard/research", label: "Research", icon: FileSearch },
  { href: "/dashboard/dividends", label: "Dividends", icon: CalendarClock },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-none flex-col border-r border-line bg-surface">
      <div className="h-16 flex items-center gap-2 px-6 font-bold text-lg text-heading tracking-tight">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs">
          B17
        </span>
        Bot17
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
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
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4 space-y-0.5">
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
