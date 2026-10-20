"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StickyRegisterButton() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    const citySection = slot?.closest<HTMLElement>(".hero-cities-section");
    const searchSection = document.querySelector<HTMLElement>(".hero-search-section");
    if (!slot || !citySection || !searchSection) return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!window.matchMedia("(max-width: 700px)").matches) {
          setStuck(false);
          return;
        }

        const stickyTop = searchSection.getBoundingClientRect().bottom + 8;
        const slotTop = slot.getBoundingClientRect().top;
        const sectionBottom = citySection.getBoundingClientRect().bottom;
        const shouldStick = slotTop <= stickyTop && sectionBottom > stickyTop + 52;

        if (shouldStick) slot.style.setProperty("--sticky-register-top", `${stickyTop}px`);
        setStuck(shouldStick);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="hero-register-cta-slot" ref={slotRef}>
      <Link className={`hero-register-cta${stuck ? " is-stuck" : ""}`} href="/sell">
        Register your land for free <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
