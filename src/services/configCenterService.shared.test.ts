import { describe, expect, it } from "vitest";
import { configCenterService } from "./configCenterService";

describe("configCenterService shared prompt/job", () => {
  it("filters shared rules by viewer org scope", async () => {
    const rows = await configCenterService.listRules({ viewerOrgId: "branch-south" });
    expect(rows.some((row) => row.shareMode === "SHARED")).toBe(true);
    expect(rows.every((row) => row.ownerOrgId === "branch-south" || row.sharedOrgIds?.includes("branch-south"))).toBe(
      true
    );
  });

  it("filters shared job scenes by viewer org scope", async () => {
    const rows = await configCenterService.listJobScenes({ viewerOrgId: "branch-south" });
    expect(rows.some((row) => row.shareMode === "SHARED")).toBe(true);
    expect(rows.every((row) => row.ownerOrgId === "branch-south" || row.sharedOrgIds?.includes("branch-south"))).toBe(
      true
    );
  });

  it("clones shared job scene into viewer org as private copy", async () => {
    const created = await configCenterService.cloneJobSceneToOrg(5001, "branch-south", "person-zhao-yi");
    expect(created.ownerOrgId).toBe("branch-south");
    expect(created.shareMode).toBe("PRIVATE");
    expect(created.sourceSceneId).toBe(5001);
  });
});
