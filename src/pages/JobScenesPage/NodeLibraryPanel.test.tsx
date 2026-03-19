import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NodeLibraryPanel } from "./NodeLibraryPanel";

describe("NodeLibraryPanel", () => {
  it("renders preview-first and drag-friendly copy", () => {
    const html = renderToStaticMarkup(
      <NodeLibraryPanel
        items={[{ label: "接口调用", nodeType: "api_call", description: "调用接口" }]}
        selectedNodeType="api_call"
        onSelect={() => undefined}
        onAdd={() => undefined}
      />
    );

    expect(html).toContain("点击节点仅查看说明");
    expect(html).toContain("支持拖拽到右侧画布");
    expect(html).toContain("添加到流程");
    expect(html).toContain("draggable=\"true\"");
  });
});
