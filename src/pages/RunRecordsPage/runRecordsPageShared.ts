import type { JobExecutionRecord, JobExecutionRecordFilters, PageResource, PromptHitRecord, PromptHitRecordFilters } from "../../types";

export type RunRecordTabKey = "prompts" | "jobs";

export type RunRecordDefaults = {
  activeTab: RunRecordTabKey;
  promptFilters: PromptHitRecordFilters;
  jobFilters: JobExecutionRecordFilters;
};

function parsePositiveInt(value: string | null) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export function getRunRecordDefaults(searchParams: URLSearchParams): RunRecordDefaults {
  const tab = searchParams.get("tab");
  const activeTab: RunRecordTabKey = tab === "jobs" ? "jobs" : "prompts";
  const ruleId = parsePositiveInt(searchParams.get("ruleId"));
  const ruleName = searchParams.get("ruleName")?.trim() || undefined;
  const sceneId = parsePositiveInt(searchParams.get("sceneId"));
  const sceneName = searchParams.get("sceneName")?.trim() || undefined;
  const pageResourceId = parsePositiveInt(searchParams.get("pageResourceId"));
  const startAt = buildDefaultStartDate();

  return {
    activeTab,
    promptFilters: {
      ruleId,
      keyword: ruleName,
      pageResourceId,
      startAt
    },
    jobFilters: {
      sceneId,
      sceneName,
      pageResourceId,
      result: "ALL",
      startAt
    }
  };
}

export function buildRunRecordPageOptions(resources: PageResource[]) {
  return resources.map((item) => ({
    label: item.name,
    value: item.id
  }));
}

export function buildRunRecordPromptOrgOptions(rows: PromptHitRecord[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.orgId, row.orgName);
  }
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

export function buildRunRecordJobOrgOptions(rows: JobExecutionRecord[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.orgId, row.orgName);
  }
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

export function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}
