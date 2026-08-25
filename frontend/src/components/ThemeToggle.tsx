import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = getTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-secondary ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}