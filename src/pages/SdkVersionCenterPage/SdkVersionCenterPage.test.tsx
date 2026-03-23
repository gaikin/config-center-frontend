import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SdkVersionCenterPage } from "./SdkVersionCenterPage";

describe("SdkVersionCenterPage", () => {
  it("only keeps menu gray strategy content", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SdkVersionCenterPage />
      </MemoryRouter>
    );

    expect(html).toContain("菜单灰度中心");
    expect(html).toContain("菜单灰度策略");
    expect(html).not.toContain("平台默认版本摘要");
    expect(html).not.toContain("版本清单");
    expect(html).not.toContain("Manifest");
    expect(html).not.toContain("兼容说明");
    expect(html).not.toContain("SDK版本中心");
  });
});
