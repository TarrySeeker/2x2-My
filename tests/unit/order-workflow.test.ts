import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/types/database";

// Mirror of VALID_TRANSITIONS from features/admin/api/orders.ts
// (server-only file — cannot import directly in tests)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["completed", "returned"],
  completed: [],
  cancelled: [],
  returned: [],
};

const ALL_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "returned",
];

function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

describe("Order workflow transitions", () => {
  // ── Happy-path forward flow ──
  it("allows new → confirmed", () => {
    expect(isTransitionAllowed("new", "confirmed")).toBe(true);
  });

  it("allows confirmed → in_production", () => {
    expect(isTransitionAllowed("confirmed", "in_production")).toBe(true);
  });

  it("allows in_production → ready", () => {
    expect(isTransitionAllowed("in_production", "ready")).toBe(true);
  });

  it("allows ready → shipped", () => {
    expect(isTransitionAllowed("ready", "shipped")).toBe(true);
  });

  it("allows shipped → delivered", () => {
    expect(isTransitionAllowed("shipped", "delivered")).toBe(true);
  });

  it("allows delivered → completed", () => {
    expect(isTransitionAllowed("delivered", "completed")).toBe(true);
  });

  // ── Cancellations (early stages) ──
  it("allows cancellation from new", () => {
    expect(isTransitionAllowed("new", "cancelled")).toBe(true);
  });

  it("allows cancellation from confirmed", () => {
    expect(isTransitionAllowed("confirmed", "cancelled")).toBe(true);
  });

  it("allows cancellation from in_production", () => {
    expect(isTransitionAllowed("in_production", "cancelled")).toBe(true);
  });

  it("allows cancellation from ready", () => {
    expect(isTransitionAllowed("ready", "cancelled")).toBe(true);
  });

  it("does NOT allow cancellation from shipped", () => {
    expect(isTransitionAllowed("shipped", "cancelled")).toBe(false);
  });

  it("does NOT allow cancellation from delivered", () => {
    expect(isTransitionAllowed("delivered", "cancelled")).toBe(false);
  });

  // ── Returns ──
  it("allows return from shipped", () => {
    expect(isTransitionAllowed("shipped", "returned")).toBe(true);
  });

  it("allows return from delivered", () => {
    expect(isTransitionAllowed("delivered", "returned")).toBe(true);
  });

  it("does NOT allow return from new", () => {
    expect(isTransitionAllowed("new", "returned")).toBe(false);
  });

  // ── Terminal states ──
  it("does NOT allow any transition from completed", () => {
    for (const status of ALL_STATUSES) {
      expect(isTransitionAllowed("completed", status)).toBe(false);
    }
  });

  it("does NOT allow any transition from cancelled", () => {
    for (const status of ALL_STATUSES) {
      expect(isTransitionAllowed("cancelled", status)).toBe(false);
    }
  });

  it("does NOT allow any transition from returned", () => {
    for (const status of ALL_STATUSES) {
      expect(isTransitionAllowed("returned", status)).toBe(false);
    }
  });

  // ── Backward transitions ──
  it("does NOT allow backward transition confirmed → new", () => {
    expect(isTransitionAllowed("confirmed", "new")).toBe(false);
  });

  it("does NOT allow skipping steps new → shipped", () => {
    expect(isTransitionAllowed("new", "shipped")).toBe(false);
  });

  it("does NOT allow skipping steps new → delivered", () => {
    expect(isTransitionAllowed("new", "delivered")).toBe(false);
  });

  // ── Self-transition ──
  it("does NOT allow self-transition for any status", () => {
    for (const status of ALL_STATUSES) {
      expect(isTransitionAllowed(status, status)).toBe(false);
    }
  });

  // ── Structural checks ──
  it("covers all 9 statuses in VALID_TRANSITIONS", () => {
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(9);
    for (const status of ALL_STATUSES) {
      expect(VALID_TRANSITIONS).toHaveProperty(status);
    }
  });
});
