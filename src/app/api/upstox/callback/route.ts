import { NextRequest } from "next/server";
import { saveUpstoxToken } from "@/lib/upstoxToken";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", req.url);
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam || !code) {
    settingsUrl.searchParams.set("upstox", "error");
    return Response.redirect(settingsUrl.toString());
  }

  const clientId = process.env.UPSTOX_CLIENT_ID;
  const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    settingsUrl.searchParams.set("upstox", "not_configured");
    return Response.redirect(settingsUrl.toString());
  }

  try {
    const res = await fetch("https://api.upstox.com/v2/login/authorization/token", {
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

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      settingsUrl.searchParams.set("upstox", "error");
      return Response.redirect(settingsUrl.toString());
    }

    const supabase = await createClient();
    const saved = await saveUpstoxToken(supabase, data.access_token);
    if (!saved) {
      settingsUrl.searchParams.set("upstox", "error");
      return Response.redirect(settingsUrl.toString());
    }
    settingsUrl.searchParams.set("upstox", "connected");
    return Response.redirect(settingsUrl.toString());
  } catch {
    settingsUrl.searchParams.set("upstox", "error");
    return Response.redirect(settingsUrl.toString());
  }
}
