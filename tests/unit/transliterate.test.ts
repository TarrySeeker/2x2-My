import { describe, expect, it } from "vitest";
import { transliterate } from "@/lib/transliterate";

describe("transliterate", () => {
  it("converts basic cyrillic to latin", () => {
    expect(transliterate("Световые буквы")).toBe("svetovye-bukvy");
  });

  it("converts all cyrillic characters", () => {
    expect(transliterate("абвгдеёжзийклмнопрстуфхцчшщъыьэюя")).toBe(
      "abvgdeyozhziyklmnoprstufkhtschshshchyeyuya",
    );
  });

  it("handles mixed cyrillic and latin", () => {
    expect(transliterate("LED вывеска")).toBe("led-vyveska");
  });

  it("lowercases and replaces spaces with hyphens", () => {
    expect(transliterate("Наружная Реклама")).toBe("naruzhnaya-reklama");
  });

  it("removes special characters", () => {
    expect(transliterate("Визитки (1000 шт.)")).toBe("vizitki-1000-sht");
  });

  it("trims leading/trailing hyphens", () => {
    expect(transliterate("  Баннер  ")).toBe("banner");
  });

  it("collapses multiple consecutive hyphens", () => {
    expect(transliterate("Входная---группа")).toBe("vkhodnaya-gruppa");
  });

  it("handles empty string", () => {
    expect(transliterate("")).toBe("");
  });

  it("handles pure latin input", () => {
    expect(transliterate("hello world")).toBe("hello-world");
  });

  it("handles numbers correctly", () => {
    expect(transliterate("2х2 реклама")).toBe("2kh2-reklama");
  });

  it("handles ё correctly", () => {
    expect(transliterate("ёлка")).toBe("yolka");
  });

  it("handles щ correctly", () => {
    expect(transliterate("площадь")).toBe("ploshchad");
  });
});
