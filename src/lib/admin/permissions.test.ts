import { describe, expect, it } from "vitest";
import {
  canAccessRegion,
  canEditContent,
  contentLockReason,
  isSuperAdmin,
  lockedRegion,
  type Viewer,
} from "./permissions";

const superAdmin: Viewer = { role: "SUPER_ADMIN", region: null };
const bdAdmin: Viewer = { role: "REGION_ADMIN", region: "BD" };
const euAdmin: Viewer = { role: "REGION_ADMIN", region: "EU" };

describe("super admin", () => {
  it("is unrestricted", () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(lockedRegion(superAdmin)).toBeNull();
    expect(canAccessRegion(superAdmin, "EU")).toBe(true);
    expect(canAccessRegion(superAdmin, "BD")).toBe(true);
    expect(canEditContent(superAdmin, ["EU", "BD"])).toBe(true);
    expect(canEditContent(superAdmin, [])).toBe(true);
  });
});

describe("region admin", () => {
  it("is locked to their own region", () => {
    expect(isSuperAdmin(bdAdmin)).toBe(false);
    expect(lockedRegion(bdAdmin)).toBe("BD");
    expect(canAccessRegion(bdAdmin, "BD")).toBe(true);
    expect(canAccessRegion(bdAdmin, "EU")).toBe(false);
  });

  it("edits only content shown on their site alone", () => {
    expect(canEditContent(bdAdmin, ["BD"])).toBe(true);
    expect(canEditContent(bdAdmin, ["EU"])).toBe(false);
    expect(canEditContent(bdAdmin, ["EU", "BD"])).toBe(false);
    expect(canEditContent(euAdmin, ["BD", "EU"])).toBe(false);
    expect(canEditContent(bdAdmin, [])).toBe(false);
  });

  it("explains why an item is locked", () => {
    expect(contentLockReason(bdAdmin, ["BD"])).toBeNull();
    expect(contentLockReason(bdAdmin, ["EU", "BD"])).toMatch(/shared/i);
    expect(contentLockReason(bdAdmin, ["EU"])).toMatch(/other site/i);
  });

  it("is never unrestricted even if the region is somehow missing", () => {
    const broken: Viewer = { role: "REGION_ADMIN", region: null };
    expect(canAccessRegion(broken, "EU")).toBe(false);
    expect(canEditContent(broken, ["EU"])).toBe(false);
  });
});
