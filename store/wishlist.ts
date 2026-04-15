import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  items: number[];
}

interface WishlistActions {
  toggle: (productId: number) => void;
  has: (productId: number) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState & WishlistActions>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (productId) =>
        set((state) => ({
          items: state.items.includes(productId)
            ? state.items.filter((id) => id !== productId)
            : [...state.items, productId],
        })),

      has: (productId) => get().items.includes(productId),

      clear: () => set({ items: [] }),
    }),
    { name: "2x2-wishlist" },
  ),
);
