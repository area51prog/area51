import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RESEARCH_REPORTS } from "@/lib/mock-data";
import { RatingPill } from "@/components/ui";

const sample = RESEARCH_REPORTS[0];

export default function ResearchTeaser() {
  return (
    <div className="rounded-2xl bg-navy p-8 sm:p-10 grid lg:grid-cols-2 gap-8 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand bg-white/10 px-3 py-1 rounded-full">
          <Sparkles size={13} /> AI equity research
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4">Ask anything about a stock. Get a real answer.</h2>
        <p className="text-sm text-white/60 mt-3 max-w-md">
          Not a chatbot guess — a structured read across valuation, scenarios, catalysts and risk, grounded in real
          price and fundamentals data.
        </p>
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-brand text-white text-sm font-semibold px-5 py-2.5 mt-6 hover:bg-brand/90 transition-colors"
        >
          Try a sample report
        </Link>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">{sample.symbol}</span>
          <RatingPill rating={sample.rating} />
        </div>
        <p className="text-sm text-white/70 leading-relaxed line-clamp-4">{sample.summary}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 text-xs">
          <span className="text-white/50">12-month target</span>
          <span className="font-mono text-white font-semibold">
            ₹{sample.targetPrice.toLocaleString("en-IN")} · {sample.upsidePct >= 0 ? "+" : ""}
            {sample.upsidePct}%
          </span>
        </div>
      </div>
    </div>
  );
}
