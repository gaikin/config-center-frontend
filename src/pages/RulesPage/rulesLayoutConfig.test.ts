import { describe, expect, it } from "vitest";
import { rulesLayoutConfig } from "./rulesLayoutConfig";

describe("rules layout config", () => {
  it("hides API value type column in condition panel", () => {
    expect(rulesLayoutConfig.apiInputTable.showValueTypeColumn).toBe(false);
  });

  it("enables horizontal scroll to avoid overflow in narrow side panel", () => {
    expect(rulesLayoutConfig.apiInputTable.scrollX).toBeGreaterThanOrEqual(520);
  });
});
