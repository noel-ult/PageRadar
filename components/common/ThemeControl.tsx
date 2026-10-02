"use client";
import { useEffect, useSyncExternalStore } from "react";
type Theme = "light" | "dark" | "system";
const KEY = "pageradar-theme-v1";
let sessionPreference: Theme | null = null;
function read(): Theme {
  if (sessionPreference) return sessionPreference;
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
function apply() {
  const mode = read();
  document.documentElement.dataset.theme =
    mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
}
function subscribe(callback: () => void) {
  window.addEventListener("pageradar-theme", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("pageradar-theme", callback);
    window.removeEventListener("storage", callback);
  };
}
export function ThemeLifecycle() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);
  return null;
}
export function ThemeControl() {
  const value = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <label className="theme-control">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={value}
        onChange={(event) => {
          const choice = event.target.value as Theme;
          try {
            localStorage.setItem(KEY, choice);
            sessionPreference = null;
          } catch {
            sessionPreference = choice;
          }
          document.documentElement.dataset.theme =
            choice === "system"
              ? matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light"
              : choice;
          window.dispatchEvent(new Event("pageradar-theme"));
        }}
      >
        <option value="system">System theme</option>
        <option value="light">Light theme</option>
        <option value="dark">Dark theme</option>
      </select>
    </label>
  );
}
