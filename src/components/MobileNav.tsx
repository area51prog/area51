"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Eye, Briefcase, FileSearch, CalendarClock } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Eye },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/dashboard/research", label: "Research", icon: FileSearch },
  { href: "/dashboard/dividends", label: "Dividends", icon: CalendarClock },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-brand" : "text-foreground/50"
            )}
          >
            <Icon size={19} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
