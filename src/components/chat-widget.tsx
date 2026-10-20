"use client";

import { useEffect, useState } from "react";
import { Headset } from "lucide-react";

export function ChatWidget() {
  const [visible, setVisible] = useState(false);
  const [carePhone, setCarePhone] = useState("918074399963");

  useEffect(() => {
    const updateVisibility = () => {
      const distanceToBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      setVisible(window.scrollY >= 190 && distanceToBottom > 120);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    void fetch("/api/promotion-popup")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.contact?.carePhone || data?.contact?.adminPhone) {
          const num = data.contact.carePhone || data.contact.adminPhone;
          const digits = num.replace(/\D/g, "");
          setCarePhone(digits.length === 10 ? `91${digits}` : digits);
        }
      })
      .catch(() => undefined);

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <div className="chat-widget">
      <a
        className="chat-launcher"
        href={`https://wa.me/${carePhone}?text=Hello%20NILAY%2C%20I%20need%20help.`}
        aria-label="Message NILAY customer care on WhatsApp"
        title="Message customer care on WhatsApp"
        target="_blank"
        rel="noreferrer"
      >
        <span className="call-launcher-icon"><Headset size={22} /></span>
      </a>
    </div>
  );
}
