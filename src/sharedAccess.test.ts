import { describe, expect, it } from "vitest";
import { canAccessSharedObject, canEditSharedObject } from "./sharedAccess";

describe("sharedAccess", () => {
  it("allows shared object to be visible but not editable for target org viewers", () => {
    const target = {
      ownerOrgId: "branch-east",
      shareMode: "SHARED" as const,
      sharedOrgIds: ["branch-south"]
    };

    const viewer = { orgScopeId: "branch-south", roleType: "CONFIG_OPERATOR" as const };

    expect(canAccessSharedObject(target, viewer)).toBe(true);
    expect(canEditSharedObject(target, viewer)).toBe(false);
  });
});
