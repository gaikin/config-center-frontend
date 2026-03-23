import { describe, expect, it } from "vitest";
import { antdComponentTokens, designTokens } from "./tokens";

describe("designTokens light style pilot", () => {
  it("uses enterprise workspace gray with white business panels", () => {
    expect(designTokens.color.topRegionBg).toBe("#ffffff");
    expect(designTokens.color.topRegionBgEnd).toBe("#ffffff");
    expect(designTokens.color.background).toBe("#f5f7fb");
    expect(designTokens.color.backgroundAccent).toBe("#eef2f7");
    expect(designTokens.color.surfaceMuted).toBe("#f5f7fa");
    expect(designTokens.color.border).toBe("#e2e8f0");
  });

  it("uses admin-style icon colors with neutral base and blue highlight", () => {
    expect(designTokens.color.primary).toBe("#1677ff");
    expect(designTokens.color.primaryHover).toBe("#4096ff");
    expect(antdComponentTokens.Menu.itemColor).toBe("#4c566a");
    expect(antdComponentTokens.Menu.itemSelectedColor).toBe("#1677ff");
  });

  it("uses a high-contrast warning tone on light surfaces", () => {
    expect(designTokens.color.warning).toBe("#d46b08");
  });
});
