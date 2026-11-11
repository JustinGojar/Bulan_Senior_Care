import { readLocalValue, writeLocalValue } from "./browser-storage.ts";

export const THEME_KEY = "bulan-theme";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return readLocalValue(THEME_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  writeLocalValue(THEME_KEY, theme);
}
