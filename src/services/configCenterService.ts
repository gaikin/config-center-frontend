import {
  seedAuditLogs,
  seedBusinessFields,
  seedDashboardOverview,
  seedInterfaces,
  seedJobScenes,
  seedMenuCapabilityPolicies,
  seedMenuCapabilityRequests,
  seedMenuSdkPolicies,
  seedPageElements,
  seedPageFieldBindings,
  seedPageMenus,
  seedPageResources,
  seedPendingItems,
  seedPendingSummary,
  seedDataProcessors,
  seedPermissionResources,
  seedRoleResourceGrants,
  seedRoles,
  seedUserRoleBindings,
  seedRules,
  seedPlatformRuntimeConfig,
  seedGeneralConfigItems,
  seedPromptHitRecords,
  seedJobExecutionRecords,
  seedContextVariables
} from "../mock/seeds";
import { getOrgLabel } from "../orgOptions";
import { notifyRolePermissionsChanged } from "../session/sessionEvents";
import {
  validateMenuSdkPolicy,
  validatePlatformRuntimeConfig
} from "../sdkGovernance";
import { canAccessSharedObject } from "../sharedAccess";
import type {
  ApiInputParam,
  ApiOutputParam,
  BusinessFieldDefinition,
  DashboardOverview,
  ContextVariableDefinition,
  JobExecutionRecord,
  JobExecutionRecordFilters,
  GeneralConfigItem,
  PublishAuditLog,
  PublishPendingItem,
  PublishPendingSummary,
  InterfaceDraftPayload,
  InterfaceDefinition,
  JobSceneDefinition,
  JobScenePreviewField,
  MenuCapabilityPolicy,
  MenuCapabilityRequest,
  MenuSdkPolicy,
  LifecycleState,
  PlatformRuntimeConfig,
  PageElement,
  PageFieldBinding,
  PageMenu,
  PageResource,
  PermissionResource,
  DataProcessorDefinition,
  PublishPendingResult,
  PublishValidationReport,
  RoleItem,
  RolePermissionOperator,
  RoleResourceGrant,
  RuleDefinition,
  SaveDraftResult,
  ShareConfigFields,
  PromptHitRecord,
  PromptHitRecordFilters,
  UserRoleBinding,
  ValidationItem,
  ValidationReport
} from "../types";
import {
  validateInterfaceDraftPayload,
  validateJobSceneDraftPayload,
  validateRuleDraftPayload
} from "../validation/formRules";
import { backendRequest, getBackendAuthContext } from "./backendApi";
import {
  HEAD_OFFICE_ORG_ID,
  hasHighPrivilegeResource,
  isHeadOfficeOnlyRole,
  isHeadOfficePermissionAdmin
} from "../permissionPolicy";

type RuleCreatePayload = Omit<RuleDefinition, "id" | "currentVersion" | "updatedAt"> & {
  currentVersion?: number;
};
type RuleUpsertPayload = Omit<RuleDefinition, "updatedAt"> & {
  updatedAt?: string;
};
type PublishEffectiveOptions = {
  effectiveOrgIds?: string[];
  effectiveStartAt?: string;
  effectiveEndAt?: string;
};
type SharedViewerOptions = {
  viewerOrgId?: string;
};
type ShareConfigUpdatePayload = Pick<ShareConfigFields, "shareMode" | "sharedOrgIds">;
type GeneralConfigUpsertPayload = Omit<GeneralConfigItem, "id" | "updatedAt"> & {
  id?: number;
  updatedAt?: string;
};
type BackendMenuSdkPolicyRow = {
  id: number;
  menuCode: string;
  menuName?: string;
  promptGrayEnabled: boolean;
  promptGrayVersion?: string | null;
  promptGrayOrgIds?: string[] | null;
  jobGrayEnabled: boolean;
  jobGrayVersion?: string | null;
  jobGrayOrgIds?: string[] | null;
  effectiveStart: string;
  effectiveEnd: string;
  status: LifecycleState;
  updateTime?: string | null;
};
type BackendInterfaceRow = {
  id: number;
  name: string;
  description: string;
  method: InterfaceDefinition["method"];
  testPath?: string | null;
  prodPath: string;
  url?: string | null;
  status: LifecycleState;
  ownerOrgId: string;
  currentVersion: number;
  timeoutMs?: number | null;
  retryTimes?: number | null;
  bodyTemplateJson?: string | null;
  inputConfigJson: string;
  outputConfigJson: string;
  paramSourceSummary: string;
  responsePath: string;
  maskSensitive?: boolean | null;
  updatedAt?: string | null;
};
type BackendInterfaceUpsertRequest = {
  id?: number | null;
  name: string;
  description: string;
  method: InterfaceDefinition["method"];
  testPath?: string | null;
  prodPath: string;
  url?: string | null;
  ownerOrgId: string;
  currentVersion: number;
  timeoutMs?: number | null;
  retryTimes?: number | null;
  bodyTemplateJson?: string | null;
  inputConfigJson: string;
  outputConfigJson: string;
  paramSourceSummary: string;
  responsePath: string;
  maskSensitive?: boolean | null;
};
type BackendInterfaceStatusUpdateRequest = {
  status: LifecycleState;
};
type BackendPageMenuRow = {
  id: number;
  regionId: string;
  menuCode: string;
  menuName: string;
  urlPattern?: string | null;
  status: LifecycleState;
};
type BackendPageMenuUpsertRequest = {
  regionId: string;
  menuCode: string;
  menuName: string;
  urlPattern: string;
  status: LifecycleState;
};
type BackendPageResourceRow = {
  id: number;
  menuCode?: string | null;
  pageCode: string;
  frameCode?: string | null;
  name: string;
  status: LifecycleState;
  ownerOrgId: string;
  currentVersion: number;
  elementCount: number;
  detectRulesSummary: string;
  updatedAt: string;
};
type BackendPageResourcePage = {
  total: number;
  pageNo: number;
  pageSize: number;
  records: BackendPageResourceRow[];
};
type BackendPageResourceUpsertRequest = {
  id?: number | null;
  menuCode?: string | null;
  pageCode: string;
  frameCode?: string | null;
  name: string;
  status: LifecycleState;
  ownerOrgId: string;
  detectRulesSummary: string;
  currentVersion?: number;
  elementCount?: number;
  updatedAt?: string;
};
type BackendJobSceneRow = {
  id: number;
  name: string;
  ownerOrgId?: string | null;
  shareMode?: string | null;
  sharedOrgIds?: string[] | null;
  sharedBy?: string | null;
  sharedAt?: string | null;
  sourceSceneId?: number | null;
  sourceSceneName?: string | null;
  pageResourceId: number;
  pageResourceName?: string | null;
  executionMode?: string | null;
  previewBeforeExecute?: boolean | null;
  floatingButtonEnabled?: boolean | null;
  floatingButtonLabel?: string | null;
  floatingButtonX?: number | null;
  floatingButtonY?: number | null;
  status: LifecycleState;
  manualDurationSec?: number | null;
  riskConfirmed?: boolean | null;
  nodeCount?: number | null;
};
type BackendJobSceneUpsertRequest = {
  id?: number | null;
  name: string;
  ownerOrgId?: string | null;
  shareMode?: string | null;
  sharedOrgIds?: string[] | null;
  sharedBy?: string | null;
  sharedAt?: string | null;
  sourceSceneId?: number | null;
  sourceSceneName?: string | null;
  pageResourceId: number;
  pageResourceName: string;
  executionMode: string;
  previewBeforeExecute?: boolean | null;
  floatingButtonEnabled?: boolean | null;
  floatingButtonLabel?: string | null;
  floatingButtonX?: number | null;
  floatingButtonY?: number | null;
  status: LifecycleState;
  manualDurationSec: number;
  riskConfirmed?: boolean | null;
};
type BackendJobSceneShareRequest = {
  shareMode: string;
  sharedOrgIds: string[];
  operator: string;
};
type BackendJobSceneCloneRequest = {
  targetOrgId: string;
  operator: string;
};
type BackendJobSceneStatusUpdateRequest = {
  status: LifecycleState;
};
type BackendPermissionResourceRow = {
  id: number;
  resourceCode: string;
  resourceName: string;
  resourceType: PermissionResource["resourceType"];
  resourcePath: string;
  pagePath?: string | null;
  status: PermissionResource["status"];
  orderNo: number;
  description?: string | null;
  updateTime?: string | null;
};
type BackendRoleRow = {
  id: number;
  name: string;
  roleType: RoleItem["roleType"];
  status: RoleItem["status"];
  orgScopeId: string;
  memberCount: number;
  updateTime?: string | null;
};
type BackendRoleResourceGrantRow = {
  id: number;
  roleId: number;
  resourceCode: string;
  createTime?: string | null;
};
type BackendUserRoleBindingRow = {
  id: number;
  userId: string;
  roleId: number;
  status: UserRoleBinding["status"];
  createTime?: string | null;
};
type BackendRoleUpsertRequest = {
  id?: number | null;
  name: string;
  roleType: RoleItem["roleType"];
  status: RoleItem["status"];
  orgScopeId: string;
};
type BackendPermissionResourceUpsertRequest = {
  id?: number | null;
  resourceCode: string;
  resourceName: string;
  resourceType: PermissionResource["resourceType"];
  resourcePath: string;
  pagePath?: string | null;
  status: PermissionResource["status"];
  orderNo: number;
  description?: string | null;
};
type BackendPageElementRow = {
  id: number;
  pageResourceId: number;
  logicName: string;
  selector: string;
  selectorType: PageElement["selectorType"];
  frameLocation?: string | null;
  updatedAt?: string | null;
  updateTime?: string | null;
};
type BackendPageElementUpsertRequest = {
  id?: number | null;
  pageResourceId: number;
  logicName: string;
  selector: string;
  selectorType: PageElement["selectorType"];
  frameLocation?: string | null;
};
type BackendBusinessFieldRow = {
  id: number;
  code: string;
  name: string;
  scope: BusinessFieldDefinition["scope"];
  pageResourceId?: number | null;
  valueType: BusinessFieldDefinition["valueType"];
  required: boolean;
  description?: string | null;
  ownerOrgId: string;
  status: LifecycleState;
  currentVersion?: number | null;
  aliases?: string[] | null;
  updatedAt?: string | null;
  updateTime?: string | null;
};
type BackendBusinessFieldUpsertRequest = {
  id?: number | null;
  code: string;
  name: string;
  scope: BusinessFieldDefinition["scope"];
  pageResourceId?: number | null;
  valueType: BusinessFieldDefinition["valueType"];
  required: boolean;
  description?: string | null;
  ownerOrgId: string;
  status: LifecycleState;
  currentVersion?: number | null;
  aliases?: string[] | null;
};
type BackendPageFieldBindingRow = {
  id: number;
  pageResourceId: number;
  businessFieldCode: string;
  pageElementId: number;
  required: boolean;
  updatedAt?: string | null;
  updateTime?: string | null;
};
type BackendPageFieldBindingUpsertRequest = {
  id?: number | null;
  pageResourceId: number;
  businessFieldCode: string;
  pageElementId: number;
  required: boolean;
};
type BackendPublishValidationItemRow = {
  key?: string | null;
  label?: string | null;
  detail?: string | null;
  passed?: boolean | null;
  type?: string | null;
  target?: string | null;
  reason?: string | null;
};
type BackendPublishValidationReportRow = {
  pass: boolean;
  items?: BackendPublishValidationItemRow[] | null;
  blockingCount?: number | null;
  warningCount?: number | null;
  impactSummary?: string | null;
  riskItems?: string[] | null;
};
type BackendGeneralConfigItemRow = {
  id: number;
  groupKey: string;
  itemKey: string;
  itemValue: string;
  description?: string | null;
  status: LifecycleState;
  orderNo: number;
  updateTime?: string | null;
  updatedBy?: string | null;
};
type BackendDataProcessorRow = {
  id: number;
  name: string;
  paramCount: number;
  functionCode: string;
  status: LifecycleState;
  usedByCount?: number | null;
};
type BackendDataProcessorUpsertRequest = {
  id?: number | null;
  name: string;
  paramCount: number;
  functionCode: string;
  status: LifecycleState;
};
type BackendDataProcessorStatusUpdateRequest = {
  status: LifecycleState;
};
type BackendContextVariableRow = {
  id: number;
  key: string;
  label: string;
  valueSource: ContextVariableDefinition["valueSource"];
  staticValue?: string | null;
  scriptContent?: string | null;
  status: LifecycleState;
  ownerOrgId: string;
};
type BackendContextVariableUpsertRequest = {
  id?: number | null;
  key: string;
  label: string;
  valueSource: ContextVariableDefinition["valueSource"];
  staticValue?: string | null;
  scriptContent?: string | null;
  status: LifecycleState;
  ownerOrgId: string;
};
type BackendContextVariableStatusUpdateRequest = {
  status: LifecycleState;
};

const isMockModeEnabled = import.meta.env.VITE_ENABLE_MOCK_MODE === "true";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

const store = {
  dashboard: structuredClone(seedDashboardOverview),
  pageMenus: structuredClone(seedPageMenus),
  pageResources: structuredClone(seedPageResources),
  pageElements: structuredClone(seedPageElements),
  businessFields: structuredClone(seedBusinessFields),
  pageFieldBindings: structuredClone(seedPageFieldBindings),
  platformRuntimeConfig: structuredClone(seedPlatformRuntimeConfig),
  generalConfigItems: structuredClone(seedGeneralConfigItems),
  menuSdkPolicies: structuredClone(seedMenuSdkPolicies),
  menuCapabilityPolicies: structuredClone(seedMenuCapabilityPolicies),
  menuCapabilityRequests: structuredClone(seedMenuCapabilityRequests),
  interfaces: structuredClone(seedInterfaces),
  dataProcessors: structuredClone(seedDataProcessors),
  contextVariables: structuredClone(seedContextVariables),
  rules: structuredClone(seedRules),
  scenes: structuredClone(seedJobScenes),
  pendingSummary: structuredClone(seedPendingSummary),
  pendingItems: structuredClone(seedPendingItems),
  auditLogs: structuredClone(seedAuditLogs),
  promptHitRecords: structuredClone(seedPromptHitRecords),
  jobExecutionRecords: structuredClone(seedJobExecutionRecords),
  roles: structuredClone(seedRoles),
  permissionResources: structuredClone(seedPermissionResources),
  roleResourceGrants: structuredClone(seedRoleResourceGrants),
  userRoleBindings: structuredClone(seedUserRoleBindings)
};

function nowIso() {
  return new Date().toISOString();
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function toBackendDateTime(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }
  const dateTime = normalized.replace(/\//g, "-").replace("T", " ");
  const [datePart, timePart = ""] = dateTime.split(" ");
  if (!datePart || !timePart) {
    return normalized;
  }
  const [hours = "00", minutes = "00"] = timePart.split(":");
  return `${datePart}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

function fromBackendDateTime(value: string | undefined | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }
  if (normalized.includes("T")) {
    return normalized.slice(0, 16).replace("T", " ");
  }
  return normalized.slice(0, 16);
}

function resolveMenuSdkPolicyMenu(menuCode: string) {
  const menu = store.pageMenus.find((item) => item.menuCode === menuCode);
  return {
    regionId: menu?.regionId ?? "",
    menuId: menu?.id ?? 0,
    menuName: menu?.menuName,
    ownerOrgId: menu?.ownerOrgId ?? "head-office"
  };
}

function normalizeMenuSdkPolicyRow(row: BackendMenuSdkPolicyRow): MenuSdkPolicy {
  const menu = resolveMenuSdkPolicyMenu(row.menuCode);
  return {
    id: row.id,
    regionId: menu.regionId,
    menuId: menu.menuId,
    menuCode: row.menuCode,
    menuName: row.menuName ?? menu.menuName,
    promptGrayEnabled: Boolean(row.promptGrayEnabled),
    promptGrayVersion: row.promptGrayVersion ?? undefined,
    promptGrayOrgIds: Array.isArray(row.promptGrayOrgIds) ? row.promptGrayOrgIds : [],
    jobGrayEnabled: Boolean(row.jobGrayEnabled),
    jobGrayVersion: row.jobGrayVersion ?? undefined,
    jobGrayOrgIds: Array.isArray(row.jobGrayOrgIds) ? row.jobGrayOrgIds : [],
    effectiveStart: fromBackendDateTime(row.effectiveStart),
    effectiveEnd: fromBackendDateTime(row.effectiveEnd),
    status: row.status,
    ownerOrgId: menu.ownerOrgId,
    updateTime: row.updateTime ?? undefined
  };
}

function normalizeBackendPageMenuRow(row: BackendPageMenuRow): PageMenu {
  return {
    id: row.id,
    regionId: row.regionId,
    menuCode: row.menuCode,
    menuName: row.menuName,
    status: row.status,
    ownerOrgId: "head-office"
  };
}

function normalizeBackendPageResourceRow(row: BackendPageResourceRow): PageResource {
  return {
    id: row.id,
    menuCode: row.menuCode ?? "",
    pageCode: row.pageCode,
    frameCode: row.frameCode ?? undefined,
    name: row.name,
    status: row.status,
    ownerOrgId: row.ownerOrgId,
    currentVersion: row.currentVersion,
    elementCount: row.elementCount,
    detectRulesSummary: row.detectRulesSummary,
    updatedAt: row.updatedAt
  };
}

function normalizeBackendPageElementRow(row: BackendPageElementRow): PageElement {
  return {
    id: row.id,
    pageResourceId: row.pageResourceId,
    logicName: row.logicName,
    selector: row.selector,
    selectorType: row.selectorType,
    frameLocation: row.frameLocation ?? "",
    updatedAt: row.updatedAt ?? row.updateTime ?? nowIso()
  };
}

function normalizeBackendBusinessFieldRow(row: BackendBusinessFieldRow): BusinessFieldDefinition {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    scope: row.scope,
    pageResourceId: row.pageResourceId ?? undefined,
    valueType: row.valueType,
    required: Boolean(row.required),
    description: row.description ?? "",
    ownerOrgId: row.ownerOrgId,
    status: row.status,
    currentVersion: row.currentVersion ?? 1,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    updatedAt: row.updatedAt ?? row.updateTime ?? nowIso()
  };
}

function normalizeBackendPageFieldBindingRow(row: BackendPageFieldBindingRow): PageFieldBinding {
  return {
    id: row.id,
    pageResourceId: row.pageResourceId,
    businessFieldCode: row.businessFieldCode,
    pageElementId: row.pageElementId,
    required: Boolean(row.required),
    updatedAt: row.updatedAt ?? row.updateTime ?? nowIso()
  };
}

function replacePageElementsForResource(pageResourceId: number, nextRows: PageElement[]) {
  store.pageElements = [
    ...nextRows,
    ...store.pageElements.filter((item) => item.pageResourceId !== pageResourceId)
  ];
}

function replacePageFieldBindingsForResource(pageResourceId: number, nextRows: PageFieldBinding[]) {
  store.pageFieldBindings = [
    ...nextRows,
    ...store.pageFieldBindings.filter((item) => item.pageResourceId !== pageResourceId)
  ];
}

function mergeBusinessFields(nextRows: BusinessFieldDefinition[], pageResourceId?: number) {
  if (pageResourceId === undefined) {
    store.businessFields = clone(nextRows);
    return;
  }
  const incomingIds = new Set(nextRows.map((item) => item.id));
  store.businessFields = [
    ...nextRows,
    ...store.businessFields.filter(
      (item) => item.pageResourceId !== pageResourceId && !incomingIds.has(item.id)
    )
  ];
}

function normalizePendingResourceType(value: string): PublishPendingItem["resourceType"] | null {
  if (
    value === "PAGE_RESOURCE" ||
    value === "RULE" ||
    value === "JOB_SCENE" ||
    value === "INTERFACE" ||
    value === "PREPROCESSOR" ||
    value === "MENU_SDK_POLICY"
  ) {
    return value;
  }
  return null;
}

function normalizeBackendPublishValidationReport(
  row: BackendPublishValidationReportRow
): ValidationReport {
  const sourceItems = Array.isArray(row.items) ? row.items : [];
  const mappedItems = sourceItems.map((item, index) => {
    const key = item.key?.trim() || item.type?.trim() || `backend_${index + 1}`;
    const label = item.label?.trim() || item.target?.trim() || item.type?.trim() || `后端校验项 ${index + 1}`;
    const detail = item.detail?.trim() || item.reason?.trim() || "校验未通过";
    const passed = typeof item.passed === "boolean" ? item.passed : false;
    return {
      key,
      label,
      passed,
      detail
    } satisfies ValidationItem;
  });
  if (mappedItems.length === 0) {
    return {
      pass: Boolean(row.pass),
      items: [
        {
          key: "backend_validation",
          label: "后端发布校验",
          passed: Boolean(row.pass),
          detail: row.pass ? "后端校验通过" : "后端校验未通过"
        }
      ]
    };
  }
  return {
    pass: Boolean(row.pass),
    items: mappedItems
  };
}

function normalizeBackendPermissionResourceRow(row: BackendPermissionResourceRow): PermissionResource {
  return {
    id: row.id,
    resourceCode: row.resourceCode,
    resourceName: row.resourceName,
    resourceType: row.resourceType,
    resourcePath: row.resourcePath,
    pagePath: row.pagePath ?? undefined,
    status: row.status,
    orderNo: row.orderNo,
    description: row.description ?? undefined,
    updatedAt: row.updateTime ?? ""
  };
}

function normalizeBackendRoleRow(row: BackendRoleRow): RoleItem {
  return {
    id: row.id,
    name: row.name,
    roleType: row.roleType,
    status: row.status,
    orgScopeId: row.orgScopeId,
    memberCount: row.memberCount,
    updatedAt: row.updateTime ?? ""
  };
}

function normalizeBackendRoleResourceGrantRow(row: BackendRoleResourceGrantRow): RoleResourceGrant {
  return {
    id: row.id,
    roleId: row.roleId,
    resourceCode: row.resourceCode,
    createdAt: row.createTime ?? ""
  };
}

function normalizeBackendUserRoleBindingRow(row: BackendUserRoleBindingRow): UserRoleBinding {
  return {
    id: row.id,
    userId: row.userId,
    roleId: row.roleId,
    status: row.status,
    createdAt: row.createTime ?? ""
  };
}

function normalizeBackendExecutionMode(raw: unknown): JobSceneDefinition["executionMode"] {
  if (raw === "AUTO_WITHOUT_PROMPT" || raw === "AUTO_AFTER_PROMPT" || raw === "PREVIEW_THEN_EXECUTE" || raw === "FLOATING_BUTTON") {
    return raw;
  }
  return "AUTO_AFTER_PROMPT";
}

function normalizeBackendJobSceneRow(
  row: BackendJobSceneRow,
  fallbackOwnerOrgId = "branch-east"
): JobSceneDefinition {
  const normalizedOwnerOrgId = row.ownerOrgId?.trim() || fallbackOwnerOrgId;
  return {
    id: row.id,
    name: row.name,
    ownerOrgId: normalizedOwnerOrgId,
    shareMode: normalizeShareMode(row.shareMode as JobSceneDefinition["shareMode"]),
    sharedOrgIds: normalizeSharedOrgIds(row.sharedOrgIds),
    sharedBy: row.sharedBy ?? undefined,
    sharedAt: row.sharedAt ?? undefined,
    sourceSceneId: row.sourceSceneId ?? undefined,
    sourceSceneName: row.sourceSceneName ?? undefined,
    pageResourceId: row.pageResourceId,
    pageResourceName: row.pageResourceName ?? "",
    executionMode: normalizeBackendExecutionMode(row.executionMode),
    previewBeforeExecute: Boolean(row.previewBeforeExecute),
    floatingButtonEnabled: Boolean(row.floatingButtonEnabled),
    floatingButtonLabel: row.floatingButtonLabel ?? "重新执行",
    floatingButtonX: typeof row.floatingButtonX === "number" ? row.floatingButtonX : 86,
    floatingButtonY: typeof row.floatingButtonY === "number" ? row.floatingButtonY : 78,
    status: row.status,
    nodeCount: row.nodeCount ?? 0,
    manualDurationSec: typeof row.manualDurationSec === "number" ? row.manualDurationSec : 30,
    riskConfirmed: Boolean(row.riskConfirmed)
  };
}

function normalizeBackendInterfaceRow(row: BackendInterfaceRow): InterfaceDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    method: row.method,
    testPath: row.testPath ?? row.prodPath,
    prodPath: row.prodPath,
    url: row.url ?? row.prodPath,
    status: row.status,
    ownerOrgId: row.ownerOrgId,
    currentVersion: row.currentVersion,
    timeoutMs: row.timeoutMs ?? 3000,
    retryTimes: row.retryTimes ?? 0,
    bodyTemplateJson: row.bodyTemplateJson ?? "",
    inputConfigJson: row.inputConfigJson,
    outputConfigJson: row.outputConfigJson,
    paramSourceSummary: row.paramSourceSummary,
    responsePath: row.responsePath,
    maskSensitive: row.maskSensitive ?? true,
    updatedAt: row.updatedAt ?? ""
  };
}

function buildBackendMenuSdkPolicyPayload(payload: MenuSdkPolicy) {
  const matchedMenu = store.pageMenus.find((item) => item.id === payload.menuId);
  if (!matchedMenu) {
    throw new Error("请选择有效菜单");
  }
  return {
    id: payload.id,
    menuCode: matchedMenu.menuCode,
    menuName: matchedMenu.menuName,
    regionId: matchedMenu.regionId,
    promptGrayEnabled: payload.promptGrayEnabled,
    promptGrayVersion: payload.promptGrayEnabled ? payload.promptGrayVersion?.trim() ?? "" : "",
    promptGrayOrgIds: payload.promptGrayEnabled ? normalizeStringList(payload.promptGrayOrgIds) : [],
    jobGrayEnabled: payload.jobGrayEnabled,
    jobGrayVersion: payload.jobGrayEnabled ? payload.jobGrayVersion?.trim() ?? "" : "",
    jobGrayOrgIds: payload.jobGrayEnabled ? normalizeStringList(payload.jobGrayOrgIds) : [],
    effectiveStart: toBackendDateTime(payload.effectiveStart),
    effectiveEnd: toBackendDateTime(payload.effectiveEnd),
    status: payload.status
  };
}

function updateStatus<T extends { id: number; status: LifecycleState; updatedAt: string }>(
  items: T[],
  id: number,
  status: LifecycleState
) {
  return items.map((item) => (item.id === id ? { ...item, status, updatedAt: nowIso() } : item));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeStringList(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeShareMode(shareMode: RuleDefinition["shareMode"] | JobSceneDefinition["shareMode"]) {
  return shareMode === "SHARED" ? "SHARED" : "PRIVATE";
}

function normalizeSharedOrgIds(sharedOrgIds: string[] | null | undefined) {
  return normalizeStringList(sharedOrgIds);
}

function normalizeSharedRule(rule: RuleDefinition): RuleDefinition {
  return {
    ...rule,
    shareMode: normalizeShareMode(rule.shareMode),
    sharedOrgIds: normalizeSharedOrgIds(rule.sharedOrgIds)
  };
}

function normalizeSharedScene(scene: JobSceneDefinition): JobSceneDefinition {
  return {
    ...scene,
    shareMode: normalizeShareMode(scene.shareMode),
    sharedOrgIds: normalizeSharedOrgIds(scene.sharedOrgIds),
    ownerOrgId: scene.ownerOrgId ?? "branch-east"
  };
}

function isVisibleToViewer(
  target: { ownerOrgId: string; shareMode?: RuleDefinition["shareMode"]; sharedOrgIds?: string[] },
  viewerOrgId?: string
) {
  if (!viewerOrgId) {
    return true;
  }
  return canAccessSharedObject(
    {
      ownerOrgId: target.ownerOrgId,
      shareMode: normalizeShareMode(target.shareMode),
      sharedOrgIds: normalizeSharedOrgIds(target.sharedOrgIds)
    },
    {
      orgScopeId: viewerOrgId,
      roleType: "CONFIG_OPERATOR"
    }
  );
}

function normalizeOptionalVersion(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function extractTransformParamCount(functionCode: string): number | null {
  const match = /^function\s+transform\s*\(([^)]*)\)/.exec(functionCode.trim());
  if (!match) {
    return null;
  }
  const params = match[1].trim();
  if (!params) {
    return 0;
  }
  return params
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function normalizeTransformSignature(functionCode: string, paramCount: number) {
  const trimmed = functionCode.trim();
  const signaturePattern = /^function\s+transform\s*\(([^)]*)\)/;
  const matched = signaturePattern.exec(trimmed);
  if (!matched) {
    return trimmed;
  }
  const originalParams = matched[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const expectedCount = Math.max(1, paramCount);
  const nextParams = originalParams.length > 0 ? [...originalParams] : ["input"];
  while (nextParams.length < expectedCount) {
    const baseName = `arg${nextParams.length}`;
    let candidate = baseName;
    let suffix = 1;
    while (nextParams.includes(candidate)) {
      candidate = `${baseName}_${suffix}`;
      suffix += 1;
    }
    nextParams.push(candidate);
  }

  return trimmed.replace(signaturePattern, `function transform(${nextParams.join(", ")})`);
}

const PLATFORM_RUNTIME_GROUP_KEY = "platform-runtime";

const PLATFORM_RUNTIME_ITEM_KEY_MAP = {
  promptStableVersion: "promptStableVersion",
  promptGrayDefaultVersion: "promptGrayDefaultVersion",
  jobStableVersion: "jobStableVersion",
  jobGrayDefaultVersion: "jobGrayDefaultVersion"
} as const;

const PLATFORM_RUNTIME_ITEM_ORDER: Record<string, number> = {
  promptStableVersion: 1,
  promptGrayDefaultVersion: 2,
  jobStableVersion: 3,
  jobGrayDefaultVersion: 4
};

function getGeneralConfigItem(groupKey: string, itemKey: string) {
  return store.generalConfigItems.find((item) => item.groupKey === groupKey && item.itemKey === itemKey) ?? null;
}

function getGeneralConfigItemValue(groupKey: string, itemKey: string) {
  return getGeneralConfigItem(groupKey, itemKey)?.itemValue ?? "";
}

function syncPlatformRuntimeConfigFromGeneralItems(updatedBy?: string) {
  const promptStableVersion = getGeneralConfigItemValue(PLATFORM_RUNTIME_GROUP_KEY, PLATFORM_RUNTIME_ITEM_KEY_MAP.promptStableVersion);
  const promptGrayDefaultVersion = normalizeOptionalVersion(
    getGeneralConfigItemValue(PLATFORM_RUNTIME_GROUP_KEY, PLATFORM_RUNTIME_ITEM_KEY_MAP.promptGrayDefaultVersion)
  );
  const jobStableVersion = getGeneralConfigItemValue(PLATFORM_RUNTIME_GROUP_KEY, PLATFORM_RUNTIME_ITEM_KEY_MAP.jobStableVersion);
  const jobGrayDefaultVersion = normalizeOptionalVersion(
    getGeneralConfigItemValue(PLATFORM_RUNTIME_GROUP_KEY, PLATFORM_RUNTIME_ITEM_KEY_MAP.jobGrayDefaultVersion)
  );

  store.platformRuntimeConfig = {
    promptStableVersion: promptStableVersion || seedPlatformRuntimeConfig.promptStableVersion,
    promptGrayDefaultVersion,
    jobStableVersion: jobStableVersion || seedPlatformRuntimeConfig.jobStableVersion,
    jobGrayDefaultVersion,
    updatedBy: updatedBy ?? store.platformRuntimeConfig.updatedBy ?? seedPlatformRuntimeConfig.updatedBy
  };
}

function normalizeBackendGeneralConfigItemRow(row: BackendGeneralConfigItemRow): GeneralConfigItem {
  return {
    id: row.id,
    groupKey: row.groupKey,
    itemKey: row.itemKey,
    itemValue: row.itemValue,
    description: row.description ?? "",
    status: row.status,
    orderNo: row.orderNo,
    updatedAt: row.updateTime ?? nowIso()
  };
}

function replaceGeneralConfigGroup(groupKey: string, rows: GeneralConfigItem[]) {
  const incomingGroups = new Set([groupKey]);
  store.generalConfigItems = [
    ...rows,
    ...store.generalConfigItems.filter((item) => !incomingGroups.has(item.groupKey))
  ];
}

function upsertGeneralConfigItemInStore(row: GeneralConfigItem) {
  store.generalConfigItems = [
    row,
    ...store.generalConfigItems.filter(
      (item) => item.id !== row.id && (item.groupKey !== row.groupKey || item.itemKey !== row.itemKey)
    )
  ];
}

function upsertGeneralConfigItemInternal(
  payload: Omit<GeneralConfigUpsertPayload, "updatedAt"> & { updatedAt?: string }
) {
  const next: GeneralConfigItem = {
    ...payload,
    id: payload.id ?? nextId(store.generalConfigItems),
    groupKey: payload.groupKey.trim(),
    itemKey: payload.itemKey.trim(),
    itemValue: payload.itemValue,
    description: payload.description?.trim() ?? "",
    updatedAt: payload.updatedAt ?? nowIso()
  };
  const exists = store.generalConfigItems.some((item) => item.id === next.id);
  store.generalConfigItems = exists
    ? store.generalConfigItems.map((item) => (item.id === next.id ? next : item))
    : [next, ...store.generalConfigItems];
}

function normalizePublishEffectiveOptions(
  options?: string[] | PublishEffectiveOptions
): PublishEffectiveOptions {
  if (Array.isArray(options)) {
    return {
      effectiveOrgIds: options
    };
  }
  return options ?? {};
}

function normalizeKeyword(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isWithinIsoRange(value: string, startAt?: string, endAt?: string) {
  if (startAt && value < startAt) {
    return false;
  }
  if (endAt && value > endAt) {
    return false;
  }
  return true;
}

function matchesPromptHitRecordFilters(item: PromptHitRecord, filters: PromptHitRecordFilters) {
  const keyword = normalizeKeyword(filters.keyword);
  if (filters.ruleId && item.ruleId !== filters.ruleId) {
    return false;
  }
  if (filters.pageResourceId && item.pageResourceId !== filters.pageResourceId) {
    return false;
  }
  if (filters.orgId && item.orgId !== filters.orgId) {
    return false;
  }
  if (!isWithinIsoRange(item.triggerAt, filters.startAt, filters.endAt)) {
    return false;
  }
  if (!keyword) {
    return true;
  }
  return (
    item.ruleName.toLowerCase().includes(keyword) ||
    item.pageResourceName.toLowerCase().includes(keyword) ||
    item.promptContentSummary.toLowerCase().includes(keyword) ||
    (item.sceneName ?? "").toLowerCase().includes(keyword)
  );
}

function matchesJobExecutionRecordFilters(item: JobExecutionRecord, filters: JobExecutionRecordFilters) {
  const keyword = normalizeKeyword(filters.keyword);
  if (filters.sceneId && item.sceneId !== filters.sceneId) {
    return false;
  }
  if (filters.sceneName && item.sceneName !== filters.sceneName) {
    return false;
  }
  if (filters.result && filters.result !== "ALL" && item.result !== filters.result) {
    return false;
  }
  if (filters.pageResourceId && item.pageResourceId !== filters.pageResourceId) {
    return false;
  }
  if (filters.orgId && item.orgId !== filters.orgId) {
    return false;
  }
  if (!isWithinIsoRange(item.startedAt, filters.startAt, filters.endAt)) {
    return false;
  }
  if (!keyword) {
    return true;
  }
  return (
    item.sceneName.toLowerCase().includes(keyword) ||
    item.pageResourceName.toLowerCase().includes(keyword) ||
    item.orgName.toLowerCase().includes(keyword) ||
    (item.failureReasonSummary ?? "").toLowerCase().includes(keyword)
  );
}

function buildRuleEffectiveTimeValidation(
  effectiveStartAt: string | undefined,
  effectiveEndAt: string | undefined
): ValidationItem {
  const normalizedStartAt = effectiveStartAt?.trim() ?? "";
  const normalizedEndAt = effectiveEndAt?.trim() ?? "";
  if (!normalizedStartAt) {
    return {
      key: "time_range",
      label: "规则生效时间",
      passed: false,
      detail: "请补充规则生效开始时间"
    };
  }
  if (!normalizedEndAt) {
    return {
      key: "time_range",
      label: "规则生效时间",
      passed: false,
      detail: "请补充规则生效结束时间"
    };
  }
  if (normalizedStartAt > normalizedEndAt) {
    return {
      key: "time_range",
      label: "规则生效时间",
      passed: false,
      detail: "规则生效结束时间不能早于开始时间"
    };
  }
  return {
    key: "time_range",
    label: "规则生效时间",
    passed: true,
    detail: `${normalizedStartAt} ~ ${normalizedEndAt}`
  };
}

function mergeValidationItem(report: ValidationReport, item: ValidationItem): ValidationReport {
  const nextItems = report.items.some((current) => current.key === item.key)
    ? report.items.map((current) => (current.key === item.key ? item : current))
    : [...report.items, item];
  return {
    pass: nextItems.every((current) => current.passed),
    items: nextItems
  };
}

function nextId(items: Array<{ id: number }>) {
  if (items.length === 0) {
    return 1;
  }
  return Math.max(...items.map((item) => item.id)) + 1;
}

function isValidResourcePathForType(resourceType: PermissionResource["resourceType"], resourcePath: string) {
  if (resourceType === "MENU") {
    return resourcePath.startsWith("/menu/");
  }
  if (resourceType === "PAGE") {
    return resourcePath.startsWith("/page/");
  }
  return resourcePath.startsWith("/action/");
}

function getRoleMemberUserIds(roleId: number): string[] {
  return normalizeStringList(
    store.userRoleBindings
      .filter((binding) => binding.roleId === roleId && binding.status === "ACTIVE")
      .map((binding) => binding.userId)
  );
}

function syncRoleMemberCount(roleId: number) {
  const memberCount = getRoleMemberUserIds(roleId).length;
  store.roles = store.roles.map((role) => (role.id === roleId ? { ...role, memberCount } : role));
}

function getRoleResourceCodes(roleId: number): string[] {
  return normalizeStringList(
    store.roleResourceGrants.filter((grant) => grant.roleId === roleId).map((grant) => grant.resourceCode)
  );
}

function getResourcePathsByCodes(resourceCodes: string[]): string[] {
  return normalizeStringList(
    resourceCodes
      .map((resourceCode) => store.permissionResources.find((resource) => resource.resourceCode === resourceCode))
      .filter((resource): resource is PermissionResource => Boolean(resource && resource.status === "ACTIVE"))
      .map((resource) => resource.resourcePath)
  );
}

function appendAuditLog(
  action: PublishAuditLog["action"],
  resourceType: string,
  resourceName: string,
  operator: string,
  resourceId?: number,
  auditMeta?: Pick<
    PublishAuditLog,
    | "approvalTicketId"
    | "approvalSource"
    | "approvalStatus"
    | "effectiveScopeType"
    | "effectiveOrgIds"
    | "effectiveScopeSummary"
    | "effectiveStartAt"
    | "effectiveEndAt"
  >
) {
  store.auditLogs = [
    {
      id: nextId(store.auditLogs),
      action,
      resourceType,
      resourceId,
      resourceName,
      operator,
      ...auditMeta,
      createdAt: nowIso()
    },
    ...store.auditLogs
  ];
  if (!isMockModeEnabled) {
    void backendRequest("/api/control/publish/logs", {
      method: "POST",
      body: JSON.stringify({
        action,
        resourceType,
        resourceId,
        resourceName,
        operator,
        effectiveScopeType: auditMeta?.effectiveScopeType,
        effectiveOrgIds: auditMeta?.effectiveOrgIds ?? [],
        effectiveScopeSummary: auditMeta?.effectiveScopeSummary,
        effectiveStartAt: auditMeta?.effectiveStartAt,
        effectiveEndAt: auditMeta?.effectiveEndAt,
        approvalTicketId: auditMeta?.approvalTicketId,
        approvalSource: auditMeta?.approvalSource,
        approvalStatus: auditMeta?.approvalStatus
      })
    }).catch(() => undefined);
  }
}

function formatEffectiveScopeSummary(scopeOrgIds: string[]) {
  if (scopeOrgIds.length === 0) {
    return "全部机构";
  }
  return scopeOrgIds.map((orgId) => getOrgLabel(orgId)).join("、");
}

function recalcPendingSummary(): PublishPendingSummary {
  const next: PublishPendingSummary = {
    draftCount: store.pendingItems.filter((it) => it.pendingType === "DRAFT").length,
    expiringSoonCount: store.pendingItems.filter((it) => it.pendingType === "EXPIRING_SOON").length,
    validationFailedCount: store.pendingItems.filter((it) => it.pendingType === "VALIDATION_FAILED").length,
    conflictCount: store.pendingItems.filter((it) => it.pendingType === "CONFLICT").length,
    riskConfirmPendingCount: store.pendingItems.filter((it) => it.pendingType === "RISK_CONFIRM").length
  };
  store.pendingSummary = next;
  return next;
}

function getResourceRecord(pending: PublishPendingItem) {
  switch (pending.resourceType) {
    case "RULE":
      return store.rules.find((item) => item.id === pending.resourceId) ?? null;
    case "JOB_SCENE":
      return store.scenes.find((item) => item.id === pending.resourceId) ?? null;
    case "PAGE_RESOURCE":
      return store.pageResources.find((item) => item.id === pending.resourceId) ?? null;
    case "INTERFACE":
      return store.interfaces.find((item) => item.id === pending.resourceId) ?? null;
    case "PREPROCESSOR":
      return store.dataProcessors.find((item) => item.id === pending.resourceId) ?? null;
    case "MENU_SDK_POLICY":
      return store.menuSdkPolicies.find((item) => item.id === pending.resourceId) ?? null;
    default:
      return null;
  }
}

function createValidationReport(pending: PublishPendingItem): ValidationReport {
  syncPlatformRuntimeConfigFromGeneralItems();
  const runtimeConfig = store.platformRuntimeConfig;
  const resource = getResourceRecord(pending);
  if (!resource) {
    return {
      pass: false,
      items: [
        {
          key: "resource_exists",
          label: "对象存在",
          passed: false,
          detail: "对象不存在或已被删除，请先刷新当前列表。"
        }
      ]
    };
  }

  const items: ValidationItem[] = [];

  const ownerOrgId = "ownerOrgId" in resource ? String(resource.ownerOrgId ?? "") : pending.ownerOrgId;
  items.push({
    key: "owner",
    label: "归属机构",
    passed: ownerOrgId.trim().length > 0,
    detail: ownerOrgId.trim().length > 0 ? getOrgLabel(ownerOrgId) : "尚未配置归属机构"
  });

  const notExpired = resource.status !== "EXPIRED";
  items.push({
    key: "state",
    label: "对象状态",
    passed: notExpired,
    detail: notExpired ? "当前对象状态可继续发布" : "对象已过期，不能继续发布"
  });

  items.push({
    key: "time_range",
    label: "生效时间",
    passed: true,
    detail: "当前原型默认通过，真实环境应以后端最终门禁为准"
  });

  if (pending.resourceType === "RULE") {
    const rule = resource as RuleDefinition;
    items[items.length - 1] = rule.effectiveStartAt?.trim() && rule.effectiveEndAt?.trim()
      ? buildRuleEffectiveTimeValidation(rule.effectiveStartAt, rule.effectiveEndAt)
      : {
          key: "time_range",
          label: "规则生效时间",
          passed: true,
          detail: "生效时间可在确认生效时补充"
        };
    const hasSceneIfNeed = !rule.hasConfirmButton || Boolean(rule.sceneId);
    items.push({
      key: "rule_scene_binding",
      label: "确认动作关联场景",
      passed: hasSceneIfNeed,
      detail: hasSceneIfNeed ? "已完成确认动作配置" : "开启确认按钮后还未绑定作业场景"
    });

    const conflict = store.rules.some(
      (item) =>
        item.id !== rule.id &&
        item.status === "ACTIVE" &&
        item.ruleScope === "PAGE_RESOURCE" &&
        rule.ruleScope === "PAGE_RESOURCE" &&
        item.pageResourceId === rule.pageResourceId &&
        item.priority === rule.priority
    );
    items.push({
      key: "rule_conflict",
      label: "同页优先级冲突",
      passed: !conflict,
      detail: conflict ? "同一页面已存在相同优先级的生效规则" : "未发现同页优先级冲突"
    });
  }

  if (pending.resourceType === "JOB_SCENE") {
    const scene = resource as JobSceneDefinition;
    const hasManualDuration = scene.manualDurationSec > 0;
    items.push({
      key: "manual_duration",
      label: "人工基准时长",
      passed: hasManualDuration,
      detail: hasManualDuration ? `${scene.manualDurationSec} 秒` : "尚未配置人工基准时长"
    });
  }

  if (pending.resourceType === "PREPROCESSOR") {
    const processor = resource as DataProcessorDefinition;
    const signatureParamCount = extractTransformParamCount(processor.functionCode);
    const controlledPass =
      Number.isInteger(processor.paramCount) &&
      processor.paramCount >= 1 &&
      signatureParamCount !== null &&
      signatureParamCount === processor.paramCount;
    items.push({
      key: "processor_control",
      label: "函数签名校验",
      passed: controlledPass,
      detail: controlledPass ? "参数个数与 transform 签名一致" : "请检查 transform 函数签名与参数个数配置"
    });
  }

  if (pending.resourceType === "MENU_SDK_POLICY") {
    const policy = resource as MenuSdkPolicy;
    const capability = store.menuCapabilityPolicies.find((item) => item.menuId === policy.menuId);
    const ruleValidation = validateMenuSdkPolicy({
      policy,
      platformConfig: runtimeConfig,
      capabilityStatus: capability
        ? {
            promptStatus: capability.promptStatus,
            jobStatus: capability.jobStatus
          }
        : undefined
    });
    const timePass = policy.effectiveStart <= policy.effectiveEnd;
    items.push({
      key: "gray_policy",
      label: "灰度策略规则",
      passed: ruleValidation.ok,
      detail: ruleValidation.ok ? "灰度策略校验通过" : ruleValidation.errors.join("；")
    });
    items.push({
      key: "runtime_baseline",
      label: "平台正式版本",
      passed:
        Boolean(runtimeConfig.promptStableVersion.trim()) &&
        Boolean(runtimeConfig.jobStableVersion.trim()),
      detail: `提示:${runtimeConfig.promptStableVersion} / 作业:${runtimeConfig.jobStableVersion}`
    });
    items.push({
      key: "effective_time",
      label: "生效时间窗",
      passed: timePass,
      detail: timePass ? `${policy.effectiveStart} ~ ${policy.effectiveEnd}` : "生效时间范围不合法"
    });
  }

  const pass = items.every((item) => item.passed);
  return { pass, items };
}

function buildPublishRiskItems(report: ValidationReport) {
  const riskItems = new Set<string>();

  if (report.items.some((item) => item.key === "rule_conflict" && !item.passed)) {
    riskItems.add("当前规则与同页已生效规则存在优先级冲突，请先确认覆盖策略。");
  }

  return Array.from(riskItems);
}

function toPublishValidationReport(pending: PublishPendingItem, report: ValidationReport): PublishValidationReport {
  const blockingCount = report.items.filter((item) => !item.passed).length;
  const warningCount = 0;
  return {
    ...report,
    blockingCount,
    warningCount,
    impactSummary: `${pending.resourceName} 预计影响机构：${getOrgLabel(pending.ownerOrgId)}`,
    riskItems: buildPublishRiskItems(report)
  };
}

function touchPendingForResource(
  resourceType: PublishPendingItem["resourceType"],
  resourceId: number,
  status: LifecycleState,
  ownerOrgId: string,
  resourceName: string,
  pendingType: PublishPendingItem["pendingType"] = "DRAFT"
) {
  const existing = store.pendingItems.find(
    (item) => item.resourceType === resourceType && item.resourceId === resourceId
  );
  if (existing) {
    store.pendingItems = store.pendingItems.map((item) =>
      item.id === existing.id ? { ...item, status, pendingType, updatedAt: nowIso() } : item
    );
  } else {
    store.pendingItems = [
      {
        id: nextId(store.pendingItems),
        resourceType,
        resourceId,
        resourceName,
        status,
        ownerOrgId,
        pendingType,
        updatedAt: nowIso()
      },
      ...store.pendingItems
    ];
  }
  recalcPendingSummary();
}

function sortPendingItems(items: PublishPendingItem[]) {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function syncPendingItems(items: PublishPendingItem[]) {
  store.pendingItems = clone(sortPendingItems(items));
  recalcPendingSummary();
  return clone(store.pendingItems);
}

export const configCenterService = {
  async getDashboardOverview(): Promise<DashboardOverview> {
    await sleep(120);
    store.dashboard = {
      ...store.dashboard,
      pageResourceCount: store.pageResources.length,
      activeRuleCount: store.rules.filter((it) => it.status === "ACTIVE").length,
      activeSceneCount: store.scenes.filter((it) => it.status === "ACTIVE").length,
      activeInterfaceCount: store.interfaces.filter((it) => it.status === "ACTIVE").length,
      roleCount: store.roles.length,
      pendingCount: store.pendingItems.length
    };
    return clone(store.dashboard);
  },

  async listPageMenus(): Promise<PageMenu[]> {
    await sleep(100);
    if (isMockModeEnabled) {
      return clone(store.pageMenus);
    }
    const rows = await backendRequest<BackendPageMenuRow[]>("/api/control/page-menus");
    const next = rows.map(normalizeBackendPageMenuRow);
    store.pageMenus = clone(next);
    return clone(next);
  },

  async upsertPageMenu(payload: BackendPageMenuUpsertRequest): Promise<PageMenu> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendPageMenuRow>("/api/control/page-menus", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const next = normalizeBackendPageMenuRow(response);
      store.pageMenus = store.pageMenus.some((item) => item.id === next.id)
        ? store.pageMenus.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.pageMenus];
      return clone(next);
    }
    const exists = store.pageMenus.find((item) => item.menuCode === payload.menuCode);
    if (exists) {
      throw new Error("菜单编码已存在，请修改后重试。");
    }
    const next: PageMenu = {
      id: nextId(store.pageMenus),
      regionId: payload.regionId,
      menuCode: payload.menuCode,
      menuName: payload.menuName,
      status: payload.status,
      ownerOrgId: "head-office"
    };
    store.pageMenus = [next, ...store.pageMenus];
    return clone(next);
  },

  async listPageResources(): Promise<PageResource[]> {
    await sleep(150);
    if (isMockModeEnabled) {
      return clone(store.pageResources);
    }
    const response = await backendRequest<BackendPageResourcePage>("/api/control/page-resources");
    const next = response.records.map(normalizeBackendPageResourceRow);
    store.pageResources = clone(next);
    return clone(next);
  },

  async listGeneralConfigItems(groupKey?: string): Promise<GeneralConfigItem[]> {
    await sleep(120);
    const normalizedGroupKey = groupKey?.trim();
    if (isMockModeEnabled) {
      const rows = normalizedGroupKey
        ? store.generalConfigItems.filter((item) => item.groupKey === normalizedGroupKey)
        : store.generalConfigItems;
      return clone(rows);
    }
    const response = normalizedGroupKey
      ? await backendRequest<BackendGeneralConfigItemRow[]>(`/api/governance/general-config-items?groupKey=${encodeURIComponent(normalizedGroupKey)}`)
      : await backendRequest<BackendGeneralConfigItemRow[]>("/api/governance/general-config-items");
    const rows = response.map(normalizeBackendGeneralConfigItemRow);
    if (normalizedGroupKey) {
      replaceGeneralConfigGroup(normalizedGroupKey, rows);
    } else {
      store.generalConfigItems = clone(rows);
    }
    if (!normalizedGroupKey || normalizedGroupKey === PLATFORM_RUNTIME_GROUP_KEY || rows.some((item) => item.groupKey === PLATFORM_RUNTIME_GROUP_KEY)) {
      syncPlatformRuntimeConfigFromGeneralItems(store.platformRuntimeConfig.updatedBy);
    }
    return clone(rows);
  },

  async upsertGeneralConfigItem(payload: GeneralConfigUpsertPayload): Promise<GeneralConfigItem> {
    await sleep(150);
    const groupKey = payload.groupKey.trim();
    const itemKey = payload.itemKey.trim();
    if (isMockModeEnabled) {
      const existedByNaturalKey = store.generalConfigItems.find(
        (item) => item.groupKey === groupKey && item.itemKey === itemKey
      );
      const upsertId = existedByNaturalKey?.id ?? payload.id ?? nextId(store.generalConfigItems);

      upsertGeneralConfigItemInternal({
        ...payload,
        id: upsertId,
        groupKey,
        itemKey
      });
      if (groupKey === PLATFORM_RUNTIME_GROUP_KEY) {
        syncPlatformRuntimeConfigFromGeneralItems(store.platformRuntimeConfig.updatedBy);
      }
      const saved = store.generalConfigItems.find((item) => item.id === upsertId);
      if (!saved) {
        throw new Error("配置项保存失败");
      }
      return clone(saved);
    }

    const body = {
      groupKey,
      itemKey,
      itemValue: payload.itemValue,
      description: payload.description ?? "",
      status: payload.status,
      orderNo: payload.orderNo
    };
    const response = payload.id
      ? await backendRequest<BackendGeneralConfigItemRow>(`/api/governance/general-config-items/${payload.id}`, {
          method: "POST",
          body: JSON.stringify(body)
        })
      : await backendRequest<BackendGeneralConfigItemRow>("/api/governance/general-config-items", {
          method: "POST",
          body: JSON.stringify(body)
        });
    const saved = normalizeBackendGeneralConfigItemRow(response);
    upsertGeneralConfigItemInStore(saved);
    if (saved.groupKey === PLATFORM_RUNTIME_GROUP_KEY) {
      syncPlatformRuntimeConfigFromGeneralItems(store.platformRuntimeConfig.updatedBy);
    }
    return clone(saved);
  },

  async updateGeneralConfigItemStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (isMockModeEnabled) {
      store.generalConfigItems = updateStatus(store.generalConfigItems, id, status);
      const target = store.generalConfigItems.find((item) => item.id === id);
      if (target?.groupKey === PLATFORM_RUNTIME_GROUP_KEY) {
        syncPlatformRuntimeConfigFromGeneralItems(store.platformRuntimeConfig.updatedBy);
      }
      return;
    }
    const response = await backendRequest<BackendGeneralConfigItemRow>(`/api/governance/general-config-items/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    const saved = normalizeBackendGeneralConfigItemRow(response);
    upsertGeneralConfigItemInStore(saved);
    if (saved.groupKey === PLATFORM_RUNTIME_GROUP_KEY) {
      syncPlatformRuntimeConfigFromGeneralItems(store.platformRuntimeConfig.updatedBy);
    }
  },

  async getPlatformRuntimeConfig(): Promise<PlatformRuntimeConfig> {
    await sleep(120);
    if (isMockModeEnabled) {
      syncPlatformRuntimeConfigFromGeneralItems();
      return clone(store.platformRuntimeConfig);
    }
    await configCenterService.listGeneralConfigItems(PLATFORM_RUNTIME_GROUP_KEY);
    return clone(store.platformRuntimeConfig);
  },

  async updatePlatformRuntimeConfig(
    payload: PlatformRuntimeConfig
  ): Promise<PlatformRuntimeConfig> {
    await sleep(160);
    const validation = validatePlatformRuntimeConfig({
      promptStableVersion: payload.promptStableVersion,
      jobStableVersion: payload.jobStableVersion
    });
    if (!validation.ok) {
      throw new Error(validation.errors[0] ?? "平台版本参数不合法");
    }

    if (isMockModeEnabled) {
      const toUpsert = (itemKey: string, itemValue: string, description: string) => {
        const exists = getGeneralConfigItem(PLATFORM_RUNTIME_GROUP_KEY, itemKey);
        upsertGeneralConfigItemInternal({
          id: exists?.id ?? nextId(store.generalConfigItems),
          groupKey: PLATFORM_RUNTIME_GROUP_KEY,
          itemKey,
          itemValue,
          description,
          status: exists?.status ?? "ACTIVE",
          orderNo: exists?.orderNo ?? PLATFORM_RUNTIME_ITEM_ORDER[itemKey] ?? 99
        });
      };

      toUpsert(PLATFORM_RUNTIME_ITEM_KEY_MAP.promptStableVersion, payload.promptStableVersion.trim(), "智能提示正式版本");
      toUpsert(
        PLATFORM_RUNTIME_ITEM_KEY_MAP.promptGrayDefaultVersion,
        normalizeOptionalVersion(payload.promptGrayDefaultVersion) ?? "",
        "智能提示默认灰度版本"
      );
      toUpsert(PLATFORM_RUNTIME_ITEM_KEY_MAP.jobStableVersion, payload.jobStableVersion.trim(), "智能作业正式版本");
      toUpsert(
        PLATFORM_RUNTIME_ITEM_KEY_MAP.jobGrayDefaultVersion,
        normalizeOptionalVersion(payload.jobGrayDefaultVersion) ?? "",
        "智能作业默认灰度版本"
      );

      syncPlatformRuntimeConfigFromGeneralItems(payload.updatedBy);
      return clone(store.platformRuntimeConfig);
    }

    const rows = await configCenterService.listGeneralConfigItems(PLATFORM_RUNTIME_GROUP_KEY);
    const rowMap = new Map(rows.map((item) => [item.itemKey, item]));
    const upsertItem = async (itemKey: string, itemValue: string, description: string) => {
      const exists = rowMap.get(itemKey);
      await configCenterService.upsertGeneralConfigItem({
        id: exists?.id,
        groupKey: PLATFORM_RUNTIME_GROUP_KEY,
        itemKey,
        itemValue,
        description,
        status: exists?.status ?? "ACTIVE",
        orderNo: exists?.orderNo ?? PLATFORM_RUNTIME_ITEM_ORDER[itemKey] ?? 99
      });
    };

    await upsertItem(PLATFORM_RUNTIME_ITEM_KEY_MAP.promptStableVersion, payload.promptStableVersion.trim(), "智能提示正式版本");
    await upsertItem(
      PLATFORM_RUNTIME_ITEM_KEY_MAP.promptGrayDefaultVersion,
      normalizeOptionalVersion(payload.promptGrayDefaultVersion) ?? "",
      "智能提示默认灰度版本"
    );
    await upsertItem(PLATFORM_RUNTIME_ITEM_KEY_MAP.jobStableVersion, payload.jobStableVersion.trim(), "智能作业正式版本");
    await upsertItem(
      PLATFORM_RUNTIME_ITEM_KEY_MAP.jobGrayDefaultVersion,
      normalizeOptionalVersion(payload.jobGrayDefaultVersion) ?? "",
      "智能作业默认灰度版本"
    );

    syncPlatformRuntimeConfigFromGeneralItems(payload.updatedBy);
    return clone(store.platformRuntimeConfig);
  },

  async listMenuSdkPolicies(): Promise<MenuSdkPolicy[]> {
    if (isMockModeEnabled) {
      await sleep(150);
      return clone(store.menuSdkPolicies);
    }
    const rows = await backendRequest<BackendMenuSdkPolicyRow[]>("/api/governance/menu-sdk-policies");
    const next = rows.map(normalizeMenuSdkPolicyRow);
    store.menuSdkPolicies = clone(next);
    return clone(next);
  },

  async upsertMenuSdkPolicy(payload: MenuSdkPolicy): Promise<MenuSdkPolicy> {
    if (isMockModeEnabled) {
      await sleep(180);
      syncPlatformRuntimeConfigFromGeneralItems();
      const capability = store.menuCapabilityPolicies.find((item) => item.menuId === payload.menuId);
      const validation = validateMenuSdkPolicy({
        policy: payload,
        platformConfig: store.platformRuntimeConfig,
        capabilityStatus: capability
          ? {
              promptStatus: capability.promptStatus,
              jobStatus: capability.jobStatus
            }
          : undefined
      });
      if (!validation.ok) {
        throw new Error(validation.errors[0] ?? "菜单灰度策略校验失败");
      }

      const next: MenuSdkPolicy = {
        ...payload,
        promptGrayVersion: payload.promptGrayEnabled ? normalizeOptionalVersion(payload.promptGrayVersion) : undefined,
        promptGrayOrgIds: payload.promptGrayEnabled ? normalizeStringList(payload.promptGrayOrgIds) : [],
        jobGrayVersion: payload.jobGrayEnabled ? normalizeOptionalVersion(payload.jobGrayVersion) : undefined,
        jobGrayOrgIds: payload.jobGrayEnabled ? normalizeStringList(payload.jobGrayOrgIds) : []
      };
      const exists = store.menuSdkPolicies.find((item) => item.id === payload.id);
      store.menuSdkPolicies = exists
        ? store.menuSdkPolicies.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.menuSdkPolicies];
      touchPendingForResource("MENU_SDK_POLICY", next.id, next.status, next.ownerOrgId, `菜单策略-${next.menuCode}`);
      return clone(next);
    }

    const capability = store.menuCapabilityPolicies.find((item) => item.menuId === payload.menuId);
    const validation = validateMenuSdkPolicy({
      policy: payload,
      platformConfig: store.platformRuntimeConfig,
      capabilityStatus: capability
        ? {
            promptStatus: capability.promptStatus,
            jobStatus: capability.jobStatus
          }
        : undefined
    });
    if (!validation.ok) {
      throw new Error(validation.errors[0] ?? "菜单灰度策略校验失败");
    }

    const response = payload.id
      ? await backendRequest<BackendMenuSdkPolicyRow>(`/api/governance/menu-sdk-policies/${payload.id}`, {
          method: "POST",
          body: JSON.stringify(buildBackendMenuSdkPolicyPayload(payload))
        })
      : await backendRequest<BackendMenuSdkPolicyRow>("/api/governance/menu-sdk-policies", {
          method: "POST",
          body: JSON.stringify(buildBackendMenuSdkPolicyPayload(payload))
        });
    const next = normalizeMenuSdkPolicyRow(response);
    store.menuSdkPolicies = store.menuSdkPolicies.some((item) => item.id === next.id)
      ? store.menuSdkPolicies.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.menuSdkPolicies];
    touchPendingForResource("MENU_SDK_POLICY", next.id, next.status, next.ownerOrgId, `菜单策略-${next.menuCode}`);
    return clone(next);
  },

  async listMenuCapabilityPolicies(): Promise<MenuCapabilityPolicy[]> {
    await sleep(120);
    return clone(store.menuCapabilityPolicies);
  },

  async listMenuCapabilityRequests(menuId?: number): Promise<MenuCapabilityRequest[]> {
    await sleep(120);
    const rows = typeof menuId === "number"
      ? store.menuCapabilityRequests.filter((item) => item.menuId === menuId)
      : store.menuCapabilityRequests;
    return clone(rows);
  },

  async submitMenuCapabilityRequest(payload: {
    menuId: number;
    capabilityTypes: Array<"PROMPT" | "JOB">;
    reason: string;
    applicant?: string;
    action?: "ENABLE" | "DISABLE";
  }): Promise<MenuCapabilityPolicy> {
    await sleep(180);
    const current = store.menuCapabilityPolicies.find((item) => item.menuId === payload.menuId);
    const requested = Array.from(new Set(payload.capabilityTypes));
    const action = payload.action ?? "ENABLE";
    if (requested.length === 0) {
      throw new Error("请选择至少一个申请能力");
    }
    if (!payload.reason.trim()) {
      throw new Error("请填写申请原因");
    }

    let nextPromptStatus = current?.promptStatus ?? "DISABLED";
    let nextJobStatus = current?.jobStatus ?? "DISABLED";
    let createdCount = 0;

    for (const capabilityType of requested) {
      if (capabilityType === "PROMPT") {
        if (action === "ENABLE") {
          if (nextPromptStatus === "DISABLED") {
            nextPromptStatus = "ENABLED";
            createdCount += 1;
          }
        } else if (nextPromptStatus === "ENABLED") {
          nextPromptStatus = "DISABLED";
          createdCount += 1;
        }
      } else if (action === "ENABLE") {
        if (nextJobStatus === "DISABLED") {
          nextJobStatus = "ENABLED";
          createdCount += 1;
        }
      } else if (nextJobStatus === "ENABLED") {
        nextJobStatus = "DISABLED";
        createdCount += 1;
      }
    }

    if (createdCount === 0) {
      throw new Error(action === "ENABLE" ? "所选能力已开通，请勿重复操作" : "所选能力已停用，请勿重复操作");
    }

    const next: MenuCapabilityPolicy = {
      id: current?.id ?? nextId(store.menuCapabilityPolicies),
      menuId: payload.menuId,
      promptStatus: nextPromptStatus,
      jobStatus: nextJobStatus,
      status: nextPromptStatus === "ENABLED" && nextJobStatus === "ENABLED" ? "ACTIVE" : "DRAFT"
    };
    store.menuCapabilityPolicies = current
      ? store.menuCapabilityPolicies.map((item) => (item.id === current.id ? next : item))
      : [next, ...store.menuCapabilityPolicies];

    return clone(next);
  },

  async updateRuleListLookupConditions(ruleId: number, conditions: RuleDefinition["listLookupConditions"]): Promise<RuleDefinition> {
    await sleep(140);
    const current = store.rules.find((item) => item.id === ruleId);
    if (!current) {
      throw new Error("规则不存在");
    }
    const next: RuleDefinition = {
      ...current,
      listLookupConditions: clone(conditions ?? []),
      updatedAt: nowIso()
    };
    store.rules = store.rules.map((item) => (item.id === ruleId ? next : item));
    return clone(next);
  },

  async upsertPageResource(
    payload: BackendPageResourceUpsertRequest
  ): Promise<PageResource> {
    await sleep(180);
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendPageResourceRow>("/api/control/page-resources", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          menuCode: payload.menuCode ?? null,
          pageCode: payload.pageCode,
          frameCode: payload.frameCode ?? "",
          name: payload.name,
          status: payload.status,
          ownerOrgId: payload.ownerOrgId,
          detectRulesSummary: payload.detectRulesSummary
        })
      });
      const next = normalizeBackendPageResourceRow(response);
      store.pageResources = store.pageResources.some((item) => item.id === next.id)
        ? store.pageResources.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.pageResources];
      return clone(next);
    }
    const exists = store.pageResources.find((item) => item.id === payload.id);
    const next: PageResource = {
      menuCode: payload.menuCode ?? "",
      pageCode: payload.pageCode,
      frameCode: payload.frameCode ?? undefined,
      name: payload.name,
      status: payload.status,
      ownerOrgId: payload.ownerOrgId,
      currentVersion: payload.currentVersion ?? exists?.currentVersion ?? 1,
      elementCount: payload.elementCount ?? exists?.elementCount ?? 0,
      detectRulesSummary: payload.detectRulesSummary,
      id: payload.id ?? nextId(store.pageResources),
      updatedAt: payload.updatedAt ?? nowIso()
    };

    if (exists && exists.status === "ACTIVE") {
      const draftVersion: PageResource = {
        ...next,
        id: nextId(store.pageResources),
        status: "DRAFT",
        currentVersion: exists.currentVersion + 1,
        updatedAt: nowIso()
      };
      store.pageResources = [draftVersion, ...store.pageResources];
      touchPendingForResource("PAGE_RESOURCE", draftVersion.id, "DRAFT", draftVersion.ownerOrgId, draftVersion.name);
      return clone(draftVersion);
    }

    store.pageResources = exists
      ? store.pageResources.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.pageResources];

    if (next.status === "DRAFT") {
      touchPendingForResource("PAGE_RESOURCE", next.id, "DRAFT", next.ownerOrgId, next.name);
    }

    return clone(next);
  },

  async listPageElements(pageResourceId: number): Promise<PageElement[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendPageElementRow[]>(`/api/control/page-resources/${pageResourceId}/elements`);
      const next = rows.map(normalizeBackendPageElementRow);
      replacePageElementsForResource(pageResourceId, next);
      return clone(next);
    }
    return clone(store.pageElements.filter((item) => item.pageResourceId === pageResourceId));
  },

  async listBusinessFields(pageResourceId?: number): Promise<BusinessFieldDefinition[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendBusinessFieldRow[]>(
        `/api/control/business-fields${buildQueryString({
          pageResourceId
        })}`
      );
      const next = rows.map(normalizeBackendBusinessFieldRow);
      mergeBusinessFields(next, pageResourceId);
      return clone(
        next.filter(
          (item) => item.scope === "GLOBAL" || pageResourceId === undefined || item.pageResourceId === pageResourceId
        )
      );
    }
    return clone(
      store.businessFields.filter(
        (item) => item.scope === "GLOBAL" || pageResourceId === undefined || item.pageResourceId === pageResourceId
      )
    );
  },

  async upsertBusinessField(
    payload: Omit<BusinessFieldDefinition, "updatedAt"> & { updatedAt?: string }
  ): Promise<BusinessFieldDefinition> {
    await sleep(150);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendBusinessFieldRow>("/api/control/business-fields", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          code: payload.code,
          name: payload.name,
          scope: payload.scope,
          pageResourceId: payload.pageResourceId ?? null,
          valueType: payload.valueType,
          required: payload.required,
          description: payload.description,
          ownerOrgId: payload.ownerOrgId,
          status: payload.status,
          currentVersion: payload.currentVersion,
          aliases: payload.aliases
        } satisfies BackendBusinessFieldUpsertRequest)
      });
      const next = normalizeBackendBusinessFieldRow(row);
      store.businessFields = store.businessFields.some((item) => item.id === next.id)
        ? store.businessFields.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.businessFields];
      return clone(next);
    }
    const next: BusinessFieldDefinition = {
      ...payload,
      updatedAt: payload.updatedAt ?? nowIso()
    };
    const exists = store.businessFields.some((item) => item.id === next.id);
    store.businessFields = exists
      ? store.businessFields.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.businessFields];
    return clone(next);
  },

  async listPageFieldBindings(pageResourceId: number): Promise<PageFieldBinding[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendPageFieldBindingRow[]>(
        `/api/control/page-resources/${pageResourceId}/field-bindings`
      );
      const next = rows.map(normalizeBackendPageFieldBindingRow);
      replacePageFieldBindingsForResource(pageResourceId, next);
      return clone(next);
    }
    return clone(store.pageFieldBindings.filter((item) => item.pageResourceId === pageResourceId));
  },

  async upsertPageFieldBinding(
    payload: Omit<PageFieldBinding, "updatedAt"> & { updatedAt?: string }
  ): Promise<PageFieldBinding> {
    await sleep(150);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendPageFieldBindingRow>("/api/control/page-field-bindings", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          pageResourceId: payload.pageResourceId,
          businessFieldCode: payload.businessFieldCode,
          pageElementId: payload.pageElementId,
          required: payload.required
        } satisfies BackendPageFieldBindingUpsertRequest)
      });
      const next = normalizeBackendPageFieldBindingRow(row);
      store.pageFieldBindings = store.pageFieldBindings.some((item) => item.id === next.id)
        ? store.pageFieldBindings.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.pageFieldBindings];
      return clone(next);
    }
    const next: PageFieldBinding = {
      ...payload,
      updatedAt: payload.updatedAt ?? nowIso()
    };
    const exists = store.pageFieldBindings.some((item) => item.id === next.id);
    store.pageFieldBindings = exists
      ? store.pageFieldBindings.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.pageFieldBindings];
    return clone(next);
  },

  async deletePageFieldBinding(id: number): Promise<void> {
    await sleep(100);
    if (!isMockModeEnabled) {
      await backendRequest<void>(`/api/control/page-field-bindings/${id}`, {
        method: "POST"
      });
      store.pageFieldBindings = store.pageFieldBindings.filter((item) => item.id !== id);
      return;
    }
    store.pageFieldBindings = store.pageFieldBindings.filter((item) => item.id !== id);
  },

  async upsertPageElement(payload: Omit<PageElement, "updatedAt"> & { updatedAt?: string }): Promise<PageElement> {
    await sleep(140);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendPageElementRow>("/api/control/page-elements", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          pageResourceId: payload.pageResourceId,
          logicName: payload.logicName,
          selector: payload.selector,
          selectorType: payload.selectorType,
          frameLocation: payload.frameLocation
        } satisfies BackendPageElementUpsertRequest)
      });
      const next = normalizeBackendPageElementRow(row);
      store.pageElements = store.pageElements.some((item) => item.id === next.id)
        ? store.pageElements.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.pageElements];
      const elementCount = store.pageElements.filter((item) => item.pageResourceId === next.pageResourceId).length;
      store.pageResources = store.pageResources.map((item) =>
        item.id === next.pageResourceId ? { ...item, elementCount, updatedAt: nowIso() } : item
      );
      return clone(next);
    }
    const next: PageElement = {
      ...payload,
      updatedAt: payload.updatedAt ?? nowIso()
    };
    const exists = store.pageElements.some((item) => item.id === next.id);
    store.pageElements = exists
      ? store.pageElements.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.pageElements];

    const resource = store.pageResources.find((item) => item.id === next.pageResourceId);
    if (resource) {
      const elementCount = store.pageElements.filter((item) => item.pageResourceId === resource.id).length;
      store.pageResources = store.pageResources.map((item) =>
        item.id === resource.id ? { ...item, elementCount, updatedAt: nowIso() } : item
      );
    }
    return clone(next);
  },

  async deletePageElement(elementId: number): Promise<void> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const target = store.pageElements.find((item) => item.id === elementId);
      await backendRequest<void>(`/api/control/page-elements/${elementId}`, {
        method: "POST"
      });
      store.pageElements = store.pageElements.filter((item) => item.id !== elementId);
      if (target) {
        const elementCount = store.pageElements.filter((item) => item.pageResourceId === target.pageResourceId).length;
        store.pageResources = store.pageResources.map((item) =>
          item.id === target.pageResourceId ? { ...item, elementCount, updatedAt: nowIso() } : item
        );
      }
      return;
    }
    const target = store.pageElements.find((item) => item.id === elementId);
    if (!target) {
      return;
    }
    store.pageElements = store.pageElements.filter((item) => item.id !== elementId);
    const elementCount = store.pageElements.filter((item) => item.pageResourceId === target.pageResourceId).length;
    store.pageResources = store.pageResources.map((item) =>
      item.id === target.pageResourceId ? { ...item, elementCount, updatedAt: nowIso() } : item
    );
  },

  async listInterfaces(): Promise<InterfaceDefinition[]> {
    await sleep(150);
    if (isMockModeEnabled) {
      return clone(store.interfaces);
    }
    const response = await backendRequest<{ total: number; pageNo: number; pageSize: number; records: BackendInterfaceRow[] }>(
      "/api/control/interfaces?pageNo=1&pageSize=500"
    );
    const next = response.records.map(normalizeBackendInterfaceRow);
    store.interfaces = clone(next);
    return clone(next);
  },

  async upsertInterface(payload: Omit<InterfaceDefinition, "updatedAt"> & { updatedAt?: string }): Promise<InterfaceDefinition> {
    await sleep(170);
    if (isMockModeEnabled) {
      const exists = store.interfaces.find((item) => item.id === payload.id);
      const next: InterfaceDefinition = {
        ...payload,
        updatedAt: payload.updatedAt ?? nowIso()
      };
      if (exists && exists.status === "ACTIVE") {
        const draftVersion: InterfaceDefinition = {
          ...next,
          id: nextId(store.interfaces),
          status: "DRAFT",
          currentVersion: exists.currentVersion + 1,
          updatedAt: nowIso()
        };
        store.interfaces = [draftVersion, ...store.interfaces];
        touchPendingForResource("INTERFACE", draftVersion.id, "DRAFT", draftVersion.ownerOrgId, draftVersion.name);
        return clone(draftVersion);
      }

      store.interfaces = exists
        ? store.interfaces.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.interfaces];

      if (next.status === "DRAFT") {
        touchPendingForResource("INTERFACE", next.id, "DRAFT", next.ownerOrgId, next.name);
      }

      return clone(next);
    }

    const response = await backendRequest<BackendInterfaceRow>("/api/control/interfaces", {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        method: payload.method,
        testPath: payload.testPath,
        prodPath: payload.prodPath,
        url: payload.url,
        ownerOrgId: payload.ownerOrgId,
        currentVersion: payload.currentVersion,
        timeoutMs: payload.timeoutMs,
        retryTimes: payload.retryTimes,
        bodyTemplateJson: payload.bodyTemplateJson,
        inputConfigJson: payload.inputConfigJson,
        outputConfigJson: payload.outputConfigJson,
        paramSourceSummary: payload.paramSourceSummary,
        responsePath: payload.responsePath,
        maskSensitive: payload.maskSensitive
      } satisfies BackendInterfaceUpsertRequest)
    });
    const next = normalizeBackendInterfaceRow(response);
    const exists = store.interfaces.some((item) => item.id === next.id);
    store.interfaces = exists
      ? store.interfaces.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.interfaces];
    if (next.status === "DRAFT") {
      touchPendingForResource("INTERFACE", next.id, "DRAFT", next.ownerOrgId, next.name);
    }
    return clone(next);
  },

  async saveInterfaceDraft(
    payload: InterfaceDraftPayload,
    options: { inputConfig: Record<string, ApiInputParam[]>; outputConfig: ApiOutputParam[]; ownerOrgId?: string }
  ): Promise<SaveDraftResult<InterfaceDefinition>> {
    await sleep(120);
    const report = validateInterfaceDraftPayload(payload, options.inputConfig, options.outputConfig, store.interfaces);
    if (!report.canSaveDraft) {
      return { success: false, report };
    }
    const exists = store.interfaces.find((item) => item.id === payload.id);
    const ownerOrgId = exists?.ownerOrgId ?? options.ownerOrgId ?? "branch-east";
    if (isMockModeEnabled) {
      const hydratedPayload: Omit<InterfaceDefinition, "updatedAt"> = {
        id: payload.id,
        name: payload.name,
        description: payload.description,
        method: payload.method,
        testPath: payload.prodPath,
        prodPath: payload.prodPath,
        url: payload.prodPath,
        status: exists?.status ?? "DRAFT",
        ownerOrgId,
        currentVersion: payload.currentVersion,
        timeoutMs: exists?.timeoutMs ?? 3000,
        retryTimes: exists?.retryTimes ?? 0,
        bodyTemplateJson: payload.bodyTemplateJson,
        inputConfigJson: payload.inputConfigJson,
        outputConfigJson: payload.outputConfigJson,
        paramSourceSummary: payload.paramSourceSummary,
        responsePath: payload.responsePath,
        maskSensitive: exists?.maskSensitive ?? true
      };
      const data = await configCenterService.upsertInterface(hydratedPayload);
      return { success: true, data, report };
    }

    const response = await backendRequest<BackendInterfaceRow>("/api/control/interfaces", {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        method: payload.method,
        testPath: payload.prodPath,
        prodPath: payload.prodPath,
        url: payload.prodPath,
        ownerOrgId,
        currentVersion: payload.currentVersion,
        timeoutMs: exists?.timeoutMs ?? 3000,
        retryTimes: exists?.retryTimes ?? 0,
        bodyTemplateJson: payload.bodyTemplateJson,
        inputConfigJson: payload.inputConfigJson,
        outputConfigJson: payload.outputConfigJson,
        paramSourceSummary: payload.paramSourceSummary,
        responsePath: payload.responsePath,
        maskSensitive: exists?.maskSensitive ?? true
      } satisfies BackendInterfaceUpsertRequest)
    });
    const data = normalizeBackendInterfaceRow(response);
    const next = store.interfaces.some((item) => item.id === data.id)
      ? store.interfaces.map((item) => (item.id === data.id ? data : item))
      : [data, ...store.interfaces];
    store.interfaces = next;
    touchPendingForResource("INTERFACE", data.id, "DRAFT", ownerOrgId, data.name);
    return { success: true, data, report };
  },

  async updateInterfaceStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (isMockModeEnabled) {
      store.interfaces = updateStatus(store.interfaces, id, status);
      const row = store.interfaces.find((item) => item.id === id);
      if (row) {
        appendAuditLog(status === "DISABLED" ? "DISABLE" : "PUBLISH", "INTERFACE", row.name, "system", row.id);
      }
      return;
    }

    const response = await backendRequest<BackendInterfaceRow>(`/api/control/interfaces/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status } satisfies BackendInterfaceStatusUpdateRequest)
    });
    const next = normalizeBackendInterfaceRow(response);
    store.interfaces = store.interfaces.some((item) => item.id === next.id)
      ? store.interfaces.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.interfaces];
  },

  async listDataProcessors(): Promise<DataProcessorDefinition[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendDataProcessorRow[]>("/api/control/data-processors");
      return clone(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          paramCount: row.paramCount,
          functionCode: row.functionCode,
          status: row.status,
          usedByCount: row.usedByCount ?? 0,
          updatedAt: ""
        }))
      );
    }
    return clone(store.dataProcessors);
  },

  async upsertDataProcessor(
    payload: Omit<DataProcessorDefinition, "updatedAt" | "usedByCount"> & {
      usedByCount?: number;
      updatedAt?: string;
    }
  ): Promise<DataProcessorDefinition> {
    await sleep(160);
    const normalizedName = payload.name.trim();
    if (!normalizedName) {
      throw new Error("请输入名称");
    }
    const normalizedParamCount = Number(payload.paramCount);
    if (!Number.isInteger(normalizedParamCount) || normalizedParamCount < 1) {
      throw new Error("参数个数至少为 1");
    }
    const normalizedFunctionCode = normalizeTransformSignature(payload.functionCode, normalizedParamCount);
    const signatureParamCount = extractTransformParamCount(normalizedFunctionCode);
    if (signatureParamCount === null) {
      throw new Error("请使用 function transform(...) 标准函数声明");
    }
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendDataProcessorRow>("/api/control/data-processors", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          name: normalizedName,
          paramCount: normalizedParamCount,
          functionCode: normalizedFunctionCode,
          status: payload.status
        } satisfies BackendDataProcessorUpsertRequest)
      });
      const next: DataProcessorDefinition = {
        id: response.id,
        name: response.name,
        paramCount: response.paramCount,
        functionCode: response.functionCode,
        status: response.status,
        usedByCount: response.usedByCount ?? 0,
        updatedAt: ""
      };
      const exists = store.dataProcessors.some((item) => item.id === next.id);
      store.dataProcessors = exists
        ? store.dataProcessors.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.dataProcessors];
      return clone(next);
    }
    const exists = store.dataProcessors.find((item) => item.id === payload.id);
    const usedByCount = exists?.usedByCount ?? payload.usedByCount ?? 0;
    const next: DataProcessorDefinition = {
      ...payload,
      name: normalizedName,
      functionCode: normalizedFunctionCode,
      paramCount: normalizedParamCount,
      usedByCount,
      updatedAt: payload.updatedAt ?? nowIso()
    };

    store.dataProcessors = exists
      ? store.dataProcessors.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.dataProcessors];

    if (next.status === "DRAFT") {
      touchPendingForResource("PREPROCESSOR", next.id, "DRAFT", "head-office", next.name);
    }

    return clone(next);
  },

  async updateDataProcessorStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendDataProcessorRow>(`/api/control/data-processors/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status } satisfies BackendDataProcessorStatusUpdateRequest)
      });
      const next: DataProcessorDefinition = {
        id: response.id,
        name: response.name,
        paramCount: response.paramCount,
        functionCode: response.functionCode,
        status: response.status,
        usedByCount: response.usedByCount ?? 0,
        updatedAt: ""
      };
      store.dataProcessors = store.dataProcessors.some((item) => item.id === next.id)
        ? store.dataProcessors.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.dataProcessors];
      return;
    }
    store.dataProcessors = updateStatus(store.dataProcessors, id, status);
    const row = store.dataProcessors.find((item) => item.id === id);
    if (row) {
      appendAuditLog("DISABLE", "PREPROCESSOR", row.name, "绯荤粺", row.id);
    }
  },

  async listContextVariables(): Promise<ContextVariableDefinition[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendContextVariableRow[]>("/api/control/context-variables");
      return clone(
        rows.map((row) => ({
          id: row.id,
          key: row.key,
          label: row.label,
          valueSource: row.valueSource,
          staticValue: row.staticValue ?? undefined,
          scriptContent: row.scriptContent ?? undefined,
          status: row.status,
          ownerOrgId: row.ownerOrgId,
          updatedAt: ""
        }))
      );
    }
    return clone(store.contextVariables);
  },

  async upsertContextVariable(
    payload: Omit<ContextVariableDefinition, "updatedAt"> & { updatedAt?: string }
  ): Promise<ContextVariableDefinition> {
    await sleep(150);
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendContextVariableRow>("/api/control/context-variables", {
        method: "POST",
        body: JSON.stringify({
          id: payload.id,
          key: payload.key,
          label: payload.label,
          valueSource: payload.valueSource,
          staticValue: payload.staticValue,
          scriptContent: payload.scriptContent,
          status: payload.status,
          ownerOrgId: payload.ownerOrgId
        } satisfies BackendContextVariableUpsertRequest)
      });
      const next: ContextVariableDefinition = {
        id: response.id,
        key: response.key,
        label: response.label,
        valueSource: response.valueSource,
        staticValue: response.staticValue ?? undefined,
        scriptContent: response.scriptContent ?? undefined,
        status: response.status,
        ownerOrgId: response.ownerOrgId,
        updatedAt: ""
      };
      const exists = store.contextVariables.some((item) => item.id === next.id);
      store.contextVariables = exists
        ? store.contextVariables.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.contextVariables];
      return clone(next);
    }
    const next: ContextVariableDefinition = {
      ...payload,
      updatedAt: payload.updatedAt ?? nowIso()
    };
    const exists = store.contextVariables.some((item) => item.id === next.id);
    store.contextVariables = exists
      ? store.contextVariables.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.contextVariables];
    return clone(next);
  },

  async updateContextVariableStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const response = await backendRequest<BackendContextVariableRow>(`/api/control/context-variables/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status } satisfies BackendContextVariableStatusUpdateRequest)
      });
      const next: ContextVariableDefinition = {
        id: response.id,
        key: response.key,
        label: response.label,
        valueSource: response.valueSource,
        staticValue: response.staticValue ?? undefined,
        scriptContent: response.scriptContent ?? undefined,
        status: response.status,
        ownerOrgId: response.ownerOrgId,
        updatedAt: ""
      };
      store.contextVariables = store.contextVariables.some((item) => item.id === next.id)
        ? store.contextVariables.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.contextVariables];
      return;
    }
    store.contextVariables = updateStatus(store.contextVariables, id, status);
  },

  async listRules(options: SharedViewerOptions = {}): Promise<RuleDefinition[]> {
    await sleep(150);
    if (!isMockModeEnabled) {
      const page = await backendRequest<{ total: number; pageNo: number; pageSize: number; records: RuleDefinition[] }>(
        "/api/control/rules?pageNo=1&pageSize=1000"
      );
      const rows = page.records
        .map((rule) => normalizeSharedRule(rule))
        .filter((rule) => isVisibleToViewer(rule, options.viewerOrgId));
      store.rules = rows.length > 0 ? [...rows] : store.rules;
      return clone(rows);
    }
    const rows = store.rules
      .map((rule) => normalizeSharedRule(rule))
      .filter((rule) => isVisibleToViewer(rule, options.viewerOrgId));
    return clone(rows);
  },

  async createRule(payload: RuleCreatePayload): Promise<RuleDefinition> {
    await sleep(200);
    if (payload.closeMode === "TIMER_THEN_MANUAL" && (!payload.closeTimeoutSec || payload.closeTimeoutSec <= 0)) {
      throw new Error("closeTimeoutSec is required when closeMode is TIMER_THEN_MANUAL");
    }
    const duplicated = store.rules.some((item) => item.name === payload.name);
    if (duplicated) {
      throw new Error(`Rule name already exists: ${payload.name}`);
    }
    if (!isMockModeEnabled) {
      const row = await backendRequest<RuleDefinition>("/api/control/rules", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      store.rules = [normalizeSharedRule(row), ...store.rules.filter((item) => item.id !== row.id)];
      if (row.status === "DRAFT") {
        touchPendingForResource("RULE", row.id, "DRAFT", row.ownerOrgId, row.name);
      }
      return clone(row);
    }
    const created: RuleDefinition = {
      ...payload,
      listLookupConditions: clone(payload.listLookupConditions ?? []),
      shareMode: normalizeShareMode(payload.shareMode),
      sharedOrgIds: normalizeSharedOrgIds(payload.sharedOrgIds),
      id: nextId(store.rules),
      currentVersion: payload.currentVersion ?? 1,
      updatedAt: nowIso()
    };
    store.rules = [created, ...store.rules];
    if (created.status === "DRAFT") {
      touchPendingForResource("RULE", created.id, "DRAFT", created.ownerOrgId, created.name);
    }
    return clone(created);
  },
  async upsertRule(payload: RuleUpsertPayload): Promise<RuleDefinition> {
    await sleep(200);
    if (payload.closeMode === "TIMER_THEN_MANUAL" && (!payload.closeTimeoutSec || payload.closeTimeoutSec <= 0)) {
      throw new Error("closeTimeoutSec is required when closeMode is TIMER_THEN_MANUAL");
    }
    const duplicated = store.rules.some((item) => item.name === payload.name && item.id !== payload.id);
    if (duplicated) {
      throw new Error(`Rule name already exists: ${payload.name}`);
    }
    if (!isMockModeEnabled) {
      const row = payload.id
        ? await backendRequest<RuleDefinition>(`/api/control/rules/${payload.id}`, {
            method: "POST",
            body: JSON.stringify(payload)
          })
        : await backendRequest<RuleDefinition>("/api/control/rules", {
            method: "POST",
            body: JSON.stringify(payload)
          });
      store.rules = row.status === "DRAFT"
        ? [normalizeSharedRule(row), ...store.rules.filter((item) => item.id !== row.id)]
        : store.rules.map((item) => (item.id === row.id ? normalizeSharedRule(row) : item)).concat(
            store.rules.some((item) => item.id === row.id) ? [] : [normalizeSharedRule(row)]
          );
      return clone(row);
    }

    const exists = store.rules.find((item) => item.id === payload.id);
    const next: RuleDefinition = {
      ...payload,
      listLookupConditions: clone(payload.listLookupConditions ?? exists?.listLookupConditions ?? []),
      shareMode: normalizeShareMode(payload.shareMode ?? exists?.shareMode),
      sharedOrgIds: normalizeSharedOrgIds(payload.sharedOrgIds ?? exists?.sharedOrgIds),
      updatedAt: payload.updatedAt ?? nowIso()
    };

    if (exists && exists.status !== "DRAFT") {
      const draftVersion: RuleDefinition = {
        ...next,
        id: nextId(store.rules),
        status: "DRAFT",
        currentVersion: exists.currentVersion + 1,
        updatedAt: nowIso()
      };
      store.rules = [draftVersion, ...store.rules];
      touchPendingForResource("RULE", draftVersion.id, "DRAFT", draftVersion.ownerOrgId, draftVersion.name);
      return clone(draftVersion);
    }

    store.rules = exists
      ? store.rules.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.rules];

    if (next.status === "DRAFT") {
      touchPendingForResource("RULE", next.id, "DRAFT", next.ownerOrgId, next.name);
    }

    return clone(next);
  },
  async saveRuleDraft(payload: RuleUpsertPayload): Promise<SaveDraftResult<RuleDefinition>> {
    await sleep(120);
    const draftPayload: RuleUpsertPayload = {
      ...payload,
      status: "DRAFT"
    };
    const report = validateRuleDraftPayload(draftPayload, store.rules);
    if (!report.canSaveDraft) {
      return { success: false, report };
    }
    const data = await configCenterService.upsertRule(draftPayload);
    return { success: true, data, report };
  },
  async updateRuleStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const row = await backendRequest<RuleDefinition>(`/api/control/rules/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      store.rules = store.rules.map((item) => (item.id === row.id ? normalizeSharedRule(row) : item));
      return;
    }
    store.rules = updateStatus(store.rules, id, status);
    const row = store.rules.find((item) => item.id === id);
    if (row) {
      appendAuditLog(status === "DISABLED" ? "DISABLE" : "PUBLISH", "RULE", row.name, "system", row.id);
    }
  },

  async updateRuleShareConfig(
    ruleId: number,
    payload: ShareConfigUpdatePayload,
    operator = "person-zhao-yi"
  ): Promise<RuleDefinition> {
    await sleep(140);
    if (!isMockModeEnabled) {
      const row = await backendRequest<RuleDefinition>(`/api/control/rules/${ruleId}/share`, {
        method: "POST",
        body: JSON.stringify({
          shareMode: payload.shareMode,
          sharedOrgIds: payload.sharedOrgIds,
          operator
        })
      });
      store.rules = store.rules.map((item) => (item.id === row.id ? normalizeSharedRule(row) : item));
      return clone(row);
    }
    const exists = store.rules.find((item) => item.id === ruleId);
    if (!exists) {
      throw new Error("Rule does not exist; cannot update share config.");
    }
    const shareMode = normalizeShareMode(payload.shareMode);
    const sharedOrgIds = shareMode === "PRIVATE" ? [] : normalizeSharedOrgIds(payload.sharedOrgIds);
    const next: RuleDefinition = {
      ...exists,
      shareMode,
      sharedOrgIds,
      sharedBy: operator,
      sharedAt: nowIso(),
      updatedAt: nowIso()
    };
    store.rules = store.rules.map((item) => (item.id === ruleId ? next : item));
    return clone(next);
  },

  async cloneRuleToOrg(ruleId: number, targetOrgId: string, operator = "person-zhao-yi"): Promise<RuleDefinition> {
    await sleep(160);
    if (!isMockModeEnabled) {
      const row = await backendRequest<RuleDefinition>(`/api/control/rules/${ruleId}/clone-logic`, {
        method: "POST",
        body: JSON.stringify({
          targetOrgId,
          operator
        })
      });
      store.rules = [normalizeSharedRule(row), ...store.rules.filter((item) => item.id !== row.id)];
      return clone(row);
    }
    const source = store.rules.find((item) => item.id === ruleId);
    if (!source) {
      throw new Error("Rule does not exist; cannot clone.");
    }
    const cloned: RuleDefinition = {
      ...source,
      id: nextId(store.rules),
      name: `${source.name}-副本`,
      ownerOrgId: targetOrgId,
      shareMode: "PRIVATE",
      sharedOrgIds: [],
      sharedBy: operator,
      sharedAt: nowIso(),
      sourceRuleId: source.id,
      sourceRuleName: source.name,
      status: "DRAFT",
      currentVersion: 1,
      updatedAt: nowIso()
    };
    store.rules = [cloned, ...store.rules];
    return clone(cloned);
  },

  async previewRule(ruleId: number): Promise<{ ruleId: number; previewOnly: true; matched: boolean; detail: string }> {
    await sleep(200);
    const rule = store.rules.find((item) => item.id === ruleId);
    return {
      ruleId,
      previewOnly: true,
      matched: Boolean(rule),
      detail: rule
        ? `Rule ${rule.name} parsed successfully；普通条件 ${rule.id ? "已加载" : "未加载"}，可在高级条件中配置 API 字段、名单字段等来源。`
        : "Rule does not exist; preview unavailable."
    };
  },

  async listJobScenes(options: SharedViewerOptions = {}): Promise<JobSceneDefinition[]> {
    await sleep(150);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<BackendJobSceneRow[]>("/api/control/job-scenes");
      const viewerOrgId = options.viewerOrgId?.trim() || undefined;
      // Formal mode trusts backend access control and avoids client-side over-filtering
      // that can hide newly created rows when legacy ownerOrgId data is inconsistent.
      const normalized = rows.map((row) => normalizeBackendJobSceneRow(row, viewerOrgId ?? "branch-east"));
      return clone(normalized);
    }
    const rows = store.scenes
      .map((scene) => normalizeSharedScene(scene))
      .filter((scene) =>
        isVisibleToViewer(
          {
            ownerOrgId: scene.ownerOrgId ?? "branch-east",
            shareMode: scene.shareMode,
            sharedOrgIds: scene.sharedOrgIds
          },
          options.viewerOrgId
        )
      );
    return clone(rows);
  },

  async upsertJobScene(payload: JobSceneDefinition): Promise<JobSceneDefinition> {
    await sleep(170);
    const exists = store.scenes.find((item) => item.id === payload.id);
    if (!isMockModeEnabled) {
      const useUpdateEndpoint = Boolean(exists && payload.id);
      const authOrgId = getBackendAuthContext()?.orgId?.trim();
      const requestBody: BackendJobSceneUpsertRequest = {
        id: useUpdateEndpoint ? payload.id : undefined,
        name: payload.name,
        ownerOrgId: payload.ownerOrgId ?? exists?.ownerOrgId ?? authOrgId ?? "branch-east",
        shareMode: normalizeShareMode(payload.shareMode ?? exists?.shareMode),
        sharedOrgIds: normalizeSharedOrgIds(payload.sharedOrgIds ?? exists?.sharedOrgIds),
        sharedBy: payload.sharedBy ?? exists?.sharedBy,
        sharedAt: payload.sharedAt ?? exists?.sharedAt,
        sourceSceneId: payload.sourceSceneId ?? exists?.sourceSceneId,
        sourceSceneName: payload.sourceSceneName ?? exists?.sourceSceneName,
        pageResourceId: payload.pageResourceId,
        pageResourceName: payload.pageResourceName,
        executionMode: payload.executionMode,
        previewBeforeExecute: payload.previewBeforeExecute ?? exists?.previewBeforeExecute ?? false,
        floatingButtonEnabled: payload.floatingButtonEnabled ?? exists?.floatingButtonEnabled ?? false,
        floatingButtonLabel: payload.floatingButtonLabel ?? exists?.floatingButtonLabel ?? "",
        floatingButtonX: payload.floatingButtonX ?? exists?.floatingButtonX ?? 0,
        floatingButtonY: payload.floatingButtonY ?? exists?.floatingButtonY ?? 0,
        status: payload.status,
        manualDurationSec: payload.manualDurationSec,
        riskConfirmed: payload.riskConfirmed ?? exists?.riskConfirmed ?? false
      };
      const row = useUpdateEndpoint
        ? await backendRequest<BackendJobSceneRow>(`/api/control/job-scenes/${payload.id}`, {
            method: "POST",
            body: JSON.stringify(requestBody)
          })
        : await backendRequest<BackendJobSceneRow>("/api/control/job-scenes", {
            method: "POST",
            body: JSON.stringify(requestBody)
          });
      const normalized = normalizeBackendJobSceneRow(row);
      store.scenes = normalized.status === "DRAFT"
        ? [normalized, ...store.scenes.filter((item) => item.id !== normalized.id)]
        : store.scenes.map((item) => (item.id === normalized.id ? normalized : item)).concat(
            store.scenes.some((item) => item.id === normalized.id) ? [] : [normalized]
          );
      return clone(normalized);
    }

    const next: JobSceneDefinition = {
      ...payload,
      ownerOrgId: payload.ownerOrgId ?? exists?.ownerOrgId ?? "branch-east",
      shareMode: normalizeShareMode(payload.shareMode ?? exists?.shareMode),
      sharedOrgIds: normalizeSharedOrgIds(payload.sharedOrgIds ?? exists?.sharedOrgIds)
    };

    store.scenes = exists
      ? store.scenes.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.scenes];

    if (next.status === "DRAFT") {
      touchPendingForResource("JOB_SCENE", next.id, "DRAFT", "branch-east", next.name);
    }

    return clone(next);
  },

  async saveJobSceneDraft(payload: JobSceneDefinition): Promise<SaveDraftResult<JobSceneDefinition>> {
    await sleep(120);
    const linkedRules = store.rules.filter((rule) => rule.sceneId === payload.id);
    const report = validateJobSceneDraftPayload(payload, store.scenes, { linkedRules });
    if (!report.canSaveDraft) {
      return { success: false, report };
    }
    const data = await configCenterService.upsertJobScene(payload);
    return { success: true, data, report };
  },

  async updateJobSceneStatus(id: number, status: LifecycleState): Promise<void> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendJobSceneRow>(`/api/control/job-scenes/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status } satisfies BackendJobSceneStatusUpdateRequest)
      });
      store.scenes = store.scenes.map((item) => (item.id === row.id ? normalizeBackendJobSceneRow(row) : item));
      return;
    }
    store.scenes = store.scenes.map((item) => (item.id === id ? { ...item, status } : item));
    const row = store.scenes.find((item) => item.id === id);
    if (row) {
      appendAuditLog(status === "DISABLED" ? "DISABLE" : "PUBLISH", "JOB_SCENE", row.name, "system", row.id);
    }
  },

  async updateJobSceneShareConfig(
    sceneId: number,
    payload: ShareConfigUpdatePayload,
    operator = "person-zhao-yi"
  ): Promise<JobSceneDefinition> {
    await sleep(140);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendJobSceneRow>(`/api/control/job-scenes/${sceneId}/share`, {
        method: "POST",
        body: JSON.stringify({
          shareMode: normalizeShareMode(payload.shareMode),
          sharedOrgIds: normalizeSharedOrgIds(payload.sharedOrgIds),
          operator
        } satisfies BackendJobSceneShareRequest)
      });
      const normalized = normalizeBackendJobSceneRow(row);
      store.scenes = store.scenes.map((item) => (item.id === normalized.id ? normalized : item));
      return clone(normalized);
    }
    const exists = store.scenes.find((item) => item.id === sceneId);
    if (!exists) {
      throw new Error("Scene does not exist; cannot update share config.");
    }
    const shareMode = normalizeShareMode(payload.shareMode);
    const sharedOrgIds = shareMode === "PRIVATE" ? [] : normalizeSharedOrgIds(payload.sharedOrgIds);
    const next: JobSceneDefinition = {
      ...exists,
      ownerOrgId: exists.ownerOrgId ?? "branch-east",
      shareMode,
      sharedOrgIds,
      sharedBy: operator,
      sharedAt: nowIso()
    };
    store.scenes = store.scenes.map((item) => (item.id === sceneId ? next : item));
    return clone(next);
  },

  async cloneJobSceneToOrg(
    sceneId: number,
    targetOrgId: string,
    operator = "person-zhao-yi"
  ): Promise<JobSceneDefinition> {
    await sleep(160);
    if (!isMockModeEnabled) {
      const row = await backendRequest<BackendJobSceneRow>(`/api/control/job-scenes/${sceneId}/clone`, {
        method: "POST",
        body: JSON.stringify({
          targetOrgId,
          operator
        } satisfies BackendJobSceneCloneRequest)
      });
      const normalized = normalizeBackendJobSceneRow(row);
      store.scenes = [normalized, ...store.scenes.filter((item) => item.id !== normalized.id)];
      return clone(normalized);
    }
    const source = store.scenes.find((item) => item.id === sceneId);
    if (!source) {
      throw new Error("Scene does not exist; cannot clone.");
    }
    const cloned: JobSceneDefinition = {
      ...source,
      id: nextId(store.scenes),
      name: `${source.name}-副本`,
      ownerOrgId: targetOrgId,
      shareMode: "PRIVATE",
      sharedOrgIds: [],
      sharedBy: operator,
      sharedAt: nowIso(),
      sourceSceneId: source.id,
      sourceSceneName: source.name,
      status: "DRAFT",
      riskConfirmed: false
    };
    store.scenes = [cloned, ...store.scenes];
    return clone(cloned);
  },

  async confirmJobSceneRisk(id: number): Promise<void> {
    await sleep(160);
    store.scenes = store.scenes.map((item) =>
      item.id === id ? { ...item, riskConfirmed: true } : item
    );

    const row = store.scenes.find((item) => item.id === id);
    if (row) {
      appendAuditLog("RISK_CONFIRM", "JOB_SCENE", row.name, "person-business-manager", row.id);
      store.pendingItems = store.pendingItems.filter(
        (item) => !(item.resourceType === "JOB_SCENE" && item.resourceId === id && item.pendingType === "RISK_CONFIRM")
      );
      recalcPendingSummary();
    }
  },

  async previewJobScene(sceneId: number): Promise<JobScenePreviewField[]> {
    await sleep(160);
    const scene = store.scenes.find((item) => item.id === sceneId);
    if (!scene) {
      return [];
    }

    return [
      {
        key: "customer_name",
        fieldName: "Customer Name",
        originalValue: "Zhang San",
        nextValue: "Zhang San",
        source: "page_get(customer_name)",
        abnormal: false
      },
      {
        key: "risk_score",
        fieldName: "Risk Score",
        originalValue: "-",
        nextValue: "86",
        source: "api_call(risk_score_query)",
        abnormal: false
      },
      {
        key: "mobile",
        fieldName: "Mobile",
        originalValue: "138****8888",
        nextValue: "13800008888",
        source: "js_script(mask_mobile)",
        abnormal: scene.executionMode === "AUTO_WITHOUT_PROMPT"
      }
    ];
  },

  async executeJobScenePreview(sceneId: number, selectedFieldKeys: string[]): Promise<{ writtenCount: number; skippedCount: number; detail: string }> {
    await sleep(180);
    const scene = store.scenes.find((item) => item.id === sceneId);
    if (!scene) {
      throw new Error("Job scene does not exist");
    }
    const total = 3;
    const writtenCount = selectedFieldKeys.length;
    const skippedCount = Math.max(total - writtenCount, 0);

    return {
      writtenCount,
      skippedCount,
      detail: skippedCount > 0 ? `Wrote ${writtenCount} fields, skipped ${skippedCount} fields` : "All fields written"
    };
  },

  async getPendingSummary(): Promise<PublishPendingSummary> {
    await sleep(40);
    const next: PublishPendingSummary = {
      draftCount: 0,
      expiringSoonCount: 0,
      validationFailedCount: 0,
      conflictCount: 0,
      riskConfirmPendingCount: 0
    };
    store.pendingItems = [];
    store.pendingSummary = clone(next);
    return clone(next);
  },

  async listPendingItems(): Promise<PublishPendingItem[]> {
    await sleep(40);
    return syncPendingItems([]);
  },

  async validatePendingItem(pendingId: number, operator = "person-business-manager"): Promise<ValidationReport> {
    await sleep(120);
    const pendingRows = isMockModeEnabled ? store.pendingItems : await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.id === pendingId);
    if (!pending) {
      throw new Error("Pending item not found");
    }
    const report = !isMockModeEnabled
      ? await backendRequest<BackendPublishValidationReportRow>("/api/control/publish/validate", {
          method: "POST",
          body: JSON.stringify({
            resourceId: pending.resourceId
          })
        }).then(normalizeBackendPublishValidationReport).catch(() => createValidationReport(pending))
      : createValidationReport(pending);
    appendAuditLog("VALIDATE", pending.resourceType, pending.resourceName, operator, pending.resourceId);
    if (!report.pass) {
      store.pendingItems = store.pendingItems.map((item) =>
        item.id === pendingId ? { ...item, pendingType: "VALIDATION_FAILED", updatedAt: nowIso() } : item
      );
      recalcPendingSummary();
    }
    return report;
  },

  async getPendingValidationReport(pendingId: number): Promise<PublishValidationReport> {
    await sleep(80);
    const pendingRows = isMockModeEnabled ? store.pendingItems : await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.id === pendingId);
    if (!pending) {
      throw new Error("Pending item not found");
    }
    const report = !isMockModeEnabled
      ? await backendRequest<BackendPublishValidationReportRow>("/api/control/publish/validate", {
          method: "POST",
          body: JSON.stringify({
            resourceId: pending.resourceId
          })
        }).then(normalizeBackendPublishValidationReport).catch(() => createValidationReport(pending))
      : createValidationReport(pending);
    return clone(toPublishValidationReport(pending, report));
  },

  async publishPendingItem(
    pendingId: number,
    operator = "person-business-manager",
    options?: string[] | PublishEffectiveOptions
  ): Promise<PublishPendingResult> {
    await sleep(180);
    const pendingRows = isMockModeEnabled ? store.pendingItems : await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.id === pendingId);
    if (!pending) {
      throw new Error("Pending item not found");
    }

    const effectiveOptions = normalizePublishEffectiveOptions(options);
    const normalizedEffectiveOrgIds = normalizeStringList(effectiveOptions.effectiveOrgIds);
    const effectiveScopeSummary = formatEffectiveScopeSummary(normalizedEffectiveOrgIds);
    let report = !isMockModeEnabled
      ? await backendRequest<BackendPublishValidationReportRow>("/api/control/publish/validate", {
          method: "POST",
          body: JSON.stringify({
            resourceId: pending.resourceId
          })
        }).then(normalizeBackendPublishValidationReport).catch(() => createValidationReport(pending))
      : createValidationReport(pending);
    const resource = getResourceRecord(pending);
    const resolvedRuleEffectiveStartAt =
      pending.resourceType === "RULE" && resource && "effectiveStartAt" in resource
        ? (effectiveOptions.effectiveStartAt?.trim() || resource.effectiveStartAt?.trim() || "")
        : effectiveOptions.effectiveStartAt?.trim() || "";
    const resolvedRuleEffectiveEndAt =
      pending.resourceType === "RULE" && resource && "effectiveEndAt" in resource
        ? (effectiveOptions.effectiveEndAt?.trim() || resource.effectiveEndAt?.trim() || "")
        : effectiveOptions.effectiveEndAt?.trim() || "";
    if (pending.resourceType === "RULE") {
      report = mergeValidationItem(
        report,
        buildRuleEffectiveTimeValidation(resolvedRuleEffectiveStartAt, resolvedRuleEffectiveEndAt)
      );
    }
    if (!report.pass) {
      store.pendingItems = store.pendingItems.map((item) =>
        item.id === pendingId ? { ...item, pendingType: "VALIDATION_FAILED", updatedAt: nowIso() } : item
      );
      recalcPendingSummary();
      return {
        success: false,
        report: toPublishValidationReport(pending, report)
      };
    }

    if (!isMockModeEnabled) {
      if (pending.resourceType === "RULE") {
        const existingRule = store.rules.find((item) => item.id === pending.resourceId);
        if (
          existingRule &&
          (existingRule.effectiveStartAt !== resolvedRuleEffectiveStartAt ||
            existingRule.effectiveEndAt !== resolvedRuleEffectiveEndAt)
        ) {
          await configCenterService.upsertRule({
            ...existingRule,
            status: "DRAFT",
            effectiveStartAt: resolvedRuleEffectiveStartAt,
            effectiveEndAt: resolvedRuleEffectiveEndAt
          });
        }
        await configCenterService.updateRuleStatus(pending.resourceId, "ACTIVE");
      } else if (pending.resourceType === "JOB_SCENE") {
        await configCenterService.updateJobSceneStatus(pending.resourceId, "ACTIVE");
      } else if (pending.resourceType === "INTERFACE") {
        await configCenterService.updateInterfaceStatus(pending.resourceId, "ACTIVE");
      } else if (pending.resourceType === "PREPROCESSOR") {
        await configCenterService.updateDataProcessorStatus(pending.resourceId, "ACTIVE");
      } else if (pending.resourceType === "MENU_SDK_POLICY") {
        const policy =
          store.menuSdkPolicies.find((item) => item.id === pending.resourceId) ??
          (await configCenterService.listMenuSdkPolicies()).find((item) => item.id === pending.resourceId);
        if (!policy) {
          throw new Error("Pending item not found");
        }
        await configCenterService.upsertMenuSdkPolicy({
          ...policy,
          status: "ACTIVE"
        });
      } else if (pending.resourceType === "PAGE_RESOURCE") {
        const pageResource =
          store.pageResources.find((item) => item.id === pending.resourceId) ??
          (await configCenterService.listPageResources()).find((item) => item.id === pending.resourceId);
        if (!pageResource) {
          throw new Error("Pending item not found");
        }
        try {
          const response = await backendRequest<BackendPageResourceRow>(`/api/control/page-resources/${pending.resourceId}/status`, {
            method: "POST",
            body: JSON.stringify({ status: "ACTIVE" })
          });
          const next = normalizeBackendPageResourceRow(response);
          store.pageResources = store.pageResources.some((item) => item.id === next.id)
            ? store.pageResources.map((item) => (item.id === next.id ? next : item))
            : [next, ...store.pageResources];
        } catch {
          await configCenterService.upsertPageResource({
            id: pageResource.id,
            menuCode: pageResource.menuCode,
            pageCode: pageResource.pageCode,
            frameCode: pageResource.frameCode,
            name: pageResource.name,
            status: "ACTIVE",
            ownerOrgId: pageResource.ownerOrgId,
            detectRulesSummary: ""
          });
        }
      }
      await configCenterService.listPendingItems();
      appendAuditLog("PUBLISH", pending.resourceType, pending.resourceName, operator, pending.resourceId, {
        effectiveScopeType: normalizedEffectiveOrgIds.length === 0 ? "ALL_ORGS" : "CUSTOM_ORGS",
        effectiveOrgIds: normalizedEffectiveOrgIds,
        effectiveScopeSummary,
        effectiveStartAt: pending.resourceType === "RULE" ? resolvedRuleEffectiveStartAt : undefined,
        effectiveEndAt: pending.resourceType === "RULE" ? resolvedRuleEffectiveEndAt : undefined
      });
      return {
        success: true,
        report: {
          ...toPublishValidationReport(pending, report),
          impactSummary:
            pending.resourceType === "RULE"
              ? `${pending.resourceName} 生效范围：${effectiveScopeSummary}；生效时间：${resolvedRuleEffectiveStartAt} ~ ${resolvedRuleEffectiveEndAt}`
              : `${pending.resourceName} 生效范围：${effectiveScopeSummary}`
        }
      };
    }

    const activate = <T extends { id: number; status: LifecycleState }>(items: T[]) =>
      items.map((item) => (item.id === pending.resourceId ? { ...item, status: "ACTIVE" } : item));

    if (pending.resourceType === "RULE") {
      store.rules = store.rules.map((item) =>
        item.id === pending.resourceId
          ? {
              ...item,
              status: "ACTIVE",
              effectiveStartAt: resolvedRuleEffectiveStartAt,
              effectiveEndAt: resolvedRuleEffectiveEndAt,
              updatedAt: nowIso()
            }
          : item
      );
    } else if (pending.resourceType === "JOB_SCENE") {
      store.scenes = activate(store.scenes);
    } else if (pending.resourceType === "PAGE_RESOURCE") {
      store.pageResources = activate(store.pageResources);
    } else if (pending.resourceType === "INTERFACE") {
      store.interfaces = activate(store.interfaces);
    } else if (pending.resourceType === "PREPROCESSOR") {
      store.dataProcessors = activate(store.dataProcessors);
    } else if (pending.resourceType === "MENU_SDK_POLICY") {
      store.menuSdkPolicies = activate(store.menuSdkPolicies);
    }
    store.pendingItems = store.pendingItems.filter((item) => item.id !== pendingId);
    recalcPendingSummary();
    appendAuditLog("PUBLISH", pending.resourceType, pending.resourceName, operator, pending.resourceId, {
      effectiveScopeType: normalizedEffectiveOrgIds.length === 0 ? "ALL_ORGS" : "CUSTOM_ORGS",
      effectiveOrgIds: normalizedEffectiveOrgIds,
      effectiveScopeSummary,
      effectiveStartAt: pending.resourceType === "RULE" ? resolvedRuleEffectiveStartAt : undefined,
      effectiveEndAt: pending.resourceType === "RULE" ? resolvedRuleEffectiveEndAt : undefined
    });
    return {
      success: true,
      report: {
        ...toPublishValidationReport(pending, report),
        impactSummary:
          pending.resourceType === "RULE"
            ? `${pending.resourceName} 生效范围：${effectiveScopeSummary}；生效时间：${resolvedRuleEffectiveStartAt} ~ ${resolvedRuleEffectiveEndAt}`
            : `${pending.resourceName} 生效范围：${effectiveScopeSummary}`
      }
    };
  },

  async deferPendingItem(pendingId: number, operator = "person-business-manager"): Promise<void> {
    await sleep(120);
    const pendingRows = isMockModeEnabled ? store.pendingItems : await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.id === pendingId);
    if (!pending) {
      throw new Error("Pending item not found");
    }
    store.pendingItems = store.pendingItems.map((item) =>
      item.id === pendingId ? { ...item, pendingType: "EXPIRING_SOON", updatedAt: nowIso() } : item
    );
    recalcPendingSummary();
    appendAuditLog("DEFER", pending.resourceType, pending.resourceName, operator, pending.resourceId);
  },

  async resolvePendingItem(pendingId: number, operator = "person-business-manager"): Promise<void> {
    await sleep(120);
    const pendingRows = isMockModeEnabled ? store.pendingItems : await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.id === pendingId);
    if (!pending) {
      throw new Error("Pending item not found");
    }
    store.pendingItems = store.pendingItems.filter((item) => item.id !== pendingId);
    recalcPendingSummary();
    appendAuditLog("RESOLVE", pending.resourceType, pending.resourceName, operator, pending.resourceId);
  },

  async rollbackResource(resourceType: string, resourceId: number, operator = "person-business-manager"): Promise<void> {
    await sleep(160);
    if (!isMockModeEnabled) {
      const normalizedType = normalizePendingResourceType(resourceType);
      if (!normalizedType) {
        return;
      }
      let rolledBackName = `${normalizedType}-${resourceId}`;
      if (normalizedType === "RULE") {
        const rule = store.rules.find((item) => item.id === resourceId);
        if (rule) {
          rolledBackName = rule.name;
        }
        await configCenterService.updateRuleStatus(resourceId, "DRAFT");
      } else if (normalizedType === "JOB_SCENE") {
        const scene = store.scenes.find((item) => item.id === resourceId);
        if (scene) {
          rolledBackName = scene.name;
        }
        await configCenterService.updateJobSceneStatus(resourceId, "DRAFT");
      } else if (normalizedType === "INTERFACE") {
        const targetInterface = store.interfaces.find((item) => item.id === resourceId);
        if (targetInterface) {
          rolledBackName = targetInterface.name;
        }
        await configCenterService.updateInterfaceStatus(resourceId, "DRAFT");
      } else if (normalizedType === "PREPROCESSOR") {
        const processor = store.dataProcessors.find((item) => item.id === resourceId);
        if (processor) {
          rolledBackName = processor.name;
        }
        await configCenterService.updateDataProcessorStatus(resourceId, "DRAFT");
      } else if (normalizedType === "MENU_SDK_POLICY") {
        const policy =
          store.menuSdkPolicies.find((item) => item.id === resourceId) ??
          (await configCenterService.listMenuSdkPolicies()).find((item) => item.id === resourceId);
        if (!policy) {
          return;
        }
        rolledBackName = `菜单策略-${policy.menuCode}`;
        await configCenterService.upsertMenuSdkPolicy({
          ...policy,
          status: "DRAFT"
        });
      } else if (normalizedType === "PAGE_RESOURCE") {
        const pageResource =
          store.pageResources.find((item) => item.id === resourceId) ??
          (await configCenterService.listPageResources()).find((item) => item.id === resourceId);
        if (!pageResource) {
          return;
        }
        rolledBackName = pageResource.name;
        try {
          const response = await backendRequest<BackendPageResourceRow>(`/api/control/page-resources/${resourceId}/status`, {
            method: "POST",
            body: JSON.stringify({ status: "DRAFT" })
          });
          const next = normalizeBackendPageResourceRow(response);
          store.pageResources = store.pageResources.some((item) => item.id === next.id)
            ? store.pageResources.map((item) => (item.id === next.id ? next : item))
            : [next, ...store.pageResources];
        } catch {
          await configCenterService.upsertPageResource({
            id: pageResource.id,
            menuCode: pageResource.menuCode,
            pageCode: pageResource.pageCode,
            frameCode: pageResource.frameCode,
            name: pageResource.name,
            status: "DRAFT",
            ownerOrgId: pageResource.ownerOrgId,
            detectRulesSummary: ""
          });
        }
      }
      await configCenterService.listPendingItems();
      appendAuditLog("ROLLBACK", normalizedType, rolledBackName, operator, resourceId);
      return;
    }

    const rollback = <T extends { id: number; status: LifecycleState }>(
      items: T[],
      type: PublishPendingItem["resourceType"],
      ownerOrgId: string,
      getName: (item: T) => string
    ) => {
      const target = items.find((item) => item.id === resourceId);
      if (!target) {
        return { items, target: null as T | null };
      }
      const nextItems = items.map((item) =>
        item.id === resourceId ? { ...item, status: "DRAFT" } : item
      );
      touchPendingForResource(type, resourceId, "DRAFT", ownerOrgId, getName(target));
      return { items: nextItems, target };
    };

    if (resourceType === "RULE") {
      const result = rollback(store.rules, "RULE", "branch-east", (item) => item.name);
      store.rules = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "RULE", result.target.name, operator, resourceId);
      }
      return;
    }

    if (resourceType === "JOB_SCENE") {
      const result = rollback(store.scenes, "JOB_SCENE", "branch-east", (item) => item.name);
      store.scenes = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "JOB_SCENE", result.target.name, operator, resourceId);
      }
      return;
    }

    if (resourceType === "INTERFACE") {
      const result = rollback(store.interfaces, "INTERFACE", "branch-east", (item) => item.name);
      store.interfaces = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "INTERFACE", result.target.name, operator, resourceId);
      }
      return;
    }

    if (resourceType === "MENU_SDK_POLICY") {
      const result = rollback(store.menuSdkPolicies, "MENU_SDK_POLICY", "head-office", (item) => `菜单策略-${item.menuCode}`);
      store.menuSdkPolicies = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "MENU_SDK_POLICY", `菜单策略-${result.target.menuCode}`, operator, resourceId);
      }
      return;
    }

    if (resourceType === "PAGE_RESOURCE") {
      const result = rollback(store.pageResources, "PAGE_RESOURCE", "branch-east", (item) => item.name);
      store.pageResources = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "PAGE_RESOURCE", result.target.name, operator, resourceId);
      }
      return;
    }

    if (resourceType === "PREPROCESSOR") {
      const result = rollback(store.dataProcessors, "PREPROCESSOR", "head-office", (item) => item.name);
      store.dataProcessors = result.items;
      if (result.target) {
        appendAuditLog("ROLLBACK", "PREPROCESSOR", result.target.name, operator, resourceId);
      }
    }
  },

  async listAuditLogs(): Promise<PublishAuditLog[]> {
    await sleep(140);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<PublishAuditLog[]>("/api/control/publish/logs");
      return clone(rows);
    }
    return clone(store.auditLogs);
  },

  async listPromptHitRecords(filters: PromptHitRecordFilters = {}): Promise<PromptHitRecord[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<PromptHitRecord[]>(
        `/api/runtime/prompt-trigger-logs${buildQueryString({
          keyword: filters.keyword,
          pageResourceId: filters.pageResourceId,
          orgId: filters.orgId,
          startAt: filters.startAt,
          endAt: filters.endAt,
          ruleId: filters.ruleId
        })}`
      );
      return clone(rows);
    }
    return clone(
      store.promptHitRecords
        .filter((item) => matchesPromptHitRecordFilters(item, filters))
        .sort((a, b) => b.triggerAt.localeCompare(a.triggerAt))
    );
  },

  async listJobExecutionRecords(filters: JobExecutionRecordFilters = {}): Promise<JobExecutionRecord[]> {
    await sleep(120);
    if (!isMockModeEnabled) {
      const rows = await backendRequest<JobExecutionRecord[]>(
        `/api/runtime/job-execution-records${buildQueryString({
          keyword: filters.keyword,
          result: filters.result === "ALL" ? undefined : filters.result,
          pageResourceId: filters.pageResourceId,
          orgId: filters.orgId,
          startAt: filters.startAt,
          endAt: filters.endAt,
          sceneId: filters.sceneId,
          sceneName: filters.sceneName
        })}`
      );
      return clone(rows);
    }
    return clone(
      store.jobExecutionRecords
        .filter((item) => matchesJobExecutionRecordFilters(item, filters))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    );
  },

  async listRoles(): Promise<RoleItem[]> {
    await sleep(120);
    if (isMockModeEnabled) {
      const roleRows = store.roles.map((role) => ({
        ...role,
        memberCount: getRoleMemberUserIds(role.id).length
      }));
      return clone(roleRows);
    }
    const rows = await backendRequest<BackendRoleRow[]>("/api/permissions/roles");
    const next = rows.map(normalizeBackendRoleRow);
    store.roles = clone(next);
    return clone(next);
  },

  async listPermissionResources(): Promise<PermissionResource[]> {
    await sleep(120);
    if (isMockModeEnabled) {
      return clone(store.permissionResources).sort((a, b) => a.orderNo - b.orderNo || a.id - b.id);
    }
    const rows = await backendRequest<BackendPermissionResourceRow[]>("/api/permissions/resources");
    const next = rows.map(normalizeBackendPermissionResourceRow);
    store.permissionResources = clone(next);
    return clone(next);
  },

  async upsertPermissionResource(
    payload: Omit<PermissionResource, "updatedAt"> & { updatedAt?: string }
  ): Promise<PermissionResource> {
    await sleep(140);
    const normalizedCode = payload.resourceCode.trim();
    const normalizedName = payload.resourceName.trim();
    const normalizedPath = payload.resourcePath.trim();
    const normalizedPagePath = payload.pagePath?.trim() || undefined;
    if (!normalizedCode) {
      throw new Error("资源编码不能为空。");
    }
    if (!normalizedName) {
      throw new Error("资源名称不能为空。");
    }
    if (!normalizedPath) {
      throw new Error("资源路径不能为空。");
    }
    if (!isValidResourcePathForType(payload.resourceType, normalizedPath)) {
      throw new Error("资源类型与路径前缀不一致。");
    }
    const pathDuplicated = store.permissionResources.some(
      (item) => item.resourcePath === normalizedPath && item.id !== payload.id
    );
    if (pathDuplicated) {
      throw new Error("资源路径已存在，请修改后重试。");
    }
    const codeDuplicated = store.permissionResources.some(
      (item) => item.resourceCode === normalizedCode && item.id !== payload.id
    );
    if (codeDuplicated) {
      throw new Error("资源编码已存在，请修改后重试。");
    }
    if (isMockModeEnabled) {
      const exists = store.permissionResources.find((item) => item.id === payload.id);
      const next: PermissionResource = {
        ...payload,
        id: exists ? payload.id : nextId(store.permissionResources),
        resourceCode: normalizedCode,
        resourceName: normalizedName,
        resourcePath: normalizedPath,
        pagePath: payload.resourceType === "PAGE" ? normalizedPagePath : undefined,
        updatedAt: payload.updatedAt ?? nowIso()
      };
      store.permissionResources = exists
        ? store.permissionResources.map((item) => (item.id === next.id ? next : item))
        : [next, ...store.permissionResources];
      notifyRolePermissionsChanged();
      return clone(next);
    }
    const response = payload.id
      ? await backendRequest<BackendPermissionResourceRow>(`/api/permissions/resources/${payload.id}`, {
          method: "POST",
          body: JSON.stringify({
            resourceCode: normalizedCode,
            resourceName: normalizedName,
            resourceType: payload.resourceType,
            resourcePath: normalizedPath,
            pagePath: payload.resourceType === "PAGE" ? normalizedPagePath : undefined,
            status: payload.status,
            orderNo: payload.orderNo,
            description: payload.description
          } satisfies BackendPermissionResourceUpsertRequest)
        })
      : await backendRequest<BackendPermissionResourceRow>("/api/permissions/resources", {
          method: "POST",
          body: JSON.stringify({
            resourceCode: normalizedCode,
            resourceName: normalizedName,
            resourceType: payload.resourceType,
            resourcePath: normalizedPath,
            pagePath: payload.resourceType === "PAGE" ? normalizedPagePath : undefined,
            status: payload.status,
            orderNo: payload.orderNo,
            description: payload.description
          } satisfies BackendPermissionResourceUpsertRequest)
        });
    const next = normalizeBackendPermissionResourceRow(response);
    store.permissionResources = store.permissionResources.some((item) => item.id === next.id)
      ? store.permissionResources.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.permissionResources];
    notifyRolePermissionsChanged();
    return clone(next);
  },

  async listRoleResourceGrants(roleId: number): Promise<RoleResourceGrant[]> {
    await sleep(120);
    if (isMockModeEnabled) {
      return clone(store.roleResourceGrants.filter((grant) => grant.roleId === roleId));
    }
    const rows = await backendRequest<BackendRoleResourceGrantRow[]>(`/api/permissions/roles/${roleId}/resource-grants`);
    const next = rows.map(normalizeBackendRoleResourceGrantRow);
    const nextRoleIds = new Set(next.map((item) => item.roleId));
    if (nextRoleIds.size === 1 && nextRoleIds.has(roleId)) {
      store.roleResourceGrants = [
        ...store.roleResourceGrants.filter((grant) => grant.roleId !== roleId),
        ...next
      ];
    }
    return clone(next);
  },

  async saveRoleResourceGrants(
    roleId: number,
    resourceCodes: string[],
    operator?: RolePermissionOperator
  ): Promise<RoleResourceGrant[]> {
    await sleep(140);
    if (isMockModeEnabled) {
      const role = store.roles.find((item) => item.id === roleId);
      if (!role) {
        throw new Error("角色不存在，无法保存授权。");
      }
      const effectiveOperator: RolePermissionOperator = operator ?? {
        operatorId: "person-head-office-permission-admin",
        roleType: "PERMISSION_ADMIN",
        orgScopeId: HEAD_OFFICE_ORG_ID
      };
      const requestedCodes = normalizeStringList(resourceCodes);
      const invalidCodes = requestedCodes.filter(
        (resourceCode) => !store.permissionResources.some((resource) => resource.resourceCode === resourceCode)
      );
      if (invalidCodes.length > 0) {
        throw new Error(`存在未定义资源编码：${invalidCodes.join("、")}`);
      }
      const requestedResources = requestedCodes
        .map((resourceCode) => store.permissionResources.find((resource) => resource.resourceCode === resourceCode))
        .filter((resource): resource is PermissionResource => Boolean(resource));
      const disabledResourceCodes = requestedResources
        .filter((resource) => resource.status !== "ACTIVE")
        .map((resource) => resource.resourceCode);
      if (disabledResourceCodes.length > 0) {
        throw new Error(`包含已停用资源，无法授权：${disabledResourceCodes.join("、")}`);
      }
      const requestedPaths = requestedResources.map((resource) => resource.resourcePath);
      const hasHighPrivilege = hasHighPrivilegeResource(requestedPaths);
      if (hasHighPrivilege && role.orgScopeId !== HEAD_OFFICE_ORG_ID) {
        throw new Error("高权限操作仅允许分配到总行范围角色。");
      }
      if (hasHighPrivilege && !isHeadOfficePermissionAdmin(effectiveOperator)) {
        throw new Error("仅总行权限管理人员可分配高权限操作。");
      }
      store.roleResourceGrants = store.roleResourceGrants.filter((grant) => grant.roleId !== roleId);
      const grantBaseId = nextId(store.roleResourceGrants);
      const createdAt = nowIso();
      const nextGrants: RoleResourceGrant[] = requestedCodes.map((resourceCode, index) => ({
        id: grantBaseId + index,
        roleId,
        resourceCode,
        createdAt
      }));
      store.roleResourceGrants = [...nextGrants, ...store.roleResourceGrants];
      appendAuditLog("ROLE_UPDATE", "ROLE", role.name, effectiveOperator.operatorId, role.id, {
        approvalTicketId: operator?.approvalTicketId ?? "APPR-DEFAULT-PENDING-INTEGRATION",
        approvalSource: operator?.approvalSource ?? "EXTERNAL_APPROVAL_FLOW",
        approvalStatus: operator?.approvalStatus ?? "PRE_APPROVED"
      });
      notifyRolePermissionsChanged();
      return clone(nextGrants);
    }
    const response = await backendRequest<{ updatedCount: number }>(`/api/permissions/roles/${roleId}/resource-grants`, {
      method: "POST",
      body: JSON.stringify({ resourceCodes })
    });
    void response;
    notifyRolePermissionsChanged();
    return this.listRoleResourceGrants(roleId);
  },

  async listUserRoleBindings(roleId?: number): Promise<UserRoleBinding[]> {
    await sleep(100);
    if (isMockModeEnabled) {
      if (typeof roleId === "number") {
        return clone(store.userRoleBindings.filter((binding) => binding.roleId === roleId));
      }
      return clone(store.userRoleBindings);
    }
    if (typeof roleId === "number") {
      const rows = await backendRequest<BackendUserRoleBindingRow[]>(`/api/permissions/roles/${roleId}/members`);
      const next = rows.map(normalizeBackendUserRoleBindingRow);
      store.userRoleBindings = [
        ...store.userRoleBindings.filter((binding) => binding.roleId !== roleId),
        ...next
      ];
      return clone(next);
    }
    const roles = await this.listRoles();
    const groups = await Promise.all(roles.map((role) => this.listUserRoleBindings(role.id)));
    return clone(groups.flat());
  },

  async saveUserRoleBindings(roleId: number, userIds: string[]): Promise<UserRoleBinding[]> {
    await sleep(140);
    if (isMockModeEnabled) {
      const role = store.roles.find((item) => item.id === roleId);
      if (!role) {
        throw new Error("角色不存在，无法保存成员。");
      }
      const normalizedUserIds = normalizeStringList(userIds);
      store.userRoleBindings = store.userRoleBindings.filter((binding) => binding.roleId !== roleId);
      const bindingBaseId = nextId(store.userRoleBindings);
      const createdAt = nowIso();
      const nextBindings: UserRoleBinding[] = normalizedUserIds.map((userId, index) => ({
        id: bindingBaseId + index,
        userId,
        roleId,
        status: "ACTIVE",
        createdAt
      }));
      store.userRoleBindings = [...nextBindings, ...store.userRoleBindings];
      syncRoleMemberCount(roleId);
      appendAuditLog("ROLE_UPDATE", "ROLE", role.name, "person-business-admin", role.id);
      notifyRolePermissionsChanged();
      return clone(nextBindings);
    }
    const response = await backendRequest<{ updatedCount: number }>(`/api/permissions/roles/${roleId}/members`, {
      method: "POST",
      body: JSON.stringify({ userIds })
    });
    void response;
    notifyRolePermissionsChanged();
    return this.listUserRoleBindings(roleId);
  },

  async upsertRole(
    payload: Omit<RoleItem, "id" | "updatedAt" | "memberCount"> & { id?: number; memberCount?: number; updatedAt?: string },
    operator?: RolePermissionOperator
  ): Promise<RoleItem> {
    await sleep(140);
    if (isMockModeEnabled) {
      const effectiveOperator: RolePermissionOperator = operator ?? {
        operatorId: "person-head-office-permission-admin",
        roleType: "PERMISSION_ADMIN",
        orgScopeId: HEAD_OFFICE_ORG_ID
      };
      const approvalMeta: Pick<PublishAuditLog, "approvalTicketId" | "approvalSource" | "approvalStatus"> = {
        approvalTicketId: operator?.approvalTicketId ?? "APPR-DEFAULT-PENDING-INTEGRATION",
        approvalSource: operator?.approvalSource ?? "EXTERNAL_APPROVAL_FLOW",
        approvalStatus: operator?.approvalStatus ?? "PRE_APPROVED"
      };
      if (isHeadOfficeOnlyRole(payload.roleType) && payload.orgScopeId !== HEAD_OFFICE_ORG_ID) {
        throw new Error("技术支持角色仅允许配置为总行范围。");
      }
      const existingResourcePaths = getResourcePathsByCodes(getRoleResourceCodes(payload.id ?? 0));
      const hasHighPrivilege = hasHighPrivilegeResource(existingResourcePaths);
      if (hasHighPrivilege && payload.orgScopeId !== HEAD_OFFICE_ORG_ID) {
        throw new Error("高权限操作仅允许分配到总行范围角色。");
      }
      if (hasHighPrivilege && !isHeadOfficePermissionAdmin(effectiveOperator)) {
        throw new Error("仅总行权限管理人员可分配高权限操作。");
      }
      const exists = typeof payload.id === "number" ? store.roles.find((item) => item.id === payload.id) : undefined;
      const memberCount = typeof payload.id === "number" ? getRoleMemberUserIds(payload.id).length || payload.memberCount || 0 : payload.memberCount || 0;
      const next: RoleItem = {
        ...payload,
        id: payload.id ?? nextId(store.roles),
        memberCount,
        updatedAt: payload.updatedAt ?? nowIso()
      };
      store.roles = exists ? store.roles.map((item) => (item.id === next.id ? next : item)) : [next, ...store.roles];
      appendAuditLog("ROLE_UPDATE", "ROLE", next.name, effectiveOperator.operatorId, next.id, approvalMeta);
      notifyRolePermissionsChanged();
      return clone(next);
    }
    const response = payload.id
      ? await backendRequest<BackendRoleRow>(`/api/permissions/roles/${payload.id}`, {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            roleType: payload.roleType,
            status: payload.status,
            orgScopeId: payload.orgScopeId
          } satisfies BackendRoleUpsertRequest)
        })
      : await backendRequest<BackendRoleRow>("/api/permissions/roles", {
          method: "POST",
          body: JSON.stringify({
            name: payload.name,
            roleType: payload.roleType,
            status: payload.status,
            orgScopeId: payload.orgScopeId
          } satisfies BackendRoleUpsertRequest)
        });
    const next = normalizeBackendRoleRow(response);
    store.roles = store.roles.some((item) => item.id === next.id)
      ? store.roles.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.roles];
    notifyRolePermissionsChanged();
    return clone(next);
  },

  async cloneRole(roleId: number): Promise<RoleItem> {
    await sleep(160);
    if (isMockModeEnabled) {
      const source = store.roles.find((item) => item.id === roleId);
      if (!source) {
        throw new Error("Role does not exist; cannot clone.");
      }
      const cloned: RoleItem = {
        ...source,
        id: nextId(store.roles),
        name: `${source.name}-copy`,
        memberCount: 0,
        updatedAt: nowIso()
      };
      store.roles = [cloned, ...store.roles];
      const sourceGrants = store.roleResourceGrants.filter((grant) => grant.roleId === source.id);
      const grantBaseId = nextId(store.roleResourceGrants);
      const clonedGrants = sourceGrants.map((grant, index) => ({
        id: grantBaseId + index,
        roleId: cloned.id,
        resourceCode: grant.resourceCode,
        createdAt: nowIso()
      }));
      store.roleResourceGrants = [...clonedGrants, ...store.roleResourceGrants];
      appendAuditLog("ROLE_UPDATE", "ROLE", cloned.name, "person-business-admin", cloned.id);
      notifyRolePermissionsChanged();
      return clone(cloned);
    }
    const response = await backendRequest<BackendRoleRow>(`/api/permissions/roles/${roleId}/clone`, {
      method: "POST"
    });
    const next = normalizeBackendRoleRow(response);
    store.roles = store.roles.some((item) => item.id === next.id)
      ? store.roles.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.roles];
    notifyRolePermissionsChanged();
    return clone(next);
  },

  async toggleRoleStatus(roleId: number): Promise<void> {
    await sleep(120);
    if (isMockModeEnabled) {
      store.roles = store.roles.map((role) => {
        if (role.id !== roleId) {
          return role;
        }
        return {
          ...role,
          status: role.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
          updatedAt: nowIso()
        };
      });
      notifyRolePermissionsChanged();
      return;
    }
    const response = await backendRequest<BackendRoleRow>(`/api/permissions/roles/${roleId}/status`, {
      method: "POST"
    });
    const next = normalizeBackendRoleRow(response);
    store.roles = store.roles.some((item) => item.id === next.id)
      ? store.roles.map((item) => (item.id === next.id ? next : item))
      : [next, ...store.roles];
    notifyRolePermissionsChanged();
  },

  async listRoleMembers(roleId: number): Promise<string[]> {
    await sleep(100);
    if (isMockModeEnabled) {
      return clone(getRoleMemberUserIds(roleId));
    }
    const rows = await this.listUserRoleBindings(roleId);
    return clone(rows.map((row) => row.userId));
  },

  async assignRoleMembers(roleId: number, members: string[]): Promise<void> {
    await sleep(140);
    if (isMockModeEnabled) {
      const role = store.roles.find((item) => item.id === roleId);
      if (!role) {
        throw new Error("角色不存在，无法保存成员。");
      }
      const normalizedUserIds = normalizeStringList(members);
      store.userRoleBindings = store.userRoleBindings.filter((binding) => binding.roleId !== roleId);
      const bindingBaseId = nextId(store.userRoleBindings);
      const createdAt = nowIso();
      const nextBindings: UserRoleBinding[] = normalizedUserIds.map((userId, index) => ({
        id: bindingBaseId + index,
        userId,
        roleId,
        status: "ACTIVE",
        createdAt
      }));
      store.userRoleBindings = [...nextBindings, ...store.userRoleBindings];
      syncRoleMemberCount(roleId);
      appendAuditLog("ROLE_UPDATE", "ROLE", role.name, "person-business-admin", role.id);
      notifyRolePermissionsChanged();
      return;
    }
    await this.saveUserRoleBindings(roleId, members);
  }
};






