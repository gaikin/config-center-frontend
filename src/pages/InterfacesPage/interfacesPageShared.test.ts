import { describe, expect, it } from "vitest";
import {
  buildMockResponseBody,
  defaultOutputParam,
  getResponsePath,
  parseOutputFromSampleObject
} from "./interfacesPageShared";

describe("interfacesPageShared output path behavior", () => {
  it("parses output sample from root path", () => {
    const rows = parseOutputFromSampleObject({
      code: 0,
      data: {
        score: 99
      }
    });
    expect(rows.map((row) => row.path)).toEqual(["$.code", "$.data"]);
    const dataRow = rows.find((row) => row.name === "data");
    expect(dataRow?.children?.map((row) => row.path)).toEqual(["$.data.score"]);
  });

  it("uses root as fallback response path", () => {
    expect(getResponsePath([])).toBe("$");
  });

  it("builds mock response from configured paths", () => {
    const response = buildMockResponseBody([
      defaultOutputParam({ name: "code", path: "$.code", valueType: "NUMBER" }),
      defaultOutputParam({ name: "riskLevel", path: "$.result.riskLevel", valueType: "STRING" })
    ]);

    expect(response).toMatchObject({
      code: 88,
      result: {
        riskLevel: "riskLevel_value"
      }
    });
  });

  it("falls back to root field name when path is empty", () => {
    const response = buildMockResponseBody([defaultOutputParam({ name: "status", path: "", valueType: "STRING" })]);
    expect(response).toMatchObject({
      status: "status_value"
    });
  });
});
