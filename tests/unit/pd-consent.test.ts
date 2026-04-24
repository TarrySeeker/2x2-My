/**
 * Unit-тесты для `lib/forms/pd-consent.ts`:
 *   - PD_CONSENT_VERSION константа
 *   - pdConsentField (z.literal(true))
 *   - clientIpForInet (нормализация IPv4/IPv6)
 *   - readIdempotencyKey (валидация формата)
 *   - makeConsentMeta
 */
import { describe, expect, it } from "vitest";
import {
  PD_CONSENT_VERSION,
  pdConsentField,
  clientIpForInet,
  readIdempotencyKey,
  makeConsentMeta,
} from "@/lib/forms/pd-consent";

describe("PD_CONSENT_VERSION", () => {
  it("совпадает с current_version в seed_cms (метка YYYY-MM-DD)", () => {
    expect(PD_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("pdConsentField", () => {
  it("принимает только true", () => {
    expect(pdConsentField.safeParse(true).success).toBe(true);
    expect(pdConsentField.safeParse(false).success).toBe(false);
    expect(pdConsentField.safeParse("true").success).toBe(false);
    expect(pdConsentField.safeParse(1).success).toBe(false);
    expect(pdConsentField.safeParse(undefined).success).toBe(false);
    expect(pdConsentField.safeParse(null).success).toBe(false);
  });

  it("на ошибку возвращает осмысленное сообщение", () => {
    const r = pdConsentField.safeParse(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toMatch(/согласие/i);
    }
  });
});

describe("clientIpForInet", () => {
  it("возвращает первый IP из x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
    expect(clientIpForInet(h)).toBe("10.0.0.1");
  });

  it("использует x-real-ip если нет x-forwarded-for", () => {
    const h = new Headers({ "x-real-ip": "10.0.0.5" });
    expect(clientIpForInet(h)).toBe("10.0.0.5");
  });

  it("вырезает порт у IPv4", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4:65000" });
    expect(clientIpForInet(h)).toBe("1.2.3.4");
  });

  it("вырезает скобки у IPv6", () => {
    const h = new Headers({ "x-forwarded-for": "[::1]:8080" });
    expect(clientIpForInet(h)).toBe("::1");
  });

  it("возвращает null если нет заголовков", () => {
    expect(clientIpForInet(new Headers())).toBeNull();
  });

  it("возвращает null для 'unknown'", () => {
    expect(
      clientIpForInet(new Headers({ "x-forwarded-for": "unknown" })),
    ).toBeNull();
  });
});

describe("readIdempotencyKey", () => {
  it("принимает UUID v4", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      readIdempotencyKey(new Headers({ "idempotency-key": uuid })),
    ).toBe(uuid);
  });

  it("принимает x-idempotency-key (альтернатива)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      readIdempotencyKey(new Headers({ "x-idempotency-key": uuid })),
    ).toBe(uuid);
  });

  it("отбрасывает слишком короткие (<8) и слишком длинные (>200)", () => {
    expect(readIdempotencyKey(new Headers({ "idempotency-key": "short" }))).toBeNull();
    expect(
      readIdempotencyKey(
        new Headers({ "idempotency-key": "x".repeat(201) }),
      ),
    ).toBeNull();
  });

  it("отбрасывает unsafe-символы", () => {
    expect(
      readIdempotencyKey(new Headers({ "idempotency-key": "abcdefgh<script>" })),
    ).toBeNull();
    expect(
      readIdempotencyKey(new Headers({ "idempotency-key": "abcdefgh; DROP" })),
    ).toBeNull();
  });

  it("возвращает null если заголовка нет", () => {
    expect(readIdempotencyKey(new Headers())).toBeNull();
  });
});

describe("makeConsentMeta", () => {
  it("складывает версию + IP + Date", () => {
    const meta = makeConsentMeta("10.0.0.1");
    expect(meta.pd_consent_version).toBe(PD_CONSENT_VERSION);
    expect(meta.pd_consent_ip).toBe("10.0.0.1");
    expect(meta.pd_consent_at).toBeInstanceOf(Date);
  });

  it("принимает null IP", () => {
    const meta = makeConsentMeta(null);
    expect(meta.pd_consent_ip).toBeNull();
  });
});
