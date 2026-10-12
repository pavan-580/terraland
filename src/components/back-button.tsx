"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ className = "", fallbackHref = "/" }: { className?: string; fallbackHref?: string }) {
  const router = useRouter();
  function goBack() {
    const referrer = document.referrer;
    let sameSiteReferrer = false;
    try {
      sameSiteReferrer = Boolean(referrer) && new URL(referrer).origin === window.location.origin;
    } catch {
      sameSiteReferrer = false;
    }
    if (window.history.length > 1 && sameSiteReferrer) router.back();
    else router.push(fallbackHref);
  }
  return <button type="button" className={className} onClick={goBack} aria-label="Back to home" title="Back to home">
    <ArrowLeft size={15} aria-hidden="true" /><span>Back to home</span>
  </button>;
}

