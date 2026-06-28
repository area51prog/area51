"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { QuoteSource } from "@/lib/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className={clsx("bg-surface border border-line rounded-2xl p-5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-heading">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ChangeBadge({ value, percent }: { value?: number; percent: number }) {
  const up = percent >= 0;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5",
        up ? "text-up bg-up/10" : "text-down bg-down/10"
      )}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {value !== undefined ? `₹${Math.abs(value).toFixed(2)} · ` : ""}
      {Math.abs(percent).toFixed(2)}%
    </span>
  );
}

const SOURCE_LABEL: Record<QuoteSource, string> = {
  upstox: "Upstox",
  finnhub: "Finnhub",
  "upstox-stale": "Upstox (stale)",
  mock: "Mock",
};

const SOURCE_TITLE: Record<QuoteSource, string> = {
  upstox: "Live price via Upstox",
  finnhub: "Live price via Finnhub",
  "upstox-stale": "Upstox token expired — showing the last price Upstox reported before it went down",
  mock: "Showing mock data — no live provider had data for this symbol",
};

export function LiveBadge({ live, source }: { live?: boolean; source?: QuoteSource }) {
  const resolved: QuoteSource = source ?? (live ? "finnhub" : "mock");
  const isLive = resolved === "upstox" || resolved === "finnhub";
  const isStale = resolved === "upstox-stale";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
        isLive ? "text-up" : isStale ? "text-amber-500" : "text-foreground/40"
      )}
      title={SOURCE_TITLE[resolved]}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isLive ? "bg-up animate-pulse" : isStale ? "bg-amber-500" : "bg-foreground/30"
        )}
      />
      {SOURCE_LABEL[resolved]}
    </span>
  );
}

export function RatingPill({ rating }: { rating: string }) {
  const styles: Record<string, string> = {
    BUY: "bg-up/10 text-up",
    HOLD: "bg-amber-500/15 text-amber-500",
    REDUCE: "bg-orange-500/15 text-orange-500",
    SELL: "bg-down/10 text-down",
  };
  return (
    <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-md", styles[rating] ?? "bg-foreground/10 text-foreground/70")}>
      {rating}
    </span>
  );
}

export function RatingDot({ rating }: { rating: string }) {
  const styles: Record<string, string> = {
    BUY: "bg-up",
    HOLD: "bg-amber-500",
    REDUCE: "bg-orange-500",
    SELL: "bg-down",
  };
  return (
    <span
      className={clsx("inline-block h-2 w-2 rounded-full flex-none", styles[rating] ?? "bg-foreground/30")}
      title={`Research report: ${rating}`}
    />
  );
}

export function PriceAreaChart({
  data,
  color = "#4f46e5",
  height = 220,
  valueLabel = "Price",
  valueFormat = (v: number) => `₹${v.toFixed(2)}`,
}: {
  data: { date: string; value: number }[];
  color?: string;
  height?: number;
  valueLabel?: string;
  valueFormat?: (v: number) => string;
}) {
  const gradId = `grad-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eceef7" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8b91a8" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(v) => [valueFormat(Number(v)), valueLabel]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e7e9f3", fontSize: 12 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type ChartMode = "price" | "pe";

export function RangeSelector<T extends string>({
  ranges,
  value,
  onChange,
}: {
  ranges: T[];
  value: T;
  onChange: (range: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-background/60 p-0.5">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={clsx(
            "text-xs font-semibold px-2.5 py-1 rounded-md transition-colors",
            value === r ? "bg-brand text-white" : "text-foreground/50 hover:text-foreground"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="px-4 first:pl-0 flex flex-col justify-center">
      <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-heading"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-foreground/50 mt-0.5">{sub}</div>}
    </div>
  );
}

export function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-background/60 p-0.5">
      {(["price", "pe"] as ChartMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={clsx(
            "text-xs font-semibold px-2.5 py-1 rounded-md transition-colors",
            mode === m ? "bg-brand text-white" : "text-foreground/50 hover:text-foreground"
          )}
        >
          {m === "price" ? "Price" : "P/E"}
        </button>
      ))}
    </div>
  );
}
