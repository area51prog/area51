import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveStock } from "@/lib/resolveStock";
import { Stock, ResearchReport } from "@/lib/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const REPORT_SCHEMA = {
  type: "object" as const,
  properties: {
    rating: { type: "string", enum: ["BUY", "HOLD", "REDUCE", "SELL"] },
    targetPrice: { type: "number" },
    upsidePct: { type: "number" },
    summary: { type: "string" },
    scenarios: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: ["Bull", "Base", "Bear"] },
          target: { type: "number" },
          returnPct: { type: "number" },
          desc: { type: "string" },
        },
        required: ["name", "target", "returnPct", "desc"],
      },
    },
    kpis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          note: { type: "string" },
        },
        required: ["label", "value"],
      },
    },
    catalysts: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    dcf: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
      },
    },
  },
  required: ["rating", "targetPrice", "upsidePct", "summary", "scenarios", "kpis", "catalysts", "risks", "dcf"],
};

type GeneratedReport = Omit<ResearchReport, "symbol" | "generatedOn" | "currentPrice">;

function buildPrompt(stock: Stock, extraContext: string | null): string {
  const historyLine = stock.history.map((h) => `${h.date}: ₹${h.price}`).join(", ");
  return `You are an equity research analyst. Produce a 12-month equity research view for the following stock using the real data provided. Be specific and numerically grounded — do not invent data points that contradict what's given.

Symbol: ${stock.symbol}
Name: ${stock.name}
Exchange: ${stock.exchange}
Sector: ${stock.sector}
Current price: ₹${stock.price}
Previous close: ₹${stock.prevClose}
Day range: ₹${stock.dayLow} – ₹${stock.dayHigh}
52-week range: ₹${stock.week52Low} – ₹${stock.week52High}
Market cap: ₹${stock.marketCapCr} cr
P/E ratio: ${stock.peRatio ?? "n/a"}
12-month price history: ${historyLine}
${extraContext ? `\n${extraContext}\n` : ""}
Call the submit_research_report tool with your full analysis.`;
}

function isStale(generatedAt: string): boolean {
  return Date.now() - new Date(generatedAt).getTime() > THIRTY_DAYS_MS;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return Response.json({ ok: false, error: "Missing symbol query param" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .select("report, generated_at")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ ok: true, report: null, generatedAt: null, stale: false });
  }

  return Response.json({
    ok: true,
    report: data.report as unknown as ResearchReport,
    generatedAt: data.generated_at,
    stale: isStale(data.generated_at),
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let symbol: string;
  let force = false;
  try {
    const body = await req.json();
    symbol = body.symbol;
    force = Boolean(body.force);
    if (!symbol || typeof symbol !== "string") {
      return Response.json({ ok: false, error: "Missing symbol in request body" }, { status: 400 });
    }
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!force) {
    const { data: cached } = await supabase
      .from("research_reports")
      .select("report, generated_at")
      .eq("symbol", symbol)
      .maybeSingle();

    if (cached && !isStale(cached.generated_at)) {
      return Response.json({
        ok: true,
        report: cached.report as unknown as ResearchReport,
        generatedAt: cached.generated_at,
        stale: false,
      });
    }
  }

  const resolved = await resolveStock(supabase, symbol);
  if (!resolved) {
    return Response.json({ ok: false, error: "No market data available for this symbol" }, { status: 404 });
  }
  const { stock, extraContext } = resolved;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [
        {
          name: "submit_research_report",
          description: "Submit the completed equity research report.",
          input_schema: REPORT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "submit_research_report" },
      messages: [{ role: "user", content: buildPrompt(stock, extraContext) }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return Response.json({ ok: false, error: "Model did not return a structured report" }, { status: 502 });
    }

    const generated = toolUse.input as GeneratedReport;
    const generatedOn = new Date().toISOString().slice(0, 10);
    const report: ResearchReport = {
      symbol: stock.symbol,
      generatedOn,
      currentPrice: stock.price,
      ...generated,
    };

    const { error: upsertError } = await supabase.from("research_reports").upsert({
      symbol: stock.symbol,
      report: report as unknown as never,
      generated_at: new Date().toISOString(),
      generated_by: userData.user?.id,
    });

    if (upsertError) {
      return Response.json({ ok: false, error: upsertError.message }, { status: 500 });
    }

    return Response.json({ ok: true, report, generatedAt: new Date().toISOString(), stale: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic request failed";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
