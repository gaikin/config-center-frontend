import { Button, Form, Grid, Input, Select, Space, Switch, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getOrgLabel } from "../../orgOptions";
import { configCenterService } from "../../services/configCenterService";
import { getRightOverlayDrawerWidth } from "../../utils";
import { createFieldIssue, tryParseJson, validateInterfaceDraftPayload } from "../../validation/formRules";
import type {
  ApiInputParam,
  ApiOutputParam,
  ApiValueType,
  FieldValidationIssue,
  InterfaceDraftPayload,
  InterfaceDefinition,
  LifecycleState,
  SaveValidationReport
} from "../../types";
import {
  buildInputSummary,
  buildMockResponseBody,
  DebugResult,
  defaultInputValidationConfig,
  defaultInputParam,
  defaultOutputParam,
  emptyInputConfig,
  flattenBodyParams,
  getResponsePath,
  InputConfigDraft,
  InputTabKey,
  normalizeInputConfig,
  normalizeOutputConfig,
  parseOutputFromSampleObject,
  regexModeOptions,
  regexTemplateOptions,
  statusColor,
  StatusFilter,
  tabLabels,
  valueTypeOptions,
  ApiRegisterForm
} from "./interfacesPageShared";

type UseInterfacesPageModelOptions = {
  onSaveValidationError?: (fieldName: string) => void;
};

const submitValidateFieldNames: Array<keyof ApiRegisterForm> = ["name", "description", "method", "prodPath"];

function getFirstValidationFieldName(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const errorFields = (error as { errorFields?: Array<{ name?: Array<string | number> }> }).errorFields;
  if (!Array.isArray(errorFields) || errorFields.length === 0) {
    return null;
  }
  const first = errorFields[0];
  const name = first?.name;
  if (!Array.isArray(name) || name.length === 0) {
    return null;
  }
  return String(name[0]);
}

export function mergeSubmitFormValues(
  validatedValues: Partial<ApiRegisterForm> | undefined,
  allValues: Partial<ApiRegisterForm> | undefined
): Partial<ApiRegisterForm> {
  return {
    ...(allValues ?? {}),
    ...(validatedValues ?? {})
  };
}

export function useInterfacesPageModel(options: UseInterfacesPageModelOptions = {}) {
  const screens = Grid.useBreakpoint();
  const drawerWidth = getRightOverlayDrawerWidth(Boolean(screens.lg));

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InterfaceDefinition[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InterfaceDefinition | null>(null);
  const [inputTab, setInputTab] = useState<InputTabKey>("headers");
  const [inputConfig, setInputConfig] = useState<InputConfigDraft>(emptyInputConfig());
  const [outputConfig, setOutputConfig] = useState<ApiOutputParam[]>([]);
  const [outputSampleJson, setOutputSampleJson] = useState("{\n  \"data\": {\n    \"score\": 90\n  }\n}");

  const [debugOpen, setDebugOpen] = useState(false);
  const [debugTarget, setDebugTarget] = useState<InterfaceDefinition | null>(null);
  const [debugPayload, setDebugPayload] = useState("{}");
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);

  const [saveValidationReport, setSaveValidationReport] = useState<SaveValidationReport | null>(null);
  const [inputValidationIssues, setInputValidationIssues] = useState<FieldValidationIssue[]>([]);
  const [outputValidationIssues, setOutputValidationIssues] = useState<FieldValidationIssue[]>([]);
  const [publishNotice, setPublishNotice] = useState<{ objectName: string; warningCount: number; resourceId: number } | null>(null);
  const [draftOwnerOrgId, setDraftOwnerOrgId] = useState("branch-east");

  const [form] = Form.useForm<ApiRegisterForm>();
  const [msgApi, holder] = message.useMessage();
  const watchedFormValues = Form.useWatch([], form) as Partial<ApiRegisterForm> | undefined;

  async function loadData() {
    setLoading(true);
    try {
      const data = await configCenterService.listInterfaces();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") {
      return rows;
    }
    return rows.filter((item) => item.status === statusFilter);
  }, [rows, statusFilter]);

  function resetFormState() {
    setInputTab("headers");
    setInputConfig(emptyInputConfig());
    setOutputConfig([]);
    setOutputSampleJson("{\n  \"data\": {\n    \"score\": 90\n  }\n}");
    setSaveValidationReport(null);
    setInputValidationIssues([]);
    setOutputValidationIssues([]);
  }

  function openCreate(preset?: {
    ownerOrgId?: string;
    name?: string;
    description?: string;
    method?: ApiRegisterForm["method"];
    prodPath?: string;
  }) {
    setEditing(null);
    setPublishNotice(null);
    resetFormState();
    setDraftOwnerOrgId(preset?.ownerOrgId ?? "branch-east");
    form.setFieldsValue({
      name: preset?.name ?? "",
      description: preset?.description ?? "",
      method: preset?.method ?? "POST",
      prodPath: preset?.prodPath ?? "",
      bodyTemplateJson: ""
    });
    setDrawerOpen(true);
  }

  function openEdit(row: InterfaceDefinition) {
    setEditing(row);
    setPublishNotice(null);
    setDraftOwnerOrgId(row.ownerOrgId);
    setInputConfig(normalizeInputConfig(row.inputConfigJson));
    setOutputConfig(normalizeOutputConfig(row.outputConfigJson));
    setOutputSampleJson("{\n  \"data\": {}\n}");

    form.setFieldsValue({
      name: row.name,
      description: row.description,
      method: row.method,
      prodPath: row.prodPath,
      bodyTemplateJson: row.bodyTemplateJson
    });
    setDrawerOpen(true);
  }

  function openClone(row: InterfaceDefinition) {
    setEditing(null);
    setPublishNotice(null);
    setDraftOwnerOrgId(row.ownerOrgId);
    setInputConfig(normalizeInputConfig(row.inputConfigJson));
    setOutputConfig(normalizeOutputConfig(row.outputConfigJson));
    setOutputSampleJson("{\n  \"data\": {}\n}");
    form.setFieldsValue({
      name: `${row.name}-副本`,
      description: row.description,
      method: row.method,
      prodPath: row.prodPath,
      bodyTemplateJson: row.bodyTemplateJson
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
  }

  const liveSaveValidationReport = useMemo(() => {
    if (!drawerOpen) {
      return null;
    }
    const values = watchedFormValues ?? {};
    return validateInterfaceDraftPayload(
      {
        id: editing?.id ?? -1,
        name: values.name?.trim() ?? "",
        description: values.description?.trim() ?? "",
        method: values.method ?? "POST",
        prodPath: values.prodPath?.trim() ?? "",
        currentVersion: editing?.currentVersion ?? 1,
        bodyTemplateJson: values.bodyTemplateJson?.trim() ?? "",
        inputConfigJson: JSON.stringify(inputConfig),
        outputConfigJson: JSON.stringify(outputConfig),
        paramSourceSummary: buildInputSummary(inputConfig),
        responsePath: getResponsePath(outputConfig)
      },
      inputConfig,
      outputConfig,
      rows
    );
  }, [drawerOpen, editing?.id, editing?.currentVersion, inputConfig, outputConfig, rows, watchedFormValues]);

  const liveOutputSampleIssues = useMemo(() => {
    const raw = outputSampleJson.trim();
    if (!raw) {
      return [] as FieldValidationIssue[];
    }
    const parsed = tryParseJson(raw);
    if (parsed.ok) {
      return [] as FieldValidationIssue[];
    }
    return [
      createFieldIssue({
        section: "params",
        field: "outputSampleJson",
        label: "返回 JSON 示例",
        message: "JSON 格式错误，当前还不能解析为返回字段",
        action: parsed.error
      })
    ];
  }, [outputSampleJson]);

  const activeSaveValidationReport = liveSaveValidationReport ?? saveValidationReport;

  function addInputRow(tab: InputTabKey) {
    setInputConfig((prev) => ({
      ...prev,
      [tab]: [...prev[tab], defaultInputParam()]
    }));
  }

  function updateInputRow(tab: InputTabKey, rowId: string, patch: Partial<ApiInputParam>) {
    setInputConfig((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => (item.id === rowId ? { ...item, ...patch } : item))
    }));
  }

  function updateInputValidation(
    tab: InputTabKey,
    rowId: string,
    patch: Partial<NonNullable<ApiInputParam["validationConfig"]>>
  ) {
    setInputConfig((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) =>
        item.id === rowId
          ? {
              ...item,
              validationConfig: {
                ...defaultInputValidationConfig(item.validationConfig),
                ...patch
              }
            }
          : item
      )
    }));
  }

  function removeInputRow(tab: InputTabKey, rowId: string) {
    setInputConfig((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((item) => item.id !== rowId)
    }));
  }

  function parseBodyTemplate() {
    const raw = form.getFieldValue("bodyTemplateJson")?.trim();
    if (!raw) {
      msgApi.warning("请先输入 Body JSON");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const generated = flattenBodyParams(parsed);

      setInputConfig((prev) => {
        return {
          ...prev,
          // Body 参数结构以 JSON 为唯一来源：每次解析都全量重建。
          body: generated
        };
      });

      msgApi.success(generated.length > 0 ? `已按 JSON 重建 ${generated.length} 个字段` : "JSON 解析成功，未识别到可生成字段");
      setInputValidationIssues([]);
    } catch {
      setInputValidationIssues([
        createFieldIssue({
          section: "params",
          field: "bodyTemplateJson",
          label: "Body JSON 模板",
          message: "JSON 格式错误，无法解析为请求参数",
          action: "请检查括号、引号和逗号是否完整。"
        })
      ]);
      msgApi.error("Body JSON 解析失败，请检查格式");
    }
  }

  function addOutputRow() {
    setOutputConfig((prev) => [...prev, defaultOutputParam()]);
  }

  function updateOutputRow(rowId: string, patch: Partial<ApiOutputParam>) {
    setOutputConfig((prev) => prev.map((item) => (item.id === rowId ? { ...item, ...patch } : item)));
  }

  function removeOutputRow(rowId: string) {
    setOutputConfig((prev) => prev.filter((item) => item.id !== rowId));
  }

  function updateOutputChildrenByParent(
    parentId: string,
    updater: (children: ApiOutputParam[]) => ApiOutputParam[]
  ) {
    const walk = (rows: ApiOutputParam[]): ApiOutputParam[] =>
      rows.map((row) => {
        if (row.id === parentId) {
          return {
            ...row,
            children: updater(row.children ?? [])
          };
        }
        if (Array.isArray(row.children) && row.children.length > 0) {
          return {
            ...row,
            children: walk(row.children)
          };
        }
        return row;
      });

    setOutputConfig((prev) => walk(prev));
  }

  function addOutputChildRow(parentId: string) {
    updateOutputChildrenByParent(parentId, (children) => [...children, defaultOutputParam()]);
  }

  function updateOutputChildRow(parentId: string, rowId: string, patch: Partial<ApiOutputParam>) {
    updateOutputChildrenByParent(parentId, (children) =>
      children.map((item) => (item.id === rowId ? { ...item, ...patch } : item))
    );
  }

  function removeOutputChildRow(parentId: string, rowId: string) {
    updateOutputChildrenByParent(parentId, (children) => children.filter((item) => item.id !== rowId));
  }

  function collectManualOutputPathMap(
    rows: ApiOutputParam[],
    parentKey = "",
    acc: Map<string, string> = new Map<string, string>()
  ): Map<string, string> {
    for (const row of rows) {
      const key = parentKey ? `${parentKey}.${row.name}` : row.name;
      if (key && row.pathMode === "MANUAL" && row.path.trim()) {
        acc.set(key, row.path.trim());
      }
      if (Array.isArray(row.children) && row.children.length > 0) {
        collectManualOutputPathMap(row.children, key, acc);
      }
    }
    return acc;
  }

  function applyManualOutputPaths(
    rows: ApiOutputParam[],
    manualPathMap: Map<string, string>,
    parentKey = ""
  ): ApiOutputParam[] {
    return rows.map((row) => {
      const key = parentKey ? `${parentKey}.${row.name}` : row.name;
      const children = Array.isArray(row.children) && row.children.length > 0
        ? applyManualOutputPaths(row.children, manualPathMap, key)
        : [];
      const manualPath = key ? manualPathMap.get(key) : undefined;
      if (manualPath) {
        return {
          ...row,
          path: manualPath,
          pathMode: "MANUAL",
          children
        };
      }
      return {
        ...row,
        pathMode: "AUTO",
        children
      };
    });
  }

  function parseOutputSample() {
    const raw = outputSampleJson.trim();
    if (!raw) {
      msgApi.warning("请先输入返回 JSON 示例");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const generated = parseOutputFromSampleObject(parsed, "$");
      setOutputConfig((prev) => {
        const manualPathMap = collectManualOutputPathMap(prev);
        return applyManualOutputPaths(generated, manualPathMap);
      });
      setOutputValidationIssues([]);
      msgApi.success("出参 JSON 解析成功");
    } catch {
      setOutputValidationIssues([
        createFieldIssue({
          section: "params",
          field: "outputSampleJson",
          label: "返回 JSON 示例",
          message: "JSON 格式错误，无法解析为返回字段",
          action: "请检查 JSON 结构是否完整。"
        })
      ]);
      msgApi.error("出参 JSON 解析失败，请检查格式");
    }
  }
  async function submit() {
    let validatedValues: Partial<ApiRegisterForm>;
    try {
      validatedValues = (await form.validateFields(submitValidateFieldNames)) as Partial<ApiRegisterForm>;
    } catch (error) {
      const fieldName = getFirstValidationFieldName(error);
      if (fieldName) {
        options.onSaveValidationError?.(fieldName);
      }
      msgApi.error("请先处理表单中的阻断项");
      return;
    }
    const values = mergeSubmitFormValues(validatedValues, form.getFieldsValue(true) as Partial<ApiRegisterForm>);

    const payload: InterfaceDraftPayload = {
      id: editing?.id ?? Date.now() + Math.floor(Math.random() * 1000),
      name: values.name?.trim() ?? "",
      description: values.description?.trim() ?? "",
      method: values.method ?? "POST",
      prodPath: values.prodPath?.trim() ?? "",
      currentVersion: editing?.currentVersion ?? 1,
      bodyTemplateJson: values.bodyTemplateJson?.trim() ?? "",
      inputConfigJson: JSON.stringify(inputConfig),
      outputConfigJson: JSON.stringify(outputConfig),
      paramSourceSummary: buildInputSummary(inputConfig),
      responsePath: getResponsePath(outputConfig)
    };

    setInputValidationIssues([]);
    setOutputValidationIssues([]);
    const result = await configCenterService.saveInterfaceDraft(payload, { inputConfig, outputConfig, ownerOrgId: draftOwnerOrgId });
    setSaveValidationReport(result.report);
    if (!result.success) {
      msgApi.error(result.report.summary);
      return;
    }
    const savedInterfaceId = result.data?.id ?? payload.id;
    await configCenterService.updateInterfaceStatus(savedInterfaceId, "ACTIVE");
    msgApi.success(
      result.report.warningCount > 0
        ? `API注册已保存并生效，另有 ${result.report.warningCount} 个提醒建议处理`
        : editing
          ? "API注册已更新并立即生效"
          : "API注册已创建并立即生效"
    );
    setPublishNotice(null);
    closeDrawer();
    await loadData();
  }

  async function publishInterfaceNow(interfaceId: number, interfaceName: string, effectiveOrgIds: string[] = []): Promise<boolean> {
    await configCenterService.updateInterfaceStatus(interfaceId, "ACTIVE");
    msgApi.success(`已生效：${interfaceName}（${effectiveOrgIds.length > 0 ? effectiveOrgIds.map((orgId) => getOrgLabel(orgId)).join("、") : "全部机构"}）`);
    await loadData();
    return true;
  }

  async function restoreInterfaceNow(
    row: InterfaceDefinition,
    effectiveOrgIds: string[] = []
  ): Promise<boolean> {
    return publishInterfaceNow(row.id, row.name, effectiveOrgIds);
  }

  async function publishNoticeNow() {
    if (!publishNotice) {
      return;
    }
    const success = await publishInterfaceNow(publishNotice.resourceId, publishNotice.objectName);
    if (success) {
      setPublishNotice(null);
    }
  }

  async function switchStatus(item: InterfaceDefinition) {
    const next: LifecycleState = item.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateInterfaceStatus(item.id, next);
    msgApi.success(`API状态已切换为 ${next}`);
    await loadData();
  }

  function openDebug(row: InterfaceDefinition) {
    setDebugTarget(row);
    setDebugPayload(row.bodyTemplateJson || "{}");
    setDebugResult(null);
    setDebugOpen(true);
  }

  function openDebugDraft() {
    const values = form.getFieldsValue() as Partial<ApiRegisterForm>;
    const target: InterfaceDefinition = {
      id: editing?.id ?? Date.now() + Math.floor(Math.random() * 1000),
      name: values.name?.trim() || "未命名接口",
      description: values.description?.trim() || "",
      method: values.method ?? "POST",
      testPath: values.prodPath?.trim() || "/prod/path",
      prodPath: values.prodPath?.trim() || "/prod/path",
      url: values.prodPath?.trim() || "/prod/path",
      status: editing?.status ?? "DRAFT",
      ownerOrgId: editing?.ownerOrgId ?? draftOwnerOrgId,
      currentVersion: editing?.currentVersion ?? 1,
      timeoutMs: editing?.timeoutMs ?? 3000,
      retryTimes: editing?.retryTimes ?? 0,
      bodyTemplateJson: values.bodyTemplateJson?.trim() ?? "{}",
      inputConfigJson: JSON.stringify(inputConfig),
      outputConfigJson: JSON.stringify(outputConfig),
      paramSourceSummary: buildInputSummary(inputConfig),
      responsePath: getResponsePath(outputConfig),
      maskSensitive: editing?.maskSensitive ?? true,
      updatedAt: new Date().toISOString()
    };
    setDebugTarget(target);
    setDebugPayload(target.bodyTemplateJson || "{}");
    setDebugResult(null);
    setDebugOpen(true);
  }

  function runDebug() {
    if (!debugTarget) {
      return;
    }

    let requestBody: Record<string, unknown> = {};
    const payload = debugPayload.trim();
    if (payload) {
      try {
        requestBody = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        msgApi.error("调试入参 JSON 格式错误");
        return;
      }
    }

    const outputs = normalizeOutputConfig(debugTarget.outputConfigJson);
    const requestPath = debugTarget.prodPath;
    const latencyMs = 180 + Math.floor(Math.random() * 320);
    const responseBody = buildMockResponseBody(outputs);

    setDebugResult({
      requestPath,
      requestBody,
      responseBody,
      latencyMs
    });
    msgApi.success("调试执行完成");
  }

  const inputColumns = (tab: InputTabKey) => {
    const renderValidationConfig = (row: ApiInputParam) => {
      const config = defaultInputValidationConfig(row.validationConfig);
      return (
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Space size={8} wrap>
            <Switch
              checked={config.required}
              checkedChildren="必填"
              unCheckedChildren="可选"
              onChange={(checked) => updateInputValidation(tab, row.id, { required: checked })}
            />
            <Select
              style={{ minWidth: 120 }}
              value={config.regexMode}
              options={regexModeOptions}
              onChange={(value) =>
                updateInputValidation(tab, row.id, {
                  regexMode: value,
                  regexTemplateKey: value === "TEMPLATE" ? config.regexTemplateKey : undefined,
                  regexPattern: value === "CUSTOM" ? config.regexPattern : "",
                  regexErrorMessage: value === "CUSTOM" ? config.regexErrorMessage : ""
                })
              }
            />
          </Space>
          {config.regexMode === "TEMPLATE" ? (
            <Select
              value={config.regexTemplateKey}
              placeholder="选择正则模板"
              options={regexTemplateOptions.map((item) => ({
                label: `${item.label} / ${item.pattern}`,
                value: item.value
              }))}
              onChange={(value) => updateInputValidation(tab, row.id, { regexTemplateKey: value })}
            />
          ) : null}
          {config.regexMode === "CUSTOM" ? (
            <Input
              value={config.regexPattern}
              placeholder="输入正则表达式，如 ^[A-Z0-9_]+$"
              onChange={(event) =>
                updateInputValidation(tab, row.id, {
                  regexPattern: event.target.value
                })
              }
            />
          ) : null}
        </Space>
      );
    };

    if (tab === "body") {
      return [
        {
          title: "字段名",
          width: 180,
          render: (_: unknown, row: ApiInputParam) => row.name || "-"
        },
        {
          title: "路径",
          width: 220,
          render: (_: unknown, row: ApiInputParam) => row.name || "-"
        },
        {
          title: "类型",
          width: 120,
          render: (_: unknown, row: ApiInputParam) =>
            valueTypeOptions.find((option) => option.value === row.valueType)?.label ?? row.valueType
        },
        {
          title: "校验规则",
          width: 330,
          render: (_: unknown, row: ApiInputParam) => renderValidationConfig(row)
        },
        {
          title: "说明",
          width: 180,
          render: (_: unknown, row: ApiInputParam) => (
            <Input
              value={row.description}
              onChange={(event) => updateInputRow(tab, row.id, { description: event.target.value })}
            />
          )
        }
      ];
    }

    return [
      {
        title: "参数名",
        width: 180,
        render: (_: unknown, row: ApiInputParam) => (
          <Input value={row.name} onChange={(event) => updateInputRow(tab, row.id, { name: event.target.value })} />
        )
      },
      {
        title: "描述",
        width: 160,
        render: (_: unknown, row: ApiInputParam) => (
          <Input
            value={row.description}
            onChange={(event) => updateInputRow(tab, row.id, { description: event.target.value })}
          />
        )
      },
      {
        title: "类型",
        width: 120,
        render: (_: unknown, row: ApiInputParam) => (
          <Select
            value={row.valueType}
            options={valueTypeOptions}
            onChange={(value) => updateInputRow(tab, row.id, { valueType: value as ApiValueType })}
          />
        )
      },
      {
        title: "校验规则",
        width: 330,
        render: (_: unknown, row: ApiInputParam) => renderValidationConfig(row)
      },
      {
        title: "操作",
        width: 80,
        render: (_: unknown, row: ApiInputParam) => (
          <Button danger size="small" onClick={() => removeInputRow(tab, row.id)}>
            删除
          </Button>
        )
      }
    ];
  };

  return {
    drawerWidth, loading, rows, statusFilter, setStatusFilter, drawerOpen, setDrawerOpen, editing, inputTab, setInputTab,
    inputConfig, outputConfig, outputSampleJson, setOutputSampleJson, debugOpen, setDebugOpen, debugTarget,
    debugPayload, setDebugPayload, debugResult, form, holder,
    msgApi,
    filteredRows, openCreate, openEdit, openClone, closeDrawer, addInputRow, updateInputRow, removeInputRow, parseBodyTemplate, addOutputRow,
    updateOutputRow, removeOutputRow, addOutputChildRow, updateOutputChildRow, removeOutputChildRow, parseOutputSample, submit, switchStatus, openDebug, openDebugDraft,
    runDebug, inputColumns, valueTypeOptions, tabLabels, statusColor,
    saveValidationReport: activeSaveValidationReport,
    inputValidationIssues,
    outputValidationIssues: [...outputValidationIssues, ...liveOutputSampleIssues],
    publishNotice,
    dismissPublishNotice: () => setPublishNotice(null),
    publishNoticeNow,
    publishInterfaceNow,
    restoreInterfaceNow
  };
}
