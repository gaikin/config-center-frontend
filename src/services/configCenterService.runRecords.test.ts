import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configCenterService } from "./configCenterService";

type BackendEnvelope<T> = {
  returnCode: string;
  errorMsg: string;
  body: T;
};

const promptRecords = [
  {
    id: 93001,
    ruleId: 300,
    ruleName: "Large Amount Prompt",
    pageResourceId: 100,
    pageResourceName: "Loan Apply Page",
    orgId: "org.demo",
    orgName: "演示机构",
    promptMode: "FLOATING",
    promptContentSummary: "检测到客户风险等级较高，请确认是否继续办理。",
    sceneId: 9001,
    sceneName: "贷款申请自动查数预填",
    triggerAt: "2026-03-22T10:00:00",
    triggerResult: "HIT",
    reason: "风险评分 >= 80"
  },
  {
    id: 93002,
    ruleId: 300,
    ruleName: "Large Amount Prompt",
    pageResourceId: 100,
    pageResourceName: "Loan Apply Page",
    orgId: "org.demo",
    orgName: "演示机构",
    promptMode: "FLOATING",
    promptContentSummary: "检测到客户风险等级较高，请确认是否继续办理。",
    sceneId: 9001,
    sceneName: "贷款申请自动查数预填",
    triggerAt: "2026-03-22T09:30:00",
    triggerResult: "MISS",
    reason: "未满足风险阈值"
  },
  {
    id: 93003,
    ruleId: 301,
    ruleName: "开户完整性提醒",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    orgId: "branch-south",
    orgName: "南分行",
    promptMode: "SILENT",
    promptContentSummary: "开户资料缺少必填项，请补充。",
    sceneId: 9001,
    sceneName: "贷款申请自动查数预填",
    triggerAt: "2026-03-22T09:00:00",
    triggerResult: "FAILED",
    reason: "页面元素缺失"
  }
];

const jobRecords = [
  {
    id: 91001,
    sceneId: 9001,
    sceneName: "脚本链路测试",
    pageResourceId: 100,
    pageResourceName: "Loan Apply Page",
    orgId: "org.demo",
    orgName: "演示机构",
    triggerSource: "MANUAL_RETRY",
    result: "SUCCESS",
    failureReasonSummary: "全部节点执行成功",
    startedAt: "2026-03-22T11:00:00",
    finishedAt: "2026-03-22T11:01:00"
  },
  {
    id: 91002,
    sceneId: 9002,
    sceneName: "开户证件信息同步",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    orgId: "branch-south",
    orgName: "南分行",
    triggerSource: "AUTO",
    result: "FAILED",
    failureReasonSummary: "页面元素缺失",
    startedAt: "2026-03-22T11:10:00",
    finishedAt: "2026-03-22T11:12:00"
  }
];

function toEnvelope<T>(body: T): Response {
  const payload: BackendEnvelope<T> = {
    returnCode: "OK",
    errorMsg: "success",
    body
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/runtime/prompt-trigger-logs") {
        const keyword = url.searchParams.get("keyword") ?? "";
        const pageResourceId = url.searchParams.get("pageResourceId");
        const orgId = url.searchParams.get("orgId");
        const ruleId = url.searchParams.get("ruleId");
        const rows = promptRecords.filter((row) => {
          return (
            (!keyword || [row.ruleName, row.pageResourceName, row.promptContentSummary, row.sceneName, row.orgName, row.reason].some((value) => value.includes(keyword))) &&
            (!pageResourceId || String(row.pageResourceId) === pageResourceId) &&
            (!orgId || row.orgId === orgId) &&
            (!ruleId || String(row.ruleId) === ruleId)
          );
        });
        return toEnvelope(rows);
      }

      if (url.pathname === "/api/runtime/job-execution-records") {
        const keyword = url.searchParams.get("keyword") ?? "";
        const result = url.searchParams.get("result") ?? "";
        const pageResourceId = url.searchParams.get("pageResourceId");
        const orgId = url.searchParams.get("orgId");
        const sceneId = url.searchParams.get("sceneId");
        const sceneName = url.searchParams.get("sceneName") ?? "";
        const rows = jobRecords.filter((row) => {
          return (
            (!keyword || [row.sceneName, row.pageResourceName, row.failureReasonSummary, row.orgName].some((value) => value.includes(keyword))) &&
            (!result || row.result === result) &&
            (!pageResourceId || String(row.pageResourceId) === pageResourceId) &&
            (!orgId || row.orgId === orgId) &&
            (!sceneId || String(row.sceneId) === sceneId) &&
            (!sceneName || row.sceneName.includes(sceneName))
          );
        });
        return toEnvelope(rows);
      }

      return new Response("not found", { status: 404 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("configCenterService run records", () => {
  it("returns prompt trigger logs without hit result column", async () => {
    const rows = await configCenterService.listPromptHitRecords({});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("ruleName");
    expect(rows[0]).toHaveProperty("promptContentSummary");
    expect(rows[0]).not.toHaveProperty("hitResult");
  });

  it("filters job execution records by keyword, result, page, and org", async () => {
    const rows = await configCenterService.listJobExecutionRecords({
      keyword: "开户",
      result: "FAILED",
      pageResourceId: 1003,
      orgId: "branch-south"
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.result === "FAILED")).toBe(true);
    expect(rows.every((row) => row.pageResourceId === 1003)).toBe(true);
    expect(rows.every((row) => row.orgId === "branch-south")).toBe(true);
  });
});
