import { describe, expect, it } from "vitest";
import { derivePreviewBeforeExecute, isApiOutputSelectionRequired, resolvePersistedExecutionMode } from "./jobScenesPageShared";

describe("job scene execution policy", () => {
  it("keeps silent auto mode when preview is off", () => {
    expect(resolvePersistedExecutionMode("AUTO_WITHOUT_PROMPT", false)).toBe("AUTO_WITHOUT_PROMPT");
  });

  it("maps floating mode to floating execution", () => {
    expect(resolvePersistedExecutionMode("FLOATING_BUTTON", false)).toBe("FLOATING_BUTTON");
  });

  it("keeps silent mode after edit-save roundtrip when trigger settings are unchanged", () => {
    const persistedExecutionMode = "AUTO_WITHOUT_PROMPT";
    const previewBeforeExecute = derivePreviewBeforeExecute({
      executionMode: persistedExecutionMode,
      previewBeforeExecute: undefined
    });

    expect(previewBeforeExecute).toBe(false);
    expect(resolvePersistedExecutionMode(persistedExecutionMode, previewBeforeExecute)).toBe("AUTO_WITHOUT_PROMPT");
  });
});

describe("api output selection policy", () => {
  it("does not require output selection when interface has no outputs", () => {
    expect(isApiOutputSelectionRequired(0)).toBe(false);
  });

  it("requires output selection when interface exposes outputs", () => {
    expect(isApiOutputSelectionRequired(2)).toBe(true);
  });
});
