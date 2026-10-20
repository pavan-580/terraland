"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StickyRegisterButton() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    const searchSection = document.querySelector<HTMLElement>(".hero-search-section");
    const hero = slot?.closest<HTMLElement>(".hero");
    if (!slot || !searchSection || !hero) return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!window.matchMedia("(max-width: 700px)").matches) {
          setStuck(false);
          return;
        }

        const searchRect = searchSection.getBoundingClientRect();
        const stickyTop = searchRect.bottom + 8;
        const slotTop = slot.getBoundingClientRect().top;
        const heroBottom = hero.getBoundingClientRect().bottom;
        const shouldStick = slotTop <= searchRect.bottom + 16 && heroBottom > searchRect.bottom;

        if (shouldStick) slot.style.setProperty("--sticky-register-top", `${stickyTop}px`);
        setStuck(shouldStick);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(searchSection);
    resizeObserver.observe(slot);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
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
