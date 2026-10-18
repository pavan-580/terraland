"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { translatePhrase, type SiteLanguage } from "@/lib/translations";

const languages: { code: SiteLanguage; name: string }[] = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "te", name: "తెలుగు" },
];
const preferenceKey = "terraland-language";
const supportedCodes = new Set<string>(languages.map(({ code }) => code));
const ignoredTextElements = "script, style, noscript, textarea, input, [translate='no'], .language-picker";
const ignoredAttributeElements = "script, style, noscript, [translate='no'], .language-picker";
const originalText = new WeakMap<Text, OriginalValue>();
const originalAttributes = new WeakMap<Element, Map<string, OriginalValue>>();

type OriginalValue = { source: string; translated: string };

function isSiteLanguage(language: string): language is SiteLanguage {
  return supportedCodes.has(language);
}

function subscribeLanguage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("terraland:language-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("terraland:language-change", onStoreChange);
  };
}

function getLanguageSnapshot(): SiteLanguage {
  try {
    const saved = window.localStorage.getItem(preferenceKey);
    if (saved && isSiteLanguage(saved)) return saved;
  } catch {
    // ignore
  }
  return "en";
}

function getServerSnapshot(): SiteLanguage {
  return "en";
}

function translatePage(language: SiteLanguage) {
  function translateText(node: Text) {
    const parent = node.parentElement;
    if (!parent || parent.closest(ignoredTextElements)) return;
    const previous = originalText.get(node);
    const current = node.nodeValue ?? "";
    const source = previous && current === previous.translated ? previous.source : current;
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    const text = source.slice(leading.length, source.length - trailing.length);
    const translated = `${leading}${translatePhrase(text, language)}${trailing}`;
    if (translated !== current) node.nodeValue = translated;
    originalText.set(node, { source, translated });
  }

  function translateAttributes(element: Element) {
    if (element.closest(ignoredAttributeElements)) return;
    const saved = originalAttributes.get(element) ?? new Map<string, OriginalValue>();
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const current = element.getAttribute(attribute);
      if (current === null) continue;
      const previous = saved.get(attribute);
      const source = previous && current === previous.translated ? previous.source : current;
      const translated = translatePhrase(source, language);
      if (translated !== current) element.setAttribute(attribute, translated);
      saved.set(attribute, { source, translated });
    }
    originalAttributes.set(element, saved);
  }

  function translateTree(root: Node) {
    if (root instanceof Text) {
      translateText(root);
      return;
    }
    if (!(root instanceof Element) && root !== document.body) return;
    if (root instanceof Element) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node instanceof Text) translateText(node);
    }
    if (root instanceof Element) {
      root.querySelectorAll("*").forEach(translateAttributes);
    }
  }

  translateTree(document.body);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData" && record.target instanceof Text) {
        translateText(record.target);
      } else {
        record.addedNodes.forEach(translateTree);
        if (record.target instanceof Element) translateAttributes(record.target);
      }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  return () => observer.disconnect();
}

export function LanguagePicker({ variant = "dropdown" }: { variant?: "dropdown" | "drawer" } = {}) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerSnapshot);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en-IN" : language;
    return translatePage(language);
  }, [language]);

  function chooseLanguage(nextLanguage: string) {
    if (!isSiteLanguage(nextLanguage)) return;
    setError("");
    try {
      window.localStorage.setItem(preferenceKey, nextLanguage);
      window.dispatchEvent(new Event("terraland:language-change"));
    } catch {
      setError("Could not save your language preference in this browser.");
    }
  }

  if (variant === "drawer") {
    return (
      <div className="language-drawer-segmented" role="group" aria-label="Choose page language">
        {languages.map((item) => (
          <button
            key={item.code}
            type="button"
            className={`language-drawer-btn ${item.code === language ? "is-selected" : ""}`}
            aria-pressed={item.code === language}
            onClick={() => chooseLanguage(item.code)}
          >
            {item.name}
          </button>
        ))}
      </div>
    );
  }

  return <>
    <div className={`language-picker${open ? " is-open" : ""}`}>
      <button className="language-picker-trigger" type="button" aria-label="Choose page language" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{languages.find((item) => item.code === language)?.name ?? "English"}</span><ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && <div className="language-picker-options" role="listbox" aria-label="Page language">
        {languages.map((item) => <button key={item.code} className={item.code === language ? "is-selected" : ""} type="button" role="option" aria-selected={item.code === language} onClick={() => { chooseLanguage(item.code); setOpen(false); }}>{item.name}</button>)}
      </div>}
    </div>
    {error && <span className="translation-error" role="status">{error}</span>}
  </>;
}
