"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function PropertyTypePicker({ options }: { options: string[] }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  return <div className={`property-type-picker${open ? " is-open" : ""}`}>
    <input type="hidden" name="type" value={value} />
    <button type="button" className="property-type-picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{value || "Any property type"}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="property-type-picker-options" role="listbox" aria-label="Property type">
      {[{ label: "Any property type", value: "" }, ...options.map((option) => ({ label: option, value: option }))].map((option) => <button key={option.value || "any"} type="button" role="option" aria-selected={value === option.value} className={value === option.value ? "is-selected" : ""} onClick={() => { setValue(option.value); setOpen(false); }}>{option.label}</button>)}
    </div>}
  </div>;
}
