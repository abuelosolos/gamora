"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * The server reads the cookie and renders data-theme on <html> (see the root
 * layout), so the first paint is already in the right theme. This provider only
 * handles changes: it updates the attribute, the cookie, and React state.
 */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    if (!isTheme(next)) return;
    document.documentElement.dataset.theme = next;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`;
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

