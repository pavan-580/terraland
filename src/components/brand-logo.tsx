"use client";

import { useEffect, useState } from "react";

export function BrandLogo({ placement = "header", src }: { placement?: "header" | "footer"; src?: string }) {
  const [logoSrc, setLogoSrc] = useState(src || "/nilay-logo.png");

  useEffect(() => {
    if (src) {
      setLogoSrc(src);
      return;
    }

    try {
      const cached = localStorage.getItem("nilay:custom-logo");
      if (cached) setLogoSrc(cached);
    } catch {
      /* localStorage unavailable */
    }

    let active = true;
    void fetch("/api/branding", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { logoUrl?: string } | null) => {
        if (!active || !data?.logoUrl) return;
        setLogoSrc(data.logoUrl);
        try {
          localStorage.setItem("nilay:custom-logo", data.logoUrl);
        } catch {
          /* localStorage unavailable */
        }
      })
      .catch(() => {});

    function onLogoUpdated(event: CustomEvent<{ logoUrl: string }>) {
      if (event.detail?.logoUrl) {
        setLogoSrc(event.detail.logoUrl);
      }
    }

    window.addEventListener("nilay:logo-updated" as string, onLogoUpdated as EventListener);
    return () => {
      active = false;
      window.removeEventListener("nilay:logo-updated" as string, onLogoUpdated as EventListener);
    };
  }, [src]);

  return (
    <img
      className={`brand-logo brand-logo-${placement}`}
      src={logoSrc}
      alt="NILAY Real Estate"
      loading="eager"
    />
  );
}
