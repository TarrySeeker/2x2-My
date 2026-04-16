import { describe, expect, it } from "vitest";
import { generateCode, CODE_CHARS } from "@/features/admin/utils/promo-code-generator";

describe("generateCode", () => {
  it("generates code of default length 8", () => {
    const code = generateCode();
    expect(code).toHaveLength(8);
  });

  it("generates code of custom length", () => {
    const code = generateCode(12);
    expect(code).toHaveLength(12);
  });

  it("generates code of length 1", () => {
    const code = generateCode(1);
    expect(code).toHaveLength(1);
  });

  it("contains only allowed characters", () => {
    // Run multiple times to reduce flakiness
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      for (const char of code) {
        expect(CODE_CHARS).toContain(char);
      }
    }
  });

  it("does not contain ambiguous characters (0, O, 1, I)", () => {
    const ambiguous = ["0", "O", "1", "I"];
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      for (const char of ambiguous) {
        expect(code).not.toContain(char);
      }
    }
  });

  it("generates different codes on consecutive calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(generateCode());
    }
    // With 30^8 possibilities, 20 codes should all be unique
    expect(codes.size).toBe(20);
  });

  it("CODE_CHARS has no duplicates", () => {
    const unique = new Set(CODE_CHARS.split(""));
    expect(unique.size).toBe(CODE_CHARS.length);
  });
});
