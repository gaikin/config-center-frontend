import { describe, expect, it } from "vitest";
import { getInterfaceEditorLayoutConfig } from "./InterfacesPage";

describe("InterfacesPage layout", () => {
  it("uses a single-page split layout without step navigation", () => {
    expect(getInterfaceEditorLayoutConfig()).toEqual({
      hasStepWizard: false,
      leftSections: ["接口基础信息"],
      rightSections: ["参数示例"]
    });
  });
});
