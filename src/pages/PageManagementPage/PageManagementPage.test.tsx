import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  PageManagementPage,
  PageSelector,
  getMenuCapabilityToggleMeta,
  getMenuDetailTabs,
  getMenuManagementActionLabels
} from "./PageManagementPage";
import { MockSessionProvider } from "../../session/mockSession";

describe("PageManagementPage", () => {
  it("uses a two-tab menu detail layout", () => {
    expect(getMenuDetailTabs()).toEqual(["overview", "page"]);

    const html = renderToStaticMarkup(
      <MockSessionProvider
        value={{
          persona: "CONFIG_OPERATOR_BRANCH",
          setPersona: () => {}
        }}
      >
        <MemoryRouter>
          <PageManagementPage />
        </MemoryRouter>
      </MockSessionProvider>
    );

    expect(html).not.toContain("开通与版本");
    expect(html).not.toContain("业务流程");
  });

  it("keeps page capability actions compact inside the page details card", () => {
    const html = renderToStaticMarkup(
      <MockSessionProvider
        value={{
          persona: "CONFIG_OPERATOR_BRANCH",
          setPersona: () => {}
        }}
      >
        <MemoryRouter>
          <PageManagementPage />
        </MemoryRouter>
      </MockSessionProvider>
    );

    expect(html).not.toContain("配置动作");
    expect(html).not.toContain("当前页面暂不可新增提示或作业配置。");
  });

  it("removes pending capability wording from menu work status", () => {
    const html = renderToStaticMarkup(
      <MockSessionProvider
        value={{
          persona: "CONFIG_OPERATOR_BRANCH",
          setPersona: () => {}
        }}
      >
        <MemoryRouter>
          <PageManagementPage />
        </MemoryRouter>
      </MockSessionProvider>
    );

    expect(html).not.toContain("开通中");
  });

  it("returns disable action metadata when both capabilities are enabled", () => {
    expect(
      getMenuCapabilityToggleMeta({
        promptStatus: "ENABLED",
        jobStatus: "ENABLED"
      })
    ).toEqual({
      action: "DISABLE",
      label: "停用能力",
      confirmText: "确认停用"
    });
  });

  it("returns concise action labels for the menu management page", () => {
    expect(getMenuManagementActionLabels()).toEqual({
      manualMaintenance: "补录菜单/页面",
      versionCenter: "查看版本",
      createPrompt: "新增提示",
      createJob: "新增作业",
      fieldMapping: "映射",
      publicFieldGovernance: "公共字段"
    });
  });

  it("switches to a search list when there are many pages", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PageSelector
          pages={Array.from({ length: 8 }).map((_, index) => ({
            id: index + 1,
            name: `页面${index + 1}`,
            promptRuleCount: index,
            jobSceneCount: index
          }))}
          selectedPageId={1}
          onSelect={() => {}}
        />
      </MemoryRouter>
    );

    expect(html).toContain("搜索页面");
    expect(html).toContain("页面1");
    expect(html).not.toContain("上一页");
    expect(html).not.toContain("下一页");
  });
});
