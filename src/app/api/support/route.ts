import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { logApiUsage } from "@/lib/adminLog";

const SUPPORT_EMAIL = "support@alloqo.com";

export async function POST(request: Request) {
  const { subject, message } = await request.json();
  if (!subject || !message) {
    return Response.json({ error: "Subject and message are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userEmail = data.user?.email;
  if (!userEmail) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const metadata = data.user?.user_metadata;
  const name = (metadata?.full_name as string | undefined) || "Not set";
  const phone = metadata?.phone_number
    ? `${metadata.phone_country_code ?? ""} ${metadata.phone_number}`
    : "Not set";

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Support email isn't configured. Add RESEND_API_KEY to .env.local." }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const resendStart = Date.now();
  const { error } = await resend.emails.send({
    from: "Alloqo Support <onboarding@resend.dev>",
    to: SUPPORT_EMAIL,
    replyTo: userEmail,
    subject: `[Support] ${subject}`,
    text: `Name: ${name}\nEmail: ${userEmail}\nPhone: ${phone}\n\n${message}`,
  });

  void logApiUsage({
    provider: "resend",
    endpoint: "support.contact",
    userId: data.user?.id,
    status: error ? "error" : "ok",
    latencyMs: Date.now() - resendStart,
  });

  if (error) {
    console.error("Resend error:", error);
    return Response.json({ error: "Failed to send message. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
