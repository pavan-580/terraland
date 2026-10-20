"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function StickyRegisterButton() {
  const slotRef = useRef<HTMLDivElement>(null);
  const anchorYRef = useRef<number | null>(null);
  const stuckRef = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const slot = slotRef.current;
      const hero = slot?.closest<HTMLElement>(".hero");
      const search = hero?.querySelector<HTMLElement>(".hero-search-section");
      if (!slot || !hero || !search || window.innerWidth > 700) {
        stuckRef.current = false;
        setStuck(false);
        return;
      }

      const searchBottom = search.getBoundingClientRect().bottom;
      if (!stuckRef.current) {
        anchorYRef.current = slot.getBoundingClientRect().top + window.scrollY;
      }
      const anchorY = anchorYRef.current ?? slot.getBoundingClientRect().top + window.scrollY;
      const shouldStick = anchorY <= window.scrollY + searchBottom + 20;
      setTop(searchBottom + 2);
      stuckRef.current = shouldStick;
      setStuck(shouldStick);
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
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
