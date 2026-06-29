"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Ref, useState } from "react";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function Captcha({
  ref,
  onVerify,
}: {
  ref?: Ref<TurnstileInstance>;
  onVerify: (token: string) => void;
}) {
  const [failed, setFailed] = useState(false);

  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set; captcha widget will not render.");
    }
    return null;
  }

  if (failed) {
    return (
      <p className="text-sm text-down">
        The captcha failed to load. Please refresh the page and try again.
      </p>
    );
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onVerify}
      onError={() => setFailed(true)}
      // "flexible" sizing has Cloudflare measure the container's width at
      // render time, which can race with layout/hydration and come back as
      // 0 — surfacing as a confusing "Invalid widget size" (400020) error.
      // "normal" is a fixed size, so it can't fail that way.
      options={{ size: "normal" }}
    />
  );
}
