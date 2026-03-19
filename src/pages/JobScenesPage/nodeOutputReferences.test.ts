import { describe, expect, it } from "vitest";
import type { JobNodeDefinition } from "../../types";
import { deriveNodeOutputReferenceOptions } from "./jobScenesPageShared";

function nodeOf(partial: Partial<JobNodeDefinition> & Pick<JobNodeDefinition, "id" | "sceneId" | "nodeType" | "name" | "orderNo">): JobNodeDefinition {
  return {
    enabled: true,
    configJson: "{}",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...partial
  };
}

describe("deriveNodeOutputReferenceOptions", () => {
  it("builds template reference options from upstream nodes only", () => {
    const rows: JobNodeDefinition[] = [
      nodeOf({ id: 1, sceneId: 10, nodeType: "page_get", name: "页面取值", orderNo: 1, configJson: "{\"field\":\"customer_id\"}" }),
      nodeOf({
        id: 2,
        sceneId: 10,
        nodeType: "api_call",
        name: "接口调用",
        orderNo: 2,
        configJson: "{\"schemaVersion\":2,\"interfaceId\":3001,\"inputBindings\":{},\"outputPaths\":[\"$.data.score\"]}"
      }),
      nodeOf({ id: 3, sceneId: 10, nodeType: "page_set", name: "页面写值", orderNo: 3 })
    ];

    const options = deriveNodeOutputReferenceOptions(rows, 3);

    expect(options.map((item) => item.value)).toContain("{{node_1_customer_id}}");
    expect(options.map((item) => item.value)).toContain("{{node_2_score}}");
    expect(options.map((item) => item.value)).not.toContain("{{node_2_api_result}}");
    expect(options.map((item) => item.value)).not.toContain("{{node_3_result}}");
  });

  it("includes list lookup output when it is upstream by graph edge even if order is later", () => {
    const rows: JobNodeDefinition[] = [
      nodeOf({ id: 1, sceneId: 10, nodeType: "page_get", name: "页面取值", orderNo: 1, configJson: "{\"field\":\"customer_id\"}" }),
      nodeOf({ id: 2, sceneId: 10, nodeType: "page_set", name: "页面写值", orderNo: 2 }),
      nodeOf({
        id: 4,
        sceneId: 10,
        nodeType: "list_lookup",
        name: "名单检索",
        orderNo: 4,
        configJson: "{\"listDataId\":1,\"matchColumn\":\"customer_id\",\"inputSourceType\":\"REFERENCE\",\"inputSource\":\"{{node_1_customer_id}}\",\"resultKey\":\"risk_match\"}"
      })
    ];

    const options = deriveNodeOutputReferenceOptions(
      rows,
      2,
      [{ id: "e-4-2", source: "4", target: "2" } as never]
    );

    expect(options.map((item) => item.value)).toContain("{{node_4_risk_match}}");
  });

  it("exposes all configured list lookup output fields", () => {
    const rows: JobNodeDefinition[] = [
      nodeOf({
        id: 5,
        sceneId: 10,
        nodeType: "list_lookup",
        name: "名单检索",
        orderNo: 1,
        configJson: "{\"resultKeys\":[\"risk_level\",\"risk_score\"]}"
      }),
      nodeOf({ id: 6, sceneId: 10, nodeType: "page_set", name: "页面写值", orderNo: 2 })
    ];

    const options = deriveNodeOutputReferenceOptions(rows, 6, [{ id: "e-5-6", source: "5", target: "6" } as never]);
    const values = options.map((item) => item.value);

    expect(values).toContain("{{node_5_risk_level}}");
    expect(values).toContain("{{node_5_risk_score}}");
  });

  it("exposes script output keys for downstream references", () => {
    const rows: JobNodeDefinition[] = [
      nodeOf({
        id: 7,
        sceneId: 10,
        nodeType: "js_script",
        name: "脚本处理",
        orderNo: 1,
        configJson:
          "{\"schemaVersion\":2,\"scriptId\":\"risk_transform\",\"scriptCode\":\"return { score: 95 };\",\"inputBindings\":{},\"outputKeys\":[\"score\",\"level\"],\"script\":\"risk_transform\"}"
      }),
      nodeOf({ id: 8, sceneId: 10, nodeType: "page_set", name: "页面写值", orderNo: 2 })
    ];

    const options = deriveNodeOutputReferenceOptions(rows, 8, [{ id: "e-7-8", source: "7", target: "8" } as never]);
    const values = options.map((item) => item.value);

    expect(values).toContain("{{node_7_score}}");
    expect(values).toContain("{{node_7_level}}");
  });
});
