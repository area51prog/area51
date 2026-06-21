import fs from "fs";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), ".data", "upstox-token.json");
const IST_OFFSET_MIN = 330;

interface StoredToken {
  accessToken: string;
  obtainedAt: number;
  expiresAt: number;
}

// Upstox access tokens always expire at 3:30 AM IST the day after they were
// issued, regardless of issue time.
function computeExpiry(obtainedAtMs: number) {
  const istMs = obtainedAtMs + IST_OFFSET_MIN * 60_000;
  const ist = new Date(istMs);
  const expiryIstMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1, 3, 30, 0, 0);
  return expiryIstMs - IST_OFFSET_MIN * 60_000;
}

export function saveUpstoxToken(accessToken: string): StoredToken {
  const obtainedAt = Date.now();
  const token: StoredToken = { accessToken, obtainedAt, expiresAt: computeExpiry(obtainedAt) };
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token), "utf-8");
  return token;
}

export function readUpstoxToken(): StoredToken | null {
  try {
    const raw = fs.readFileSync(TOKEN_PATH, "utf-8");
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

export function getValidUpstoxAccessToken(): string | null {
  const token = readUpstoxToken();
  if (!token || Date.now() >= token.expiresAt) return null;
  return token.accessToken;
}

export function clearUpstoxToken() {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch {
    // already absent
  }
}
