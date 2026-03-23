import { beforeEach, describe, expect, it, vi } from "vitest";
import { workflowService } from "./workflowService";

function nowSuffix() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

describe("workflowService script node execution", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let nodes: Array<{
    id: number;
    sceneId: number;
    nodeType: "page_get" | "api_call" | "list_lookup" | "js_script" | "page_set" | "page_click" | "send_hotkey";
    name: string;
    orderNo: number;
    enabled: boolean;
    configJson: string;
    updatedAt: string;
  }> = [];

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  beforeEach(() => {
    nodes = [];
    fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.includes("/api/control/job-scenes/") && url.endsWith("/nodes") && method === "POST") {
          const sceneId = Number(url.split("/").slice(-2, -1)[0]);
          const payload = JSON.parse(String(init?.body ?? "{}")) as {
            id?: number;
            nodeType: typeof nodes[number]["nodeType"];
            name: string;
            orderNo: number;
            enabled: boolean;
            configJson: string;
          };
          const next = {
            id: payload.id ?? (nodes.length === 0 ? 1 : Math.max(...nodes.map((item) => item.id)) + 1),
            sceneId,
            nodeType: payload.nodeType,
            name: payload.name,
            orderNo: payload.orderNo,
            enabled: payload.enabled,
            configJson: payload.configJson,
            updatedAt: new Date().toISOString()
          };
          nodes = nodes.some((item) => item.id === next.id)
            ? nodes.map((item) => (item.id === next.id ? next : item))
            : [next, ...nodes];
          return jsonResponse(next);
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      });
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("resolves script outputs and allows downstream page_set to reference them", async () => {
    const suffix = nowSuffix();
    const sceneId = 980000 + suffix;
    const baseNodeId = 780000 + suffix * 10;

    await workflowService.upsertJobNode({
      id: baseNodeId + 1,
      sceneId,
      nodeType: "page_get",
      name: "页面取值1",
      orderNo: 1,
      enabled: true,
      configJson: JSON.stringify({ field: "customer_id" })
    });
    await workflowService.upsertJobNode({
      id: baseNodeId + 2,
      sceneId,
      nodeType: "api_call",
      name: "接口调用1",
      orderNo: 2,
      enabled: true,
      configJson: JSON.stringify({
        schemaVersion: 2,
        interfaceId: 3001,
        inputBindings: {},
        outputPaths: ["$.data.score"]
      })
    });
    await workflowService.upsertJobNode({
      id: baseNodeId + 3,
      sceneId,
      nodeType: "js_script",
      name: "脚本处理1",
      orderNo: 3,
      enabled: true,
      configJson: JSON.stringify({
        schemaVersion: 2,
        scriptId: "risk_transform",
        scriptCode: "return { scoreTag: String(input.riskRef) + '_HIGH' };",
        inputBindings: {
          riskRef: { sourceType: "REFERENCE", value: `{{node_${baseNodeId + 2}_score}}` }
        },
        outputKeys: ["scoreTag"],
        script: "risk_transform"
      })
    });
    await workflowService.upsertJobNode({
      id: baseNodeId + 4,
      sceneId,
      nodeType: "page_set",
      name: "页面写值1",
      orderNo: 4,
      enabled: true,
      configJson: JSON.stringify({
        target: "risk_level",
        valueType: "REFERENCE",
        value: `{{node_${baseNodeId + 3}_scoretag}}`
      })
    });

    const execution = await workflowService.executeJobScene(sceneId, "脚本链路测试", "MANUAL_RETRY");
    expect(execution.result).toBe("SUCCESS");

    const logs = await workflowService.listJobNodeRunLogs(execution.id);
    const scriptLog = logs.find((item) => item.nodeId === baseNodeId + 3);
    const pageSetLog = logs.find((item) => item.nodeId === baseNodeId + 4);

    expect(scriptLog?.status).toBe("SUCCESS");
    expect(scriptLog?.detail).toContain("scoreTag");
    expect(pageSetLog?.status).toBe("SUCCESS");
    expect(pageSetLog?.detail).toContain("risk_level");
    expect(pageSetLog?.detail).toContain("86_HIGH");
  });

  it("executes send_hotkey node and logs keyCodes", async () => {
    const suffix = nowSuffix();
    const sceneId = 990000 + suffix;
    const nodeId = 880000 + suffix * 10;

    await workflowService.upsertJobNode({
      id: nodeId,
      sceneId,
      nodeType: "send_hotkey",
      name: "发送热键1",
      orderNo: 1,
      enabled: true,
      configJson: JSON.stringify({
        keys: ["CTRL", "SHIFT", "A"],
        keyCodes: [17, 16, 65]
      })
    });

    const execution = await workflowService.executeJobScene(sceneId, "热键链路测试", "MANUAL_RETRY");
    expect(execution.result).toBe("SUCCESS");

    const logs = await workflowService.listJobNodeRunLogs(execution.id);
    const hotkeyLog = logs.find((item) => item.nodeId === nodeId);

    expect(hotkeyLog?.status).toBe("SUCCESS");
    expect(hotkeyLog?.detail).toContain("发送热键");
    expect(hotkeyLog?.detail).toContain("CTRL+SHIFT+A");
    expect(hotkeyLog?.detail).toContain("17,16,65");
  });

  it("omits id in create payload when caller does not provide id", async () => {
    const sceneId = 991001;

    await workflowService.upsertJobNode({
      sceneId,
      nodeType: "page_get",
      name: "页面取值创建校验",
      orderNo: 1,
      enabled: true,
      configJson: JSON.stringify({ field: "customer_id" })
    });

    const createCall = fetchSpy.mock.calls.find(([input, init]) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();
      return url === `/api/control/job-scenes/${sceneId}/nodes` && method === "POST";
    });
    expect(createCall).toBeTruthy();
    const payload = JSON.parse(String(createCall?.[1]?.body ?? "{}")) as { id?: number };
    expect(payload.id).toBeUndefined();
  });
});
