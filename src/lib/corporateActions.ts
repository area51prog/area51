import { ActionType, CorporateAction, CorporateActionRow } from "@/lib/types";

const RATIO_RE = /(\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?)/;

function dividendSubType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("interim")) return "Interim";
  if (lower.includes("special")) return "Special";
  return "Final";
}

function ratioSubType(name: string, details: string): string | null {
  return RATIO_RE.exec(name)?.[1] ?? RATIO_RE.exec(details)?.[1] ?? null;
}

// Upstox's corporate-actions feed mixes investor-impacting events (dividend,
// bonus, split, ...) with informational notices (AGM/EGM, board meetings,
// postal ballots) that don't change a shareholder's position or cash flow.
// Anything that doesn't match a known economic action type is dropped.
export function classifyAction(name: string, details: string): { type: ActionType; subType: string | null } | null {
  const lower = name.toLowerCase();

  if (lower.includes("dividend")) return { type: "Dividend", subType: dividendSubType(name) };
  if (lower.includes("bonus")) return { type: "Bonus", subType: ratioSubType(name, details) };
  if (lower.includes("split") || lower.includes("sub-division") || lower.includes("subdivision")) {
    return { type: "Split", subType: ratioSubType(name, details) };
  }
  if (lower.includes("rights")) return { type: "Rights", subType: ratioSubType(name, details) };
  if (lower.includes("buyback") || lower.includes("buy-back")) return { type: "Buyback", subType: null };
  if (lower.includes("merger") || lower.includes("amalgamation") || lower.includes("demerger") || lower.includes("scheme of arrangement")) {
    return { type: "Merger", subType: null };
  }
  if (lower.includes("delisting")) return { type: "Delisting", subType: null };

  return null;
}

export function classifyCorporateActions(symbol: string, actions: CorporateAction[]): CorporateActionRow[] {
  return actions.flatMap((a) => {
    const classified = classifyAction(a.name, a.details);
    if (!classified || !a.exDate) return [];
    return [
      {
        symbol,
        actionType: classified.type,
        subType: classified.subType,
        exDate: a.exDate,
        amount: a.amount,
        rawName: a.name,
        details: a.details || null,
      },
    ];
  });
}
