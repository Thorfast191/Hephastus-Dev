import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

function placeholders(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function lookup(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], source);
}

describe("message catalogues", () => {
  it("define exactly the same keys in every language", () => {
    expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort());
  });

  it("use the same {placeholders} in every language", () => {
    for (const path of keyPaths(en)) {
      const english = lookup(en, path);
      const french = lookup(fr, path);
      if (typeof english === "string" && typeof french === "string") {
        expect(placeholders(french), path).toEqual(placeholders(english));
      }
    }
  });

  it("leave nothing blank", () => {
    for (const path of keyPaths(fr)) {
      expect(String(lookup(fr, path)).trim(), path).not.toBe("");
    }
  });
});
