import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, type CartItemData } from "@/store/cart";

const ITEM_A: Omit<CartItemData, "quantity"> = {
  productId: 101,
  variantId: undefined,
  name: "Визитки 90×50",
  slug: "vizitki-90x50",
  price: 1700,
  imageUrl: "/img/vizitki.webp",
  maxStock: 50,
};

const ITEM_B: Omit<CartItemData, "quantity"> = {
  productId: 201,
  variantId: 5,
  name: "Баннер уличный",
  slug: "banner-street",
  price: 3200,
  imageUrl: "/img/banner.webp",
  maxStock: 10,
};

function state() {
  return useCartStore.getState();
}

beforeEach(() => {
  useCartStore.setState({
    items: [],
    isOpen: false,
    promoCode: null,
    promoDiscount: 0,
  });
});

describe("addItem", () => {
  it("adds a new item with quantity 1 and opens the drawer", () => {
    state().addItem(ITEM_A);
    expect(state().items).toHaveLength(1);
    expect(state().items[0].quantity).toBe(1);
    expect(state().items[0].productId).toBe(101);
    expect(state().isOpen).toBe(true);
  });

  it("increments quantity when adding an existing item", () => {
    state().addItem(ITEM_A);
    state().addItem(ITEM_A);
    expect(state().items).toHaveLength(1);
    expect(state().items[0].quantity).toBe(2);
  });

  it("does not exceed maxStock on duplicate adds", () => {
    const limited = { ...ITEM_A, maxStock: 2 };
    state().addItem(limited);
    state().addItem(limited);
    state().addItem(limited);
    expect(state().items[0].quantity).toBe(2);
  });

  it("distinguishes items by variantId", () => {
    state().addItem(ITEM_A);
    state().addItem(ITEM_B);
    expect(state().items).toHaveLength(2);
  });
});

describe("removeItem", () => {
  it("removes an item by productId/variantId", () => {
    state().addItem(ITEM_A);
    state().addItem(ITEM_B);
    state().removeItem(ITEM_A.productId, ITEM_A.variantId);
    expect(state().items).toHaveLength(1);
    expect(state().items[0].productId).toBe(201);
  });

  it("does nothing if item not found", () => {
    state().addItem(ITEM_A);
    state().removeItem(999);
    expect(state().items).toHaveLength(1);
  });
});

describe("updateQuantity", () => {
  it("sets new quantity for an item", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, 5);
    expect(state().items[0].quantity).toBe(5);
  });

  it("removes the item when quantity is 0", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, 0);
    expect(state().items).toHaveLength(0);
  });

  it("removes the item when quantity is negative", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, -1);
    expect(state().items).toHaveLength(0);
  });

  it("caps quantity at maxStock", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, 999);
    expect(state().items[0].quantity).toBe(ITEM_A.maxStock);
  });
});

describe("clearCart", () => {
  it("removes all items and resets promo", () => {
    state().addItem(ITEM_A);
    state().addItem(ITEM_B);
    state().setPromo("2X2", 500);
    state().clearCart();
    expect(state().items).toHaveLength(0);
    expect(state().promoCode).toBeNull();
    expect(state().promoDiscount).toBe(0);
  });
});

describe("setPromo", () => {
  it("sets promo code and discount", () => {
    state().setPromo("2X2", 500);
    expect(state().promoCode).toBe("2X2");
    expect(state().promoDiscount).toBe(500);
  });

  it("resets promo when called with null", () => {
    state().setPromo("2X2", 500);
    state().setPromo(null, 0);
    expect(state().promoCode).toBeNull();
    expect(state().promoDiscount).toBe(0);
  });
});

describe("setOpen", () => {
  it("sets isOpen to true", () => {
    state().setOpen(true);
    expect(state().isOpen).toBe(true);
  });

  it("sets isOpen to false", () => {
    state().setOpen(true);
    state().setOpen(false);
    expect(state().isOpen).toBe(false);
  });
});

describe("getSubtotal", () => {
  it("returns 0 for an empty cart", () => {
    expect(state().getSubtotal()).toBe(0);
  });

  it("returns sum of price * quantity for all items", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, 3);
    state().addItem(ITEM_B);
    // 1700*3 + 3200*1 = 8300
    expect(state().getSubtotal()).toBe(8300);
  });
});

describe("getTotal", () => {
  it("returns subtotal minus promoDiscount", () => {
    state().addItem(ITEM_A);
    state().setPromo("2X2", 500);
    // 1700 - 500 = 1200
    expect(state().getTotal()).toBe(1200);
  });

  it("never goes below 0 when discount exceeds subtotal", () => {
    state().addItem(ITEM_A);
    state().setPromo("BIG", 99999);
    expect(state().getTotal()).toBe(0);
  });

  it("equals subtotal when no promo applied", () => {
    state().addItem(ITEM_A);
    expect(state().getTotal()).toBe(state().getSubtotal());
  });
});

describe("getItemsCount", () => {
  it("returns 0 for an empty cart", () => {
    expect(state().getItemsCount()).toBe(0);
  });

  it("returns total quantity across all items", () => {
    state().addItem(ITEM_A);
    state().updateQuantity(ITEM_A.productId, ITEM_A.variantId, 3);
    state().addItem(ITEM_B);
    state().updateQuantity(ITEM_B.productId, ITEM_B.variantId, 2);
    // 3 + 2 = 5
    expect(state().getItemsCount()).toBe(5);
  });
});
