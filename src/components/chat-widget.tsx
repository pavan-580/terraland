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
      <a className="chat-launcher" href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20need%20help." aria-label="Message NILAY customer care on WhatsApp" title="Message customer care on WhatsApp" target="_blank" rel="noreferrer">
        <span className="call-launcher-icon"><Headset size={22} /></span>
      </a>
    </div>
  );
}
