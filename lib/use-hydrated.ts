import { useSyncExternalStore } from "react";

const noop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(noop, getTrue, getFalse);
}
