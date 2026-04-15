"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * ThemeProvider — next-themes с class-based переключением.
 * Этап 1: витрина всегда светлая (forcedTheme="light") — Yna не содержит
 * тёмной темы. Тёмная активируется только в админке в Этапе 6+.
 * См. DECISIONS.md D-059.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="2x2-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
