import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MockSessionProvider } from "../../session/mockSession";
import { RulesPage } from "./RulesPage";

describe("RulesPage shared mode", () => {
  it("shows shared status and copy guidance", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MockSessionProvider
          value={{
            persona: "CONFIG_OPERATOR_BRANCH",
            setPersona: () => {}
          }}
        >
          <RulesPage embedded mode="PAGE_RULE" />
        </MockSessionProvider>
      </MemoryRouter>
    );

    expect(html).toContain("共享状态");
    expect(html).toContain("复制为我的版本");
  });
});
