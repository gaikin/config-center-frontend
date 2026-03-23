import type { GeneralConfigItem } from "./types";

export const REGION_GROUP_KEY = "region";

const fallbackRegionItems = [
  { code: "trade", name: "交易中心" },
  { code: "task", name: "任务中心" },
  { code: "manage", name: "管理中心" },
  { code: "business", name: "业务入口" }
] as const;

function normalizeRegionValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getActiveRegionItems(items: GeneralConfigItem[]) {
  return items
    .filter((item) => item.groupKey === REGION_GROUP_KEY && item.status === "ACTIVE")
    .sort((left, right) => left.orderNo - right.orderNo || left.id - right.id);
}

export function buildRegionOptions(items: GeneralConfigItem[], extraRegionIds: string[] = []) {
  const activeItems = getActiveRegionItems(items);
  const options = activeItems.length > 0
    ? activeItems.map((item) => ({
        label: normalizeRegionValue(item.itemValue) || item.itemKey,
        value: item.itemKey
      }))
    : fallbackRegionItems.map((item) => ({
        label: item.name,
        value: item.code
      }));

  const seen = new Set(options.map((item) => item.value));
  for (const regionId of extraRegionIds) {
    const normalized = normalizeRegionValue(regionId);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    options.push({
      label: `专区 ${normalized}`,
      value: normalized
    });
  }

  return options;
}

export function getRegionDisplayName(regionId?: string | null, items: GeneralConfigItem[] = []) {
  const normalizedRegionId = normalizeRegionValue(regionId);
  if (!normalizedRegionId) {
    return "-";
  }
  const activeItems = getActiveRegionItems(items);
  const matched = activeItems.find((item) => item.itemKey === normalizedRegionId);
  return normalizeRegionValue(matched?.itemValue) || normalizedRegionId;
}

export function getRegionLabel(regionId?: string | null, items: GeneralConfigItem[] = []) {
  const displayName = getRegionDisplayName(regionId, items);
  return displayName === "-" ? displayName : `专区 ${displayName}`;
}
