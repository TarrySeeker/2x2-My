import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItemData {
  productId: number;
  variantId?: number;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  quantity: number;
  imageUrl: string;
  sku?: string;
  attributes?: Record<string, string>;
  maxStock: number;
}

interface CartState {
  items: CartItemData[];
  isOpen: boolean;
  promoCode: string | null;
  promoDiscount: number;
}

interface CartActions {
  addItem: (item: Omit<CartItemData, "quantity">) => void;
  removeItem: (productId: number, variantId?: number) => void;
  updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void;
  clearCart: () => void;
  setOpen: (open: boolean) => void;
  setPromo: (code: string | null, discount: number) => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getItemsCount: () => number;
}

const matchItem = (a: CartItemData, productId: number, variantId?: number) =>
  a.productId === productId && a.variantId === variantId;

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,
      promoDiscount: 0,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) =>
            matchItem(i, item.productId, item.variantId),
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                matchItem(i, item.productId, item.variantId)
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
                  : i,
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
            isOpen: true,
          };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !matchItem(i, productId, variantId)),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !matchItem(i, productId, variantId))
              : state.items.map((i) =>
                  matchItem(i, productId, variantId)
                    ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                    : i,
                ),
        })),

      clearCart: () => set({ items: [], promoCode: null, promoDiscount: 0 }),

      setOpen: (open) => set({ isOpen: open }),

      setPromo: (code, discount) =>
        set({ promoCode: code, promoDiscount: discount }),

      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - get().promoDiscount);
      },

      getItemsCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "2x2-cart",
      partialize: (state) => ({
        items: state.items,
        promoCode: state.promoCode,
        promoDiscount: state.promoDiscount,
      }),
    },
  ),
);
