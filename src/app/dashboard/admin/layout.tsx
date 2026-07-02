"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import AdminSubNav from "./_components/AdminSubNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, ready } = useProfile();

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/dashboard");
  }, [ready, isAdmin, router]);

  if (!ready || !isAdmin) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-brand" />
        <h2 className="text-lg font-semibold text-heading">Admin dashboard</h2>
      </div>
      <AdminSubNav />
      {children}
    </div>
  );
}
