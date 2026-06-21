"use client";

import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/watchlist": "Watchlist",
  "/dashboard/portfolio": "Portfolio",
  "/dashboard/research": "Research",
  "/dashboard/dividends": "Dividend calendar",
  "/dashboard/settings": "Account settings",
};

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/dashboard/stocks/")) return "Stock detail";
  if (pathname.startsWith("/dashboard/research/")) return "Research report";
  return "Bot17";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-foreground/50">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={titleFor(pathname)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
