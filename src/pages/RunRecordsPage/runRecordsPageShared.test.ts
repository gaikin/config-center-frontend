import { describe, expect, it } from "vitest";
import { formatDurationMs, getRunRecordDefaults } from "./runRecordsPageShared";

describe("runRecordsPageShared", () => {
  it("parses run record defaults from search params", () => {
    const defaults = getRunRecordDefaults(new URLSearchParams("?tab=jobs&sceneId=5002&sceneName=开户证件信息同步"));
    expect(defaults.activeTab).toBe("jobs");
    expect(defaults.jobFilters.sceneId).toBe(5002);
    expect(defaults.jobFilters.sceneName).toBe("开户证件信息同步");
  });

  it("formats duration for table display", () => {
    expect(formatDurationMs(0)).toBe("0 ms");
    expect(formatDurationMs(920)).toBe("920 ms");
    expect(formatDurationMs(1788)).toBe("1.79 s");
  });
});
