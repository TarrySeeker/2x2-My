import { describe, it, expect } from "vitest";
import { SITE, CONTACTS, ADDRESS, absoluteUrl } from "@/lib/seo/site";

describe("SITE constants", () => {
  it("has non-empty brand name and slogan", () => {
    expect(SITE.name.length).toBeGreaterThan(0);
    expect(SITE.shortName).toBe("2х2");
    expect(SITE.slogan).toContain("2х2");
  });

  it("description mentions Ханты-Мансийск and core services", () => {
    expect(SITE.description).toContain("Ханты-Мансийск");
    expect(SITE.description.toLowerCase()).toMatch(/полиграфия|наружная|вывески/);
  });

  it("has og-image and themeColor", () => {
    expect(SITE.ogImage).toMatch(/\.(jpg|png|webp)$/);
    expect(SITE.themeColor).toBe("#FF6600");
  });

  it("keywords target local search", () => {
    const joined = SITE.keywords.join(" ");
    expect(joined).toMatch(/ханты-мансийск/i);
    expect(joined).toMatch(/хмао/i);
  });
});

describe("CONTACTS", () => {
  it("phonePrimaryTel is a valid tel-format (no spaces, starts with +)", () => {
    expect(CONTACTS.phonePrimaryTel).toMatch(/^\+\d{11}$/);
    expect(CONTACTS.phoneSecondaryTel).toMatch(/^\+\d{11}$/);
  });

  it("email has @ and a domain", () => {
    expect(CONTACTS.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("social links point to real hosts", () => {
    expect(CONTACTS.telegram).toMatch(/^https:\/\/t\.me\//);
    expect(CONTACTS.whatsapp).toMatch(/^https:\/\/wa\.me\//);
    expect(CONTACTS.vk).toMatch(/^https:\/\/vk\.com\//);
  });
});

describe("ADDRESS", () => {
  it("is in Ханты-Мансийск / ХМАО", () => {
    expect(ADDRESS.addressLocality).toBe("Ханты-Мансийск");
    expect(ADDRESS.addressRegion).toContain("ХМАО");
    expect(ADDRESS.addressCountry).toBe("RU");
  });
});

describe("absoluteUrl", () => {
  it("passes absolute URLs through unchanged", () => {
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("prefixes SITE.url for relative paths with leading slash", () => {
    expect(absoluteUrl("/portfolio")).toBe(`${SITE.url}/portfolio`);
  });

  it("prefixes SITE.url for relative paths WITHOUT leading slash", () => {
    expect(absoluteUrl("portfolio")).toBe(`${SITE.url}/portfolio`);
  });

  it("defaults to root when called without args", () => {
    expect(absoluteUrl()).toBe(`${SITE.url}/`);
  });
});
