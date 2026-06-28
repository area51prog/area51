"use client";

import { useState } from "react";
import { Mail, MessageCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui";

const FAQS = [
  {
    q: "Why does a price show as Mock instead of Live?",
    a: "Live prices come from Upstox first, then Finnhub as a fallback. If neither provider has data for a symbol, the app shows the last known mock price. Check Settings → Market data providers to connect or reconnect a provider.",
  },
  {
    q: "My Upstox connection keeps failing.",
    a: "Upstox access tokens expire daily at 3:30am IST and must be reconnected each day. Make sure UPSTOX_CLIENT_ID and UPSTOX_CLIENT_SECRET are set correctly, and that the redirect URI matches what's configured in your Upstox developer app.",
  },
  {
    q: "How do I add or remove holdings from my portfolio?",
    a: "Go to Portfolio and use the add/edit controls on each holding. Changes are saved to your account immediately and sync across devices.",
  },
  {
    q: "Can I delete my account?",
    a: "Account deletion isn't self-serve yet. Send us a message below and we'll take care of it.",
  },
  {
    q: "How do dividend projections work?",
    a: "The Dividends page estimates upcoming income by multiplying announced per-share amounts by the quantity you hold, for any stock with an upcoming ex-dividend date.",
  },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message.");
      setSent(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <Card title="Frequently asked questions">
        <div className="divide-y divide-line">
          {FAQS.map((faq, i) => {
            const open = openFaq === i;
            return (
              <div key={faq.q} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-semibold text-heading">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`flex-none text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && <p className="mt-2 text-sm text-foreground/60">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Contact support">
        {sent ? (
          <div className="flex items-center gap-2 rounded-lg border border-up/30 bg-up/5 px-4 py-3 text-sm text-up">
            <MessageCircle size={16} />
            Thanks — we&apos;ve received your message and will reply to {user?.email ?? "your email"} soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Subject</span>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-foreground/70 mb-1.5">Message</span>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface text-foreground px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-brand text-white text-sm font-semibold px-4 py-2 hover:bg-brand/90 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send message"}
              </button>
              {sendError && <span className="text-sm text-down">{sendError}</span>}
            </div>
          </form>
        )}
      </Card>

      <Card title="Other ways to reach us">
        <a
          href="mailto:support@alloqo.com"
          className="flex items-center gap-3 text-sm font-semibold text-foreground/70 hover:text-brand"
        >
          <Mail size={16} />
          support@alloqo.com
        </a>
      </Card>
    </div>
  );
}
