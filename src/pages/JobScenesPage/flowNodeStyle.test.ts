import { describe, expect, it } from "vitest";
import { getFlowNodeStyle } from "./jobScenesPageShared";

describe("getFlowNodeStyle", () => {
  it("marks invalid node as red regardless of enabled status", () => {
    const style = getFlowNodeStyle(true, true);

    expect(style.border).toBe("1px solid #ff4d4f");
    expect(style.background).toBe("#fff2f0");
  });

  it("uses normal enabled style when node has no issue", () => {
    const style = getFlowNodeStyle(true, false);

    expect(style.border).toBe("1px solid #91caff");
    expect(style.background).toBe("#f0f5ff");
  });
});
