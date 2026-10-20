"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StickyRegisterButton() {
  const slotRef = useRef<HTMLDivElement>(null);
  const anchorYRef = useRef<number | null>(null);
  const stuckRef = useRef(false);
  const topRef = useRef(0);
  const [stuck, setStuck] = useState(false);
  const [top, setTop] = useState(0);

  useEffect(() => {
    let frame = 0;
    const updatePosition = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const slot = slotRef.current;
        const hero = slot?.closest<HTMLElement>(".hero");
        const search = hero?.querySelector<HTMLElement>(".hero-search-section");
        if (!slot || !hero || !search || window.innerWidth > 700) {
          stuckRef.current = false;
          anchorYRef.current = null;
          setStuck(false);
          return;
        }

        const slotTop = slot.getBoundingClientRect().top;
        const searchBottom = search.getBoundingClientRect().bottom;
        if (!stuckRef.current) {
          anchorYRef.current = slotTop + window.scrollY;
        }
        const anchorY = anchorYRef.current ?? slotTop + window.scrollY;
        const wasStuck = stuckRef.current;
        const shouldStick = anchorY <= window.scrollY + searchBottom + 20;

        if (shouldStick) {
          const nextTop = wasStuck ? searchBottom + 12 : slotTop;
          if (Math.abs(topRef.current - nextTop) > 0.5) {
            topRef.current = nextTop;
            setTop(nextTop);
          }
          if (!wasStuck) {
            window.requestAnimationFrame(() => {
              if (!stuckRef.current) return;
              const pinnedTop = search.getBoundingClientRect().bottom + 12;
              topRef.current = pinnedTop;
              setTop(pinnedTop);
            });
          }
        }

        stuckRef.current = shouldStick;
        if (wasStuck !== shouldStick) setStuck(shouldStick);
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  return (
    <>
      <div ref={slotRef} className={`hero-register-cta-slot${stuck ? " is-stuck" : ""}`}>
        <Link className="hero-register-cta" href="/sell">
          Register your land for free <ArrowUpRight size={15} />
        </Link>
      </div>
      {stuck && typeof document !== "undefined" && createPortal(
        <Link className="hero-register-cta hero-register-cta-stuck" style={{ top }} href="/sell">
          Register your land for free <ArrowUpRight size={15} />
        </Link>,
        document.body
      )}
    </>
  );
}
