import { describe, expect, it } from "vitest";
import { nodeLibrary } from "./jobScenesPageShared";

describe("jobScenesPageShared list deprecation", () => {
  it("does not expose list lookup node in node library", () => {
    const hasListLookupNode = nodeLibrary.some((item) => item.nodeType === "list_lookup");
    expect(hasListLookupNode).toBe(false);
  });
});
