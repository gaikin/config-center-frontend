import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedPlatformRuntimeConfig } from "../mock/seeds";
import { configCenterService } from "./configCenterService";

type GeneralConfigRow = {
  id: number;
  groupKey: string;
  itemKey: string;
  itemValue: string;
  description?: string;
  status: "ACTIVE" | "DISABLED";
  orderNo: number;
  updateTime?: string;
  updatedBy?: string;
};

describe("configCenterService general config", () => {
  const baseGeneralConfigRows: GeneralConfigRow[] = [
    {
      id: 3701,
      groupKey: "platform-runtime",
      itemKey: "promptStableVersion",
      itemValue: seedPlatformRuntimeConfig.promptStableVersion,
      description: "智能提示正式版本",
      status: "ACTIVE",
      orderNo: 1,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3702,
      groupKey: "platform-runtime",
      itemKey: "promptGrayDefaultVersion",
      itemValue: seedPlatformRuntimeConfig.promptGrayDefaultVersion ?? "",
      description: "智能提示默认灰度版本",
      status: "ACTIVE",
      orderNo: 2,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3703,
      groupKey: "platform-runtime",
      itemKey: "jobStableVersion",
      itemValue: seedPlatformRuntimeConfig.jobStableVersion,
      description: "智能作业正式版本",
      status: "ACTIVE",
      orderNo: 3,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3704,
      groupKey: "platform-runtime",
      itemKey: "jobGrayDefaultVersion",
      itemValue: seedPlatformRuntimeConfig.jobGrayDefaultVersion ?? "",
      description: "智能作业默认灰度版本",
      status: "ACTIVE",
      orderNo: 4,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3705,
      groupKey: "region",
      itemKey: "trade",
      itemValue: "交易中心",
      description: "交易中心专区",
      status: "ACTIVE",
      orderNo: 1,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3706,
      groupKey: "region",
      itemKey: "task",
      itemValue: "任务中心",
      description: "任务中心专区",
      status: "ACTIVE",
      orderNo: 2,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    },
    {
      id: 3707,
      groupKey: "region",
      itemKey: "manage",
      itemValue: "管理中心",
      description: "管理中心专区",
      status: "ACTIVE",
      orderNo: 3,
      updateTime: "2026-03-22 08:00:00",
      updatedBy: "system.seed"
    }
  ];
  let generalConfigRows = structuredClone(baseGeneralConfigRows);

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  beforeEach(() => {
    generalConfigRows = structuredClone(baseGeneralConfigRows);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.startsWith("/api/governance/general-config-items") && method === "GET") {
          const parsedUrl = new URL(url, "http://localhost");
          const groupKey = parsedUrl.searchParams.get("groupKey");
          return jsonResponse(
            groupKey ? generalConfigRows.filter((item) => item.groupKey === groupKey) : generalConfigRows
          );
        }
        if (url.endsWith("/api/governance/general-config-items") && method === "POST") {
          const payload = JSON.parse(String(init?.body ?? "{}")) as Omit<GeneralConfigRow, "id" | "updateTime" | "updatedBy">;
          const next = {
            id: Math.max(9000, ...generalConfigRows.map((item) => item.id)) + 1,
            ...payload,
            updateTime: "2026-03-22 08:00:00",
            updatedBy: "system.test"
          };
          generalConfigRows = [...generalConfigRows, next];
          return jsonResponse(next);
        }
        if (url.match(/\/api\/governance\/general-config-items\/\d+$/) && method === "POST") {
          const id = Number(url.split("/").pop());
          const payload = JSON.parse(String(init?.body ?? "{}")) as Omit<GeneralConfigRow, "id" | "updateTime" | "updatedBy">;
          generalConfigRows = generalConfigRows.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...payload,
                  updateTime: "2026-03-22 08:00:00",
                  updatedBy: "system.test"
                }
              : item
          );
          return jsonResponse(generalConfigRows.find((item) => item.id === id));
        }
        if (url.match(/\/api\/governance\/general-config-items\/\d+\/status$/) && method === "POST") {
          const id = Number(url.split("/").slice(-2, -1)[0]);
          const payload = JSON.parse(String(init?.body ?? "{}")) as { status: "ACTIVE" | "DISABLED" };
          generalConfigRows = generalConfigRows.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: payload.status,
                  updateTime: "2026-03-22 08:00:00",
                  updatedBy: "system.test"
                }
              : item
          );
          return jsonResponse(generalConfigRows.find((item) => item.id === id));
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      })
    );
  });

  it("loads platform runtime config entries from general config items", async () => {
    const rows = await configCenterService.listGeneralConfigItems("platform-runtime");
    const keys = new Set(rows.map((item) => item.itemKey));
    expect(keys.has("promptStableVersion")).toBe(true);
    expect(keys.has("promptGrayDefaultVersion")).toBe(true);
    expect(keys.has("jobStableVersion")).toBe(true);
    expect(keys.has("jobGrayDefaultVersion")).toBe(true);
  });

  it("loads region options from general config items", async () => {
    const rows = await configCenterService.listGeneralConfigItems("region");
    expect(rows.map((item) => item.itemKey)).toEqual(["trade", "task", "manage"]);
    expect(rows.map((item) => item.itemValue)).toEqual(["交易中心", "任务中心", "管理中心"]);
  });

  it("loads platform runtime config through general config items", async () => {
    const before = await configCenterService.getPlatformRuntimeConfig();
    await configCenterService.upsertGeneralConfigItem({
      id: 3701,
      groupKey: "platform-runtime",
      itemKey: "promptStableVersion",
      itemValue: "9.9.9",
      description: "test override",
      status: "ACTIVE",
      orderNo: 1
    });

    const runtime = await configCenterService.getPlatformRuntimeConfig();
    expect(runtime.promptStableVersion).toBe("9.9.9");

    await configCenterService.updatePlatformRuntimeConfig({
      ...before,
      updatedBy: "person-platform-admin"
    });
  });

  it("persists general config updates through the backend client", async () => {
    const saved = await configCenterService.upsertGeneralConfigItem({
      id: 3705,
      groupKey: "region",
      itemKey: "trade",
      itemValue: "交易中心（更新）",
      description: "updated region",
      status: "ACTIVE",
      orderNo: 1
    });
    expect(saved.itemValue).toBe("交易中心（更新）");

    await configCenterService.updateGeneralConfigItemStatus(3705, "DISABLED");
    const rows = await configCenterService.listGeneralConfigItems("region");
    const updated = rows.find((item) => item.id === 3705);
    expect(updated?.status).toBe("DISABLED");
  });
});
