import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type InsertRow<T extends keyof Tables> = Tables[T]["Insert"];
export type UpdateRow<T extends keyof Tables> = Tables[T]["Update"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
