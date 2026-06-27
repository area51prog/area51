import { NextRequest, NextResponse } from "next/server";

export const UPSTOX_OAUTH_STATE_COOKIE = "upstox_oauth_state";

export async function GET(req: NextRequest) {
  const clientId = process.env.UPSTOX_CLIENT_ID;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.redirect(new URL("/dashboard/settings?upstox=not_configured", req.url));
  }

  const state = crypto.randomUUID();
  const dialogUrl = new URL("https://api.upstox.com/v2/login/authorization/dialog");
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("client_id", clientId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(dialogUrl.toString());
  res.cookies.set(UPSTOX_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
