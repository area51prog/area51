"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { Card } from "@/components/ui";

export default function PremiumGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { isPremium, ready } = useProfile();

  if (!ready) return null;

  if (!isPremium) {
    return (
      <Card className="max-w-lg mx-auto py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand mb-4">
          <Lock size={24} />
        </span>
        <h2 className="text-xl font-bold text-heading">{feature} is a Premium feature</h2>
        <p className="text-sm text-foreground/60 mt-2">
          Upgrade to Premium to unlock {feature.toLowerCase()}, up to 5 watchlists and portfolios, and higher stock limits.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
