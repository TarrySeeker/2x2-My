import { describe, expect, it } from "vitest";
import {
  reviewReplySchema,
  bulkApproveSchema,
  reviewIdSchema,
  reviewFilterSchema,
} from "@/features/admin/schemas/review";

describe("reviewReplySchema", () => {
  it("accepts valid reply", () => {
    const result = reviewReplySchema.safeParse({ id: 1, reply: "Спасибо за отзыв!" });
    expect(result.success).toBe(true);
  });

  it("rejects empty reply", () => {
    const result = reviewReplySchema.safeParse({ id: 1, reply: "" });
    expect(result.success).toBe(false);
  });

  it("rejects reply > 2000 chars", () => {
    const result = reviewReplySchema.safeParse({
      id: 1,
      reply: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts reply of exactly 2000 chars", () => {
    const result = reviewReplySchema.safeParse({
      id: 1,
      reply: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("accepts reply of exactly 1 char", () => {
    const result = reviewReplySchema.safeParse({
      id: 1,
      reply: "a",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive id", () => {
    const result = reviewReplySchema.safeParse({ id: 0, reply: "text" });
    expect(result.success).toBe(false);
  });

  it("rejects negative id", () => {
    const result = reviewReplySchema.safeParse({ id: -5, reply: "text" });
    expect(result.success).toBe(false);
  });
});

describe("bulkApproveSchema", () => {
  it("accepts valid ids array", () => {
    const result = bulkApproveSchema.safeParse({ ids: [1, 2, 3] });
    expect(result.success).toBe(true);
  });

  it("rejects empty ids array", () => {
    const result = bulkApproveSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it("accepts single id", () => {
    const result = bulkApproveSchema.safeParse({ ids: [42] });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive ids", () => {
    const result = bulkApproveSchema.safeParse({ ids: [1, 0, 3] });
    expect(result.success).toBe(false);
  });

  it("rejects negative ids", () => {
    const result = bulkApproveSchema.safeParse({ ids: [-1] });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer ids", () => {
    const result = bulkApproveSchema.safeParse({ ids: [1.5] });
    expect(result.success).toBe(false);
  });
});

describe("reviewIdSchema", () => {
  it("accepts valid positive id", () => {
    const result = reviewIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects id = 0", () => {
    const result = reviewIdSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative id", () => {
    const result = reviewIdSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer id", () => {
    const result = reviewIdSchema.safeParse({ id: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("reviewFilterSchema", () => {
  it("provides defaults", () => {
    const result = reviewFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
    expect(result.status).toBeUndefined();
  });

  it("accepts valid status values", () => {
    for (const status of ["pending", "approved", "rejected"]) {
      const result = reviewFilterSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = reviewFilterSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });

  it("rejects per_page > 100", () => {
    const result = reviewFilterSchema.safeParse({ per_page: 200 });
    expect(result.success).toBe(false);
  });
});
