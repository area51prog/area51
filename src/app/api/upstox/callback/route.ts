import { NextRequest, NextResponse } from "next/server";
import { saveUpstoxToken } from "@/lib/upstoxToken";
import { createClient } from "@/lib/supabase/server";
import { UPSTOX_OAUTH_STATE_COOKIE } from "@/app/api/upstox/login/route";

export async function GET(req: NextRequest) {
  const clientId = process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  // Upstox only ever redirects back to our registered redirectUri, so its
  // origin is the one host we know is publicly reachable. req.url's host can
  // reflect an internal reverse-proxy address (e.g. 0.0.0.0) depending on the
  // deploy platform, which would send the browser somewhere unreachable.
  const origin = redirectUri ? new URL(redirectUri).origin : req.nextUrl.origin;
  const settingsUrl = new URL("/dashboard/settings", origin);

  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(UPSTOX_OAUTH_STATE_COOKIE)?.value;

  if (errorParam || !code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("upstox", "error");
    const res = NextResponse.redirect(settingsUrl.toString());
    res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
    return res;
  }

  if (!clientId || !clientSecret || !redirectUri) {
    settingsUrl.searchParams.set("upstox", "not_configured");
    const res = NextResponse.redirect(settingsUrl.toString());
    res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
    return res;
  }

  try {
    const tokenRes = await fetch("https://api.upstox.com/v2/login/authorization/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.access_token) {
      settingsUrl.searchParams.set("upstox", "error");
      const res = NextResponse.redirect(settingsUrl.toString());
      res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
      return res;
    }

    const supabase = await createClient();
    const saved = await saveUpstoxToken(supabase, data.access_token);
    if (!saved) {
      settingsUrl.searchParams.set("upstox", "error");
      const res = NextResponse.redirect(settingsUrl.toString());
      res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
      return res;
    }
    settingsUrl.searchParams.set("upstox", "connected");
    const res = NextResponse.redirect(settingsUrl.toString());
    res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
    return res;
  } catch {
    settingsUrl.searchParams.set("upstox", "error");
    const res = NextResponse.redirect(settingsUrl.toString());
    res.cookies.delete(UPSTOX_OAUTH_STATE_COOKIE);
    return res;
  }
}
