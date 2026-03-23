import { describe, expect, it } from "vitest";
import type { ApiInputParam, InterfaceDraftPayload } from "../types";
import { validateInterfaceDraftPayload } from "./formRules";

describe("validateInterfaceDraftPayload", () => {
  it("does not warn when output fields are empty", () => {
    const payload: InterfaceDraftPayload = {
      id: 1001,
      name: "客户查询",
      description: "查询客户信息",
      method: "POST",
      prodPath: "/customer/query",
      currentVersion: 1,
      bodyTemplateJson: "",
      inputConfigJson: "{\"headers\":[],\"query\":[],\"path\":[],\"body\":[]}",
      outputConfigJson: "[]",
      paramSourceSummary: "Header 0 / Query 0 / Path 0 / Body 0",
      responsePath: "$.data"
    };

    const inputConfig: Record<string, ApiInputParam[]> = {
      headers: [],
      query: [],
      path: [],
      body: []
    };

    const report = validateInterfaceDraftPayload(payload, inputConfig, [], []);

    expect(report.ok).toBe(true);
    expect(report.warningCount).toBe(0);
    expect(report.sectionIssues).toHaveLength(0);
  });
});
