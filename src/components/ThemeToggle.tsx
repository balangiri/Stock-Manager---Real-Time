"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

// Subscribe to class changes on <html> so the toggle re-renders when theme changes
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// Server-side snapshot — always "light" (the inline script handles initial dark class)
function getThemeServerSnapshot(): Theme {
  return "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
      className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        color: "var(--foreground)",
      }}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-yellow-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
}
