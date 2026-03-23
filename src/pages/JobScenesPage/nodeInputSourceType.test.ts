import { describe, expect, it } from "vitest";
import type { JobNodeDefinition } from "../../types";
import { buildFormValuesFromNode, buildNodeConfigFromForm } from "./jobScenesPageShared";

function buildPageSetNode(configJson: string): JobNodeDefinition {
  return {
    id: 2001,
    sceneId: 9,
    nodeType: "page_set",
    name: "页面写值1",
    orderNo: 4,
    enabled: true,
    configJson,
    updatedAt: "2026-03-19T00:00:00.000Z"
  };
}

function buildPageClickNode(configJson: string): JobNodeDefinition {
  return {
    id: 2101,
    sceneId: 9,
    nodeType: "page_click",
    name: "页面点击1",
    orderNo: 4,
    enabled: true,
    configJson,
    updatedAt: "2026-03-19T00:00:00.000Z"
  };
}

function buildSendHotkeyNode(configJson: string): JobNodeDefinition {
  return {
    id: 2201,
    sceneId: 9,
    nodeType: "send_hotkey",
    name: "发送热键1",
    orderNo: 5,
    enabled: true,
    configJson,
    updatedAt: "2026-03-19T00:00:00.000Z"
  };
}

function buildApiCallNode(configJson: string): JobNodeDefinition {
  return {
    id: 3001,
    sceneId: 9,
    nodeType: "api_call",
    name: "接口调用1",
    orderNo: 3,
    enabled: true,
    configJson,
    updatedAt: "2026-03-19T00:00:00.000Z"
  };
}

function buildScriptNode(configJson: string): JobNodeDefinition {
  return {
    id: 4001,
    sceneId: 9,
    nodeType: "js_script",
    name: "脚本处理1",
    orderNo: 5,
    enabled: true,
    configJson,
    updatedAt: "2026-03-19T00:00:00.000Z"
  };
}

describe("page set value type", () => {
  it("infers REFERENCE valueType from legacy template value", () => {
    const values = buildFormValuesFromNode(buildPageSetNode("{\"target\":\"risk_score\",\"value\":\"{{node_2_api_result}}\"}"));

    expect(values.valueType).toBe("REFERENCE");
    expect(values.value).toBe("{{node_2_api_result}}");
  });

  it("keeps valueType in saved config", () => {
    const config = buildNodeConfigFromForm({
      name: "页面写值1",
      nodeType: "page_set",
      enabled: true,
      target: "risk_score",
      valueType: "STRING",
      value: "A+"
    });

    expect(config.valueType).toBe("STRING");
    expect(config.value).toBe("A+");
  });
});

describe("page click config", () => {
  it("restores click target from node config", () => {
    const values = buildFormValuesFromNode(buildPageClickNode("{\"target\":\"submit_button\"}"));

    expect(values.target).toBe("submit_button");
  });

  it("keeps click target in saved config", () => {
    const config = buildNodeConfigFromForm({
      name: "页面点击1",
      nodeType: "page_click",
      enabled: true,
      target: "submit_button"
    });

    expect(config).toEqual({
      target: "submit_button"
    });
  });
});

describe("send hotkey config", () => {
  it("restores hotkey fields from node config", () => {
    const values = buildFormValuesFromNode(buildSendHotkeyNode("{\"keys\":[\"CTRL\",\"SHIFT\",\"A\"],\"keyCodes\":[17,16,65]}"));

    expect(values.hotkeyModifiers).toEqual(["CTRL", "SHIFT"]);
    expect(values.hotkeyKey).toBe("A");
  });

  it("maps hotkey fields to keys and keyCodes in saved config", () => {
    const config = buildNodeConfigFromForm({
      name: "发送热键1",
      nodeType: "send_hotkey",
      enabled: true,
      hotkeyModifiers: ["CTRL", "SHIFT"],
      hotkeyKey: "a"
    });

    expect(config).toEqual({
      keys: ["CTRL", "SHIFT", "A"],
      keyCodes: [17, 16, 65]
    });
  });
});

describe("api call schema v2", () => {
  it("resets legacy config and marks node for refactor", () => {
    const values = buildFormValuesFromNode(buildApiCallNode("{\"interfaceId\":3001,\"forceFail\":false}"));

    expect(values.apiRefactorRequired).toBe(true);
    expect(values.apiInterfaceId).toBeUndefined();
    expect(values.apiOutputPaths).toEqual([]);
    expect(values.apiInputBindings).toEqual({});
  });

  it("keeps schema v2 config in saved output", () => {
    const config = buildNodeConfigFromForm({
      name: "接口调用1",
      nodeType: "api_call",
      enabled: true,
      apiInterfaceId: 3001,
      apiInputBindings: {
        customerId: { sourceType: "STRING", value: "C001" },
        scoreRef: { sourceType: "REFERENCE", value: "{{node_1_customer_id}}" }
      },
      apiOutputPaths: ["$.data.score", "$.data.riskLevel"]
    });

    expect(config).toEqual({
      schemaVersion: 2,
      interfaceId: 3001,
      inputBindings: {
        customerId: { sourceType: "STRING", value: "C001" },
        scoreRef: { sourceType: "REFERENCE", value: "{{node_1_customer_id}}" }
      },
      outputPaths: ["$.data.score", "$.data.riskLevel"]
    });
  });
});

describe("script node schema v2", () => {
  it("keeps script code, inputs and output keys in saved config", () => {
    const config = buildNodeConfigFromForm({
      name: "脚本处理1",
      nodeType: "js_script",
      enabled: true,
      scriptCode: "return { score: 98, level: 'HIGH' };",
      scriptInputs: [
        { name: "customerId", sourceType: "STRING", value: "C001" },
        { name: "riskRef", sourceType: "REFERENCE", value: "{{node_2_risk_score}}" }
      ],
      scriptOutputKeys: ["score", "level"]
    });

    expect(config).toEqual({
      schemaVersion: 2,
      scriptId: "script",
      scriptCode: "return { score: 98, level: 'HIGH' };",
      inputBindings: {
        customerId: { sourceType: "STRING", value: "C001" },
        riskRef: { sourceType: "REFERENCE", value: "{{node_2_risk_score}}" }
      },
      outputKeys: ["score", "level"]
    });
  });

  it("restores script schema v2 form values", () => {
    const values = buildFormValuesFromNode(
      buildScriptNode("{\"schemaVersion\":2,\"scriptId\":\"risk_transform\",\"scriptCode\":\"return { score: 90 };\",\"inputBindings\":{\"riskRef\":{\"sourceType\":\"REFERENCE\",\"value\":\"{{node_2_risk_score}}\"}},\"outputKeys\":[\"score\"]}")
    );

    expect(values.scriptCode).toContain("return { score: 90");
    expect(values.scriptInputs).toEqual([{ name: "riskRef", sourceType: "REFERENCE", value: "{{node_2_risk_score}}" }]);
    expect(values.scriptOutputKeys).toEqual(["score"]);
  });
});
