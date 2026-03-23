import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedDataProcessors } from "../mock/seeds";
import { configCenterService } from "./configCenterService";
import { workflowService } from "./workflowService";

describe("workflowService data processor execution", () => {
  let dataProcessors = structuredClone(seedDataProcessors);
  let ruleGroups: Array<{ id: number; ruleId: number; logicType: "AND" | "OR"; parentGroupId?: number; updatedAt: string }> = [];
  let ruleConditions: Array<{
    id: number;
    ruleId: number;
    groupId: number;
    left: Record<string, unknown>;
    operator: string;
    right?: Record<string, unknown>;
    updatedAt: string;
  }> = [];

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  beforeEach(() => {
    dataProcessors = structuredClone(seedDataProcessors);
    ruleGroups = [];
    ruleConditions = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.endsWith("/api/control/data-processors") && method === "GET") {
          return jsonResponse(dataProcessors);
        }
        if (url.endsWith("/api/control/data-processors") && method === "POST") {
          const payload = JSON.parse(String(init?.body ?? "{}")) as {
            id?: number;
            name: string;
            paramCount: number;
            functionCode: string;
            status: string;
          };
          const next = {
            id: payload.id ?? (dataProcessors.length === 0 ? 1 : Math.max(...dataProcessors.map((item) => item.id)) + 1),
            name: payload.name,
            paramCount: payload.paramCount,
            functionCode: payload.functionCode,
            status: payload.status as "ACTIVE" | "DRAFT" | "DISABLED" | "EXPIRED",
            usedByCount: 0,
            updatedAt: new Date().toISOString()
          };
          dataProcessors = dataProcessors.some((item) => item.id === next.id)
            ? dataProcessors.map((item) => (item.id === next.id ? next : item))
            : [next, ...dataProcessors];
          return jsonResponse(next);
        }
        if (url.includes("/api/control/rules/") && url.endsWith("/condition-groups") && method === "POST") {
          const ruleId = Number(url.split("/").slice(-2, -1)[0]);
          const payload = JSON.parse(String(init?.body ?? "{}")) as { logicType: "AND" | "OR"; parentGroupId?: number };
          const next = {
            id: ruleGroups.length === 0 ? 1 : Math.max(...ruleGroups.map((item) => item.id)) + 1,
            ruleId,
            logicType: payload.logicType,
            parentGroupId: payload.parentGroupId,
            updatedAt: new Date().toISOString()
          };
          ruleGroups = [next, ...ruleGroups];
          return jsonResponse(next);
        }
        if (url.endsWith("/api/control/rule-conditions") && method === "POST") {
          const payload = JSON.parse(String(init?.body ?? "{}")) as {
            id?: number;
            ruleId: number;
            groupId: number;
            left: Record<string, unknown>;
            operator: string;
            right?: Record<string, unknown>;
          };
          const next = {
            id: payload.id ?? (ruleConditions.length === 0 ? 1 : Math.max(...ruleConditions.map((item) => item.id)) + 1),
            ruleId: payload.ruleId,
            groupId: payload.groupId,
            left: payload.left,
            operator: payload.operator,
            right: payload.right,
            updatedAt: new Date().toISOString()
          };
          ruleConditions = ruleConditions.some((item) => item.id === next.id)
            ? ruleConditions.map((item) => (item.id === next.id ? next : item))
            : [next, ...ruleConditions];
          return jsonResponse(next);
        }
        if (url.includes("/api/control/rules/") && url.endsWith("/condition-groups") && method === "GET") {
          const ruleId = Number(url.split("/").slice(-2, -1)[0]);
          return jsonResponse(ruleGroups.filter((item) => item.ruleId === ruleId));
        }
        if (url.includes("/api/control/rules/") && url.endsWith("/conditions") && method === "GET") {
          const ruleId = Number(url.split("/").slice(-2, -1)[0]);
          return jsonResponse(ruleConditions.filter((item) => item.ruleId === ruleId));
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      })
    );
  });

  it("applies configured data processor args in rule preview", async () => {
    const processorId = Date.now() + 10;
    await configCenterService.upsertDataProcessor({
      id: processorId,
      name: "拼接后缀",
      paramCount: 2,
      functionCode: "function transform(input, suffix) { return String(input ?? '') + String(suffix ?? ''); }",
      status: "ACTIVE"
    });

    const ruleId = Date.now() + 11;
    const group = await workflowService.createRuleConditionGroup(ruleId, "AND");
    await workflowService.upsertRuleCondition({
      id: Date.now() + 12,
      ruleId,
      groupId: group.id,
      operator: "EQ",
      left: {
        sourceType: "CONST",
        key: "A",
        constValue: "A",
        dataProcessorIds: [processorId],
        dataProcessorConfigs: [
          {
            dataProcessorId: processorId,
            args: ["-X"]
          }
        ]
      },
      right: {
        sourceType: "CONST",
        key: "A-X",
        constValue: "A-X",
        dataProcessorIds: [],
        dataProcessorConfigs: []
      }
    });

    const preview = await workflowService.previewRuleWithInput(ruleId, {
      pageFields: {},
      interfaceFields: {},
      context: {}
    });

    expect(preview.matched).toBe(true);
  });
});
