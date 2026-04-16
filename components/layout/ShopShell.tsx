"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Conditionally renders shop chrome (Header, Footer, CartDrawer, etc.)
 * only on non-admin pages. Admin pages have their own layout with sidebar.
 */
export default function ShopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null;

  return <>{children}</>;
}
