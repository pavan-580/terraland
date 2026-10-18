"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  className = "",
  fallbackHref = "/",
  label = "Go back",
}: {
  className?: string;
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      let sameSiteReferrer = false;
      try {
        sameSiteReferrer = Boolean(referrer) && new URL(referrer).origin === window.location.origin;
      } catch {
        sameSiteReferrer = false;
      }
      if (window.history.length > 1 && sameSiteReferrer) {
        router.back();
        return;
      }
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      className={`site-back-btn ${className}`.trim()}
      onClick={goBack}
      aria-label={label}
      title={label}
    >
      <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
