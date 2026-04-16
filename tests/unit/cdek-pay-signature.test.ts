import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

function generateSignature(
  params: Record<string, string | number>,
  secretKey: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const values = sortedKeys.map((k) => String(params[k]));
  const str = values.join("") + secretKey;
  return createHash("sha256").update(str, "utf8").digest("hex");
}

function verifySignature(
  params: Record<string, string | number>,
  secretKey: string,
  signature: string,
): boolean {
  const expected = generateSignature(params, secretKey);
  return expected === signature;
}

describe("CDEK Pay signature", () => {
  const testParams = {
    shop_login: "test-shop",
    order_number: "ORD-001",
    amount: 5000,
    email: "test@example.com",
  };
  const testSecret = "my-secret-key-123";

  it("generates a deterministic SHA256 signature", () => {
    const sig1 = generateSignature(testParams, testSecret);
    const sig2 = generateSignature(testParams, testSecret);
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates correct signature for known input", () => {
    const sortedKeys = Object.keys(testParams).sort();
    const values = sortedKeys.map((k) => String(testParams[k as keyof typeof testParams]));
    const raw = values.join("") + testSecret;
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");

    const result = generateSignature(testParams, testSecret);
    expect(result).toBe(expected);
  });

  it("sorts params alphabetically before concatenation", () => {
    const paramsA = { z_field: "z", a_field: "a" };
    const paramsB = { a_field: "a", z_field: "z" };
    expect(generateSignature(paramsA, "key")).toBe(
      generateSignature(paramsB, "key"),
    );
  });

  it("verifies a valid signature", () => {
    const sig = generateSignature(testParams, testSecret);
    expect(verifySignature(testParams, testSecret, sig)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifySignature(testParams, testSecret, "invalid-hash")).toBe(false);
  });

  it("handles empty secret key", () => {
    const sig = generateSignature(testParams, "");
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different signature when secret differs", () => {
    const sig1 = generateSignature(testParams, "secret-a");
    const sig2 = generateSignature(testParams, "secret-b");
    expect(sig1).not.toBe(sig2);
  });
});
