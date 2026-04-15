"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

interface SupabaseContextValue {
  supabase: Supabase;
  session: Session | null;
}

const SupabaseContext = React.createContext<SupabaseContextValue | undefined>(
  undefined,
);

/**
 * SupabaseProvider — браузерный клиент Supabase + актуальная сессия.
 * Оборачивает всё приложение ниже ThemeProvider. На Этапе 1 Supabase может
 * быть не сконфигурирован — тогда клиент всё равно создаётся, просто запросы
 * будут падать (это ожидаемо). Data-fetchers в lib/data/* ловят такие ошибки
 * через trySupabase() и возвращают demo-данные (D-013).
 */
export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = React.useState<Supabase>(() => createClient());
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = React.useMemo<SupabaseContextValue>(
    () => ({ supabase, session }),
    [supabase, session],
  );

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseContextValue {
  const ctx = React.useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used inside <SupabaseProvider>");
  }
  return ctx;
}
