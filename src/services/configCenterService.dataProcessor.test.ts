import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedDataProcessors } from "../mock/seeds";
import type { LifecycleState } from "../types";
import { configCenterService } from "./configCenterService";

describe("configCenterService data processor", () => {
  let rows = structuredClone(seedDataProcessors);

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify({ returnCode: "OK", errorMsg: "success", body }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  beforeEach(() => {
    rows = structuredClone(seedDataProcessors);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.endsWith("/api/control/data-processors") && method === "GET") {
          return jsonResponse(rows);
        }
        if (url.endsWith("/api/control/data-processors") && method === "POST") {
          const payload = JSON.parse(String(init?.body ?? "{}")) as {
            id?: number;
            name: string;
            paramCount: number;
            functionCode: string;
            status: string;
          };
          const existsIndex = rows.findIndex((item) => item.id === payload.id);
          const next = {
            id: payload.id ?? (rows.length === 0 ? 1 : Math.max(...rows.map((item) => item.id)) + 1),
            name: payload.name,
            paramCount: payload.paramCount,
            functionCode: payload.functionCode,
            status: payload.status as LifecycleState,
            usedByCount: existsIndex >= 0 ? rows[existsIndex].usedByCount : 0,
            updatedAt: new Date().toISOString()
          };
          if (existsIndex >= 0) {
            rows = rows.map((item, index) => (index === existsIndex ? next : item));
          } else {
            rows = [next, ...rows];
          }
          return jsonResponse(next);
        }
        if (url.includes("/api/control/data-processors/") && url.endsWith("/status") && method === "POST") {
          const parts = url.split("/");
          const id = Number(parts[parts.length - 2]);
          const payload = JSON.parse(String(init?.body ?? "{}")) as { status: string };
          const existsIndex = rows.findIndex((item) => item.id === id);
          if (existsIndex >= 0) {
            rows = rows.map((item, index) => (index === existsIndex ? { ...item, status: payload.status as LifecycleState } : item));
            return jsonResponse(rows[existsIndex]);
          }
          return jsonResponse({
            id,
            name: "",
            paramCount: 1,
            functionCode: "function transform(input) { return input; }",
            status: payload.status as LifecycleState,
            usedByCount: 0,
            updatedAt: new Date().toISOString()
          });
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      })
    );
  });

  it("auto syncs function signature when paramCount does not match", async () => {
    const saved = await configCenterService.upsertDataProcessor({
      id: Date.now(),
      name: "拼接后缀",
      paramCount: 3,
      functionCode: "function transform(input, arg1) { return String(input) + String(arg1 ?? ''); }",
      status: "ACTIVE"
    });

    expect(saved.functionCode).toContain("function transform(input, arg1, arg2)");
  });

  it("accepts valid transform function and can query it", async () => {
    const id = Date.now() + 1;
    const saved = await configCenterService.upsertDataProcessor({
      id,
      name: "去空格",
      paramCount: 1,
      functionCode: "function transform(input) { return String(input ?? '').trim(); }",
      status: "ACTIVE"
    });

    expect(saved.id).toBe(id);
    const rows = await configCenterService.listDataProcessors();
    expect(rows.some((item) => item.id === id && item.paramCount === 1)).toBe(true);
  });

  it("can save when editing active processor and setting paramCount to 3", async () => {
    const rows = await configCenterService.listDataProcessors();
    const active = rows.find((item) => item.status === "ACTIVE");
    expect(active).toBeTruthy();

    const saved = await configCenterService.upsertDataProcessor({
      id: active!.id,
      name: active!.name,
      paramCount: 3,
      functionCode: "function transform(input, arg1) { return String(input ?? '') + String(arg1 ?? ''); }",
      status: "ACTIVE"
    });

    expect(saved.id).toBe(active!.id);
    expect(saved.paramCount).toBe(3);
    expect(saved.functionCode).toContain("function transform(input, arg1, arg2)");
  });

  it("allows editing draft version even when active version has same name", async () => {
    const rows = await configCenterService.listDataProcessors();
    const active = rows.find((item) => item.status === "ACTIVE");
    expect(active).toBeTruthy();

    const draft = await configCenterService.upsertDataProcessor({
      id: active!.id,
      name: active!.name,
      paramCount: 3,
      functionCode: "function transform(input, x) { return String(input ?? '') + String(x ?? ''); }",
      status: "ACTIVE"
    });

    const updatedDraft = await configCenterService.upsertDataProcessor({
      id: draft.id,
      name: draft.name,
      paramCount: 3,
      functionCode: "function transform(input, x, y) { return String(input ?? '') + String(x ?? '') + String(y ?? ''); }",
      status: "DRAFT"
    });

    expect(updatedDraft.id).toBe(draft.id);
  });
});
