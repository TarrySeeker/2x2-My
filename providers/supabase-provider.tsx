"use client";

import * as React from "react";

/**
 * STUB SupabaseProvider (TODO LUCIA — цепочка 2).
 *
 * После миграции с Supabase на чистый PostgreSQL клиентский провайдер
 * больше не нужен — вся работа с БД переместилась в Server Actions / API.
 * Файл оставлен как no-op обёртка для обратной совместимости с
 * `app/layout.tsx` и `app/admin/login/layout.tsx`, которые его используют.
 *
 * `useSupabase()` оставлен как заглушка возвращающая null-сессию.
 */

interface StubContextValue {
  supabase: null;
  session: null;
}

const STUB_VALUE: StubContextValue = { supabase: null, session: null };

const SupabaseContext = React.createContext<StubContextValue>(STUB_VALUE);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseContext.Provider value={STUB_VALUE}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): StubContextValue {
  return React.useContext(SupabaseContext);
}
