import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OperandPill } from "./rulesOperandRenderers";
import type { OperandDraft } from "./rulesPageShared";

const baseOperand: OperandDraft = {
  sourceType: "CONST",
  valueType: "STRING",
  displayValue: "测试值",
  machineKey: "测试值",
  interfaceInputConfig: "",
  dataProcessors: []
};

describe("OperandPill layout", () => {
  it("uses fluid width to avoid overflow in narrow condition panels", () => {
    const html = renderToStaticMarkup(
      <OperandPill
        conditionId="condition-1"
        side="left"
        operand={baseOperand}
        selectedOperand={null}
        onSelect={() => undefined}
      />
    );

    expect(html).toContain("width:100%");
    expect(html).toContain("max-width:320px");
    expect(html).not.toContain("min-width:320px");
  });
});
