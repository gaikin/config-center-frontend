import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";
import type { JobNodeDefinition, JobSceneDefinition, LifecycleState } from "../../types";

export type TriggerMode = "AUTO" | "BUTTON";

export type SceneForm = {
  name: string;
  pageResourceId: number;
  executionMode: JobSceneDefinition["executionMode"];
  previewBeforeExecute: boolean;
  floatingButtonEnabled?: boolean;
  floatingButtonLabel?: string;
  floatingButtonX?: number;
  floatingButtonY?: number;
  status: LifecycleState;
  manualDurationSec: number;
};
export type StatusFilter = "ALL" | LifecycleState;

export type FlowNodeData = {
  label: string;
  typeLabel: string;
  nodeType: JobNodeDefinition["nodeType"];
  enabled: boolean;
  onDelete?: () => void;
};

export type FlowNode = Node<FlowNodeData, "jobNode">;
export type FlowEdge = Edge;

export type NodeConfig = Record<string, unknown>;

export type ApiCallInputSourceType = "STRING" | "REFERENCE";

export type ApiCallInputBinding = {
  sourceType: ApiCallInputSourceType;
  value: string;
};

export type ScriptInputRow = {
  name: string;
  sourceType: ApiCallInputSourceType;
  value: string;
};

export type ApiCallInputParam = {
  tab: "headers" | "query" | "path" | "body";
  name: string;
  description: string;
  required: boolean;
  valueType: string;
  label: string;
};

export type ApiCallOutputOption = {
  path: string;
  label: string;
  valueType: string;
  variableKey: string;
};

export type HotkeyModifier = "CTRL" | "ALT" | "SHIFT" | "META";

export type NodeDetailForm = {
  name: string;
  nodeType: JobNodeDefinition["nodeType"];
  enabled: boolean;
  field?: string;
  apiInterfaceId?: number;
  apiInputBindings?: Record<string, ApiCallInputBinding>;
  apiOutputPaths?: string[];
  apiRefactorRequired?: boolean;
  scriptCode?: string;
  scriptInputs?: ScriptInputRow[];
  scriptOutputKeys?: string[];
  hotkeyModifiers?: HotkeyModifier[];
  hotkeyKey?: string;
  target?: string;
  valueType?: "STRING" | "REFERENCE";
  value?: string;
};

export type NodeLibraryItem = {
  label: string;
  nodeType: JobNodeDefinition["nodeType"];
  description: string;
};

export type NodeOutputReferenceOption = {
  value: string;
  label: string;
  variableKey: string;
  nodeId: number;
};

export const statusColor: Record<LifecycleState, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  DISABLED: "orange",
  EXPIRED: "red"
};

export const executionLabel: Record<JobSceneDefinition["executionMode"], string> = {
  AUTO_WITHOUT_PROMPT: "自动执行(静默)",
  AUTO_AFTER_PROMPT: "自动执行",
  PREVIEW_THEN_EXECUTE: "自动执行 + 预览确认",
  FLOATING_BUTTON: "按钮触发"
};

export function deriveTriggerMode(executionMode: JobSceneDefinition["executionMode"]): TriggerMode {
  return executionMode === "FLOATING_BUTTON" ? "BUTTON" : "AUTO";
}

export function derivePreviewBeforeExecute(scene: Pick<JobSceneDefinition, "executionMode" | "previewBeforeExecute">) {
  if (typeof scene.previewBeforeExecute === "boolean") {
    return scene.previewBeforeExecute;
  }
  return scene.executionMode === "PREVIEW_THEN_EXECUTE";
}

export function buildExecutionMode(triggerMode: TriggerMode, previewBeforeExecute: boolean): JobSceneDefinition["executionMode"] {
  if (triggerMode === "BUTTON") {
    return "FLOATING_BUTTON";
  }
  return previewBeforeExecute ? "PREVIEW_THEN_EXECUTE" : "AUTO_AFTER_PROMPT";
}

export function resolvePersistedExecutionMode(
  executionMode: JobSceneDefinition["executionMode"],
  previewBeforeExecute: boolean
): JobSceneDefinition["executionMode"] {
  if (executionMode === "AUTO_WITHOUT_PROMPT" && !previewBeforeExecute) {
    return "AUTO_WITHOUT_PROMPT";
  }
  return buildExecutionMode(deriveTriggerMode(executionMode), previewBeforeExecute);
}

export function isApiOutputSelectionRequired(outputOptionCount: number) {
  return outputOptionCount > 0;
}

export function getTriggerModeLabel(triggerMode: TriggerMode) {
  return triggerMode === "BUTTON" ? "按钮触发" : "自动执行";
}

export function getRunModeLabel(previewBeforeExecute: boolean) {
  return previewBeforeExecute ? "预览确认" : "直接执行";
}

export const nodeTypeLabel: Record<JobNodeDefinition["nodeType"], string> = {
  page_get: "页面取值",
  api_call: "接口调用",
  list_lookup: "名单检索(已下线)",
  js_script: "脚本处理",
  page_set: "页面写值",
  page_click: "页面点击",
  send_hotkey: "发送热键"
};

export const nodeLibrary: NodeLibraryItem[] = [
  { label: "页面取值", nodeType: "page_get", description: "从页面字段读取值" },
  { label: "接口调用", nodeType: "api_call", description: "调用外部接口获取数据" },
  { label: "脚本处理", nodeType: "js_script", description: "执行脚本进行加工" },
  { label: "页面写值", nodeType: "page_set", description: "将结果写回页面字段" },
  { label: "页面点击", nodeType: "page_click", description: "点击页面字段对应控件" },
  { label: "发送热键", nodeType: "send_hotkey", description: "向页面发送组合热键" }
];

export function formatFlowNodeLabel(
  orderNo: number,
  name: string
) {
  return `${orderNo}. ${name}`;
}

export function formatFlowNodeTypeLabel(nodeType: JobNodeDefinition["nodeType"]) {
  return nodeTypeLabel[nodeType];
}

export const HOTKEY_MODIFIER_OPTIONS: Array<{ label: string; value: HotkeyModifier }> = [
  { label: "Ctrl", value: "CTRL" },
  { label: "Alt", value: "ALT" },
  { label: "Shift", value: "SHIFT" },
  { label: "Meta", value: "META" }
];

export const HOTKEY_MAIN_KEY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "G", value: "G" },
  { label: "H", value: "H" },
  { label: "I", value: "I" },
  { label: "J", value: "J" },
  { label: "K", value: "K" },
  { label: "L", value: "L" },
  { label: "M", value: "M" },
  { label: "N", value: "N" },
  { label: "O", value: "O" },
  { label: "P", value: "P" },
  { label: "Q", value: "Q" },
  { label: "R", value: "R" },
  { label: "S", value: "S" },
  { label: "T", value: "T" },
  { label: "U", value: "U" },
  { label: "V", value: "V" },
  { label: "W", value: "W" },
  { label: "X", value: "X" },
  { label: "Y", value: "Y" },
  { label: "Z", value: "Z" },
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "Enter", value: "ENTER" },
  { label: "Tab", value: "TAB" },
  { label: "Space", value: "SPACE" },
  { label: "Esc", value: "ESC" },
  { label: "Backspace", value: "BACKSPACE" },
  { label: "Delete", value: "DELETE" },
  { label: "Up", value: "ARROW_UP" },
  { label: "Down", value: "ARROW_DOWN" },
  { label: "Left", value: "ARROW_LEFT" },
  { label: "Right", value: "ARROW_RIGHT" },
  { label: "F1", value: "F1" },
  { label: "F2", value: "F2" },
  { label: "F3", value: "F3" },
  { label: "F4", value: "F4" },
  { label: "F5", value: "F5" },
  { label: "F6", value: "F6" },
  { label: "F7", value: "F7" },
  { label: "F8", value: "F8" },
  { label: "F9", value: "F9" },
  { label: "F10", value: "F10" },
  { label: "F11", value: "F11" },
  { label: "F12", value: "F12" }
];

export function parseConfig(configJson: string): NodeConfig {
  try {
    const parsed = JSON.parse(configJson) as NodeConfig;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeApiInputSourceType(value: unknown): ApiCallInputSourceType {
  return value === "REFERENCE" ? "REFERENCE" : "STRING";
}

function normalizeApiValueType(value: unknown) {
  if (value === "NUMBER" || value === "BOOLEAN" || value === "OBJECT" || value === "ARRAY") {
    return value;
  }
  return "STRING";
}

function normalizeHotkeyModifier(value: unknown): HotkeyModifier | null {
  return value === "CTRL" || value === "ALT" || value === "SHIFT" || value === "META"
    ? value
    : null;
}

function normalizeHotkeyMainKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "CONTROL" || normalized === "CTRL") {
    return "CTRL";
  }
  if (normalized === "OPTION") {
    return "ALT";
  }
  if (normalized === "COMMAND" || normalized === "CMD") {
    return "META";
  }
  if (normalized === "RETURN") {
    return "ENTER";
  }
  if (normalized === "ESCAPE") {
    return "ESC";
  }
  if (normalized === "SPACEBAR") {
    return "SPACE";
  }
  return normalized;
}

function hotkeyKeyToCode(key: string): number | null {
  if (!key) {
    return null;
  }
  if (/^[A-Z]$/.test(key)) {
    return key.charCodeAt(0);
  }
  if (/^[0-9]$/.test(key)) {
    return key.charCodeAt(0);
  }
  if (/^F([1-9]|1[0-2])$/.test(key)) {
    const numberPart = Number(key.slice(1));
    return 111 + numberPart;
  }
  const staticMap: Record<string, number> = {
    CTRL: 17,
    ALT: 18,
    SHIFT: 16,
    META: 91,
    ENTER: 13,
    TAB: 9,
    SPACE: 32,
    ESC: 27,
    BACKSPACE: 8,
    DELETE: 46,
    ARROW_UP: 38,
    ARROW_DOWN: 40,
    ARROW_LEFT: 37,
    ARROW_RIGHT: 39
  };
  return staticMap[key] ?? null;
}

function hotkeyCodeToKey(code: number): string | null {
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(code);
  }
  if (code >= 48 && code <= 57) {
    return String.fromCharCode(code);
  }
  if (code >= 112 && code <= 123) {
    return `F${code - 111}`;
  }
  const staticMap: Record<number, string> = {
    17: "CTRL",
    18: "ALT",
    16: "SHIFT",
    91: "META",
    13: "ENTER",
    9: "TAB",
    32: "SPACE",
    27: "ESC",
    8: "BACKSPACE",
    46: "DELETE",
    38: "ARROW_UP",
    40: "ARROW_DOWN",
    37: "ARROW_LEFT",
    39: "ARROW_RIGHT"
  };
  return staticMap[code] ?? null;
}

function deriveMachineKeyFromOutputPath(path: string) {
  return normalizeVariableSegment(
    path
      .replace(/^\$\./, "")
      .replace(/\[\d+\]/g, "")
      .split(".")
      .filter(Boolean)
      .pop() ?? ""
  );
}

export function parseApiCallInputParams(inputConfigJson: string): ApiCallInputParam[] {
  const parsed = parseJsonSafe<Record<string, unknown>>(inputConfigJson, {});
  const tabs: ApiCallInputParam["tab"][] = ["headers", "query", "path", "body"];
  const params: ApiCallInputParam[] = [];

  for (const tab of tabs) {
    const section = parsed[tab];
    if (!Array.isArray(section)) {
      continue;
    }
    for (const row of section) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const item = row as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!name) {
        continue;
      }
      const description = typeof item.description === "string" ? item.description.trim() : "";
      const rawValidation = item.validationConfig;
      const validation =
        rawValidation && typeof rawValidation === "object"
          ? (rawValidation as Record<string, unknown>)
          : undefined;
      const requiredFromLegacy = typeof item.required === "boolean" ? item.required : false;
      const required = Boolean(validation?.required ?? requiredFromLegacy);
      const valueType = normalizeApiValueType(item.valueType);

      params.push({
        tab,
        name,
        description,
        required,
        valueType,
        label: description ? `${name} (${description})` : name
      });
    }
  }

  return params;
}

function collectApiOutputPathMeta(
  outputs: unknown[],
  collector: Array<{ path: string; valueType: string }> = []
): Array<{ path: string; valueType: string }> {
  for (const row of outputs) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const item = row as Record<string, unknown>;
    const path = typeof item.path === "string" ? item.path.trim() : "";
    if (path) {
      collector.push({
        path,
        valueType: normalizeApiValueType(item.valueType)
      });
    }
    if (Array.isArray(item.children)) {
      collectApiOutputPathMeta(item.children, collector);
    }
  }
  return collector;
}

export function parseApiCallOutputOptions(outputConfigJson: string): ApiCallOutputOption[] {
  const outputs = parseJsonSafe<unknown[]>(outputConfigJson, []);
  const seen = new Set<string>();
  const result: ApiCallOutputOption[] = [];

  for (const item of collectApiOutputPathMeta(outputs)) {
    if (!item.path || seen.has(item.path)) {
      continue;
    }
    seen.add(item.path);
    const machineKey = deriveMachineKeyFromOutputPath(item.path);
    result.push({
      path: item.path,
      valueType: item.valueType,
      variableKey: machineKey || "api_output",
      label: `${item.path} (${item.valueType})`
    });
  }

  return result;
}

export function getFlowPosition(configJson: string, fallbackX: number, fallbackY: number) {
  const config = parseConfig(configJson);
  const raw = config.__flowPosition;
  if (
    raw &&
    typeof raw === "object" &&
    typeof (raw as { x?: unknown }).x === "number" &&
    typeof (raw as { y?: unknown }).y === "number"
  ) {
    return { x: (raw as { x: number; y: number }).x, y: (raw as { x: number; y: number }).y };
  }
  return { x: fallbackX, y: fallbackY };
}

export function mergeFlowPosition(configJson: string, position: { x: number; y: number }) {
  const config = parseConfig(configJson);
  config.__flowPosition = { x: Math.round(position.x), y: Math.round(position.y) };
  return JSON.stringify(config);
}

export function getFlowNextNodeIds(configJson: string) {
  const config = parseConfig(configJson);
  const raw = config.__nextNodeIds;
  if (!Array.isArray(raw)) {
    return [] as string[];
  }
  const cleaned = raw
    .map((item) => String(item).trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

export function mergeFlowNextNodeIds(configJson: string, nextNodeIds: string[]) {
  const config = parseConfig(configJson);
  const cleaned = Array.from(
    new Set(
      nextNodeIds
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
  if (cleaned.length === 0) {
    delete config.__nextNodeIds;
  } else {
    config.__nextNodeIds = cleaned;
  }
  return JSON.stringify(config);
}

export function getFlowNodeStyle(enabled: boolean, hasIssue = false) {
  if (hasIssue) {
    return {
      width: 196,
      minHeight: 72,
      borderRadius: 8,
      border: "1px solid #ff4d4f",
      background: "#fff2f0"
    };
  }
  return {
    width: 196,
    minHeight: 72,
    borderRadius: 8,
    border: enabled ? "1px solid #91caff" : "1px solid #d9d9d9",
    background: enabled ? "#f0f5ff" : "#fafafa"
  };
}

export function buildFlowFromNodeRows(nodeRows: JobNodeDefinition[]) {
  const sorted = [...nodeRows].sort((a, b) => a.orderNo - b.orderNo);
  const idSet = new Set(sorted.map((item) => String(item.id)));

  const nodes: FlowNode[] = sorted.map((item, index) => ({
    id: String(item.id),
    type: "jobNode",
    data: {
      label: formatFlowNodeLabel(item.orderNo, item.name),
      typeLabel: formatFlowNodeTypeLabel(item.nodeType),
      nodeType: item.nodeType,
      enabled: item.enabled
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    position: getFlowPosition(item.configJson, 80 + index * 260, 120),
    style: getFlowNodeStyle(item.enabled)
  }));

  const edges: FlowEdge[] = [];
  const edgeIdSet = new Set<string>();
  for (const item of sorted) {
    const source = String(item.id);
    for (const target of getFlowNextNodeIds(item.configJson)) {
      if (!idSet.has(target) || source === target) {
        continue;
      }
      const edgeId = `e-${source}-${target}`;
      if (edgeIdSet.has(edgeId)) {
        continue;
      }
      edgeIdSet.add(edgeId);
      edges.push({
        id: edgeId,
        source,
        target,
        type: "bezier",
        markerEnd: { type: MarkerType.ArrowClosed }
      });
    }
  }

  return { nodes, edges };
}

export function deriveOrderedNodeIds(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const ids = nodes.map((item) => item.id);
  const idSet = new Set(ids);
  const xMap = new Map(nodes.map((item) => [item.id, item.position.x]));

  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  ids.forEach((id) => {
    adjacency.set(id, []);
    indegree.set(id, 0);
  });

  const pairSet = new Set<string>();
  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target) || edge.source === edge.target) {
      continue;
    }
    const pair = `${edge.source}->${edge.target}`;
    if (pairSet.has(pair)) {
      continue;
    }
    pairSet.add(pair);
    adjacency.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue = ids
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => (xMap.get(a) ?? 0) - (xMap.get(b) ?? 0));
  const ordered: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      break;
    }
    ordered.push(id);
    const nextIds = adjacency.get(id) ?? [];
    for (const nextId of nextIds) {
      indegree.set(nextId, (indegree.get(nextId) ?? 0) - 1);
      if ((indegree.get(nextId) ?? 0) === 0) {
        queue.push(nextId);
      }
    }
    queue.sort((a, b) => (xMap.get(a) ?? 0) - (xMap.get(b) ?? 0));
  }

  if (ordered.length !== ids.length) {
    return [...ids].sort((a, b) => (xMap.get(a) ?? 0) - (xMap.get(b) ?? 0));
  }

  return ordered;
}

export function getDefaultNodeConfig(
  nodeType: JobNodeDefinition["nodeType"],
  options: {
    field?: string;
    target?: string;
  } = {}
): NodeConfig {
  if (nodeType === "page_get") {
    return { field: options.field ?? "" };
  }
  if (nodeType === "api_call") {
    return {
      schemaVersion: 2,
      inputBindings: {},
      outputPaths: []
    };
  }
  if (nodeType === "js_script") {
    return {
      schemaVersion: 2,
      scriptId: "script",
      scriptCode: "return { result: input };",
      inputBindings: {},
      outputKeys: ["result"]
    };
  }
  if (nodeType === "page_click") {
    return { target: options.target ?? "" };
  }
  if (nodeType === "send_hotkey") {
    return {
      keys: ["CTRL", "S"],
      keyCodes: [17, 83]
    };
  }
  return { target: options.target ?? "target_field", valueType: "STRING", value: "" };
}

export function buildNodeConfigFromForm(values: NodeDetailForm): NodeConfig {
  if (values.nodeType === "page_get") {
    return {
      field: values.field?.trim() ?? ""
    };
  }
  if (values.nodeType === "api_call") {
    const rawBindings = values.apiInputBindings ?? {};
    const normalizedBindings = Object.entries(rawBindings).reduce<Record<string, ApiCallInputBinding>>((acc, [key, value]) => {
      const paramName = key.trim();
      if (!paramName || !value || typeof value !== "object") {
        return acc;
      }
      acc[paramName] = {
        sourceType: normalizeApiInputSourceType(value.sourceType),
        value: typeof value.value === "string" ? value.value.trim() : ""
      };
      return acc;
    }, {});
    const outputPathSet = new Set(
      (values.apiOutputPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
    );
    return {
      schemaVersion: 2,
      interfaceId: values.apiInterfaceId,
      inputBindings: normalizedBindings,
      outputPaths: [...outputPathSet]
    };
  }
  if (values.nodeType === "js_script") {
    const scriptId = "script";
    const inputBindings = (values.scriptInputs ?? []).reduce<Record<string, ApiCallInputBinding>>((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const inputName = typeof item.name === "string" ? item.name.trim() : "";
      if (!inputName || acc[inputName]) {
        return acc;
      }
      acc[inputName] = {
        sourceType: normalizeApiInputSourceType(item.sourceType),
        value: typeof item.value === "string" ? item.value.trim() : ""
      };
      return acc;
    }, {});
    const outputKeys = Array.from(
      new Set(
        (values.scriptOutputKeys ?? [])
          .map((item) => normalizeVariableSegment(item))
          .filter(Boolean)
      )
    );
    return {
      schemaVersion: 2,
      scriptId,
      scriptCode: typeof values.scriptCode === "string" ? values.scriptCode : "",
      inputBindings,
      outputKeys
    };
  }
  if (values.nodeType === "page_click") {
    return {
      target: values.target?.trim() ?? ""
    };
  }
  if (values.nodeType === "send_hotkey") {
    const modifiers = Array.from(
      new Set(
        (values.hotkeyModifiers ?? [])
          .map((item) => normalizeHotkeyModifier(item))
          .filter((item): item is HotkeyModifier => Boolean(item))
      )
    );
    const mainKey = normalizeHotkeyMainKey(values.hotkeyKey);
    const keys = [...modifiers, ...(mainKey ? [mainKey] : [])];
    const keyCodes = keys
      .map((item) => hotkeyKeyToCode(item))
      .filter((item): item is number => typeof item === "number");
    return {
      keys,
      keyCodes
    };
  }
  return {
    target: values.target?.trim() ?? "",
    valueType: values.valueType ?? "STRING",
    value: values.value ?? ""
  };
}

export function buildFormValuesFromNode(node: JobNodeDefinition): NodeDetailForm {
  const config = parseConfig(node.configJson);
  const rawValue = typeof config.value === "string" ? config.value : "";
  const valueType: NodeDetailForm["valueType"] =
    config.valueType === "STRING" || config.valueType === "REFERENCE"
      ? config.valueType
      : rawValue.trim().startsWith("{{") && rawValue.trim().endsWith("}}")
        ? "REFERENCE"
        : "STRING";
  let apiInterfaceId: number | undefined;
  let apiInputBindings: Record<string, ApiCallInputBinding> = {};
  let apiOutputPaths: string[] = [];
  let apiRefactorRequired = false;
  let scriptCode = "";
  let scriptInputs: ScriptInputRow[] = [];
  let scriptOutputKeys: string[] = [];
  let hotkeyModifiers: HotkeyModifier[] = [];
  let hotkeyKey = "";

  if (node.nodeType === "api_call") {
    const schemaVersion = config.schemaVersion;
    const rawInputBindings = config.inputBindings;
    const rawOutputPaths = config.outputPaths;
    const schemaValid =
      schemaVersion === 2 &&
      rawInputBindings &&
      typeof rawInputBindings === "object" &&
      !Array.isArray(rawInputBindings) &&
      Array.isArray(rawOutputPaths);

    if (!schemaValid) {
      apiRefactorRequired = true;
    } else {
      apiInterfaceId = typeof config.interfaceId === "number" ? config.interfaceId : undefined;
      apiInputBindings = Object.entries(rawInputBindings as Record<string, unknown>).reduce<Record<string, ApiCallInputBinding>>(
        (acc, [key, value]) => {
          const paramName = key.trim();
          if (!paramName || !value || typeof value !== "object" || Array.isArray(value)) {
            return acc;
          }
          const row = value as Record<string, unknown>;
          acc[paramName] = {
            sourceType: normalizeApiInputSourceType(row.sourceType),
            value: typeof row.value === "string" ? row.value : ""
          };
          return acc;
        },
        {}
      );
      const outputPathSet = new Set<string>();
      for (const item of rawOutputPaths as unknown[]) {
        if (typeof item !== "string") {
          continue;
        }
        const path = item.trim();
        if (!path) {
          continue;
        }
        outputPathSet.add(path);
      }
      apiOutputPaths = [...outputPathSet];
    }
  }

  if (node.nodeType === "js_script") {
    const rawInputBindings = config.inputBindings;
    const rawOutputKeys = config.outputKeys;
    const isSchemaV2 =
      config.schemaVersion === 2 &&
      rawInputBindings &&
      typeof rawInputBindings === "object" &&
      !Array.isArray(rawInputBindings) &&
      Array.isArray(rawOutputKeys);
    if (isSchemaV2) {
      scriptCode = typeof config.scriptCode === "string" ? config.scriptCode : "";
      scriptInputs = Object.entries(rawInputBindings as Record<string, unknown>).reduce<ScriptInputRow[]>((acc, [key, value]) => {
        const inputName = key.trim();
        if (!inputName || !value || typeof value !== "object" || Array.isArray(value)) {
          return acc;
        }
        const item = value as Record<string, unknown>;
        acc.push({
          name: inputName,
          sourceType: normalizeApiInputSourceType(item.sourceType),
          value: typeof item.value === "string" ? item.value : ""
        });
        return acc;
      }, []);
      scriptOutputKeys = Array.from(
        new Set(
          (rawOutputKeys as unknown[])
            .map((item) => (typeof item === "string" ? normalizeVariableSegment(item) : ""))
            .filter(Boolean)
        )
      );
    }
  }

  if (node.nodeType === "send_hotkey") {
    const keySet = new Set<string>();
    if (Array.isArray(config.keys)) {
      for (const raw of config.keys as unknown[]) {
        const normalized = normalizeHotkeyMainKey(raw);
        if (normalized) {
          keySet.add(normalized);
        }
      }
    }
    if (keySet.size === 0 && Array.isArray(config.keyCodes)) {
      for (const raw of config.keyCodes as unknown[]) {
        if (typeof raw !== "number" || !Number.isFinite(raw)) {
          continue;
        }
        const key = hotkeyCodeToKey(raw);
        if (key) {
          keySet.add(key);
        }
      }
    }
    const modifiers: HotkeyModifier[] = [];
    for (const item of keySet) {
      const modifier = normalizeHotkeyModifier(item);
      if (modifier) {
        modifiers.push(modifier);
      }
    }
    hotkeyModifiers = modifiers;
    hotkeyKey = [...keySet].find((item) => !normalizeHotkeyModifier(item)) ?? "";
  }

  return {
    name: node.name,
    nodeType: node.nodeType,
    enabled: node.enabled,
    field: typeof config.field === "string" ? config.field : "",
    apiInterfaceId,
    apiInputBindings,
    apiOutputPaths,
    apiRefactorRequired,
    scriptCode,
    scriptInputs,
    scriptOutputKeys,
    hotkeyModifiers,
    hotkeyKey,
    target: typeof config.target === "string" ? config.target : "",
    valueType,
    value: rawValue
  };
}

function normalizeVariableSegment(raw: string) {
  const compact = raw.trim().replace(/\s+/g, "_");
  const sanitized = compact.replace(/[^a-zA-Z0-9_]/g, "_");
  return sanitized.replace(/_+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function deriveNodeOutputKeys(node: JobNodeDefinition): string[] {
  const config = parseConfig(node.configJson);
  const fallback = `node_${node.id}_result`;
  if (node.nodeType === "page_get") {
    const field = typeof config.field === "string" && config.field.trim() ? normalizeVariableSegment(config.field) : "page_value";
    return [`node_${node.id}_${field || "page_value"}`];
  }
  if (node.nodeType === "api_call") {
    if (config.schemaVersion !== 2 || !Array.isArray(config.outputPaths)) {
      return [];
    }
    const keys = new Set<string>();
    for (const rawPath of config.outputPaths as unknown[]) {
      if (typeof rawPath !== "string") {
        continue;
      }
      const path = rawPath.trim();
      if (!path) {
        continue;
      }
      const machineKey = deriveMachineKeyFromOutputPath(path) || "api_output";
      keys.add(`node_${node.id}_${machineKey}`);
    }
    return [...keys];
  }
  if (node.nodeType === "js_script") {
    if (config.schemaVersion === 2 && Array.isArray(config.outputKeys)) {
      const outputKeys = Array.from(
        new Set(
          (config.outputKeys as unknown[])
            .map((item) => (typeof item === "string" ? normalizeVariableSegment(item) : ""))
            .filter(Boolean)
        )
      );
      if (outputKeys.length > 0) {
        return outputKeys.map((item) => `node_${node.id}_${item}`);
      }
    }
    const scriptId =
      typeof config.scriptId === "string" && config.scriptId.trim()
        ? normalizeVariableSegment(config.scriptId)
        : typeof config.script === "string" && config.script.trim()
          ? normalizeVariableSegment(config.script)
          : "script";
    return [`node_${node.id}_${scriptId || "script"}_result`];
  }
  if (node.nodeType === "page_set" || node.nodeType === "page_click" || node.nodeType === "send_hotkey") {
    return [];
  }
  return [fallback];
}

export function deriveNodeOutputReferenceOptions(
  nodeRows: JobNodeDefinition[],
  currentNodeId?: number,
  flowEdges?: Array<Pick<FlowEdge, "source" | "target">>
): NodeOutputReferenceOption[] {
  const sorted = [...nodeRows].sort((a, b) => a.orderNo - b.orderNo);
  const current = typeof currentNodeId === "number" ? sorted.find((node) => node.id === currentNodeId) : undefined;
  const refs: NodeOutputReferenceOption[] = [];
  const seen = new Set<string>();
  const idSet = new Set(sorted.map((node) => String(node.id)));

  let upstreamByGraph = new Set<number>();
  if (current) {
    const reverseAdjacency = new Map<string, string[]>();
    const edgePairs: Array<{ source: string; target: string }> = [];

    if (flowEdges && flowEdges.length > 0) {
      for (const edge of flowEdges) {
        edgePairs.push({ source: edge.source, target: edge.target });
      }
    } else {
      for (const node of sorted) {
        const source = String(node.id);
        for (const target of getFlowNextNodeIds(node.configJson)) {
          edgePairs.push({ source, target });
        }
      }
    }

    for (const edge of edgePairs) {
      if (!idSet.has(edge.source) || !idSet.has(edge.target) || edge.source === edge.target) {
        continue;
      }
      const incoming = reverseAdjacency.get(edge.target) ?? [];
      if (!incoming.includes(edge.source)) {
        incoming.push(edge.source);
      }
      reverseAdjacency.set(edge.target, incoming);
    }

    const visited = new Set<string>();
    const queue = [String(current.id)];
    while (queue.length > 0) {
      const nodeId = queue.shift() as string;
      const incoming = reverseAdjacency.get(nodeId) ?? [];
      for (const source of incoming) {
        if (visited.has(source)) {
          continue;
        }
        visited.add(source);
        queue.push(source);
      }
    }
    upstreamByGraph = new Set(
      [...visited]
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
    );
  }

  for (const node of sorted) {
    if (!node.enabled || node.id === currentNodeId) {
      continue;
    }
    if (current && upstreamByGraph.size > 0 && !upstreamByGraph.has(node.id)) {
      continue;
    }
    if (current && upstreamByGraph.size === 0 && node.orderNo >= current.orderNo) {
      continue;
    }
    for (const key of deriveNodeOutputKeys(node)) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      refs.push({
        value: `{{${key}}}`,
        label: `${node.name} · ${key}`,
        variableKey: key,
        nodeId: node.id
      });
    }
  }

  return refs;
}

