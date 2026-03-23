import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Dropdown,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { EffectiveConfirmModal } from "../../components/EffectiveConfirmModal";
import { ScopeQuickFilters, type ScopeMenuOption, type ScopePageOption } from "../../components/ScopeQuickFilters";
import { PublishContinuationAlert } from "../../components/PublishContinuationAlert";
import { ValidationReportPanel } from "../../components/ValidationReportPanel";
import { EffectiveScopeMode, getEffectiveActionMeta, getEffectivePermissionBlockedMessage } from "../../effectiveFlow";
import { lifecycleLabelMap, promptModeLabelMap } from "../../enumLabels";
import { getOrgLabel, orgOptions } from "../../orgOptions";
import { DEFAULT_PROMPT_TITLE } from "../../promptContent";
import { configCenterService } from "../../services/configCenterService";
import { useMockSession } from "../../session/mockSession";
import { PromptRichPreview } from "./PromptRichPreview";
import { PromptTemplateEditor } from "./PromptTemplateEditor";
import { rulesLayoutConfig } from "./rulesLayoutConfig";
import { RulesPageMode, useRulesPageModel } from "./useRulesPageModel";
import { FlatConditionDraft, InterfaceInputParamDraft, LOGIC_OPERATOR_WIDTH, OperandDraft, defaultInterfaceInputBinding, deriveMachineKeyFromOutputPath, interfaceInputSourceOptions, normalizeOperator, normalizeSourceType, closeModeLabel, operatorOptions, sourceOptions, statusColor } from "./rulesPageShared";
import { OperandPill, InterfaceInputValueEditor } from "./rulesOperandRenderers";
import type { LifecycleState, PublishValidationReport, RuleDefinition, RuleLogicType, ShareMode, ValidationIssue } from "../../types";

type RulesPageProps = {
  mode?: RulesPageMode;
  embedded?: boolean;
  initialPageResourceId?: number;
  initialTemplateRuleId?: number;
  initialSceneId?: number;
  autoOpenCreate?: boolean;
};

type EffectiveTarget = {
  id: number;
  name: string;
  status: LifecycleState;
  source: "row" | "notice";
};

type RuleListStatusFilter = "ALL" | LifecycleState;

const rulesSummaryAccents = {
  total: "linear-gradient(90deg, #1677ff 0%, #4c9dff 100%)",
  draft: "linear-gradient(90deg, #64748b 0%, #94a3b8 100%)",
  active: "linear-gradient(90deg, #2f9e44 0%, #5ab86b 100%)",
  disabled: "linear-gradient(90deg, #d46b08 0%, #f59e0b 100%)"
} as const;

const PageHeader = styled.div`
  margin-bottom: var(--space-16);
`;

const SummaryCard = styled(Card)<{ $accent: string }>`
  height: 100%;

  &::before {
    content: "";
    display: block;
    height: 4px;
    background: ${({ $accent }) => $accent};
  }

  .ant-card-body {
    padding-top: 14px;
  }
`;

const ToolbarSection = styled.section`
  margin-bottom: 12px;
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
`;

const EditorStatusBar = styled(Card)`
  margin-bottom: 12px;

  .ant-card-body {
    padding: 10px 12px;
  }
`;

const StickyEditorFooter = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 12;
  margin: 12px -24px -24px;
  padding: 10px 24px 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.08);
`;

function CompactHint({
  tone = "warning",
  title,
  description,
  extra
}: {
  tone?: "warning" | "success" | "info";
  title: string;
  description?: string;
  extra?: React.ReactNode;
}) {
  const palette =
    tone === "success"
      ? {
          border: "#e2e8f0",
          background: "#f8fafc",
          text: "#334155"
        }
      : tone === "info"
        ? {
            border: "#bfdbfe",
            background: "#eff6ff",
            text: "#1d4ed8"
          }
        : {
            border: "#ffd591",
            background: "#fff7e6",
            text: "#ad4e00"
          };

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        background: palette.background,
        borderRadius: 8,
        padding: "8px 10px"
      }}
    >
      <Space size={[8, 4]} wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Space size={[8, 4]} wrap>
          <Tag
            color={tone === "info" ? "processing" : tone === "warning" ? "warning" : undefined}
            style={
              tone === "success"
                ? { marginInlineEnd: 0, borderColor: "#e2e8f0", background: "#f8fafc", color: "#334155" }
                : { marginInlineEnd: 0 }
            }
          >
            {tone === "success" ? "已配置" : tone === "info" ? "说明" : "待处理"}
          </Tag>
          <Typography.Text style={{ color: palette.text }}>{title}</Typography.Text>
          {description ? <Typography.Text style={{ color: "var(--color-text-secondary)" }}>{description}</Typography.Text> : null}
        </Space>
        {extra}
      </Space>
    </div>
  );
}

function PanelField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function summarizeOperand(operand: OperandDraft) {
  switch (operand.sourceType) {
    case "PAGE_FIELD":
    case "CONTEXT":
    case "CONST":
      return operand.displayValue?.trim() || "未配置";
    case "INTERFACE_FIELD":
      return operand.interfaceName?.trim() && operand.outputPath?.trim()
        ? `${operand.interfaceName}.${operand.outputPath}`
        : operand.interfaceName?.trim() || "未绑定 API 输出";
    default:
      return "未配置";
  }
}

function summarizeCondition(condition: FlatConditionDraft) {
  const operatorLabel = operatorOptions.find((item) => item.value === condition.operator)?.label ?? condition.operator;
  if (condition.operator === "EXISTS") {
    return `${summarizeOperand(condition.left)} ${operatorLabel}`;
  }
  return `${summarizeOperand(condition.left)} ${operatorLabel} ${summarizeOperand(condition.right)}`;
}

function IssueQuickNavCard({
  items,
  onJump
}: {
  items: Array<{ key: string; label: string; count: number }>;
  onJump: (key: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card size="small" title="问题定位">
      <Space direction="vertical" style={{ width: "100%" }} size={8}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onJump(item.key)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              background: "var(--color-surface)",
              padding: "8px 10px",
              cursor: "pointer"
            }}
          >
            <span style={{ color: "var(--color-text-primary)" }}>{item.label}</span>
            <Tag color="error" style={{ marginInlineEnd: 0 }}>
              {item.count}
            </Tag>
          </button>
        ))}
      </Space>
    </Card>
  );
}

export function RulesPage({
  mode = "PAGE_RULE",
  embedded = false,
  initialPageResourceId,
  initialTemplateRuleId,
  initialSceneId,
  autoOpenCreate
}: RulesPageProps) {
  const { hasResource, meta } = useMockSession();
  const {
    holder,
    msgApi,
    loading,
    rows,
    templates,
    resources,
    pageMenus,
    scenes,
    dataProcessors,
    interfaces,
    open,
    editing,
    ruleForm,
    logicLoading,
    globalLogicType,
    setGlobalLogicType,
    pageFieldOptions,
    contextVariableOptions,
    promptVariableOptions,
    conditionsDraft,
    selectedOperand,
    setSelectedOperand,
    savingQuery,
    closeRuleModal,
    openCreate,
    applyTemplate,
    openEdit,
    submitRule,
    switchStatus,
    addCondition,
    removeCondition,
    selectedContext,
    changeSelectedSourceType,
    addDataProcessorBinding,
    updateDataProcessorBinding,
    removeDataProcessorBinding,
    saveConditionLogic,
    selectedOutputPathOptions,
    selectedInterfaceInputParams,
    selectedInterfaceInputConfig,
    updateInterfaceInputValue,
    updateCondition,
    updateSelectedOperand,
    saveValidationReport,
    logicValidationIssues,
    selectedOperandIssues,
    hasSelectedOperandDirtyConfig,
    wizardStepIssues,
    publishNotice,
    dismissPublishNotice,
    publishRuleNow,
    restoreRuleNow,
    cloneRuleToViewerOrg,
    reloadData
  } = useRulesPageModel(mode, {
    initialPageResourceId,
    initialTemplateRuleId,
    initialSceneId,
    autoOpenCreate,
    viewerOrgId: meta.orgScopeId,
    viewerRoleType: meta.roleType,
    viewerOperatorId: meta.operatorId
  });
  const navigate = useNavigate();
  const isTemplateMode = mode === "TEMPLATE";
  const pageTitle = isTemplateMode ? "模板复用" : "智能提示";
  const pageDescription = isTemplateMode
    ? "沉淀高复用规则模板。模板仅引用公共字段，供业务人员在新建页面规则时快速套用。"
    : "规则配置以页面规则为主；新建时可快速复用模板，自动带入条件与提示配置，无需先专门建立模板。保存后可直接发布当前对象。";
  const createButtonLabel = isTemplateMode ? "新建模板" : "新建规则";
  const modalTitle = editing ? (isTemplateMode ? "编辑规则模板" : "编辑规则") : isTemplateMode ? "新建规则模板" : "新建规则";
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ matched: boolean; detail: string } | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"basic" | "logic">("basic");
  const [pendingOpenTab, setPendingOpenTab] = useState<"basic" | "logic" | null>(null);
  const [effectiveTarget, setEffectiveTarget] = useState<EffectiveTarget | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [effectiveSubmitting, setEffectiveSubmitting] = useState(false);
  const [effectiveValidationReport, setEffectiveValidationReport] = useState<PublishValidationReport | null>(null);
  const [effectiveBlockedMessage, setEffectiveBlockedMessage] = useState<string | null>(null);
  const [effectiveScopeMode, setEffectiveScopeMode] = useState<EffectiveScopeMode>("ALL_ORGS");
  const [effectiveScopeOrgIds, setEffectiveScopeOrgIds] = useState<string[]>([]);
  const [effectiveStartAt, setEffectiveStartAt] = useState("");
  const [effectiveEndAt, setEffectiveEndAt] = useState("");
  const [shareTargetRule, setShareTargetRule] = useState<RuleDefinition | null>(null);
  const [shareModeDraft, setShareModeDraft] = useState<ShareMode>("PRIVATE");
  const [shareOrgIdsDraft, setShareOrgIdsDraft] = useState<string[]>([]);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<RuleListStatusFilter>("ALL");
  const [selectedMenuId, setSelectedMenuId] = useState<number | undefined>(undefined);
  const [selectedPageId, setSelectedPageId] = useState<number | undefined>(undefined);
  const initializedScopeRef = useRef(false);
  const watchedPromptMode = Form.useWatch("promptMode", ruleForm);
  const watchedTemplateRuleId = Form.useWatch("templateRuleId", ruleForm);
  const watchedTitleSuffix = Form.useWatch("titleSuffix", ruleForm);
  const watchedBodyTemplate = Form.useWatch("bodyTemplate", ruleForm);
  const watchedBodyEditorStateJson = Form.useWatch("bodyEditorStateJson", ruleForm);
  const effectiveMeta = effectiveTarget ? getEffectiveActionMeta(effectiveTarget.status) : null;
  const effectiveScopeOptions = useMemo(
    () => orgOptions.map((item) => ({ label: item.label, value: String(item.value) })),
    []
  );
  const shareScopeOptions = useMemo(
    () => orgOptions.map((item) => ({ label: item.label, value: String(item.value) })),
    []
  );
  const screens = Grid.useBreakpoint();
  const effectivePermissionBlockedMessage = effectiveMeta
    ? getEffectivePermissionBlockedMessage(effectiveMeta.type, hasResource)
    : null;
  const modalBlockedMessage = effectiveBlockedMessage ?? effectivePermissionBlockedMessage;
  const canEffectiveConfirm =
    Boolean(effectiveMeta) &&
    (effectiveMeta?.type === "DISABLE" || Boolean(effectiveStartAt.trim() && effectiveEndAt.trim() && effectiveStartAt.trim() <= effectiveEndAt.trim())) &&
    (effectiveMeta?.type === "DISABLE" || effectiveScopeMode !== "CUSTOM_ORGS" || effectiveScopeOrgIds.length > 0) &&
    (effectiveMeta?.type !== "PUBLISH" || Boolean(effectiveValidationReport?.pass)) &&
    !modalBlockedMessage;
  const promptPreviewValues = useMemo(
    () =>
      promptVariableOptions.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.exampleValue;
        return acc;
      }, {}),
    [promptVariableOptions]
  );
  const promptPreviewTitle = watchedTitleSuffix?.trim() ? `${DEFAULT_PROMPT_TITLE} · ${watchedTitleSuffix.trim()}` : DEFAULT_PROMPT_TITLE;
  const promptEditorKey = `${editing?.id ?? "create"}-${watchedTemplateRuleId ?? "none"}`;
  const ownerOrgLabel = getOrgLabel(ruleForm.getFieldValue("ownerOrgId"));
  const quickNavItems = useMemo(
    () =>
      [
        { key: "basic", label: "基础信息", count: wizardStepIssues[0] + wizardStepIssues[1] },
        { key: "prompt", label: "提示内容", count: wizardStepIssues[2] },
        { key: "logic", label: "条件配置", count: wizardStepIssues[3] },
        { key: "summary", label: "保存确认", count: wizardStepIssues[4] }
      ].filter((item) => item.count > 0),
    [wizardStepIssues]
  );
  const conditionSummary = useMemo(() => {
    if (logicLoading) {
      return "条件加载中...";
    }
    if (conditionsDraft.length === 0) {
      return "暂无条件";
    }
    const joiner = globalLogicType === "AND" ? " 且 " : " 或 ";
    const pieces = conditionsDraft.slice(0, 2).map((item) => summarizeCondition(item));
    const suffix = conditionsDraft.length > 2 ? ` 等 ${conditionsDraft.length} 条` : "";
    return `${globalLogicType === "AND" ? "满足全部条件" : "满足任一条件"}：${pieces.join(joiner)}${suffix}`;
  }, [conditionsDraft, globalLogicType, logicLoading]);
  const currentPageName =
    resources.find((item) => item.id === ruleForm.getFieldValue("pageResourceId"))?.name ?? "未绑定页面";
  useEffect(() => {
    if (initializedScopeRef.current || resources.length === 0 || pageMenus.length === 0) {
      return;
    }
    if (typeof initialPageResourceId === "number") {
      const presetPage = resources.find((item) => item.id === initialPageResourceId);
      if (presetPage) {
        setSelectedPageId(presetPage.id);
        setSelectedMenuId(pageMenus.find((item) => item.menuCode === presetPage.menuCode)?.id);
        initializedScopeRef.current = true;
        return;
      }
    }
    initializedScopeRef.current = true;
  }, [initialPageResourceId, pageMenus.length, resources]);
  const scopeMenus = useMemo<ScopeMenuOption[]>(
    () => pageMenus.map((menu) => ({ id: menu.id, label: menu.menuName })),
    [pageMenus]
  );
  const scopePages = useMemo<ScopePageOption[]>(
    () =>
      resources.map((page) => {
        const matchedMenu = pageMenus.find((item) => item.menuCode === page.menuCode);
        return {
          id: page.id,
          label: page.name,
          menuId: matchedMenu?.id ?? 0,
          menuLabel: matchedMenu?.menuName
        };
      }),
    [pageMenus, resources]
  );
  const scopeFilteredRows = useMemo(() => {
    let nextRows = rows;
    if (typeof selectedPageId === "number") {
      nextRows = nextRows.filter((row) => row.pageResourceId === selectedPageId);
    } else if (typeof selectedMenuId === "number") {
      const selectedMenu = pageMenus.find((item) => item.id === selectedMenuId);
      const allowed = new Set(resources.filter((item) => item.menuCode === selectedMenu?.menuCode).map((item) => item.id));
      nextRows = nextRows.filter((row) => allowed.has(row.pageResourceId ?? -1));
    }
    return nextRows;
  }, [resources, rows, selectedMenuId, selectedPageId]);
  const keywordValue = keyword.trim().toLowerCase();
  const displayedRows = useMemo(() => {
    return scopeFilteredRows.filter((row) => {
      if (listStatusFilter !== "ALL" && row.status !== listStatusFilter) {
        return false;
      }
      if (!keywordValue) {
        return true;
      }
      const pageName = (row.pageResourceName ?? "").toLowerCase();
      const sourceTemplate = (row.sourceRuleName ?? "").toLowerCase();
      return (
        row.name.toLowerCase().includes(keywordValue) ||
        pageName.includes(keywordValue) ||
        sourceTemplate.includes(keywordValue)
      );
    });
  }, [keywordValue, listStatusFilter, scopeFilteredRows]);
  const rowSummary = useMemo(() => {
    const total = rows.length;
    const draft = rows.filter((item) => item.status === "DRAFT").length;
    const active = rows.filter((item) => item.status === "ACTIVE").length;
    const disabled = rows.filter((item) => item.status === "DISABLED").length;
    return { total, draft, active, disabled };
  }, [rows]);
  Form.useWatch([], ruleForm);
  const hasUnsavedEdits = open && ruleForm.isFieldsTouched(true);
  const editorIssues = useMemo<ValidationIssue[]>(
    () => [
      ...(saveValidationReport?.fieldIssues ?? []),
      ...(saveValidationReport?.sectionIssues ?? []),
      ...(saveValidationReport?.objectIssues ?? []),
      ...logicValidationIssues
    ],
    [logicValidationIssues, saveValidationReport?.fieldIssues, saveValidationReport?.objectIssues, saveValidationReport?.sectionIssues]
  );
  const editorBlockingCount = useMemo(
    () => editorIssues.filter((issue) => issue.level === "blocking").length,
    [editorIssues]
  );
  const editorWarningCount = useMemo(
    () => editorIssues.filter((issue) => issue.level === "warning").length,
    [editorIssues]
  );
  const editorIssueShortcuts = useMemo(
    () =>
      editorIssues.slice(0, 6).map((issue) => ({
        key: issue.key,
        issue,
        label: issue.kind === "field" ? issue.label : issue.title
      })),
    [editorIssues]
  );
  const logicBlockingCount = useMemo(
    () => logicValidationIssues.filter((issue) => issue.level === "blocking").length,
    [logicValidationIssues]
  );
  const logicWarningCount = useMemo(
    () => logicValidationIssues.filter((issue) => issue.level === "warning").length,
    [logicValidationIssues]
  );
  const saveBlockingCount = saveValidationReport?.blockingCount ?? 0;
  const saveWarningCount = saveValidationReport?.warningCount ?? 0;
  const hasSaveIssues = saveBlockingCount + saveWarningCount > 0;
  const isReadonlySharedRule = (row: RuleDefinition) =>
    row.shareMode === "SHARED" && row.ownerOrgId !== meta.orgScopeId;
  const editingReadonlyShared = Boolean(editing && isReadonlySharedRule(editing));
  const getShareScopeLabel = (row: RuleDefinition) => {
    if (row.shareMode !== "SHARED") {
      return "仅自己";
    }
    const scopeOrgIds = row.sharedOrgIds ?? [];
    if (scopeOrgIds.length === 0) {
      return "全部机构";
    }
    return scopeOrgIds.map((orgId) => getOrgLabel(orgId)).join("、");
  };

  function openShareSettings(row: RuleDefinition) {
    setShareTargetRule(row);
    setShareModeDraft(row.shareMode === "SHARED" ? "SHARED" : "PRIVATE");
    setShareOrgIdsDraft((row.sharedOrgIds ?? []).filter((orgId) => orgId !== row.ownerOrgId));
  }

  async function submitShareSettings() {
    if (!shareTargetRule) {
      return;
    }
    setShareSubmitting(true);
    try {
      await configCenterService.updateRuleShareConfig(
        shareTargetRule.id,
        {
          shareMode: shareModeDraft,
          sharedOrgIds: shareModeDraft === "SHARED" ? shareOrgIdsDraft : []
        },
        meta.operatorId
      );
      msgApi.success("共享设置已保存");
      setShareTargetRule(null);
      await reloadData();
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "共享设置保存失败");
    } finally {
      setShareSubmitting(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    setPreviewResult(null);
    setActiveEditorTab(pendingOpenTab ?? "basic");
    setPendingOpenTab(null);
  }, [open, editing?.id, isTemplateMode]);

  async function runWizardPreview() {
    const values = await ruleForm.validateFields([
      "name",
      "priority",
      "promptMode",
      "titleSuffix",
      "bodyTemplate",
      "closeMode",
      "ownerOrgId",
      ...(ruleForm.getFieldValue("closeMode") === "TIMER_THEN_MANUAL" ? ["closeTimeoutSec"] : []),
      "sceneId"
    ]);

    setPreviewLoading(true);
    try {
      if (editing) {
        const result = await configCenterService.previewRule(editing.id);
        setPreviewResult({
          matched: result.matched,
          detail: result.detail
        });
      } else {
        setPreviewResult({
          matched: true,
          detail: `规则「${values.name}」预览通过：已完成字段完整性检查，可继续保存。`
        });
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  function jumpToRuleSection(key: string) {
    const anchorMap: Record<string, string> = {
      basic: "rule-section-basic",
      prompt: "rule-section-prompt",
      logic: "rule-section-logic",
      summary: "rule-section-summary"
    };
    setActiveEditorTab(key === "logic" ? "logic" : "basic");
    window.setTimeout(() => {
      const target = document.getElementById(anchorMap[key]);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function focusLogicIssue(field?: string) {
    setActiveEditorTab("logic");
    const matched = field?.match(/^(\d+):(left|right):/);
    if (!matched) {
      window.setTimeout(() => {
        document.getElementById("rule-section-logic")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return;
    }
    const conditionIndex = Number(matched[1]);
    const side = matched[2] as "left" | "right";
    const condition = conditionsDraft[conditionIndex];
    if (!condition) {
      return;
    }
    setSelectedOperand({ conditionId: condition.id, side });
    window.setTimeout(() => {
      document.getElementById(`logic-condition-${condition.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  function jumpToIssue(issue: ValidationIssue) {
    if (issue.section === "logic") {
      focusLogicIssue(issue.kind === "field" ? issue.field : undefined);
      return;
    }

    const sectionToTab: Record<string, string> = {
      page: "basic",
      basic: "basic",
      content: "prompt",
      confirm: "summary"
    };
    const targetSection = sectionToTab[issue.section] ?? issue.section;
    jumpToRuleSection(targetSection);

    if (issue.kind === "field") {
      const fieldName = issue.field as string;
      if (fieldName && !fieldName.includes(":")) {
        window.setTimeout(() => {
          ruleForm.scrollToField(fieldName, { block: "center" });
        }, 120);
      }
    }
  }

  function openRuleEditorTab(row: RuleDefinition, tab: "basic" | "logic") {
    setPendingOpenTab(tab);
    openEdit(row);
  }

  function buildRowMenuItems(row: RuleDefinition): MenuProps["items"] {
    const items: MenuProps["items"] = [
      {
        key: "basic",
        label: "基础配置",
        icon: <EditOutlined />,
        onClick: () => openRuleEditorTab(row, "basic")
      },
      {
        key: "logic",
        label: "条件配置",
        icon: <MoreOutlined />,
        onClick: () => openRuleEditorTab(row, "logic")
      }
    ];
    if (!isTemplateMode) {
      items.push({
        key: "run-records",
        label: "命中记录",
        icon: <MoreOutlined />,
        onClick: () => {
          const params = new URLSearchParams({
            tab: "prompts",
            ruleId: String(row.id),
            ruleName: row.name
          });
          if (row.pageResourceId) {
            params.set("pageResourceId", String(row.pageResourceId));
          }
          navigate(`/run-records?${params.toString()}`);
        }
      });
    }
    return items;
  }

  function resetListFilters() {
    setKeyword("");
    setListStatusFilter("ALL");
    setSelectedMenuId(undefined);
    setSelectedPageId(undefined);
  }

  function renderLogicEditorContent() {
    if (logicLoading) {
      return <Alert type="info" showIcon message="条件加载中" description="正在准备当前规则的命中条件，请稍候。" />;
    }

    return (
      <>
        <Space direction="vertical" size={10} style={{ width: "100%", marginBottom: 12 }}>
          <Typography.Text style={{ color: "var(--color-text-secondary)" }}>
            左侧维护条件链路，右侧编辑当前选中值的来源与取值。
          </Typography.Text>
          {logicValidationIssues.length > 0 ? (
            <Collapse
              size="small"
              defaultActiveKey={logicBlockingCount > 0 ? ["logic-validation"] : []}
              items={[
                {
                  key: "logic-validation",
                  label: `条件检查：阻塞 ${logicBlockingCount} / 警告 ${logicWarningCount}`,
                  children: <ValidationReportPanel issues={logicValidationIssues} title="条件配置检查结果" />
                }
              ]}
            />
          ) : (
            <CompactHint tone="success" title="条件检查通过" description="当前条件配置无待处理问题。" />
          )}
        </Space>

        <Space wrap style={{ marginBottom: 12 }}>
          <Typography.Text strong>整体逻辑</Typography.Text>
          <Select
            style={{ width: 180 }}
            value={globalLogicType}
            options={[
              { label: "AND（全部满足）", value: "AND" },
              { label: "OR（满足任一）", value: "OR" }
            ]}
            onChange={(value) => setGlobalLogicType(value as RuleLogicType)}
          />
          <Typography.Text type="secondary" style={{ minWidth: 0 }}>
            {conditionSummary}
          </Typography.Text>
        </Space>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.lg ? "minmax(0,1fr) minmax(320px, 420px)" : "minmax(0,1fr)",
            gap: 12,
            alignItems: "start"
          }}
        >
          <Card size="small" title="条件链路">
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {conditionsDraft.map((condition, index) => {
                const issueCount = logicValidationIssues.filter((issue) => issue.field.startsWith(`${index}:`)).length;
                const isSelected = selectedOperand?.conditionId === condition.id;
                return (
                <Card
                  key={condition.id}
                  id={`logic-condition-${condition.id}`}
                  size="small"
                  style={{
                    borderColor: issueCount > 0 ? "#ffccc7" : isSelected ? "var(--color-primary)" : "var(--color-border)",
                    background: isSelected ? "rgba(22, 119, 255, 0.06)" : "var(--color-surface)"
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space size={[8, 4]} wrap style={{ width: "100%", justifyContent: "space-between" }}>
                      <Space size={[8, 4]} wrap>
                        <Tag color="blue">条件 {index + 1}</Tag>
                        {issueCount > 0 ? <Tag color="error">问题 {issueCount}</Tag> : null}
                        <Typography.Text type="secondary">{summarizeCondition(condition)}</Typography.Text>
                      </Space>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label="delete-condition"
                        onClick={() => removeCondition(condition.id)}
                      />
                    </Space>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: screens.md ? "minmax(0,1fr) auto minmax(0,1fr)" : "minmax(0,1fr)",
                        alignItems: "center",
                        gap: 8,
                        width: "100%"
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          padding: "6px 8px",
                          background: "var(--color-surface)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4
                        }}
                      >
                        <OperandPill conditionId={condition.id} side="left" operand={condition.left} selectedOperand={selectedOperand} onSelect={setSelectedOperand} />
                      </div>
                      <Select
                        style={
                          screens.md
                            ? { width: LOGIC_OPERATOR_WIDTH, minWidth: LOGIC_OPERATOR_WIDTH, maxWidth: LOGIC_OPERATOR_WIDTH }
                            : { width: "100%" }
                        }
                        value={condition.operator}
                        options={operatorOptions}
                        onChange={(value) =>
                          updateCondition(condition.id, (previous) => ({ ...previous, operator: normalizeOperator(value) }))
                        }
                      />
                      <div
                        style={{
                          minWidth: 0,
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          padding: "6px 8px",
                          background: "var(--color-surface)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4
                        }}
                      >
                        {condition.operator === "EXISTS" ? (
                          <Tag>无需右值</Tag>
                        ) : (
                          <OperandPill conditionId={condition.id} side="right" operand={condition.right} selectedOperand={selectedOperand} onSelect={setSelectedOperand} />
                        )}
                      </div>
                    </div>
                  </Space>
                </Card>
                );
              })}
            </Space>
          </Card>

          <Card
            size="small"
            title={
              selectedContext ? `${selectedContext.side === "left" ? "左值" : "右值"}属性面板` : "属性面板"
            }
          >
            {!selectedContext ? (
              <Typography.Text type="secondary">先在左侧点击要编辑的左值或右值。</Typography.Text>
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <ValidationReportPanel issues={selectedOperandIssues} title="当前值还有待处理问题" compact />
                {hasSelectedOperandDirtyConfig ? (
                  <CompactHint title="当前来源下已有配置内容" description="切换来源类型后会自动清理旧配置。" />
                ) : null}
                <Typography.Text type="secondary">
                  当前正在编辑：条件 {selectedContext.index + 1} - {selectedContext.side === "left" ? "左值" : "右值"}
                </Typography.Text>

                <PanelField label="来源类型">
                  <Select
                    style={{ width: "100%" }}
                    value={selectedContext.operand.sourceType}
                    options={sourceOptions}
                    onChange={(value) => changeSelectedSourceType(normalizeSourceType(value))}
                  />
                </PanelField>

                {selectedContext.operand.sourceType === "CONST" ? (
                  <div>
                    <Typography.Text>值</Typography.Text>
                    <Input
                      style={{ marginTop: 8 }}
                      placeholder="请输入固定值"
                      value={selectedContext.operand.displayValue}
                      onChange={(event) =>
                        updateSelectedOperand({
                          displayValue: event.target.value,
                          machineKey: event.target.value
                        })
                      }
                    />
                  </div>
                ) : null}

                {selectedContext.operand.sourceType === "PAGE_FIELD" ? (
                  <div>
                    <Typography.Text>值（页面字段）</Typography.Text>
                    <Select
                      showSearch
                      allowClear
                      style={{ width: "100%", marginTop: 8 }}
                      placeholder="请选择页面字段"
                      value={selectedContext.operand.displayValue || undefined}
                      optionFilterProp="label"
                      options={pageFieldOptions}
                      onChange={(value) =>
                        updateSelectedOperand({
                          displayValue: (value as string) ?? "",
                          machineKey: (value as string) ?? ""
                        })
                      }
                    />
                  </div>
                ) : null}

                {selectedContext.operand.sourceType === "CONTEXT" ? (
                  <div>
                    <Typography.Text>值（上下文变量）</Typography.Text>
                    <Select
                      showSearch
                      allowClear
                      style={{ width: "100%", marginTop: 8 }}
                      placeholder="请选择上下文变量"
                      value={selectedContext.operand.displayValue || undefined}
                      options={contextVariableOptions}
                      onChange={(value) =>
                        updateSelectedOperand({
                          displayValue: (value as string) ?? "",
                          machineKey: (value as string) ?? ""
                        })
                      }
                    />
                  </div>
                ) : null}

                {selectedContext.operand.sourceType === "INTERFACE_FIELD" ? (
                  <>
                    <div>
                      <Typography.Text>值（API）</Typography.Text>
                      <Select
                        showSearch
                        allowClear
                        style={{ width: "100%", marginTop: 8 }}
                        placeholder="请选择 API"
                        value={selectedContext.operand.interfaceId}
                        options={interfaces.map((item) => ({ label: item.name, value: item.id }))}
                        onChange={(value) => {
                          const picked = interfaces.find((item) => item.id === value);
                          updateSelectedOperand({
                            interfaceId: value as number | undefined,
                            interfaceName: picked?.name,
                            outputPath: "",
                            machineKey: "",
                            displayValue: "",
                            interfaceInputConfig: "",
                            valueType: "STRING"
                          });
                        }}
                      />
                    </div>

                    <div>
                      <Typography.Text>输出值路径</Typography.Text>
                      <Select
                        showSearch
                        allowClear
                        style={{ width: "100%", marginTop: 8 }}
                        placeholder="请选择API输出路径"
                        value={selectedContext.operand.outputPath || undefined}
                        options={selectedOutputPathOptions}
                        onChange={(value) => {
                          const nextPath = (value as string) ?? "";
                          updateSelectedOperand({
                            outputPath: nextPath,
                            machineKey: deriveMachineKeyFromOutputPath(nextPath)
                          });
                        }}
                      />
                    </div>

                    <Collapse
                      size="small"
                      items={[
                        {
                          key: "api-inputs",
                          label: `入参配置（${selectedInterfaceInputParams.length}）`,
                          children:
                            selectedInterfaceInputParams.length === 0 ? (
                              <Typography.Text type="secondary">当前 API 没有配置入参，可直接继续。</Typography.Text>
                            ) : (
                              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Typography.Text type="secondary">
                                  API注册仅定义入参契约；来源与取值映射在智能提示中按规则单独配置。
                                </Typography.Text>
                                <Table<InterfaceInputParamDraft>
                                  size="small"
                                  rowKey={(row) => `${row.tab}:${row.name}`}
                                  pagination={false}
                                  dataSource={selectedInterfaceInputParams}
                                  scroll={{ x: rulesLayoutConfig.apiInputTable.scrollX }}
                                  columns={[
                                    {
                                      title: "参数",
                                      width: 180,
                                      render: (_, row) => (
                                        <Space size={4}>
                                          <Typography.Text
                                            ellipsis={{ tooltip: row.name }}
                                            style={{ maxWidth: 120 }}
                                          >
                                            {row.name}
                                          </Typography.Text>
                                          {row.validationConfig.required ? <Tag color="error">必填</Tag> : <Tag>可选</Tag>}
                                        </Space>
                                      )
                                    },
                                    {
                                      title: "来源",
                                      width: 128,
                                      render: (_, row) => {
                                        const binding = selectedInterfaceInputConfig[row.name] ?? defaultInterfaceInputBinding();
                                        return (
                                          <Select
                                            size="small"
                                            value={binding.sourceType}
                                            options={interfaceInputSourceOptions}
                                            onChange={(value) =>
                                              updateInterfaceInputValue(row.name, {
                                                sourceType: value,
                                                sourceValue: ""
                                              })
                                            }
                                          />
                                        );
                                      }
                                    },
                                    ...(rulesLayoutConfig.apiInputTable.showValueTypeColumn
                                      ? [
                                          {
                                            title: "值类型",
                                            width: 120,
                                            render: (_: unknown, row: InterfaceInputParamDraft) => <Tag color="blue">{row.valueType}</Tag>
                                          }
                                        ]
                                      : []),
                                    {
                                      title: "取值",
                                      render: (_, row) => (
                                        <InterfaceInputValueEditor
                                          param={row}
                                          binding={selectedInterfaceInputConfig[row.name] ?? defaultInterfaceInputBinding()}
                                          pageFieldOptions={pageFieldOptions}
                                          contextVariableOptions={contextVariableOptions}
                                          updateInterfaceInputValue={updateInterfaceInputValue}
                                        />
                                      )
                                    }
                                  ]}
                                />
                              </Space>
                            )
                        }
                      ]}
                    />
                    <CompactHint
                      tone={selectedContext.operand.outputPath?.trim() ? "success" : "warning"}
                      title={`${selectedContext.operand.interfaceName || "API名称"}.${selectedContext.operand.outputPath || "(未绑定输出值)"}`}
                      description={selectedContext.operand.outputPath?.trim() ? "接口输出已绑定" : "请选择一个 API 输出路径"}
                    />
                  </>
                ) : null}

                <Collapse
                  size="small"
                  items={[
                    {
                      key: "data-processors",
                      label: `数据处理链（${selectedContext.operand.dataProcessors.length}）`,
                      extra: (
                        <Tooltip title="添加数据处理">
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              addDataProcessorBinding();
                            }}
                          />
                        </Tooltip>
                      ),
                      children:
                        selectedContext.operand.dataProcessors.length === 0 ? (
                          <Typography.Text type="secondary">暂无数据处理函数</Typography.Text>
                        ) : (
                          <Space direction="vertical" style={{ width: "100%" }}>
                            {selectedContext.operand.dataProcessors.map((binding) => (
                              <Space key={binding.id} style={{ width: "100%" }} align="start">
                                <Select
                                  showSearch
                                  allowClear
                                  placeholder="选择数据处理函数"
                                  style={{ flex: 1 }}
                                  value={binding.dataProcessorId}
                                  options={dataProcessors.map((item) => ({ label: item.name, value: item.id }))}
                                  onChange={(value) => updateDataProcessorBinding(binding.id, { dataProcessorId: value as number | undefined })}
                                />
                                <div style={{ flex: 2 }}>
                                  {(() => {
                                    const selectedProcessor = dataProcessors.find((item) => item.id === binding.dataProcessorId);
                                    const argCount = Math.max(0, (selectedProcessor?.paramCount ?? 1) - 1);
                                    if (argCount === 0) {
                                      return <Typography.Text type="secondary">该函数仅接收 input，无额外参数</Typography.Text>;
                                    }
                                    return (
                                      <Space style={{ width: "100%" }} wrap>
                                        {Array.from({ length: argCount }, (_, argIndex) => (
                                          <Input
                                            key={`${binding.id}-arg-${argIndex}`}
                                            style={{ width: 140 }}
                                            placeholder={`参数${argIndex + 1}`}
                                            value={binding.args[argIndex] ?? ""}
                                            onChange={(event) => {
                                              const nextArgs = Array.from({ length: argCount }, (_, idx) =>
                                                idx === argIndex ? event.target.value : (binding.args[idx] ?? "")
                                              );
                                              updateDataProcessorBinding(binding.id, { args: nextArgs });
                                            }}
                                          />
                                        ))}
                                      </Space>
                                    );
                                  })()}
                                </div>
                                <Tooltip title="删除数据处理">
                                  <Button danger icon={<DeleteOutlined />} onClick={() => removeDataProcessorBinding(binding.id)} />
                                </Tooltip>
                              </Space>
                            ))}
                          </Space>
                        )
                    }
                  ]}
                />
              </Space>
            )}
          </Card>
        </div>
      </>
    );
  }

  async function openEffectiveAction(target: EffectiveTarget) {
    const action = getEffectiveActionMeta(target.status);
    const permissionBlocked = getEffectivePermissionBlockedMessage(action.type, hasResource);
    if (permissionBlocked) {
      msgApi.warning(permissionBlocked);
      return;
    }
    const targetRule = rows.find((item) => item.id === target.id);

    setEffectiveTarget(target);
    setEffectiveLoading(false);
    setEffectiveBlockedMessage(null);
    setEffectiveValidationReport(null);
    setEffectiveScopeMode("ALL_ORGS");
    setEffectiveScopeOrgIds([]);
    setEffectiveStartAt(targetRule?.effectiveStartAt ?? "");
    setEffectiveEndAt(targetRule?.effectiveEndAt ?? "");

    if (action.type !== "PUBLISH") {
      return;
    }

    setEffectiveValidationReport({
      pass: true,
      items: [
        {
          key: "instant_publish",
          label: "即时生效",
          passed: true,
          detail: "当前模式为保存即生效，无需待发布步骤"
        }
      ],
      blockingCount: 0,
      warningCount: 0
    });
  }

  async function confirmEffectiveAction() {
    if (!effectiveTarget || !effectiveMeta) {
      return;
    }
    setEffectiveSubmitting(true);
    try {
      if (effectiveMeta.type === "PUBLISH") {
        const success = await publishRuleNow(
          effectiveTarget.id,
          effectiveTarget.name,
          {
            effectiveOrgIds: effectiveScopeMode === "CUSTOM_ORGS" ? effectiveScopeOrgIds : [],
            effectiveStartAt,
            effectiveEndAt
          }
        );
        if (!success) {
          return;
        }
      } else {
        const row = rows.find((item) => item.id === effectiveTarget.id);
        if (!row) {
          msgApi.warning("对象状态已变化，请刷新后重试。");
          return;
        }
        if (effectiveMeta.type === "RESTORE") {
          const restored = await restoreRuleNow(
            row,
            {
              effectiveOrgIds: effectiveScopeMode === "CUSTOM_ORGS" ? effectiveScopeOrgIds : [],
              effectiveStartAt,
              effectiveEndAt
            }
          );
          if (!restored) {
            return;
          }
        } else {
          await switchStatus(row);
        }
      }

      if (effectiveTarget.source === "notice") {
        dismissPublishNotice();
      }
      setEffectiveTarget(null);
      setEffectiveValidationReport(null);
      setEffectiveBlockedMessage(null);
      setEffectiveStartAt("");
      setEffectiveEndAt("");
    } finally {
      setEffectiveSubmitting(false);
    }
  }
  return (
    <div>
      {holder}
      {!embedded ? (
        <PageHeader>
          <Typography.Title level={4}>{pageTitle}</Typography.Title>
          <Typography.Paragraph type="secondary">{pageDescription}</Typography.Paragraph>
        </PageHeader>
      ) : null}

      {publishNotice ? (
        <PublishContinuationAlert
          objectLabel={publishNotice.objectLabel}
          objectName={publishNotice.objectName}
          warningCount={publishNotice.warningCount}
          actionLabel={getEffectiveActionMeta("DRAFT").label}
          actionDisabled={Boolean(getEffectivePermissionBlockedMessage("PUBLISH", hasResource))}
          actionDisabledReason={getEffectivePermissionBlockedMessage("PUBLISH", hasResource) ?? undefined}
          onGoPublish={() =>
            void openEffectiveAction({
              id: publishNotice.resourceId,
              name: publishNotice.objectName,
              status: "DRAFT",
              source: "notice"
            })
          }
          onClose={dismissPublishNotice}
        />
      ) : null}

      {!embedded ? (
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard $accent={rulesSummaryAccents.total}>
              <Statistic title={isTemplateMode ? "模板总数" : "规则总数"} value={rowSummary.total} />
            </SummaryCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard $accent={rulesSummaryAccents.draft}>
              <Statistic title="草稿" value={rowSummary.draft} />
            </SummaryCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard $accent={rulesSummaryAccents.active}>
              <Statistic title="已生效" value={rowSummary.active} />
            </SummaryCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <SummaryCard $accent={rulesSummaryAccents.disabled}>
              <Statistic title="已停用" value={rowSummary.disabled} />
            </SummaryCard>
          </Col>
        </Row>
      ) : null}

      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 12 }}
        message="共享状态说明"
        description="创建者可通过“共享设置”配置范围；共享对象仅可查看，如需调整请复制为我的副本。"
      />

      {!isTemplateMode ? (
        <div style={{ marginBottom: 12 }}>
          <ScopeQuickFilters
            menus={scopeMenus}
            pages={scopePages}
            selectedMenuId={selectedMenuId}
            selectedPageId={selectedPageId}
            onMenuChange={(menuId) => {
              setSelectedMenuId(menuId);
              setSelectedPageId(undefined);
            }}
            onPageChange={(pageId) => {
              setSelectedPageId(pageId);
              if (typeof pageId !== "number") {
                return;
              }
              const page = scopePages.find((item) => item.id === pageId);
              if (page) {
                setSelectedMenuId(page.menuId);
              }
            }}
          />
        </div>
      ) : null}

      <ToolbarSection>
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} lg={10}>
            <Input.Search
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={isTemplateMode ? "搜索模板名称" : "搜索规则名称、页面资源或来源模板"}
            />
          </Col>
          <Col xs={24} lg={14}>
            <ActionBar>
              <Segmented
                value={listStatusFilter}
                onChange={(value) => setListStatusFilter(value as RuleListStatusFilter)}
                options={[
                  { label: "全部", value: "ALL" },
                  { label: "草稿", value: "DRAFT" },
                  { label: "生效", value: "ACTIVE" },
                  { label: "停用", value: "DISABLED" },
                  { label: "过期", value: "EXPIRED" }
                ]}
              />
              <Button onClick={resetListFilters}>重置筛选</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(selectedPageId)} aria-label="create-rule">
                {createButtonLabel}
              </Button>
            </ActionBar>
          </Col>
        </Row>
      </ToolbarSection>

      <Card
        extra={<Typography.Text type="secondary">当前展示 {displayedRows.length} 条</Typography.Text>}
      >
        <Table<RuleDefinition>
          rowKey="id"
          loading={loading}
          dataSource={displayedRows}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
          columns={[
            { title: isTemplateMode ? "模板名称" : "规则名称", dataIndex: "name", width: 200 },
            ...(isTemplateMode
              ? [
                  {
                    title: "字段范围",
                    width: 140,
                    render: () => <Tag color="blue">仅公共字段</Tag>
                  }
                ]
              : [
                  {
                    title: "页面资源",
                    width: 160,
                    render: (_: unknown, row: RuleDefinition) =>
                      row.pageResourceName ?? <Typography.Text type="secondary">未绑定页面</Typography.Text>
                  },
                  {
                    title: "来源模板",
                    width: 160,
                    render: (_: unknown, row: RuleDefinition) =>
                      row.sourceRuleName ?? <Typography.Text type="secondary">独立规则</Typography.Text>
                  }
                ]),
            { title: "优先级", dataIndex: "priority", width: 90 },
            {
              title: "提示模式",
              dataIndex: "promptMode",
              width: 100,
              render: (value: RuleDefinition["promptMode"]) => promptModeLabelMap[value]
            },
            {
              title: "关闭方式",
              width: 200,
              render: (_, row) =>
                row.closeMode === "TIMER_THEN_MANUAL"
                  ? `${closeModeLabel[row.closeMode]}(${row.closeTimeoutSec ?? "-"}秒)`
                  : closeModeLabel[row.closeMode]
            },
            {
              title: "状态",
              width: 100,
              render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag>
            },
            {
              title: "共享状态",
              width: 110,
              render: (_, row) =>
                row.shareMode === "SHARED" ? <Tag color="processing">已共享</Tag> : <Tag>私有</Tag>
            },
            {
              title: "共享范围",
              width: 180,
              render: (_, row) => (
                <Typography.Text type={row.shareMode === "SHARED" ? undefined : "secondary"}>
                  {getShareScopeLabel(row)}
                </Typography.Text>
              )
            },
            {
              title: "操作",
              width: 320,
              render: (_, row) => {
                const readonlyShared = isReadonlySharedRule(row);
                const actionMeta = getEffectiveActionMeta(row.status);
                const actionBlocked = getEffectivePermissionBlockedMessage(actionMeta.type, hasResource);
                if (readonlyShared) {
                  return (
                    <Space>
                      <Button size="small" onClick={() => openRuleEditorTab(row, "basic")}>
                        查看
                      </Button>
                      <Button size="small" onClick={() => void cloneRuleToViewerOrg(row)}>
                        复制为我的副本
                      </Button>
                    </Space>
                  );
                }
                return (
                  <Space>
                    <Button size="small" onClick={() => openRuleEditorTab(row, "basic")}>
                      编辑
                    </Button>
                    <Button size="small" onClick={() => openShareSettings(row)}>
                      共享设置
                    </Button>
                    <Dropdown menu={{ items: buildRowMenuItems(row) }} trigger={["click"]}>
                      <Button size="small" icon={<MoreOutlined />}>
                        更多
                      </Button>
                    </Dropdown>
                    <Button
                      size="small"
                      type={actionMeta.type === "PUBLISH" ? "primary" : "default"}
                      disabled={Boolean(actionBlocked)}
                      title={actionBlocked ?? undefined}
                      onClick={() =>
                        void openEffectiveAction({
                          id: row.id,
                          name: row.name,
                          status: row.status,
                          source: "row"
                        })
                      }
                    >
                      {actionMeta.label}
                    </Button>
                  </Space>
                );
              }
            }
          ]}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={open}
        onCancel={closeRuleModal}
        width={isTemplateMode ? 720 : 1240}
        footer={null}
      >
        <Form form={ruleForm} layout="vertical" disabled={editingReadonlyShared}>
          <Form.Item hidden name="ruleScope">
            <Input />
          </Form.Item>

          {editingReadonlyShared ? (
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 12 }}
              message="当前对象来自共享，仅可查看"
              description="如需修改，请使用“复制为我的副本”后在副本中编辑。"
            />
          ) : null}

          <EditorStatusBar size="small">
            <Space align="center" size={[8, 8]} wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space size={[8, 4]} wrap>
                {hasUnsavedEdits ? (
                  <Tag color="warning">未保存更改</Tag>
                ) : (
                  <Tag style={{ borderColor: "var(--color-border)", background: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>内容已保存</Tag>
                )}
                <Tag color={editorBlockingCount > 0 ? "error" : "default"}>阻塞 {editorBlockingCount}</Tag>
                <Tag color={editorWarningCount > 0 ? "warning" : "default"}>警告 {editorWarningCount}</Tag>
                <Typography.Text type="secondary">
                  {editorBlockingCount > 0 ? "请先处理阻塞问题后再保存。" : "可直接保存；建议同步处理提示项。"}
                </Typography.Text>
              </Space>
              {editorIssueShortcuts.length > 0 ? (
                <Space size={[6, 6]} wrap>
                  {editorIssueShortcuts.map((item) => (
                    <Button key={item.key} size="small" onClick={() => jumpToIssue(item.issue)}>
                      {item.label}
                    </Button>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">暂无待定位问题</Typography.Text>
              )}
            </Space>
          </EditorStatusBar>

          <Tabs
            activeKey={activeEditorTab}
            onChange={(key) => setActiveEditorTab(key as "basic" | "logic")}
            items={[
              {
                key: "basic",
                label: "基础配置",
                children: (
                  <div style={{ display: "grid", gridTemplateColumns: isTemplateMode ? "minmax(0,1fr)" : "minmax(0,1.7fr) minmax(320px, 0.9fr)", gap: 16, alignItems: "start" }}>
                    <Space direction="vertical" style={{ width: "100%" }} size={16}>
                      {!isTemplateMode ? (
                        <Card id="rule-section-basic" size="small" title="触发对象">
                          {!editing ? (
                            <>
                              <Form.Item
                                name="pageResourceId"
                                label="页面资源"
                                rules={[{ required: true, message: "请选择页面资源" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  options={resources.map((item) => ({ label: item.name, value: item.id }))}
                                />
                              </Form.Item>
                              <Form.Item name="templateRuleId" label="场景模板">
                                <Select
                                  allowClear
                                  showSearch
                                  placeholder={templates.length > 0 ? "可选：套用已沉淀模板" : "暂无可复用模板"}
                                  optionFilterProp="label"
                                  options={templates.map((item) => ({
                                    label: item.name,
                                    value: item.id
                                  }))}
                                  onChange={(value) => applyTemplate(value as number | undefined)}
                                />
                              </Form.Item>
                            </>
                          ) : (
                            <>
                              <Form.Item
                                name="pageResourceId"
                                label="页面资源"
                                rules={[{ required: true, message: "请选择页面资源" }]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  options={resources.map((item) => ({ label: item.name, value: item.id }))}
                                />
                              </Form.Item>
                              <Form.Item label="来源模板">
                                <Input value={editing?.sourceRuleName ?? "独立规则"} readOnly />
                              </Form.Item>
                            </>
                          )}
                        </Card>
                      ) : (
                        <Card id="rule-section-basic" size="small" title="模板范围">
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            模板不绑定页面，只能使用公共字段。业务人员套用模板时，再把模板转换为页面规则。
                          </Typography.Paragraph>
                        </Card>
                      )}

                      <Card size="small" title="规则与行为">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                          <Form.Item name="name" label={isTemplateMode ? "模板名称" : "规则名称"} rules={[{ required: true, message: `请输入${isTemplateMode ? "模板" : "规则"}名称` }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
                            <InputNumber min={1} max={999} style={{ width: "100%" }} />
                          </Form.Item>
                          <Form.Item name="promptMode" label="提示模式" rules={[{ required: true }]}>
                            <Select options={[{ label: promptModeLabelMap.SILENT, value: "SILENT" }, { label: promptModeLabelMap.FLOATING, value: "FLOATING" }]} />
                          </Form.Item>
                          <Form.Item name="closeMode" label="关闭方式" rules={[{ required: true }]}>
                            <Select options={Object.entries(closeModeLabel).map(([value, label]) => ({ label, value }))} />
                          </Form.Item>
                          <Form.Item name="sceneId" label="关联作业场景（可选）" extra="可联动作业；不配置时仅关闭提示。">
                            <Select allowClear options={scenes.map((scene) => ({ label: scene.name, value: scene.id }))} />
                          </Form.Item>
                          <Form.Item label="状态">
                            <Tag color="default">保存后立即生效</Tag>
                          </Form.Item>
                        </div>
                        <Form.Item noStyle shouldUpdate>
                          {() =>
                            ruleForm.getFieldValue("closeMode") === "TIMER_THEN_MANUAL" ? (
                              <Form.Item
                                name="closeTimeoutSec"
                                label="关闭超时(秒)"
                                rules={[
                                  { required: true, message: "超时后关闭必须填写关闭超时时间" },
                                  { type: "number", min: 1, message: "关闭超时时间需大于0" }
                                ]}
                              >
                                <InputNumber min={1} style={{ width: "100%" }} />
                              </Form.Item>
                            ) : null
                          }
                        </Form.Item>
                        <Form.Item name="ownerOrgId" hidden rules={[{ required: true, message: "请选择组织范围" }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item label="组织范围">
                          <Input value={ownerOrgLabel} readOnly disabled placeholder="系统自动带出" />
                        </Form.Item>
                      </Card>

                      <Card id="rule-section-prompt" size="small" title="提示内容">
                        <Space direction="vertical" style={{ width: "100%" }} size={16}>
                          <Form.Item name="titleSuffix" hidden rules={[{ max: 20, message: "标题后缀最多 20 个字符" }]}>
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="bodyTemplate"
                            label="提示正文"
                            rules={[
                              { required: true, message: "请输入提示正文" },
                              { max: 300, message: "提示正文最多 300 个字符" },
                              {
                                validator: (_, value: string | undefined) => {
                                  const text = value ?? "";
                                  const matched = Array.from(text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), (item) => item[1]);
                                  const invalidKeys = Array.from(new Set(matched.filter((key) => !promptVariableOptions.some((item) => item.key === key))));
                                  return invalidKeys.length > 0 ? Promise.reject(new Error(`存在未注册变量：${invalidKeys.join("、")}`)) : Promise.resolve();
                                }
                              }
                            ]}
                            extra={`${(watchedBodyTemplate ?? "").length} / 300`}
                          >
                            <PromptTemplateEditor
                              key={promptEditorKey}
                              value={watchedBodyTemplate ?? ""}
                              editorStateJson={watchedBodyEditorStateJson ?? ""}
                              variableOptions={promptVariableOptions}
                              placeholder="请输入提示正文，可点击或拖拽变量到此处"
                              onChange={(nextValue, nextEditorStateJson) =>
                                ruleForm.setFieldsValue({
                                  bodyTemplate: nextValue,
                                  bodyEditorStateJson: nextEditorStateJson
                                })
                              }
                            />
                          </Form.Item>
                        </Space>
                      </Card>
                    </Space>

                    {!isTemplateMode ? (
                      <div>
                        <div style={{ position: "sticky", top: 0 }}>
                          <Space direction="vertical" style={{ width: "100%" }} size={16}>
                            <IssueQuickNavCard items={quickNavItems} onJump={jumpToRuleSection} />

                            <Card id="rule-section-summary" size="small" title="实时摘要">
                              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                                <Tag color="blue">{ruleForm.getFieldValue("name") || "未命名规则"}</Tag>
                                <Typography.Text style={{ color: "var(--color-text-secondary)" }}>页面：{currentPageName}</Typography.Text>
                                <Typography.Text style={{ color: "var(--color-text-secondary)" }}>
                                  提示模式：{watchedPromptMode ? promptModeLabelMap[watchedPromptMode] : "-"} / 关闭方式：
                                  {ruleForm.getFieldValue("closeMode") ? closeModeLabel[ruleForm.getFieldValue("closeMode") as RuleDefinition["closeMode"]] : "-"}
                                </Typography.Text>
                                <Typography.Text style={{ color: "var(--color-text-secondary)" }}>条件摘要：{conditionSummary}</Typography.Text>
                                <Typography.Text strong>{promptPreviewTitle}</Typography.Text>
                                <div
                                  style={{
                                    border: "1px solid #dbeafe",
                                    background: "#f5f9ff",
                                    borderRadius: 12,
                                    padding: 16
                                  }}
                                >
                                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                    {watchedPromptMode === "SILENT" ? (
                                      <Alert
                                        type="info"
                                        showIcon
                                        message="当前仅展示浮窗样式预览"
                                      />
                                    ) : null}
                                    <div style={{ whiteSpace: "pre-wrap", color: "var(--color-text-primary)" }}>
                                      {watchedBodyTemplate ? (
                                        <PromptRichPreview
                                          bodyTemplate={watchedBodyTemplate}
                                          bodyEditorStateJson={watchedBodyEditorStateJson}
                                          previewValues={promptPreviewValues}
                                        />
                                      ) : (
                                        "请输入提示正文后查看预览效果。"
                                      )}
                                    </div>
                                    <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                                      <Button disabled>取消</Button>
                                      <Button type="primary" disabled>
                                        确定
                                      </Button>
                                    </Space>
                                  </Space>
                                </div>
                                <Typography.Text type="secondary">
                                  状态：保存后立即生效，组织范围：{ownerOrgLabel}
                                </Typography.Text>
                              </Space>
                            </Card>

                            {hasSaveIssues ? (
                              <Collapse
                                size="small"
                                defaultActiveKey={saveBlockingCount > 0 ? ["save-validation"] : []}
                                items={[
                                  {
                                    key: "save-validation",
                                    label: `保存检查：阻塞 ${saveBlockingCount} / 警告 ${saveWarningCount}`,
                                    children: <ValidationReportPanel report={saveValidationReport} title="保存前检查结果" />
                                  }
                                ]}
                              />
                            ) : (
                              <CompactHint tone="success" title="保存检查通过" description="当前无阻塞项，可直接保存。" />
                            )}

                            {previewResult ? (
                              <Alert
                                showIcon
                                type={previewResult.matched ? "success" : "info"}
                                message={previewResult.matched ? "预览通过" : "预览提示"}
                                description={previewResult.detail}
                              />
                            ) : (
                              <Typography.Text style={{ color: "var(--color-text-secondary)" }}>
                                建议执行一次预览，确认提示展示效果与规则表达。
                              </Typography.Text>
                            )}
                          </Space>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              },
              {
                key: "logic",
                label: isTemplateMode ? "模板条件" : "条件配置",
                children: (
                  <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Card
                      id="rule-section-logic"
                      size="small"
                      title={isTemplateMode ? "模板条件" : "条件配置"}
                      extra={
                        <Space>
                          <Tooltip title="新增条件">
                            <Button icon={<PlusOutlined />} onClick={addCondition} disabled={editingReadonlyShared} />
                          </Tooltip>
                          {editing ? (
                            <Button
                              type="primary"
                              loading={savingQuery}
                              onClick={() => void saveConditionLogic()}
                              disabled={editingReadonlyShared}
                            >
                              保存条件逻辑
                            </Button>
                          ) : null}
                        </Space>
                      }
                    >
                      {renderLogicEditorContent()}
                    </Card>
                  </Space>
                )
              }
            ]}
          />

          <StickyEditorFooter>
            <Space align="center" size={[8, 8]} wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space size={[8, 4]} wrap>
                {editorBlockingCount > 0 ? (
                  <Tag color="error">存在 {editorBlockingCount} 个阻塞问题</Tag>
                ) : (
                  <Tag style={{ borderColor: "var(--color-border)", background: "var(--color-surface-muted)", color: "var(--color-text-secondary)" }}>保存校验通过</Tag>
                )}
                {editorWarningCount > 0 ? <Tag color="warning">提示 {editorWarningCount}</Tag> : null}
              </Space>
              <Space>
                <Button onClick={closeRuleModal}>取消</Button>
                {!isTemplateMode && !editingReadonlyShared ? (
                  <Button loading={previewLoading} onClick={() => void runWizardPreview()}>
                    执行预览
                  </Button>
                ) : null}
                {!editingReadonlyShared ? (
                  <Button type="primary" onClick={() => void submitRule()}>
                    {isTemplateMode ? "保存" : "保存规则"}
                  </Button>
                ) : null}
                {editingReadonlyShared ? (
                  <Button type="primary" onClick={() => editing && void cloneRuleToViewerOrg(editing)}>
                    复制为我的副本
                  </Button>
                ) : null}
              </Space>
            </Space>
          </StickyEditorFooter>
        </Form>
      </Modal>

      <Modal
        title={shareTargetRule ? `共享设置：${shareTargetRule.name}` : "共享设置"}
        open={Boolean(shareTargetRule)}
        onCancel={() => setShareTargetRule(null)}
        onOk={() => void submitShareSettings()}
        confirmLoading={shareSubmitting}
        okText="保存"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            创建者可设置共享范围；被共享方仅可查看并复制副本。
          </Typography.Text>
          <PanelField label="共享模式">
            <Segmented
              value={shareModeDraft}
              options={[
                { label: "私有", value: "PRIVATE" },
                { label: "共享", value: "SHARED" }
              ]}
              onChange={(value) => setShareModeDraft(value as ShareMode)}
            />
          </PanelField>
          {shareModeDraft === "SHARED" ? (
            <PanelField label="共享机构">
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择可查看的机构"
                value={shareOrgIdsDraft}
                options={shareScopeOptions.filter((item) => item.value !== shareTargetRule?.ownerOrgId)}
                onChange={(value) => setShareOrgIdsDraft(value as string[])}
              />
            </PanelField>
          ) : null}
        </Space>
      </Modal>

      {effectiveTarget && effectiveMeta ? (
        <EffectiveConfirmModal
          open
          objectName={effectiveTarget.name}
          action={effectiveMeta}
          loading={effectiveLoading}
          confirming={effectiveSubmitting}
          canConfirm={canEffectiveConfirm}
          blockedMessage={modalBlockedMessage}
          validationReport={effectiveValidationReport}
          scopeMode={effectiveScopeMode}
          scopeOrgIds={effectiveScopeOrgIds}
          scopeOptions={effectiveScopeOptions}
          effectiveStartAt={effectiveStartAt}
          effectiveEndAt={effectiveEndAt}
          onScopeModeChange={setEffectiveScopeMode}
          onScopeOrgIdsChange={setEffectiveScopeOrgIds}
          onEffectiveStartAtChange={setEffectiveStartAt}
          onEffectiveEndAtChange={setEffectiveEndAt}
          onCancel={() => {
            setEffectiveTarget(null);
            setEffectiveValidationReport(null);
            setEffectiveBlockedMessage(null);
            setEffectiveStartAt("");
            setEffectiveEndAt("");
          }}
          onConfirm={() => void confirmEffectiveAction()}
        />
      ) : null}
    </div>
  );
}


