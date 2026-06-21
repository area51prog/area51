import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.UPSTOX_CLIENT_ID;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.redirect(new URL("/dashboard/settings?upstox=not_configured", req.url));
  }

  const state = Math.random().toString(36).slice(2);
  const dialogUrl = new URL("https://api.upstox.com/v2/login/authorization/dialog");
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("client_id", clientId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("state", state);

  return Response.redirect(dialogUrl.toString());
}
