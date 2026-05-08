import { describe, it, expect } from "vitest";
import {
  buildOrganization,
  buildLocalBusiness,
  buildWebSite,
  type OrgSocials,
} from "@/lib/seo/json-ld";

describe("buildOrganization sameAs", () => {
  it("does NOT include sameAs key when socials are empty", () => {
    const org = buildOrganization(undefined, {});
    expect("sameAs" in org).toBe(false);
  });

  it("does NOT include sameAs when socials are all empty/whitespace", () => {
    const socials: OrgSocials = { vk: "", telegram: "  ", whatsapp: null };
    const org = buildOrganization(undefined, socials);
    expect("sameAs" in org).toBe(false);
  });

  it("does NOT include sameAs when socials param is null/undefined", () => {
    const org1 = buildOrganization(undefined, null);
    const org2 = buildOrganization(undefined, undefined);
    expect("sameAs" in org1).toBe(false);
    expect("sameAs" in org2).toBe(false);
  });

  it("includes only valid https URLs in sameAs", () => {
    const socials: OrgSocials = {
      vk: "https://vk.com/real-page",
      telegram: "https://t.me/real-channel",
      whatsapp: "  https://wa.me/79324247740  ",
      dzen: "",
      max: "not-a-url",
    };
    const org = buildOrganization(undefined, socials);
    expect(org.sameAs).toEqual([
      "https://vk.com/real-page",
      "https://t.me/real-channel",
      "https://wa.me/79324247740",
    ]);
  });

  it("trims whitespace around URLs", () => {
    const socials: OrgSocials = { vk: "  https://vk.com/x  " };
    const org = buildOrganization(undefined, socials);
    expect(org.sameAs).toEqual(["https://vk.com/x"]);
  });
});

describe("buildLocalBusiness", () => {
  it("does NOT include paymentAccepted (онлайн-оплат у клиента нет)", () => {
    const lb = buildLocalBusiness();
    expect("paymentAccepted" in lb).toBe(false);
    expect("currenciesAccepted" in lb).toBe(false);
  });

  it("includes priceRange (из BUSINESS.priceRange)", () => {
    const lb = buildLocalBusiness();
    expect(lb.priceRange).toBeDefined();
  });
});

describe("buildWebSite", () => {
  it("references organization @id", () => {
    const ws = buildWebSite();
    expect(ws.publisher).toMatchObject({ "@id": expect.stringMatching(/#organization$/) });
  });
});
