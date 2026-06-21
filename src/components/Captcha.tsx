"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Ref } from "react";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function Captcha({
  ref,
  onVerify,
}: {
  ref?: Ref<TurnstileInstance>;
  onVerify: (token: string) => void;
}) {
  if (!siteKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set; captcha widget will not render.");
    }
    return null;
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onVerify}
      options={{ size: "flexible" }}
    />
  );
}
