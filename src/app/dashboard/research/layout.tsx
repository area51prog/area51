import PremiumGate from "@/components/PremiumGate";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <PremiumGate feature="Research">{children}</PremiumGate>;
}
