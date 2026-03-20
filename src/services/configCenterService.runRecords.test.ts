import { describe, expect, it } from "vitest";
import { configCenterService } from "./configCenterService";

describe("configCenterService run records", () => {
  it("returns prompt hit records without hit result column", async () => {
    const rows = await configCenterService.listPromptHitRecords({});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("ruleName");
    expect(rows[0]).toHaveProperty("promptContentSummary");
    expect(rows[0]).not.toHaveProperty("hitResult");
  });

  it("filters job execution records by keyword, result, page, and org", async () => {
    const rows = await configCenterService.listJobExecutionRecords({
      keyword: "开户",
      result: "FAILED",
      pageResourceId: 1003,
      orgId: "branch-south"
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.result === "FAILED")).toBe(true);
    expect(rows.every((row) => row.pageResourceId === 1003)).toBe(true);
    expect(rows.every((row) => row.orgId === "branch-south")).toBe(true);
  });
});
