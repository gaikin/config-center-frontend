import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BindingPrototypePage, BindingPrototypePanel, canAddMenuPage } from "./BindingPrototypePage";

describe("BindingPrototypePage", () => {
  it("renders the manual menu and page entry model", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BindingPrototypePage />
      </MemoryRouter>
    );

    expect(html).toContain("menuCode");
    expect(html).toContain("menuName");
    expect(html).toContain("pageCode");
    expect(html).toContain("pageName");
    expect(html).not.toContain("业务流程");
    expect(html).not.toContain("promptId");
    expect(html).not.toContain("jobId");
  });

  it("does not expose removed fields", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BindingPrototypePage />
      </MemoryRouter>
    );

    expect(html).not.toContain("promptId");
    expect(html).not.toContain("jobId");
    expect(html).toContain("手工维护菜单/页面");
  });

  it("supports embedded mode for menu-management manual entry", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BindingPrototypePanel embedded />
      </MemoryRouter>
    );

    expect(html).not.toContain("引用绑定原型");
    expect(html).toContain("手工新增菜单/页面入口");
  });

  it("does not require pageCode to be uppercase only", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <BindingPrototypePage />
      </MemoryRouter>
    );

    expect(html).not.toContain("仅支持大写字母、数字和下划线");
  });

  it("allows the same pageCode to be reused across different menus", () => {
    expect(
      canAddMenuPage(
        [
          {
            menuCode: "loan-process",
            pageCode: "page-a",
            pageName: "A"
          }
        ],
        "TRADE_CENTER",
        "page-a"
      )
    ).toBe(true);
    expect(
      canAddMenuPage(
        [
          {
            menuCode: "TASK_CENTER",
            pageCode: "page-a",
            pageName: "A"
          }
        ],
        "TASK_CENTER",
        "page-a"
      )
    ).toBe(false);
  });
});
