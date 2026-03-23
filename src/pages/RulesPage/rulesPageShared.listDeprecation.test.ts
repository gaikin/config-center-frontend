import { describe, expect, it } from "vitest";
import { sourceOptions } from "./rulesPageShared";

describe("rulesPageShared list deprecation", () => {
  it("does not expose list operand source in source options", () => {
    const hasListSource = sourceOptions.some((item) => item.value === "LIST_LOOKUP_FIELD");
    expect(hasListSource).toBe(false);
  });
});
