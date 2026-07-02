"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Users, Activity, HeartPulse, ScrollText } from "lucide-react";

const TABS = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/usage", label: "API Usage", icon: Activity },
  { href: "/dashboard/admin/health", label: "Health", icon: HeartPulse },
  { href: "/dashboard/admin/audit", label: "Audit", icon: ScrollText },
] as const;

export default function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-line pb-px">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
              active
                ? "border-brand text-brand"
                : "border-transparent text-foreground/50 hover:text-foreground",
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
