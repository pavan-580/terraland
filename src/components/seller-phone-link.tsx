"use client";

import type { ReactNode, MouseEvent } from "react";

export function SellerPhoneLink({
  propertyId,
  phone,
  owner,
  className,
  children,
}: {
  propertyId: string;
  phone: string;
  owner: string;
  className?: string;
  children: ReactNode;
}) {
  function recordClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const payload = new Blob([JSON.stringify({ propertyId })], { type: "application/json" });
    if (!navigator.sendBeacon("/api/seller-phone-clicks", payload)) {
      void fetch("/api/seller-phone-clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
        keepalive: true,
      });
    }
  }

  return <a className={className} href={`tel:${phone}`} onClick={recordClick} aria-label={`Call seller ${owner}`}>{children}</a>;
}
