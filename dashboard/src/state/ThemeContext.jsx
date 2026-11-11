import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
// Only written when the person presses the theme switch. (The old key "vision-theme" was saved automatically from the computer's mode, so it is ignored.)
const STORAGE_KEY = "vision-theme-choice";

function getInitialTheme() {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  if (stored === "light" || stored === "dark") return stored;
  // The UI is designed for light mode: that is the default even when the computer is in dark mode.
  // Dark is used only when the person picked it with the theme switch (stored above).
  return "light";
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* storage blocked: the choice just lasts for this visit */ }
    return next;
  });

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
