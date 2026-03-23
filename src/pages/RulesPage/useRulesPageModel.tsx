import { Form, Grid, Modal, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateContextVariableValue } from "../../contextVariables";
import { getOrgLabel } from "../../orgOptions";
import { configCenterService } from "../../services/configCenterService";
import { workflowService } from "../../services/workflowService";
import { createId, getRightOverlayDrawerWidth } from "../../utils";
import { createFieldIssue, validateRuleDraftPayload } from "../../validation/formRules";
import { parsePromptContentConfig, stringifyPromptContentConfig } from "../../promptContent";
import type {
  BusinessFieldDefinition,
  ContextVariableDefinition,
  FieldValidationIssue,
  InterfaceDefinition,
  JobSceneDefinition,
  LifecycleState,
  PageFieldBinding,
  PageMenu,
  PageResource,
  DataProcessorDefinition,
  RuleConditionGroup,
  RuleDefinition,
  RuleLogicType,
  RuleOperandSourceType,
  SaveValidationReport
} from "../../types";
import type { InterfaceInputBindingDraft, OperandDraft, OperandSide, PromptVariableOption } from "./rulesPageShared";
import {
  buildDefaultCondition,
  buildDataProcessorId,
  collectInterfaceInputParams,
  collectOutputPathMeta,
  contextOptions,
  defaultInterfaceInputBinding,
  deriveMachineKeyFromOutputPath,
  FlatConditionDraft,
  hasDirtyOperandConfig,
  normalizeOperator,
  parseInterfaceInputConfig,
  parseJsonSafe,
  DataProcessorDraft,
  resetOperandBySource,
  RulePageFieldOption,
  RuleForm,
  SelectedOperand,
  stringifyInterfaceInputConfig,
  statusColor,
  toFlatCondition,
  toRuleOperand,
  operatorOptions,
  sourceOptions,
  valueTypeOptions
} from "./rulesPageShared";

export type RulesPageMode = "PAGE_RULE" | "TEMPLATE";

type RulesPageOptions = {
  initialPageResourceId?: number;
  initialTemplateRuleId?: number;
  initialSceneId?: number;
  autoOpenCreate?: boolean;
  viewerOrgId?: string;
  viewerRoleType?: "CONFIG_OPERATOR" | "PERMISSION_ADMIN" | "TECH_SUPPORT";
  viewerOperatorId?: string;
};

type PublishNotice = {
  objectLabel: string;
  objectName: string;
  warningCount: number;
  resourceId: number;
};

export function useRulesPageModel(mode: RulesPageMode = "PAGE_RULE", options: RulesPageOptions = {}) {
  const screens = Grid.useBreakpoint();
  const logicDrawerWidth = getRightOverlayDrawerWidth(Boolean(screens.lg));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RuleDefinition[]>([]);
  const [resources, setResources] = useState<PageResource[]>([]);
  const [pageMenus, setPageMenus] = useState<PageMenu[]>([]);
  const [businessFields, setBusinessFields] = useState<BusinessFieldDefinition[]>([]);
  const [pageFieldBindings, setPageFieldBindings] = useState<PageFieldBinding[]>([]);
  const [scenes, setScenes] = useState<JobSceneDefinition[]>([]);
  const [dataProcessors, setDataProcessors] = useState<DataProcessorDefinition[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceDefinition[]>([]);
  const [contextVariables, setContextVariables] = useState<ContextVariableDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleDefinition | null>(null);
  const [reuseSourceRule, setReuseSourceRule] = useState<RuleDefinition | null>(null);
  const [ruleForm] = Form.useForm<RuleForm>();
  const watchedRuleScope = Form.useWatch("ruleScope", ruleForm);
  const watchedPageResourceId = Form.useWatch("pageResourceId", ruleForm);
  const [ruleSnapshot, setRuleSnapshot] = useState("");
  const [currentRule, setCurrentRule] = useState<RuleDefinition | null>(null);
  const [logicLoading, setLogicLoading] = useState(false);
  const [globalLogicType, setGlobalLogicType] = useState<RuleLogicType>("AND");
  const [conditionsDraft, setConditionsDraft] = useState<FlatConditionDraft[]>([buildDefaultCondition()]);
  const [selectedOperand, setSelectedOperand] = useState<SelectedOperand | null>(null);
  const [savingQuery, setSavingQuery] = useState(false);
  const [saveValidationReport, setSaveValidationReport] = useState<SaveValidationReport | null>(null);
  const [logicValidationIssues, setLogicValidationIssues] = useState<FieldValidationIssue[]>([]);
  const [publishNotice, setPublishNotice] = useState<PublishNotice | null>(null);
  const hasAutoOpened = useRef(false);
  const [msgApi, holder] = message.useMessage();
  const activeRuleScope = currentRule?.ruleScope ?? watchedRuleScope ?? "PAGE_RESOURCE";
  const activePageResourceId = currentRule?.pageResourceId ?? watchedPageResourceId;
  const watchedRuleValues = Form.useWatch([], ruleForm) as Partial<RuleForm> | undefined;

  async function loadData() {
    setLoading(true);
    try {
      const [ruleData, resourceData, menuData, fieldData, sceneData, dataProcessorData, interfaceData, contextVariableData] = await Promise.all([
        configCenterService.listRules({ viewerOrgId: options.viewerOrgId }),
        configCenterService.listPageResources(),
        configCenterService.listPageMenus(),
        configCenterService.listBusinessFields(),
        configCenterService.listJobScenes({ viewerOrgId: options.viewerOrgId }),
        configCenterService.listDataProcessors(),
        configCenterService.listInterfaces(),
        configCenterService.listContextVariables()
      ]);
      const bindingData = (await Promise.all(
        resourceData.map((resource) => configCenterService.listPageFieldBindings(resource.id))
      )).flat();
      setRows(ruleData);
      setResources(resourceData);
      setPageMenus(menuData);
      setBusinessFields(fieldData);
      setPageFieldBindings(bindingData);
      setScenes(sceneData);
      setDataProcessors(dataProcessorData);
      setInterfaces(interfaceData);
      setContextVariables(contextVariableData);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadData();
  }, []);
  const templateRows = useMemo(
    () => rows.filter((row) => row.ruleScope === "SHARED"),
    [rows]
  );
  const pageRuleRows = useMemo(
    () => rows.filter((row) => row.ruleScope === "PAGE_RESOURCE"),
    [rows]
  );
  const pageFieldOptions = useMemo<RulePageFieldOption[]>(() => {
    const boundFieldCodes =
      activeRuleScope === "PAGE_RESOURCE" && typeof activePageResourceId === "number"
        ? new Set(
            pageFieldBindings
              .filter((binding) => binding.pageResourceId === activePageResourceId)
              .map((binding) => binding.businessFieldCode)
          )
        : null;

    const fields = businessFields.filter((field) => {
      if (activeRuleScope === "SHARED") {
        return field.scope === "GLOBAL";
      }
      if (typeof activePageResourceId !== "number") {
        return field.scope === "GLOBAL";
      }
      if (!boundFieldCodes?.has(field.code)) {
        return false;
      }
      return field.scope === "GLOBAL" || field.pageResourceId === activePageResourceId;
    });

    return fields.map((field) => ({
      label: `${field.scope === "GLOBAL" ? "公共字段" : "页面字段"} / ${field.name}`,
      value: field.code,
      group: field.scope === "GLOBAL" ? "公共字段" : "页面特有字段"
    }));
  }, [activePageResourceId, activeRuleScope, businessFields, pageFieldBindings]);
  const contextVariableOptions = useMemo<Array<{ label: string; value: string }>>(() => {
    const activeRows = contextVariables.filter((item) => item.status !== "DISABLED" && item.key.trim());
    if (activeRows.length === 0) {
      return contextOptions.map((item) => ({ label: item, value: item }));
    }
    const seen = new Set<string>();
    return activeRows
      .filter((item) => {
        if (seen.has(item.key)) {
          return false;
        }
        seen.add(item.key);
        return true;
      })
      .map((item) => ({
        label: item.label?.trim() ? `${item.label} (${item.key})` : item.key,
        value: item.key
      }));
  }, [contextVariables]);
  const promptVariableOptions = useMemo<PromptVariableOption[]>(() => {
    const result: PromptVariableOption[] = [];
    const seenKeys = new Set<string>();
    const exampleValues: Record<string, string> = {
      customer_id: "62220001",
      id_no: "330102199001010011",
      mobile: "13800138000",
      account_purpose: "经营结算",
      collateral_type: "房产抵押",
      org_id: "branch-east",
      operator_role: "客户经理",
      channel: "柜面",
      user_role: "新员工",
      score: "92",
      riskLevel: "高风险",
      name: "张三"
    };

    for (const field of pageFieldOptions) {
      if (seenKeys.has(field.value)) {
        continue;
      }
      seenKeys.add(field.value);
      result.push({
        key: field.value,
        label: field.label.split("/").pop()?.trim() ?? field.value,
        exampleValue: exampleValues[field.value] ?? `${field.label.split("/").pop()?.trim() ?? field.value}示例`,
        sourceType: "PAGE_FIELD"
      });
    }

    const contextRows = contextVariables.filter((item) => item.status !== "DISABLED" && item.key.trim());
    if (contextRows.length === 0) {
      for (const item of contextOptions) {
        if (seenKeys.has(item)) {
          continue;
        }
        seenKeys.add(item);
        result.push({
          key: item,
          label: item,
          exampleValue: exampleValues[item] ?? `${item}-示例`,
          sourceType: "CONTEXT"
        });
      }
    } else {
      const seenContextKey = new Set<string>();
      for (const item of contextRows) {
        const key = item.key.trim();
        if (!key || seenContextKey.has(key) || seenKeys.has(key)) {
          continue;
        }
        seenContextKey.add(key);
        seenKeys.add(key);
        const dynamicExample = evaluateContextVariableValue(item, exampleValues);
        result.push({
          key,
          label: item.label?.trim() || key,
          exampleValue: dynamicExample || exampleValues[key] || `${key}-示例`,
          sourceType: "CONTEXT"
        });
      }
    }

    const collectInterfaceVariables = (
      outputs: unknown[],
      interfaceName: string
    ) => {
      for (const item of outputs) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const row = item as { name?: unknown; path?: unknown; children?: unknown[] };
        const outputPath = typeof row.path === "string" ? row.path : "";
        const key = deriveMachineKeyFromOutputPath(outputPath);
        const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : key;
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          result.push({
            key,
            label: `API / ${interfaceName} / ${name}`,
            exampleValue: exampleValues[key] ?? `${name}示例`,
            sourceType: "INTERFACE_FIELD"
          });
        }
        if (Array.isArray(row.children)) {
          collectInterfaceVariables(row.children, interfaceName);
        }
      }
    };

    for (const target of interfaces) {
      collectInterfaceVariables(parseJsonSafe<unknown[]>(target.outputConfigJson, []), target.name);
    }

    return result;
  }, [contextVariables, interfaces, pageFieldOptions]);
  function buildRuleSnapshot(values: Partial<RuleForm>) {
    return JSON.stringify({
      templateRuleId: values.templateRuleId ?? null,
      name: values.name ?? "",
      ruleScope: values.ruleScope ?? (mode === "TEMPLATE" ? "SHARED" : "PAGE_RESOURCE"),
      pageResourceId: values.pageResourceId ?? null,
      priority: values.priority ?? 1,
      promptMode: values.promptMode ?? "FLOATING",
      titleSuffix: values.titleSuffix ?? "",
      bodyTemplate: values.bodyTemplate ?? "",
      bodyEditorStateJson: values.bodyEditorStateJson ?? "",
      closeMode: values.closeMode ?? "MANUAL_CLOSE",
      closeTimeoutSec: values.closeTimeoutSec ?? null,
      hasConfirmButton: values.hasConfirmButton ?? true,
      sceneId: values.sceneId ?? null,
      status: "DRAFT",
      ownerOrgId: values.ownerOrgId ?? ""
    });
  }
  function closeRuleModalDirectly() {
    setOpen(false);
    setEditing(null);
    setCurrentRule(null);
    setReuseSourceRule(null);
    setRuleSnapshot("");
    setSaveValidationReport(null);
  }
  function closeRuleModal() {
    const current = buildRuleSnapshot(ruleForm.getFieldsValue() as Partial<RuleForm>);
    if (ruleSnapshot && current !== ruleSnapshot) {
      Modal.confirm({
        title: "存在未保存修改",
        content: "关闭后将丢失当前规则基础配置，是否继续？",
        okText: "仍然关闭",
        cancelText: "继续编辑",
        onOk: closeRuleModalDirectly
      });
      return;
    }
    closeRuleModalDirectly();
  }
  async function loadLogic(rule: RuleDefinition) {
    const [groupData, conditionData] = await Promise.all([
      workflowService.listRuleConditionGroups(rule.id),
      workflowService.listRuleConditions(rule.id)
    ]);
    const rootGroup = groupData
      .filter((item) => !item.parentGroupId)
      .sort((a, b) => a.id - b.id)[0];
    setGlobalLogicType(rootGroup?.logicType ?? "AND");
    const nextConditions = conditionData.sort((a, b) => a.id - b.id).map(toFlatCondition);
    const safeConditions = nextConditions.length > 0 ? nextConditions : [buildDefaultCondition()];
    setConditionsDraft(safeConditions);
    setSelectedOperand({ conditionId: safeConditions[0].id, side: "left" });
  }
  function openCreate(presetPageResourceId?: number) {
    const presetPageId =
      typeof presetPageResourceId === "number" && resources.some((item) => item.id === presetPageResourceId)
        ? presetPageResourceId
        : typeof options.initialPageResourceId === "number" &&
            resources.some((item) => item.id === options.initialPageResourceId)
          ? options.initialPageResourceId
        : resources[0]?.id;
    const presetTemplate =
      mode === "PAGE_RULE" &&
      typeof options.initialTemplateRuleId === "number" &&
      templateRows.some((item) => item.id === options.initialTemplateRuleId)
        ? templateRows.find((item) => item.id === options.initialTemplateRuleId) ?? null
        : null;
    const presetSceneId =
      typeof options.initialSceneId === "number" && scenes.some((item) => item.id === options.initialSceneId)
        ? options.initialSceneId
        : undefined;
    const presetPromptContent = parsePromptContentConfig(presetTemplate?.promptContentConfigJson);
    const values: RuleForm = {
      templateRuleId: presetTemplate?.id,
      name: presetTemplate ? `${presetTemplate.name}-副本` : "",
      ruleScope: mode === "TEMPLATE" ? "SHARED" : "PAGE_RESOURCE",
      pageResourceId: mode === "TEMPLATE" ? undefined : presetPageId,
      priority: presetTemplate?.priority ?? 500,
      promptMode: presetTemplate?.promptMode ?? "FLOATING",
      titleSuffix: presetPromptContent.titleSuffix,
      bodyTemplate: presetPromptContent.bodyTemplate,
      bodyEditorStateJson: presetPromptContent.bodyEditorStateJson,
      closeMode: presetTemplate?.closeMode ?? "MANUAL_CLOSE",
      closeTimeoutSec: presetTemplate?.closeTimeoutSec,
      hasConfirmButton: true,
      sceneId: presetTemplate?.sceneId ?? presetSceneId,
      status: "DRAFT",
      ownerOrgId: presetTemplate?.ownerOrgId ?? "branch-east"
    };
    const defaultCondition = buildDefaultCondition();
    setEditing(null);
    setCurrentRule(null);
    setReuseSourceRule(presetTemplate);
    setPublishNotice(null);
    ruleForm.setFieldsValue(values);
    setConditionsDraft([defaultCondition]);
    setSelectedOperand({ conditionId: defaultCondition.id, side: "left" });
    setLogicValidationIssues([]);
    if (presetTemplate) {
      setLogicLoading(true);
      void loadLogic(presetTemplate)
        .catch((error) => {
          msgApi.error(error instanceof Error ? error.message : "模板条件加载失败");
        })
        .finally(() => {
          setLogicLoading(false);
        });
    }
    setRuleSnapshot(buildRuleSnapshot(values));
    setSaveValidationReport(null);
    setOpen(true);
  }
  useEffect(() => {
    if (mode !== "PAGE_RULE" || !options.autoOpenCreate) {
      return;
    }
    if (hasAutoOpened.current || resources.length === 0) {
      return;
    }
    hasAutoOpened.current = true;
    openCreate();
  }, [mode, options.autoOpenCreate, resources.length]);
  function applyTemplate(templateId?: number) {
    const template = templateRows.find((item) => item.id === templateId) ?? null;
    setReuseSourceRule(template);
    if (!template) {
      ruleForm.setFieldValue("templateRuleId", undefined);
      const defaultCondition = buildDefaultCondition();
      setConditionsDraft([defaultCondition]);
      setSelectedOperand({ conditionId: defaultCondition.id, side: "left" });
      return;
    }
    const currentValues = ruleForm.getFieldsValue();
    const promptContent = parsePromptContentConfig(template?.promptContentConfigJson);
    ruleForm.setFieldsValue({
      ...currentValues,
      templateRuleId: template.id,
      name: currentValues.name?.trim() ? currentValues.name : `${template.name}-副本`,
      ruleScope: "PAGE_RESOURCE",
      priority: template.priority,
      promptMode: template.promptMode,
      titleSuffix: currentValues.titleSuffix?.trim() ? currentValues.titleSuffix : promptContent.titleSuffix,
      bodyTemplate: currentValues.bodyTemplate?.trim() ? currentValues.bodyTemplate : promptContent.bodyTemplate,
      bodyEditorStateJson: currentValues.bodyEditorStateJson?.trim() ? currentValues.bodyEditorStateJson : promptContent.bodyEditorStateJson,
      closeMode: template.closeMode,
      closeTimeoutSec: template.closeTimeoutSec,
      hasConfirmButton: true,
      sceneId: template.sceneId,
      ownerOrgId: currentValues.ownerOrgId?.trim() ? currentValues.ownerOrgId : template.ownerOrgId
    });
    setLogicValidationIssues([]);
    setLogicLoading(true);
    void loadLogic(template)
      .catch((error) => {
        msgApi.error(error instanceof Error ? error.message : "模板条件加载失败");
      })
      .finally(() => {
        setLogicLoading(false);
      });
  }
  function openEdit(row: RuleDefinition) {
    const promptContent = parsePromptContentConfig(row.promptContentConfigJson);
    const values: RuleForm = {
      templateRuleId: row.sourceRuleId,
      name: row.name,
      ruleScope: row.ruleScope,
      pageResourceId: row.pageResourceId,
      priority: row.priority,
      promptMode: row.promptMode,
      titleSuffix: promptContent.titleSuffix,
      bodyTemplate: promptContent.bodyTemplate,
      bodyEditorStateJson: promptContent.bodyEditorStateJson,
      closeMode: row.closeMode,
      closeTimeoutSec: row.closeTimeoutSec,
      hasConfirmButton: true,
      sceneId: row.sceneId,
      status: "DRAFT",
      ownerOrgId: row.ownerOrgId
    };
    setEditing(row);
    setCurrentRule(row);
    setReuseSourceRule(null);
    setPublishNotice(null);
    ruleForm.setFieldsValue(values);
    setRuleSnapshot(buildRuleSnapshot(values));
    setSaveValidationReport(null);
    setOpen(true);
    setLogicValidationIssues([]);
    setLogicLoading(true);
    void loadLogic(row)
      .catch((error) => {
        msgApi.error(error instanceof Error ? error.message : "条件配置加载失败");
      })
      .finally(() => {
        setLogicLoading(false);
      });
  }
  const liveSaveValidationReport = useMemo(() => {
    if (!open) {
      return null;
    }
    const values = watchedRuleValues ?? {};
    const effectiveScope = mode === "TEMPLATE" ? "SHARED" : values.ruleScope ?? "PAGE_RESOURCE";
    return validateRuleDraftPayload(
      {
        id: editing?.id ?? -1,
        name: values.name ?? "",
        ruleScope: effectiveScope,
        pageResourceId: effectiveScope === "PAGE_RESOURCE" ? values.pageResourceId : undefined,
        priority: values.priority ?? 1,
        promptMode: values.promptMode ?? "FLOATING",
        promptContentConfigJson: stringifyPromptContentConfig({
          titleSuffix: values.titleSuffix,
          bodyTemplate: values.bodyTemplate,
          bodyEditorStateJson: values.bodyEditorStateJson
        }),
        closeMode: values.closeMode ?? "MANUAL_CLOSE",
        closeTimeoutSec: values.closeTimeoutSec,
        hasConfirmButton: true,
        sceneId: values.sceneId,
        ownerOrgId: values.ownerOrgId ?? "",
        availablePromptVariableKeys: promptVariableOptions.map((item) => item.key)
      },
      rows
    );
  }, [editing?.id, mode, open, promptVariableOptions, rows, watchedRuleValues]);
  const activeSaveValidationReport = liveSaveValidationReport ?? saveValidationReport;
  async function submitRule() {
    const values = await ruleForm.validateFields();
    const logicIssues = collectLogicValidationIssues();
    setLogicValidationIssues(logicIssues);
    if (logicIssues.some((issue) => issue.level === "blocking")) {
      msgApi.error("条件配置存在未处理问题，请先修复后再保存规则");
      return;
    }
    const effectiveScope = mode === "TEMPLATE" ? "SHARED" : values.ruleScope;
    const resource =
      effectiveScope === "PAGE_RESOURCE"
        ? resources.find((item) => item.id === values.pageResourceId)
        : undefined;
    if (effectiveScope === "PAGE_RESOURCE" && !resource) {
      msgApi.error("请选择页面资源");
      return;
    }
    const scene = scenes.find((item) => item.id === values.sceneId);
    const result = await configCenterService.saveRuleDraft({
      id: editing?.id ?? Date.now() + Math.floor(Math.random() * 1000),
      name: values.name,
      ruleScope: effectiveScope,
      ruleSetCode: editing?.ruleSetCode ?? createId(mode === "TEMPLATE" ? "rule-template" : "rule"),
      pageResourceId: resource?.id,
      pageResourceName: resource?.name,
      sourceRuleId:
        mode === "PAGE_RULE" ? (!editing ? reuseSourceRule?.id : editing?.sourceRuleId) : undefined,
      sourceRuleName:
        mode === "PAGE_RULE" ? (!editing ? reuseSourceRule?.name : editing?.sourceRuleName) : undefined,
      priority: values.priority,
      promptMode: values.promptMode,
      promptContentConfigJson: stringifyPromptContentConfig({
        titleSuffix: values.titleSuffix,
        bodyTemplate: values.bodyTemplate,
        bodyEditorStateJson: values.bodyEditorStateJson
      }),
      closeMode: values.closeMode,
      closeTimeoutSec: values.closeMode === "TIMER_THEN_MANUAL" ? values.closeTimeoutSec : undefined,
      hasConfirmButton: true,
      sceneId: values.sceneId,
      sceneName: scene?.name,
      effectiveStartAt: editing?.effectiveStartAt,
      effectiveEndAt: editing?.effectiveEndAt,
      status: "DRAFT",
      currentVersion: editing?.currentVersion ?? 1,
      ownerOrgId: values.ownerOrgId
    });
    setSaveValidationReport(result.report);
    if (!result.success || !result.data) {
      msgApi.error(result.report.summary);
      return;
    }
    const saved = result.data;
    try {
      await persistConditionLogic(saved.id);
      await configCenterService.updateRuleStatus(saved.id, "ACTIVE");
      setLogicValidationIssues([]);
    } catch (error) {
      msgApi.error(error instanceof Error ? `规则已保存，但条件保存失败：${error.message}` : "规则已保存，但条件保存失败");
      setEditing(saved);
      setCurrentRule(saved);
      await loadData();
      return;
    }
    const savedObjectLabel = isTemplateMode(mode) ? "模板" : "规则";
    const savedMessage =
      result.report.warningCount > 0
        ? `${savedObjectLabel}已保存并生效，另有 ${result.report.warningCount} 个提醒建议处理`
        : mode === "PAGE_RULE" && !editing && reuseSourceRule
          ? "规则模板已复用为页面规则，并已立即生效"
          : !editing
            ? `${savedObjectLabel}已创建并立即生效`
            : saved.id !== editing.id
              ? `${savedObjectLabel}已更新并立即生效`
              : `${savedObjectLabel}已更新并立即生效`;
    msgApi.success(savedMessage);
    setPublishNotice(null);
    closeRuleModalDirectly();
    await loadData();
  }

  async function publishRuleNow(
    ruleId: number,
    ruleName: string,
    options?: {
      effectiveOrgIds?: string[];
      effectiveStartAt?: string;
      effectiveEndAt?: string;
    }
  ): Promise<boolean> {
    const normalizedEffectiveOrgIds = options?.effectiveOrgIds ?? [];
    const existingRule = rows.find((item) => item.id === ruleId);
    if (
      existingRule &&
      options?.effectiveStartAt &&
      options?.effectiveEndAt &&
      (
        existingRule.effectiveStartAt !== options.effectiveStartAt ||
        existingRule.effectiveEndAt !== options.effectiveEndAt
      )
    ) {
      await configCenterService.upsertRule({
        ...existingRule,
        effectiveStartAt: options.effectiveStartAt,
        effectiveEndAt: options.effectiveEndAt,
        status: "ACTIVE"
      });
    } else {
      await configCenterService.updateRuleStatus(ruleId, "ACTIVE");
    }
    const effectiveTimeSummary =
      options?.effectiveStartAt && options?.effectiveEndAt
        ? `，时间 ${options.effectiveStartAt} ~ ${options.effectiveEndAt}`
        : "";
    msgApi.success(
      `已生效：${ruleName}（${normalizedEffectiveOrgIds.length > 0 ? normalizedEffectiveOrgIds.map((orgId) => getOrgLabel(orgId)).join("、") : "全部机构"}${effectiveTimeSummary}）`
    );
    await loadData();
    return true;
  }

  async function publishNoticeNow() {
    if (!publishNotice) {
      return;
    }
    const success = await publishRuleNow(publishNotice.resourceId, publishNotice.objectName);
    if (success) {
      setPublishNotice(null);
    }
  }

  async function restoreRuleNow(
    row: RuleDefinition,
    options?: {
      effectiveOrgIds?: string[];
      effectiveStartAt?: string;
      effectiveEndAt?: string;
    }
  ): Promise<boolean> {
    return publishRuleNow(row.id, row.name, options);
  }

  async function switchStatus(row: RuleDefinition) {
    const next: LifecycleState = row.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateRuleStatus(row.id, next);
    msgApi.success(`规则状态已切换为 ${next}`);
    await loadData();
  }

  async function cloneRuleToViewerOrg(row: RuleDefinition) {
    const targetOrgId = options.viewerOrgId ?? "branch-east";
    const operatorId = options.viewerOperatorId ?? "person-zhao-yi";
    await configCenterService.cloneRuleToOrg(row.id, targetOrgId, operatorId);
    msgApi.success("已复制为我的副本");
    await loadData();
  }
  async function openLogic(row: RuleDefinition) {
    setCurrentRule(row);
    setLogicValidationIssues([]);
    setLogicLoading(true);
    try {
      await loadLogic(row);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "条件配置加载失败");
    } finally {
      setLogicLoading(false);
    }
  }
  function updateCondition(conditionId: string, updater: (previous: FlatConditionDraft) => FlatConditionDraft) {
    setConditionsDraft((previous) => previous.map((item) => (item.id === conditionId ? updater(item) : item)));
  }
  function updateOperand(conditionId: string, side: OperandSide, patch: Partial<OperandDraft>) {
    updateCondition(conditionId, (item) => ({
      ...item,
      [side]: { ...item[side], ...patch }
    }));
  }
  function updateSelectedOperand(patch: Partial<OperandDraft>) {
    if (!selectedOperand) {
      return;
    }
    updateOperand(selectedOperand.conditionId, selectedOperand.side, patch);
  }
  function addCondition() {
    const created = buildDefaultCondition();
    setConditionsDraft((previous) => [...previous, created]);
    setSelectedOperand({ conditionId: created.id, side: "left" });
  }
  function removeCondition(conditionId: string) {
    setConditionsDraft((previous) => {
      if (previous.length <= 1) {
        msgApi.warning("至少保留一条条件");
        return previous;
      }
      const next = previous.filter((item) => item.id !== conditionId);
      if (selectedOperand?.conditionId === conditionId) {
        setSelectedOperand(next.length > 0 ? { conditionId: next[0].id, side: "left" } : null);
      }
      return next;
    });
  }
  const selectedContext = useMemo(() => {
    if (!selectedOperand) {
      return null;
    }
    const condition = conditionsDraft.find((item) => item.id === selectedOperand.conditionId);
    if (!condition) {
      return null;
    }
    const operand = condition[selectedOperand.side];
    return {
      condition,
      operand,
      side: selectedOperand.side,
      index: conditionsDraft.findIndex((item) => item.id === selectedOperand.conditionId)
    };
  }, [conditionsDraft, selectedOperand]);
  function changeSelectedSourceType(nextSource: RuleOperandSourceType) {
    if (!selectedContext || selectedContext.operand.sourceType === nextSource) {
      return;
    }
    const applyChange = () => {
      updateOperand(selectedContext.condition.id, selectedContext.side, resetOperandBySource(nextSource, selectedContext.operand));
    };
    if (!hasDirtyOperandConfig(selectedContext.operand)) {
      applyChange();
      return;
    }
    Modal.confirm({
      title: "切换来源将清理旧配置",
      content: "来源切换后将清空当前值、接口入参与数据处理配置，是否继续？",
      okText: "继续切换",
      cancelText: "取消",
      onOk: applyChange
    });
  }
  function normalizeDataProcessorArgs(dataProcessorId: number | undefined, currentArgs: string[] = []) {
    if (typeof dataProcessorId !== "number") {
      return [];
    }
    const target = dataProcessors.find((item) => item.id === dataProcessorId);
    const argCount = Math.max(0, (target?.paramCount ?? 1) - 1);
    return Array.from({ length: argCount }, (_, index) => currentArgs[index] ?? "");
  }
  function addDataProcessorBinding() {
    if (!selectedContext) {
      return;
    }
    const next = [...selectedContext.operand.dataProcessors, { id: buildDataProcessorId(), args: [] }];
    updateSelectedOperand({ dataProcessors: next });
  }
  function updateDataProcessorBinding(bindingId: string, patch: Partial<DataProcessorDraft>) {
    if (!selectedContext) {
      return;
    }
    const next = selectedContext.operand.dataProcessors.map((item) => {
      if (item.id !== bindingId) {
        return item;
      }
      const merged: DataProcessorDraft = {
        ...item,
        ...patch,
        args: patch.args ?? item.args
      };
      if (Object.prototype.hasOwnProperty.call(patch, "dataProcessorId")) {
        merged.args = normalizeDataProcessorArgs(merged.dataProcessorId, merged.args);
      }
      return merged;
    });
    updateSelectedOperand({ dataProcessors: next });
  }
  function removeDataProcessorBinding(bindingId: string) {
    if (!selectedContext) {
      return;
    }
    const next = selectedContext.operand.dataProcessors.filter((item) => item.id !== bindingId);
    updateSelectedOperand({ dataProcessors: next });
  }
  function validateOperand(draft: OperandDraft, label: string, conditionIndex: number): FieldValidationIssue[] {
    const issues: FieldValidationIssue[] = [];
    const fieldLabel = `条件 ${conditionIndex + 1}${label === "left" ? " 左值" : " 右值"}`;
    if (draft.sourceType === "INTERFACE_FIELD") {
      if (!draft.interfaceName?.trim()) {
        issues.push(
          createFieldIssue({
            section: "logic",
            field: `${conditionIndex}:${label}:interfaceName`,
            label: fieldLabel,
            message: "请选择 API 来源"
          })
        );
      }
      if (!draft.outputPath?.trim()) {
        issues.push(
          createFieldIssue({
            section: "logic",
            field: `${conditionIndex}:${label}:outputPath`,
            label: fieldLabel,
            message: "请选择 API 输出路径"
          })
        );
      }
      const target = interfaces.find((item) => item.id === draft.interfaceId);
      const requiredInputs = collectInterfaceInputParams(target).filter((item) => item.validationConfig.required);
      const inputConfig = parseInterfaceInputConfig(draft.interfaceInputConfig);
      for (const input of requiredInputs) {
        const value = (inputConfig[input.name]?.sourceValue ?? "").trim();
        if (!value) {
          issues.push(
            createFieldIssue({
              section: "logic",
              field: `${conditionIndex}:${label}:input:${input.name}`,
              label: fieldLabel,
              message: `缺少必填 API 入参：${input.name}`
            })
          );
        }
      }
    } else if (!draft.displayValue.trim()) {
      issues.push(
        createFieldIssue({
          section: "logic",
          field: `${conditionIndex}:${label}:displayValue`,
          label: fieldLabel,
          message: "请输入比较值"
        })
      );
    }
    const invalidDataProcessor = draft.dataProcessors.find((item) => typeof item.dataProcessorId !== "number");
    if (invalidDataProcessor) {
      issues.push(
        createFieldIssue({
          section: "logic",
          field: `${conditionIndex}:${label}:dataProcessor`,
          label: fieldLabel,
          message: "存在未完成选择的数据处理函数"
        })
      );
    }
    return issues;
  }
  function collectLogicValidationIssues() {
    const nextIssues: FieldValidationIssue[] = [];
    for (const [index, condition] of conditionsDraft.entries()) {
      nextIssues.push(...validateOperand(condition.left, "left", index));
      if (condition.operator !== "EXISTS") {
        nextIssues.push(...validateOperand(condition.right, "right", index));
      }
    }
    return nextIssues;
  }
  async function persistConditionLogic(ruleId: number) {
    const latestGroups = await workflowService.listRuleConditionGroups(ruleId);
    const roots = latestGroups.filter((item) => !item.parentGroupId);
    for (const root of roots) {
      await workflowService.deleteRuleConditionGroup(root.id);
    }
    const rootGroup: RuleConditionGroup = await workflowService.createRuleConditionGroup(ruleId, globalLogicType);
    const nextLocalId = (() => {
      let cursor = Date.now();
      return () => {
        cursor += 1;
        return cursor;
      };
    })();
    for (const condition of conditionsDraft) {
      const operator = normalizeOperator(condition.operator);
      const needRight = operator !== "EXISTS";
      await workflowService.upsertRuleCondition({
        id: nextLocalId(),
        ruleId,
        groupId: rootGroup.id,
        left: toRuleOperand(condition.left),
        operator,
        right: needRight ? toRuleOperand(condition.right) : undefined
      });
    }
  }
  async function saveConditionLogic() {
    if (!currentRule) {
      msgApi.warning("请先保存规则基础信息，再单独保存条件逻辑");
      return;
    }
    const nextIssues = collectLogicValidationIssues();
    setLogicValidationIssues(nextIssues);
    if (nextIssues.some((issue) => issue.level === "blocking")) {
      msgApi.error("高级条件存在未处理问题，请先修复后再保存");
      return;
    }
    setSavingQuery(true);
    try {
      await persistConditionLogic(currentRule.id);
      msgApi.success("条件逻辑已保存");
      setLogicValidationIssues([]);
      await loadLogic(currentRule);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "条件逻辑保存失败");
    } finally {
      setSavingQuery(false);
    }
  }
  function getOutputPathOptions(interfaceId?: number) {
    const target = interfaces.find((item) => item.id === interfaceId);
    if (!target) {
      return [];
    }
    const outputs = parseJsonSafe<unknown[]>(target.outputConfigJson, []);
    return collectOutputPathMeta(outputs)
      .filter((item) => Boolean(item.path))
      .map((item) => ({
        label: `${item.path} (${item.valueType})`,
        value: item.path,
        valueType: item.valueType
      }));
  }
  function getInterfaceInputOptions(interfaceId?: number) {
    const target = interfaces.find((item) => item.id === interfaceId);
    return collectInterfaceInputParams(target);
  }
  const selectedOutputPathOptions = useMemo(
    () => getOutputPathOptions(selectedContext?.operand.interfaceId),
    [selectedContext?.operand.interfaceId, interfaces]
  );
  const selectedInterfaceInputParams = useMemo(
    () => getInterfaceInputOptions(selectedContext?.operand.interfaceId),
    [selectedContext?.operand.interfaceId, interfaces]
  );
  const selectedInterfaceInputConfig = useMemo(
    () => parseInterfaceInputConfig(selectedContext?.operand.interfaceInputConfig ?? ""),
    [selectedContext?.operand.interfaceInputConfig]
  );
  function updateInterfaceInputValue(paramName: string, patch: Partial<InterfaceInputBindingDraft>) {
    const current = selectedInterfaceInputConfig[paramName] ?? defaultInterfaceInputBinding();
    const nextValue = {
      ...current,
      ...patch
    };
    const nextConfig = {
      ...selectedInterfaceInputConfig,
      [paramName]: nextValue
    };
    if (!nextValue.sourceValue.trim()) {
      delete nextConfig[paramName];
    }
    updateSelectedOperand({
      interfaceInputConfig: stringifyInterfaceInputConfig(nextConfig)
    });
  }
  const selectedOperandIssues = useMemo(() => {
    if (!selectedContext) {
      return [] as FieldValidationIssue[];
    }
    return validateOperand(selectedContext.operand, selectedContext.side, selectedContext.index);
  }, [interfaces, selectedContext]);
  const wizardStepIssues = useMemo(() => {
    const allIssues = activeSaveValidationReport
      ? [...activeSaveValidationReport.fieldIssues, ...activeSaveValidationReport.sectionIssues, ...activeSaveValidationReport.objectIssues]
      : [];
    return {
      0: allIssues.filter((issue) => issue.section === "page").length,
      1: allIssues.filter((issue) => issue.section === "basic").length,
      2: allIssues.filter((issue) => issue.section === "content").length,
      3: logicValidationIssues.length,
      4: allIssues.filter((issue) => issue.section === "confirm").length
    };
  }, [activeSaveValidationReport, logicValidationIssues]);
  return {
    mode, holder, msgApi, logicDrawerWidth, loading,
    rows: mode === "TEMPLATE" ? templateRows : pageRuleRows,
    templates: templateRows,
    resources, pageMenus, scenes, dataProcessors, interfaces,
    open, editing, ruleForm, currentRule, logicLoading, globalLogicType, setGlobalLogicType,
    pageFieldOptions,
    contextVariableOptions,
    promptVariableOptions,
    conditionsDraft, selectedOperand, setSelectedOperand, savingQuery,
    closeRuleModal, openCreate, applyTemplate, openEdit, submitRule, switchStatus, openLogic,
    addCondition, removeCondition,
    selectedContext, changeSelectedSourceType,
    addDataProcessorBinding, updateDataProcessorBinding, removeDataProcessorBinding,
    saveConditionLogic, selectedOutputPathOptions, selectedInterfaceInputParams,
    selectedInterfaceInputConfig, updateInterfaceInputValue,
    updateCondition, updateSelectedOperand, statusColor, operatorOptions, sourceOptions, valueTypeOptions,
    saveValidationReport: activeSaveValidationReport,
    logicValidationIssues,
    selectedOperandIssues,
    hasSelectedOperandDirtyConfig: Boolean(selectedContext && hasDirtyOperandConfig(selectedContext.operand)),
    wizardStepIssues,
    publishNotice,
    dismissPublishNotice: () => setPublishNotice(null),
    publishNoticeNow,
    publishRuleNow,
    restoreRuleNow,
    cloneRuleToViewerOrg,
    reloadData: loadData
  };
}

function isTemplateMode(mode: RulesPageMode) {
  return mode === "TEMPLATE";
}

