import { describe, expect, it } from "vitest";
import { configCenterService } from "./configCenterService";

describe("configCenterService menu capability opening", () => {
  it("enables requested capabilities directly instead of entering pending", async () => {
    const updated = await configCenterService.submitMenuCapabilityRequest({
      menuId: 102,
      capabilityTypes: ["PROMPT"],
      reason: "需要启用提示能力"
    });

    expect(updated.promptStatus).toBe("ENABLED");
    expect(updated.promptStatus).not.toBe("PENDING");
  });

  it("can disable an enabled capability directly", async () => {
    const updated = await configCenterService.submitMenuCapabilityRequest({
      menuId: 101,
      capabilityTypes: ["PROMPT"],
      reason: "停用提示能力",
      action: "DISABLE"
    });

    expect(updated.promptStatus).toBe("DISABLED");
    expect(updated.status).toBe("DRAFT");
  });
});
