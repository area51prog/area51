import PremiumGate from "@/components/PremiumGate";

export default function DividendsLayout({ children }: { children: React.ReactNode }) {
  return <PremiumGate feature="Dividends">{children}</PremiumGate>;
}
