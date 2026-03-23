import { describe, expect, it } from "vitest";
import { mergeSubmitFormValues } from "./useInterfacesPageModel";

describe("mergeSubmitFormValues", () => {
  it("falls back to all form values when validated values are empty", () => {
    const result = mergeSubmitFormValues(
      {},
      {
        name: "客户信息查询",
        description: "用于客户基础信息查询",
        method: "POST",
        prodPath: "/customer/profile/query",
        bodyTemplateJson: "{\"customerId\":\"\"}"
      }
    );

    expect(result).toMatchObject({
      name: "客户信息查询",
      description: "用于客户基础信息查询",
      method: "POST",
      prodPath: "/customer/profile/query",
      bodyTemplateJson: "{\"customerId\":\"\"}"
    });
  });

  it("lets validated values override same keys from all values", () => {
    const result = mergeSubmitFormValues(
      {
        description: "新的用途说明"
      },
      {
        name: "客户信息查询",
        description: "旧用途说明",
        method: "POST",
        prodPath: "/customer/profile/query",
        bodyTemplateJson: ""
      }
    );

    expect(result.description).toBe("新的用途说明");
    expect(result.name).toBe("客户信息查询");
  });
});
