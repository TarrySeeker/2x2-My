import type { ReactNode } from "react";

export const metadata = {
  title: "Вход — Панель управления 2×2",
};

/**
 * Admin login has its own layout — no shop Header/Footer.
 * The root layout still provides ThemeProvider and SupabaseProvider.
 */
export default function AdminLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
