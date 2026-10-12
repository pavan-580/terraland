"use client";

import { useEffect, useState } from "react";
import { Headset } from "lucide-react";

export function ChatWidget() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY >= 190);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <div className="chat-widget">
      <a className="chat-launcher" href="tel:+918074399963" aria-label="Call NILAY">
        <span className="call-launcher-icon"><Headset size={22} /></span>
      </a>
    </div>
  );
}
