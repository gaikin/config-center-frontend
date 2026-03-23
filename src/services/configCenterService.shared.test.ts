import { beforeEach, describe, expect, it, vi } from "vitest";
import { configCenterService } from "./configCenterService";
import { setBackendAuthContext } from "./backendApi";

let sharedSceneSeedId = 980000;
let sharedSceneStore: Array<Record<string, unknown>> = [];
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sharedSceneStore = [];
  setBackendAuthContext(null);
  fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method ?? "GET").toUpperCase();
    if (url.startsWith("/api/control/rules")) {
      return new Response(
        JSON.stringify({
          returnCode: "OK",
          errorMsg: "success",
          body: {
            total: 2,
            pageNo: 1,
            pageSize: 1000,
            records: [
              {
                id: 4001,
                name: "贷款高风险强提示",
                ruleScope: "SHARED",
                ruleSetCode: "loan_high_risk_prompt",
                pageResourceId: 1001,
                pageResourceName: "贷款申请主页面",
                shareMode: "SHARED",
                sharedOrgIds: ["branch-south"],
                priority: 950,
                promptMode: "FLOATING",
                closeMode: "MANUAL_CLOSE",
                promptContentConfigJson: "{}",
                hasConfirmButton: true,
                sceneId: 5001,
                sceneName: "贷款申请自动查数预填",
                effectiveStartAt: "2026-03-01 00:00",
                effectiveEndAt: "2026-12-31 23:59",
                status: "ACTIVE",
                currentVersion: 6,
                ownerOrgId: "branch-east",
                listLookupConditions: [],
                updatedAt: "2026-03-22T00:00:00"
              },
              {
                id: 4002,
                name: "开户信息完整性提醒",
                ruleScope: "PAGE_RESOURCE",
                ruleSetCode: "open_account_integrity_prompt",
                pageResourceId: 1003,
                pageResourceName: "开户办理主页面",
                shareMode: "PRIVATE",
                sharedOrgIds: [],
                priority: 700,
                promptMode: "SILENT",
                closeMode: "AUTO_CLOSE",
                promptContentConfigJson: "{}",
                hasConfirmButton: false,
                status: "DRAFT",
                currentVersion: 1,
                ownerOrgId: "branch-south",
                listLookupConditions: [],
                updatedAt: "2026-03-22T00:00:00"
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url === "/api/control/job-scenes" && method !== "POST") {
      return new Response(
        JSON.stringify({
          returnCode: "OK",
          errorMsg: "success",
          body: sharedSceneStore
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if ((url === "/api/control/job-scenes" || (url.startsWith("/api/control/job-scenes/") && !url.endsWith("/clone"))) && method === "POST") {
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const row = {
        id: body.id ?? ++sharedSceneSeedId,
        name: body.name,
        ownerOrgId: body.ownerOrgId ?? "branch-east",
        shareMode: body.shareMode ?? "PRIVATE",
        sharedOrgIds: body.sharedOrgIds ?? [],
        sharedBy: body.sharedBy ?? "person-zhao-yi",
        sharedAt: body.sharedAt ?? "2026-03-22T00:00:00",
        sourceSceneId: body.sourceSceneId ?? null,
        sourceSceneName: body.sourceSceneName ?? null,
        pageResourceId: body.pageResourceId,
        pageResourceName: body.pageResourceName,
        executionMode: body.executionMode,
        previewBeforeExecute: body.previewBeforeExecute ?? false,
        floatingButtonEnabled: body.floatingButtonEnabled ?? false,
        floatingButtonLabel: body.floatingButtonLabel ?? "重试回填",
        floatingButtonX: body.floatingButtonX ?? 84,
        floatingButtonY: body.floatingButtonY ?? 76,
        status: body.status ?? "DRAFT",
        manualDurationSec: body.manualDurationSec ?? 20,
        riskConfirmed: body.riskConfirmed ?? false,
        nodeCount: 0
      };
      sharedSceneStore = [row, ...sharedSceneStore.filter((item) => item.id !== row.id)];
      return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body: row }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.startsWith("/api/control/job-scenes/") && url.endsWith("/clone")) {
      const sourceId = Number(url.split("/")[4]);
      const source = sharedSceneStore.find((item) => item.id === sourceId);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const row = {
        ...(source ?? {}),
        id: ++sharedSceneSeedId,
        name: `${String(source?.name ?? "Job Scene")}-副本`,
        ownerOrgId: String(body.targetOrgId ?? "branch-east"),
        shareMode: "PRIVATE",
        sharedOrgIds: [],
        sharedBy: String(body.operator ?? "person-zhao-yi"),
        sharedAt: "2026-03-22T00:00:00",
        sourceSceneId: source?.id ?? sourceId,
        sourceSceneName: source?.name ?? null,
        status: "DRAFT",
        riskConfirmed: false,
        nodeCount: Number(source?.nodeCount ?? 0)
      };
      sharedSceneStore = [row, ...sharedSceneStore.filter((item) => item.id !== row.id)];
      return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body: row }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchSpy);
});

async function createSharedSceneSeed() {
  sharedSceneSeedId += 1;
  return configCenterService.upsertJobScene({
    id: sharedSceneSeedId,
    name: `共享场景-${sharedSceneSeedId}`,
    ownerOrgId: "branch-east",
    shareMode: "SHARED",
    sharedOrgIds: ["branch-south"],
    pageResourceId: 1001,
    pageResourceName: "贷款申请主页面",
    executionMode: "AUTO_AFTER_PROMPT",
    previewBeforeExecute: false,
    floatingButtonEnabled: false,
    floatingButtonLabel: "重试回填",
    floatingButtonX: 84,
    floatingButtonY: 76,
    status: "DRAFT",
    nodeCount: 0,
    manualDurationSec: 20,
    riskConfirmed: false
  });
}

describe("configCenterService shared prompt/job", () => {
  it("filters shared rules by viewer org scope", async () => {
    const rows = await configCenterService.listRules({ viewerOrgId: "branch-south" });
    expect(rows.some((row) => row.shareMode === "SHARED")).toBe(true);
    expect(rows.every((row) => row.ownerOrgId === "branch-south" || row.sharedOrgIds?.includes("branch-south"))).toBe(
      true
    );
  });

  it("filters shared job scenes by viewer org scope", async () => {
    await createSharedSceneSeed();
    const rows = await configCenterService.listJobScenes({ viewerOrgId: "branch-south" });
    expect(rows.some((row) => row.shareMode === "SHARED")).toBe(true);
    expect(rows.every((row) => row.ownerOrgId === "branch-south" || row.sharedOrgIds?.includes("branch-south"))).toBe(
      true
    );
  });

  it("normalizes partial backend scene fields to keep list echo stable", async () => {
    sharedSceneStore = [
      {
        id: 880001,
        name: "后端回显兜底场景",
        ownerOrgId: null,
        shareMode: "PRIVATE",
        sharedOrgIds: null,
        pageResourceId: 1001,
        pageResourceName: null,
        executionMode: "LEGACY_MODE",
        previewBeforeExecute: null,
        floatingButtonEnabled: null,
        floatingButtonLabel: null,
        floatingButtonX: null,
        floatingButtonY: null,
        status: "ACTIVE",
        manualDurationSec: null,
        riskConfirmed: null,
        nodeCount: null
      }
    ];

    const [scene] = await configCenterService.listJobScenes({ viewerOrgId: "branch-south" });
    expect(scene).toBeTruthy();
    expect(scene.ownerOrgId).toBe("branch-south");
    expect(scene.pageResourceName).toBe("");
    expect(scene.executionMode).toBe("AUTO_AFTER_PROMPT");
    expect(scene.sharedOrgIds).toEqual([]);
    expect(scene.manualDurationSec).toBe(30);
    expect(scene.floatingButtonLabel).toBe("重新执行");
    expect(scene.nodeCount).toBe(0);
    expect(scene.riskConfirmed).toBe(false);
  });

  it("clones shared job scene into viewer org as private copy", async () => {
    const source = await createSharedSceneSeed();
    const created = await configCenterService.cloneJobSceneToOrg(source.id, "branch-south", "person-zhao-yi");
    expect(created.ownerOrgId).toBe("branch-south");
    expect(created.shareMode).toBe("PRIVATE");
    expect(created.sourceSceneId).toBe(source.id);
  });

  it("creates new job scene with POST even when client pre-generates id", async () => {
    const generatedId = Date.now();
    await configCenterService.upsertJobScene({
      id: generatedId,
      name: `新建场景-${generatedId}`,
      ownerOrgId: "branch-east",
      shareMode: "PRIVATE",
      sharedOrgIds: [],
      pageResourceId: 1001,
      pageResourceName: "贷款申请主页面",
      executionMode: "AUTO_AFTER_PROMPT",
      previewBeforeExecute: false,
      floatingButtonEnabled: false,
      floatingButtonLabel: "重试回填",
      floatingButtonX: 84,
      floatingButtonY: 76,
      status: "DRAFT",
      nodeCount: 0,
      manualDurationSec: 20,
      riskConfirmed: false
    });
    const createCallExists = fetchSpy.mock.calls.some(([input, init]) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();
      return url === "/api/control/job-scenes" && method === "POST";
    });
    const updateCallExists = fetchSpy.mock.calls.some(([input, init]) => {
      const url = String(input);
      const method = String(init?.method ?? "GET").toUpperCase();
      return url.startsWith("/api/control/job-scenes/") && method === "POST";
    });

    expect(createCallExists).toBe(true);
    expect(updateCallExists).toBe(false);
  });

  it("uses logged-in org as owner when ownerOrgId is missing", async () => {
    setBackendAuthContext({
      idToken: "mock-token",
      userId: "80334567",
      orgId: "branch-south",
      roleIds: []
    });

    const generatedId = Date.now() + 1;
    const created = await configCenterService.upsertJobScene({
      id: generatedId,
      name: `归属机构回显场景-${generatedId}`,
      shareMode: "PRIVATE",
      sharedOrgIds: [],
      pageResourceId: 1001,
      pageResourceName: "贷款申请主页面",
      executionMode: "AUTO_AFTER_PROMPT",
      previewBeforeExecute: false,
      floatingButtonEnabled: false,
      floatingButtonLabel: "重试回填",
      floatingButtonX: 84,
      floatingButtonY: 76,
      status: "DRAFT",
      nodeCount: 0,
      manualDurationSec: 20,
      riskConfirmed: false
    });

    const createRequestBody = fetchSpy.mock.calls
      .map(([, init]) => init?.body)
      .filter(Boolean)
      .map((raw) => JSON.parse(String(raw)) as Record<string, unknown>)
      .find((body) => body.name === `归属机构回显场景-${generatedId}`);

    expect(createRequestBody?.ownerOrgId).toBe("branch-south");
    expect(created.ownerOrgId).toBe("branch-south");
  });
});
