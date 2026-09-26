import { describe, expect, it } from "vitest";
import { asLocalized, hasTranslation, localize, localizeOptional } from "./localized";

describe("localize", () => {
  it("returns the requested language", () => {
    expect(localize({ en: "Hello", fr: "Bonjour" }, "fr")).toBe("Bonjour");
  });

  it("falls back to English when the translation is missing or blank", () => {
    expect(localize({ en: "Hello" }, "fr")).toBe("Hello");
    expect(localize({ en: "Hello", fr: "   " }, "fr")).toBe("Hello");
  });

  it("tolerates legacy plain strings and garbage", () => {
    expect(localize("Hello", "fr")).toBe("Hello");
    expect(localize(null, "en")).toBe("");
    expect(localize([1, 2], "en")).toBe("");
  });
});

describe("localizeOptional", () => {
  it("keeps absent values null so callers can apply their own defaults", () => {
    expect(localizeOptional(null, "en")).toBeNull();
    expect(localizeOptional({ en: "" }, "fr")).toBeNull();
    expect(localizeOptional({ en: "Hi" }, "fr")).toBe("Hi");
  });
});

describe("asLocalized / hasTranslation", () => {
  it("drops unknown languages and blank translations", () => {
    expect(asLocalized({ en: "A", fr: "", de: "B" })).toEqual({ en: "A" });
  });

  it("reports whether a real translation exists", () => {
    expect(hasTranslation({ en: "A", fr: "B" }, "fr")).toBe(true);
    expect(hasTranslation({ en: "A", fr: " " }, "fr")).toBe(false);
  });
});
