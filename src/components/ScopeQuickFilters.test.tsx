import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScopeQuickFilters } from "./ScopeQuickFilters";

describe("ScopeQuickFilters", () => {
  it("renders menu and page switchers", () => {
    const html = renderToStaticMarkup(
      <ScopeQuickFilters
        menus={[
          { id: 1, label: "交易中心" },
          { id: 2, label: "任务中心" }
        ]}
        pages={[
          { id: 11, label: "客户信息页", menuId: 1, menuLabel: "交易中心" },
          { id: 22, label: "作业编排页", menuId: 2, menuLabel: "任务中心" }
        ]}
        selectedMenuId={1}
        selectedPageId={11}
        onMenuChange={() => {}}
        onPageChange={() => {}}
      />
    );

    expect(html).toContain("切换菜单 / 页面");
    expect(html).toContain("菜单");
    expect(html).toContain("页面");
    expect(html).toContain("交易中心");
    expect(html).toContain("客户信息页");
    expect(html).toContain("当前菜单");
    expect(html).toContain("当前页面");
  });
});
