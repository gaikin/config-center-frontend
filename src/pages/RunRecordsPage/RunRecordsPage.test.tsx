import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RunRecordsPage } from "./RunRecordsPage";

describe("RunRecordsPage", () => {
  it("renders prompt and job tabs", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/run-records?tab=jobs"]}>
        <RunRecordsPage />
      </MemoryRouter>
    );

    expect(html).toContain("提示记录");
    expect(html).toContain("作业记录");
    expect(html).toContain("执行结果");
  });

  it("supports default filters from prompt and job shortcuts", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/run-records?tab=prompts&ruleId=4001&ruleName=贷款高风险强提示"]}>
        <RunRecordsPage />
      </MemoryRouter>
    );

    expect(html).toContain("贷款高风险强提示");
  });
});

