import { create } from "zustand";

export interface QuickLeadProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
}

export interface QuoteRequestProduct {
  id: number;
  name: string;
  slug: string;
  categoryId?: number | null;
  prefillParams?: Record<string, unknown>;
}

interface UIState {
  mobileFiltersOpen: boolean;
  searchOpen: boolean;
  oneClickModalOpen: boolean;
  oneClickProduct: QuickLeadProduct | null;
  calcRequestModalOpen: boolean;
  calcRequestProduct: QuoteRequestProduct | null;
}

interface UIActions {
  setMobileFilters: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  openOneClick: (product: QuickLeadProduct) => void;
  closeOneClick: () => void;
  openQuote: (product: QuoteRequestProduct) => void;
  closeQuote: () => void;
  /** @deprecated используй openQuote */
  openCalcRequest: (product: QuoteRequestProduct) => void;
  /** @deprecated используй closeQuote */
  closeCalcRequest: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  mobileFiltersOpen: false,
  searchOpen: false,
  oneClickModalOpen: false,
  oneClickProduct: null,
  calcRequestModalOpen: false,
  calcRequestProduct: null,

  setMobileFilters: (open) => set({ mobileFiltersOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),

  openOneClick: (product) =>
    set({ oneClickModalOpen: true, oneClickProduct: product }),
  closeOneClick: () =>
    set({ oneClickModalOpen: false, oneClickProduct: null }),

  openQuote: (product) =>
    set({ calcRequestModalOpen: true, calcRequestProduct: product }),
  closeQuote: () =>
    set({ calcRequestModalOpen: false, calcRequestProduct: null }),

  openCalcRequest: (product) =>
    set({ calcRequestModalOpen: true, calcRequestProduct: product }),
  closeCalcRequest: () =>
    set({ calcRequestModalOpen: false, calcRequestProduct: null }),

  closeAll: () =>
    set({
      mobileFiltersOpen: false,
      searchOpen: false,
      oneClickModalOpen: false,
      oneClickProduct: null,
      calcRequestModalOpen: false,
      calcRequestProduct: null,
    }),
}));
