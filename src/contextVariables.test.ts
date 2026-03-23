import { describe, expect, it } from "vitest";
import type { ContextVariableDefinition } from "./types";
import { evaluateContextVariableValue } from "./contextVariables";

function buildBase(partial: Partial<ContextVariableDefinition>): ContextVariableDefinition {
  return {
    id: 1,
    key: "ctx_test",
    label: "测试变量",
    valueSource: "STATIC",
    status: "ACTIVE",
    ownerOrgId: "head-office",
    updatedAt: "2026-03-20T00:00:00.000Z",
    ...partial
  };
}

describe("evaluateContextVariableValue", () => {
  it("returns static value for STATIC source", () => {
    const value = evaluateContextVariableValue(
      buildBase({
        valueSource: "STATIC",
        staticValue: "branch-east"
      }),
      { org_id: "branch-south" }
    );
    expect(value).toBe("branch-east");
  });

  it("executes script with context and returns result", () => {
    const value = evaluateContextVariableValue(
      buildBase({
        valueSource: "SCRIPT",
        scriptContent: "return (context.org_id || '') + '-manager';"
      }),
      { org_id: "branch-east" }
    );
    expect(value).toBe("branch-east-manager");
  });

  it("supports expression script without explicit return", () => {
    const value = evaluateContextVariableValue(
      buildBase({
        valueSource: "SCRIPT",
        scriptContent: "context.channel === '柜面' ? 'counter' : 'online'"
      }),
      { channel: "柜面" }
    );
    expect(value).toBe("counter");
  });

  it("returns empty string when script throws", () => {
    const value = evaluateContextVariableValue(
      buildBase({
        valueSource: "SCRIPT",
        scriptContent: "throw new Error('boom')"
      }),
      {}
    );
    expect(value).toBe("");
  });
});
