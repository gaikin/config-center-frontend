import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, MoreOutlined, PartitionOutlined, PlusOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dayjs from "dayjs";
import { type DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { EffectiveConfirmModal } from "../../components/EffectiveConfirmModal";
import { PublishContinuationAlert } from "../../components/PublishContinuationAlert";
import { ScopeQuickFilters, type ScopeMenuOption, type ScopePageOption } from "../../components/ScopeQuickFilters";
import { ValidationReportPanel } from "../../components/ValidationReportPanel";
import { EffectiveScopeMode, getEffectiveActionMeta, getEffectivePermissionBlockedMessage } from "../../effectiveFlow";
import { lifecycleLabelMap } from "../../enumLabels";
import { getOrgLabel, orgOptions } from "../../orgOptions";
import { configCenterService } from "../../services/configCenterService";
import { useMockSession } from "../../session/mockSession";
import { NodeLibraryPanel } from "./NodeLibraryPanel";
import { readNodeTypeFromDragData } from "./nodeLibraryDnD";
import { JobFlowNode } from "./JobFlowNode";
import { useJobScenesPageModel } from "./useJobScenesPageModel";
import {
  buildExecutionMode,
  FlowEdge,
  FlowNode,
  HOTKEY_MAIN_KEY_OPTIONS,
  HOTKEY_MODIFIER_OPTIONS,
  isApiOutputSelectionRequired,
  deriveTriggerMode,
  getTriggerModeLabel,
  StatusFilter,
  type TriggerMode
} from "./jobScenesPageShared";
import type { ExecutionMode, JobSceneDefinition, JobScenePreviewField, LifecycleState, PublishValidationReport, ShareMode } from "../../types";

type EffectiveTarget = {
  id: number;
  name: string;
  status: LifecycleState;
  source: "row" | "notice";
};

const DEFAULT_FLOATING_BUTTON_LABEL = "重新执行";
const DEFAULT_FLOATING_BUTTON_X = 86;
const DEFAULT_FLOATING_BUTTON_Y = 78;
const INLINE_TYPE_WIDTH = 128;
const API_INPUT_LABEL_WIDTH = 96;
const API_INPUT_TYPE_WIDTH = 90;

const PageHeader = styled.div`
  margin-bottom: var(--space-16);
`;

const SceneTypeCard = styled(Card)`
  margin-bottom: 12px;
`;

const ScenePresetCard = styled(Card)`
  width: 320px;
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

export function JobScenesPage() {
  const navigate = useNavigate();
  const { hasResource, meta } = useMockSession();
  const [keyword, setKeyword] = useState("");
  const {
    holder,
    msgApi,
    statusFilter,
    setStatusFilter,
    filteredRows,
    openCreate,
    openEdit,
    switchStatus,
    openBuilder,
    openPreview,
    loading,
    linkedRulesByScene,
    pageMenus,
    open,
    closeSceneModal,
    submitScene,
    form,
    resources,
    editing,
    builderOpen,
    closeBuilder,
    savingFlow,
    saveFlowLayout,
    autoLayoutNodes,
    builderScene,
    selectFlowNode,
    flowNodes,
    flowEdges,
    onFlowNodesChange,
    onFlowEdgesChange,
    onConnect,
    setReactFlowInstance,
    nodeLibrary,
    addNodeFromLibrary,
    addNodeFromLibraryAtClientPosition,
    selectedLibraryNodeType,
    previewLibraryNode,
    selectedNode,
    pageFieldOptions,
    interfaces,
    nodeDetailForm,
    selectedApiInputParams,
    selectedApiOutputOptions,
    nodeOutputReferenceOptions,
    watchedNodeType,
    removeFlowNode,
    previewOpen,
    setPreviewOpen,
    previewScene,
    previewRows,
    previewSelectedKeys,
    setPreviewSelectedKeys,
    previewLoading,
    previewExecuting,
    executePreview,
    drawerWidth,
    statusColor,
    autoOpenCreateRef,
    sceneSaveValidationReport,
    nodeValidationIssues,
    previewValidationIssues,
    publishNotice,
    dismissPublishNotice,
    publishSceneNow,
    restoreSceneNow,
    cloneSceneToViewerOrg,
    reloadData
  } = useJobScenesPageModel({
    viewerOrgId: meta.orgScopeId,
    viewerOperatorId: meta.operatorId
  });
  const [effectiveTarget, setEffectiveTarget] = useState<EffectiveTarget | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [effectiveSubmitting, setEffectiveSubmitting] = useState(false);
  const [effectiveValidationReport, setEffectiveValidationReport] = useState<PublishValidationReport | null>(null);
  const [effectiveBlockedMessage, setEffectiveBlockedMessage] = useState<string | null>(null);
  const [effectiveScopeMode, setEffectiveScopeMode] = useState<EffectiveScopeMode>("ALL_ORGS");
  const [effectiveScopeOrgIds, setEffectiveScopeOrgIds] = useState<string[]>([]);
  const [effectiveStartAt, setEffectiveStartAt] = useState("");
  const [effectiveEndAt, setEffectiveEndAt] = useState("");
  const [shareTargetScene, setShareTargetScene] = useState<JobSceneDefinition | null>(null);
  const [shareModeDraft, setShareModeDraft] = useState<ShareMode>("PRIVATE");
  const [shareOrgIdsDraft, setShareOrgIdsDraft] = useState<string[]>([]);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const effectiveMeta = effectiveTarget ? getEffectiveActionMeta(effectiveTarget.status) : null;
  const effectiveScopeOptions = useMemo(
    () => orgOptions.map((item) => ({ label: item.label, value: String(item.value) })),
    []
  );
  const shareScopeOptions = useMemo(
    () => orgOptions.map((item) => ({ label: item.label, value: String(item.value) })),
    []
  );
  const effectivePermissionBlockedMessage = effectiveMeta
    ? getEffectivePermissionBlockedMessage(effectiveMeta.type, hasResource)
    : null;
  const modalBlockedMessage = effectiveBlockedMessage ?? effectivePermissionBlockedMessage;
  const canEffectiveConfirm =
    Boolean(effectiveMeta) &&
    (effectiveMeta?.type !== "PUBLISH" || Boolean(effectiveValidationReport?.pass)) &&
    (effectiveMeta?.type !== "PUBLISH" || effectiveScopeMode !== "CUSTOM_ORGS" || effectiveScopeOrgIds.length > 0) &&
    !modalBlockedMessage;
  const [searchParams] = useSearchParams();
  const pageResourceFilter = Number(searchParams.get("pageResourceId") ?? "");
  const executionModeParam = searchParams.get("executionMode");
  const sceneNameParam = searchParams.get("sceneName");
  const quickAction = searchParams.get("action");
  const hasPageFilter = Number.isFinite(pageResourceFilter) && pageResourceFilter > 0;
  const [selectedMenuId, setSelectedMenuId] = useState<number | undefined>(undefined);
  const [selectedPageId, setSelectedPageId] = useState<number | undefined>(hasPageFilter ? pageResourceFilter : undefined);
  const presetPageName = resources.find((item) => item.id === pageResourceFilter)?.name;
  const presetExecutionMode = (
    executionModeParam === "AUTO_WITHOUT_PROMPT" ||
    executionModeParam === "AUTO_AFTER_PROMPT" ||
    executionModeParam === "FLOATING_BUTTON"
  )
    ? executionModeParam
    : undefined;
  const isReadonlySharedScene = (row: JobSceneDefinition) =>
    row.shareMode === "SHARED" && row.ownerOrgId !== meta.orgScopeId;
  const editingReadonlyShared = Boolean(editing && isReadonlySharedScene(editing));
  const builderReadonlyShared = Boolean(builderScene && isReadonlySharedScene(builderScene));
  const getShareScopeLabel = (row: JobSceneDefinition) => {
    if (row.shareMode !== "SHARED") {
      return "仅自己";
    }
    const scopeOrgIds = row.sharedOrgIds ?? [];
    if (scopeOrgIds.length === 0) {
      return "全部机构";
    }
    return scopeOrgIds.map((orgId) => getOrgLabel(orgId)).join("、");
  };

  function openShareSettings(row: JobSceneDefinition) {
    setShareTargetScene(row);
    setShareModeDraft(row.shareMode === "SHARED" ? "SHARED" : "PRIVATE");
    setShareOrgIdsDraft((row.sharedOrgIds ?? []).filter((orgId) => orgId !== row.ownerOrgId));
  }

  async function submitShareSettings() {
    if (!shareTargetScene) {
      return;
    }
    setShareSubmitting(true);
    try {
      await configCenterService.updateJobSceneShareConfig(
        shareTargetScene.id,
        {
          shareMode: shareModeDraft,
          sharedOrgIds: shareModeDraft === "SHARED" ? shareOrgIdsDraft : []
        },
        meta.operatorId
      );
      msgApi.success("共享设置已保存");
      setShareTargetScene(null);
      await reloadData();
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "共享设置保存失败");
    } finally {
      setShareSubmitting(false);
    }
  }

  useEffect(() => {
    if (!hasPageFilter || quickAction !== "create" || autoOpenCreateRef.current) {
      return;
    }
    autoOpenCreateRef.current = true;
    openCreate({
      pageResourceId: pageResourceFilter,
      executionMode: presetExecutionMode,
      name: sceneNameParam ?? undefined
    });
  }, [autoOpenCreateRef, hasPageFilter, openCreate, pageResourceFilter, presetExecutionMode, quickAction, sceneNameParam]);

  const currentScopeMenu = useMemo(
    () => (typeof selectedMenuId === "number" ? pageMenus.find((item) => item.id === selectedMenuId) ?? null : null),
    [pageMenus, selectedMenuId]
  );
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
  useEffect(() => {
    if (typeof selectedPageId !== "number") {
      return;
    }
    const matchedPage = resources.find((item) => item.id === selectedPageId);
    if (matchedPage) {
      const matchedMenu = pageMenus.find((item) => item.menuCode === matchedPage.menuCode);
      if (matchedMenu && matchedMenu.id !== selectedMenuId) {
        setSelectedMenuId(matchedMenu.id);
      }
    }
  }, [pageMenus, resources, selectedMenuId, selectedPageId]);
  const currentScopePageIds = useMemo(() => {
    if (!currentScopeMenu) {
      return [] as number[];
    }
    return resources.filter((item) => item.menuCode === currentScopeMenu.menuCode).map((item) => item.id);
  }, [currentScopeMenu, resources]);
  const visibleRows = useMemo(() => {
    let nextRows = filteredRows;
    if (typeof selectedPageId === "number") {
      nextRows = nextRows.filter((item) => item.pageResourceId === selectedPageId);
    } else if (typeof selectedMenuId === "number") {
      const allowed = new Set(currentScopePageIds);
      nextRows = nextRows.filter((item) => allowed.has(item.pageResourceId));
    }
    return nextRows;
  }, [currentScopePageIds, filteredRows, selectedMenuId, selectedPageId]);
  const activePageResourceId = useMemo(
    () => selectedPageId ?? (typeof selectedMenuId === "number" ? currentScopePageIds[0] : undefined),
    [currentScopePageIds, selectedMenuId, selectedPageId]
  );
  const keywordValue = keyword.trim().toLowerCase();
  const searchedRows = useMemo(() => {
    if (!keywordValue) {
      return visibleRows;
    }
    return visibleRows.filter((item) => {
      const sceneName = (item.name ?? "").toLowerCase();
      const pageName = (item.pageResourceName ?? "").toLowerCase();
      return sceneName.includes(keywordValue) || pageName.includes(keywordValue);
    });
  }, [keywordValue, visibleRows]);
  const watchedExecutionMode = Form.useWatch("executionMode", form) as ExecutionMode | undefined;
  const watchedFloatingButtonEnabled = Form.useWatch("floatingButtonEnabled", form) as boolean | undefined;
  const watchedValueType = Form.useWatch("valueType", nodeDetailForm) as "STRING" | "REFERENCE" | undefined;
  const watchedValue = Form.useWatch("value", nodeDetailForm) as string | undefined;
  const watchedApiInputBindings = Form.useWatch("apiInputBindings", nodeDetailForm) as
    | Record<string, { sourceType?: "STRING" | "REFERENCE"; value?: string }>
    | undefined;
  const watchedScriptInputs = Form.useWatch("scriptInputs", nodeDetailForm) as
    | Array<{ name?: string; sourceType?: "STRING" | "REFERENCE"; value?: string }>
    | undefined;
  const watchedApiRefactorRequired = Form.useWatch("apiRefactorRequired", nodeDetailForm) as boolean | undefined;
  const selectedTriggerMode: TriggerMode = watchedExecutionMode ? deriveTriggerMode(watchedExecutionMode) : "AUTO";
  const floatingRetriggerEnabled = selectedTriggerMode === "BUTTON" || Boolean(watchedFloatingButtonEnabled);
  const linkedFloatingPromptRules = useMemo(() => {
    if (!editing?.id) {
      return [] as Array<{ id: number; name: string }>;
    }
    return (linkedRulesByScene.get(editing.id) ?? [])
      .filter((rule) => rule.promptMode === "FLOATING")
      .map((rule) => ({ id: rule.id, name: rule.name }));
  }, [editing?.id, linkedRulesByScene]);
  const promptPriorityConflict = watchedExecutionMode === "AUTO_WITHOUT_PROMPT" && linkedFloatingPromptRules.length > 0;
  const currentSceneStatus: LifecycleState = editing?.status ?? "DRAFT";
  const activeNodeType = selectedNode?.nodeType ?? watchedNodeType;
  const nodeTypes = useMemo(() => ({ jobNode: JobFlowNode }), []);
  const flowNodesWithActions = useMemo<FlowNode[]>(
    () =>
      flowNodes.map((item) => ({
        ...item,
        data: {
          ...item.data,
          onDelete: () => {
            if (!builderReadonlyShared) {
              void removeFlowNode(item.id);
            }
          }
        }
      })),
    [builderReadonlyShared, flowNodes, removeFlowNode]
  );
  const apiInputTabItems = useMemo(() => {
    const tabOrder = [
      { key: "body", label: "Body" },
      { key: "query", label: "Query" },
      { key: "path", label: "Path" },
      { key: "headers", label: "Header" }
    ] as const;
    return tabOrder
      .map((tab) => {
        const params = selectedApiInputParams.filter((item) => item.tab === tab.key);
        return {
          key: tab.key,
          label: `${tab.label}${params.length > 0 ? ` (${params.length})` : ""}`,
          params
        };
      })
      .filter((tab) => tab.params.length > 0);
  }, [selectedApiInputParams]);

  useEffect(() => {
    if (activeNodeType !== "page_set" || watchedValueType !== "REFERENCE") {
      return;
    }
    const currentValue = watchedValue?.trim();
    if (!currentValue) {
      return;
    }
    const matched = nodeOutputReferenceOptions.some((item) => item.value === currentValue);
    if (!matched) {
      nodeDetailForm.setFieldValue("value", undefined);
    }
  }, [activeNodeType, nodeDetailForm, nodeOutputReferenceOptions, watchedValue, watchedValueType]);

  useEffect(() => {
    if (activeNodeType !== "api_call") {
      return;
    }
    const bindings = watchedApiInputBindings ?? {};
    let hasInvalidValue = false;
    const nextBindings: Record<string, { sourceType: "STRING" | "REFERENCE"; value: string }> = {};
    for (const [key, raw] of Object.entries(bindings)) {
      const sourceType = raw?.sourceType === "REFERENCE" ? "REFERENCE" : "STRING";
      const value = typeof raw?.value === "string" ? raw.value : "";
      const validReference = sourceType !== "REFERENCE" || !value.trim() || nodeOutputReferenceOptions.some((item) => item.value === value.trim());
      nextBindings[key] = {
        sourceType,
        value: validReference ? value : ""
      };
      if (!validReference) {
        hasInvalidValue = true;
      }
    }
    if (hasInvalidValue) {
      nodeDetailForm.setFieldValue("apiInputBindings", nextBindings);
    }
  }, [activeNodeType, nodeDetailForm, nodeOutputReferenceOptions, watchedApiInputBindings]);

  useEffect(() => {
    if (activeNodeType !== "js_script") {
      return;
    }
    const scriptInputs = watchedScriptInputs ?? [];
    let hasInvalidValue = false;
    const nextScriptInputs = scriptInputs.map((item) => {
      const sourceType = item?.sourceType === "REFERENCE" ? "REFERENCE" : "STRING";
      const value = typeof item?.value === "string" ? item.value : "";
      const validReference = sourceType !== "REFERENCE" || !value.trim() || nodeOutputReferenceOptions.some((option) => option.value === value.trim());
      if (!validReference) {
        hasInvalidValue = true;
      }
      return {
        name: typeof item?.name === "string" ? item.name : "",
        sourceType,
        value: validReference ? value : ""
      };
    });
    if (hasInvalidValue) {
      nodeDetailForm.setFieldValue("scriptInputs", nextScriptInputs);
    }
  }, [activeNodeType, nodeDetailForm, nodeOutputReferenceOptions, watchedScriptInputs]);

  const handleFlowDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!canvasDragOver) {
      setCanvasDragOver(true);
    }
  }, [canvasDragOver]);

  const handleFlowDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setCanvasDragOver(false);
    const nodeType = readNodeTypeFromDragData(event.dataTransfer);
    if (!nodeType) {
      return;
    }
    void addNodeFromLibraryAtClientPosition(nodeType, { x: event.clientX, y: event.clientY });
  }, [addNodeFromLibraryAtClientPosition]);

  const sceneCards = [
    {
      key: "auto-run",
      title: "自动执行",
      desc: "提示完成后自动进入作业流程，默认直接执行。",
      mode: "AUTO_AFTER_PROMPT" as const
    },
    {
      key: "button-run",
      title: "按钮触发",
      desc: "提示完成后展示悬浮按钮，用户点击后再执行。",
      mode: "FLOATING_BUTTON" as const
    }
  ];

  function buildRowMenuItems(row: JobSceneDefinition): MenuProps["items"] {
    return [
      {
        key: "edit",
        label: "编辑",
        icon: <EditOutlined />,
        onClick: () => openEdit(row)
      },
      {
        key: "run-records",
        label: "运行记录",
        icon: <InfoCircleOutlined />,
        onClick: () => {
          const params = new URLSearchParams({
            tab: "jobs",
            sceneId: String(row.id),
            sceneName: row.name
          });
          if (row.pageResourceId) {
            params.set("pageResourceId", String(row.pageResourceId));
          }
          navigate(`/run-records?${params.toString()}`);
        }
      }
    ];
  }

  function resetListFilters() {
    setKeyword("");
    setStatusFilter("ALL");
    setSelectedMenuId(undefined);
    setSelectedPageId(undefined);
  }

  async function openEffectiveAction(target: EffectiveTarget) {
    const action = getEffectiveActionMeta(target.status);
    const permissionBlocked = getEffectivePermissionBlockedMessage(action.type, hasResource);
    if (permissionBlocked) {
      msgApi.warning(permissionBlocked);
      return;
    }

    setEffectiveTarget(target);
    setEffectiveLoading(false);
    setEffectiveValidationReport(null);
    setEffectiveBlockedMessage(null);
    setEffectiveScopeMode("ALL_ORGS");
    setEffectiveScopeOrgIds([]);
    setEffectiveStartAt(dayjs().format("YYYY-MM-DD HH:mm"));
    setEffectiveEndAt("");

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
        const success = await publishSceneNow(
          effectiveTarget.id,
          effectiveTarget.name,
          effectiveScopeMode === "CUSTOM_ORGS" ? effectiveScopeOrgIds : []
        );
        if (!success) {
          return;
        }
      } else {
        const row = visibleRows.find((item) => item.id === effectiveTarget.id) ?? filteredRows.find((item) => item.id === effectiveTarget.id);
        if (!row) {
          msgApi.warning("对象状态已变化，请刷新后重试。");
          return;
        }
        if (effectiveMeta.type === "RESTORE") {
          const restored = await restoreSceneNow(
            row,
            effectiveScopeMode === "CUSTOM_ORGS" ? effectiveScopeOrgIds : []
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
      <PageHeader>
        <Typography.Title level={4}>作业编排</Typography.Title>
      </PageHeader>
      {publishNotice ? (
        <PublishContinuationAlert
          objectLabel="作业场景"
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
      {hasPageFilter ? (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 12 }}
          message={`已切换到页面：${presetPageName ?? "当前页面"}`}
        />
      ) : null}

      <SceneTypeCard title="场景类型（业务视角）">
        <Space size={[8, 8]} wrap>
          {sceneCards.map((item) => (
            <ScenePresetCard key={item.key} size="small" title={item.title}>
              <Space direction="vertical">
                <Typography.Text type="secondary">{item.desc}</Typography.Text>
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    openCreate({
                      pageResourceId: activePageResourceId,
                      executionMode: item.mode,
                      name: sceneNameParam ?? `${item.title}-${new Date().getTime()}`
                    })
                  }
                >
                  按该场景创建
                </Button>
              </Space>
            </ScenePresetCard>
          ))}
        </Space>
      </SceneTypeCard>

      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 12 }}
        message="共享状态说明"
        description="创建者可通过“共享设置”配置范围；共享对象仅可查看，如需调整请复制为我的版本。"
      />

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

      <ToolbarSection>
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} lg={9}>
            <Input.Search
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索场景名称或所属页面"
            />
          </Col>
          <Col xs={24} lg={15}>
            <ActionBar>
              <Button
                icon={<PartitionOutlined />}
                disabled={searchedRows.length === 0}
                onClick={() => (searchedRows[0] ? void openBuilder(searchedRows[0]) : undefined)}
              >
                打开最新编排
              </Button>
              <Segmented
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { label: "全部", value: "ALL" },
                  { label: "草稿", value: "DRAFT" },
                  { label: "启用", value: "ACTIVE" },
                  { label: "停用", value: "DISABLED" },
                  { label: "过期", value: "EXPIRED" }
                ]}
              />
              <Button
                onClick={() => {
                  const params = new URLSearchParams({ tab: "jobs" });
                  if (hasPageFilter) {
                    params.set("pageResourceId", String(pageResourceFilter));
                  }
                  navigate(`/run-records?${params.toString()}`);
                }}
              >
                运行记录
              </Button>
              <Button onClick={resetListFilters}>重置筛选</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() =>
                  openCreate({
                    pageResourceId: activePageResourceId,
                    executionMode: presetExecutionMode,
                    name: sceneNameParam ?? undefined
                  })
                }
                aria-label="create-scene"
              >
                新建场景
              </Button>
            </ActionBar>
          </Col>
        </Row>
      </ToolbarSection>

      <Card
        extra={<Typography.Text type="secondary">当前展示 {searchedRows.length} 项</Typography.Text>}
      >
        <Table<JobSceneDefinition>
          rowKey="id"
          loading={loading}
          dataSource={searchedRows}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
          columns={[
            { title: "场景名称", dataIndex: "name", width: 220 },
            { title: "所属页面", dataIndex: "pageResourceName", width: 160 },
            {
              title: "执行策略",
              width: 280,
              render: (_, row) => {
                const triggerMode = deriveTriggerMode(row.executionMode);
                const floatingEnabled = row.floatingButtonEnabled ?? row.executionMode === "FLOATING_BUTTON";
                const shouldShowRetriggerTag = triggerMode === "AUTO" && floatingEnabled;
                return (
                  <Space size={[6, 4]} wrap>
                    {triggerMode === "AUTO" ? <Tag>自动触发</Tag> : null}
                    {triggerMode === "BUTTON" ? <Tag color="blue">按钮触发</Tag> : null}
                    {shouldShowRetriggerTag ? <Tag color="processing">补充按钮</Tag> : null}
                  </Space>
                );
              }
            },
            {
              title: "触发关联",
              width: 240,
              render: (_, row) => {
                const linkedRules = linkedRulesByScene.get(row.id) ?? [];
                if (linkedRules.length === 0) {
                  return <Typography.Text type="secondary">未关联规则</Typography.Text>;
                }
                return (
                  <Space size={[4, 4]} wrap>
                    {linkedRules.map((rule) => (
                      <Tag key={rule.id} color="processing">
                        {rule.name}
                      </Tag>
                    ))}
                  </Space>
                );
              }
            },
            { title: "节点数", dataIndex: "nodeCount", width: 80 },
            { title: "人工基准(秒)", dataIndex: "manualDurationSec", width: 120 },
            { title: "状态", width: 100, render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag> },
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
              width: 340,
              render: (_, row) => {
                const readonlyShared = isReadonlySharedScene(row);
                const actionMeta = getEffectiveActionMeta(row.status);
                const actionBlocked = getEffectivePermissionBlockedMessage(actionMeta.type, hasResource);
                if (readonlyShared) {
                  return (
                    <Space wrap>
                      <Button size="small" type="primary" icon={<PartitionOutlined />} onClick={() => void openBuilder(row)}>
                        作业编排
                      </Button>
                      <Button size="small" onClick={() => openEdit(row)}>
                        查看
                      </Button>
                      <Button size="small" onClick={() => void cloneSceneToViewerOrg(row)}>
                        复制为我的版本
                      </Button>
                    </Space>
                  );
                }
                return (
                  <Space wrap>
                    <Button size="small" type="primary" icon={<PartitionOutlined />} onClick={() => void openBuilder(row)}>
                      作业编排
                    </Button>
                    <Button size="small" onClick={() => openEdit(row)}>
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
        title={editing ? "编辑场景" : "新建场景"}
        open={open}
        onCancel={closeSceneModal}
        onOk={editingReadonlyShared ? undefined : () => void submitScene()}
        width={680}
        footer={
          editingReadonlyShared
            ? [
                <Button key="close" onClick={closeSceneModal}>
                  关闭
                </Button>,
                <Button key="clone" type="primary" onClick={() => editing && void cloneSceneToViewerOrg(editing)}>
                  复制为我的版本
                </Button>
              ]
            : undefined
        }
      >
        <Form form={form} layout="vertical" disabled={editingReadonlyShared}>
          {editingReadonlyShared ? (
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 12 }}
              message="当前对象来自共享，仅可查看"
              description="如需修改，请复制为我的版本后在副本中编辑。"
            />
          ) : null}
          <Space size={8} wrap style={{ marginBottom: 12 }}>
            <Tag color="processing">保存即草稿</Tag>
            <Tag color="processing">节点数自动统计</Tag>
            <Typography.Text type="secondary">仅需配置页面与执行方式</Typography.Text>
          </Space>
          <ValidationReportPanel report={sceneSaveValidationReport} title="保存前检查结果" />
          {promptPriorityConflict ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="提示优先：静默执行不会生效"
              description={`当前已关联浮窗提示规则：${linkedFloatingPromptRules
                .map((rule) => rule.name)
                .join("、")}。运行时将按提示配置弹窗。`}
            />
          ) : null}
          <Form.Item name="name" label="场景名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="pageResourceId" label="页面资源" rules={[{ required: true }]}><Select options={resources.map((r) => ({ label: r.name, value: r.id }))} /></Form.Item>
          <Form.Item hidden name="executionMode">
            <Input />
          </Form.Item>
          <Form.Item hidden name="floatingButtonEnabled">
            <Input />
          </Form.Item>
          <Form.Item label="触发方式" required>
            <Segmented
              value={selectedTriggerMode}
              options={[
                { label: "自动执行", value: "AUTO" },
                { label: "按钮触发", value: "BUTTON" }
              ]}
              onChange={(value) => {
                const nextTriggerMode = value as TriggerMode;
                const nextExecutionMode = buildExecutionMode(nextTriggerMode, false);
                form.setFieldValue("executionMode", nextExecutionMode);
                if (nextTriggerMode === "BUTTON") {
                  form.setFieldValue("floatingButtonEnabled", true);
                  if (!form.getFieldValue("floatingButtonLabel")) {
                    form.setFieldValue("floatingButtonLabel", DEFAULT_FLOATING_BUTTON_LABEL);
                  }
                  if (typeof form.getFieldValue("floatingButtonX") !== "number") {
                    form.setFieldValue("floatingButtonX", DEFAULT_FLOATING_BUTTON_X);
                  }
                  if (typeof form.getFieldValue("floatingButtonY") !== "number") {
                    form.setFieldValue("floatingButtonY", DEFAULT_FLOATING_BUTTON_Y);
                  }
                } else if (form.getFieldValue("floatingButtonEnabled") === undefined) {
                  form.setFieldValue("floatingButtonEnabled", false);
                }
              }}
            />
          </Form.Item>
          <Form.Item label="悬浮按钮补充入口" style={{ marginBottom: 12 }}>
            <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
              <Typography.Text type="secondary">
                用于让用户在主流程完成后重复触发同一作业。
              </Typography.Text>
              <Switch
                checked={floatingRetriggerEnabled}
                disabled={selectedTriggerMode === "BUTTON"}
                onChange={(checked) => {
                  form.setFieldValue("floatingButtonEnabled", checked);
                  if (checked) {
                    if (!form.getFieldValue("floatingButtonLabel")) {
                      form.setFieldValue("floatingButtonLabel", DEFAULT_FLOATING_BUTTON_LABEL);
                    }
                    if (typeof form.getFieldValue("floatingButtonX") !== "number") {
                      form.setFieldValue("floatingButtonX", DEFAULT_FLOATING_BUTTON_X);
                    }
                    if (typeof form.getFieldValue("floatingButtonY") !== "number") {
                      form.setFieldValue("floatingButtonY", DEFAULT_FLOATING_BUTTON_Y);
                    }
                  }
                }}
              />
            </Space>
          </Form.Item>
          {floatingRetriggerEnabled ? (
            <Card
              size="small"
              style={{ marginBottom: 12 }}
              title={
                <Space size={8}>
                  <Typography.Text>悬浮按钮配置</Typography.Text>
                  <Tag color="error">必填</Tag>
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Form.Item
                  name="floatingButtonLabel"
                  label="按钮文案"
                  rules={[{ required: true, message: "请输入按钮文案" }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input maxLength={16} placeholder="如：重新执行" />
                </Form.Item>
                <Space align="start" size={12} wrap>
                  <Form.Item
                    name="floatingButtonX"
                    label="横坐标 X(%)"
                    rules={[{ required: true, message: "请输入X坐标" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} max={100} precision={0} />
                  </Form.Item>
                  <Form.Item
                    name="floatingButtonY"
                    label="纵坐标 Y(%)"
                    rules={[{ required: true, message: "请输入Y坐标" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} max={100} precision={0} />
                  </Form.Item>
                </Space>
                <Typography.Text type="secondary">
                  坐标按页面可视区域百分比记录，便于不同分辨率下保持相对位置。
                </Typography.Text>
              </Space>
            </Card>
          ) : (
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              当前为自动执行，无需配置悬浮按钮。
            </Typography.Text>
          )}
          <Form.Item label="状态">
            <Space size={8} wrap>
              <Tag color={statusColor[currentSceneStatus]}>{lifecycleLabelMap[currentSceneStatus]}</Tag>
              <Typography.Text type="secondary">
                {editing ? "当前线上状态仅展示，保存时会生成草稿版本。" : "新建场景默认为草稿。"}
              </Typography.Text>
              <Tooltip title="状态变更请使用列表中的“立即生效 / 暂停生效 / 恢复生效”操作。">
                <InfoCircleOutlined style={{ color: "var(--text-secondary)" }} />
              </Tooltip>
            </Space>
          </Form.Item>
          <Form.Item name="manualDurationSec" label="人工基准(秒)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={builderScene ? `作业编排: ${builderScene.name}` : "作业编排"}
        placement="right"
        width={drawerWidth}
        open={builderOpen}
        onClose={closeBuilder}
        extra={
          <Space>
            <Button size="small" disabled={!builderScene} onClick={() => (builderScene ? void openPreview(builderScene) : undefined)}>
              打开预览确认
            </Button>
            <Button onClick={autoLayoutNodes} disabled={builderReadonlyShared}>自动排版</Button>
            <Button loading={savingFlow} onClick={() => void saveFlowLayout()} disabled={builderReadonlyShared}>保存编排</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {builderReadonlyShared ? (
            <Alert
              showIcon
              type="info"
              message="当前对象来自共享，仅可查看"
              description="画布与节点属性均为只读；如需修改请复制为我的版本。"
            />
          ) : null}
          <Card title="节点编排区" size="small">
            <div style={{ display: "flex", gap: 12, alignItems: "stretch", overflowX: "auto", position: "relative" }}>
              <Card title="节点库" style={{ flex: "0 0 220px" }}>
                <NodeLibraryPanel
                  items={nodeLibrary}
                  selectedNodeType={selectedLibraryNodeType}
                  disabledNodeTypes={
                    builderReadonlyShared
                      ? nodeLibrary.map((item) => item.nodeType)
                      : []
                  }
                  onSelect={previewLibraryNode}
                  onAdd={(nodeType) => {
                    if (!builderReadonlyShared) {
                      void addNodeFromLibrary(nodeType);
                    }
                  }}
                />
              </Card>

              <Card title="编排画布" style={{ flex: "1 0 680px", minWidth: 540 }}>
                {flowNodes.length === 0 ? (
                  <Alert type="warning" showIcon message="当前场景暂无节点，请先从左侧节点库添加。" style={{ marginBottom: 12 }} />
                ) : null}
                <div
                  style={{
                    width: "100%",
                    height: 520,
                    border: canvasDragOver ? "1px dashed #1677ff" : "1px solid #f0f0f0",
                    borderRadius: 8
                  }}
                  onDragOver={builderReadonlyShared ? undefined : handleFlowDragOver}
                  onDragLeave={builderReadonlyShared ? undefined : () => setCanvasDragOver(false)}
                  onDrop={builderReadonlyShared ? undefined : handleFlowDrop}
                >
                  <ReactFlowProvider>
                    <ReactFlow<FlowNode, FlowEdge>
                      nodes={flowNodesWithActions}
                      edges={flowEdges}
                      nodeTypes={nodeTypes}
                      onNodesChange={builderReadonlyShared ? undefined : onFlowNodesChange}
                      onEdgesChange={builderReadonlyShared ? undefined : onFlowEdgesChange}
                      onConnect={builderReadonlyShared ? undefined : onConnect}
                      onInit={(instance) => setReactFlowInstance(instance)}
                      onNodeClick={(_, node) => void selectFlowNode(node.id)}
                      onPaneClick={() => void selectFlowNode(null)}
                      nodesDraggable={!builderReadonlyShared}
                      nodesConnectable={!builderReadonlyShared}
                      elementsSelectable
                      minZoom={0.15}
                      fitView={flowNodesWithActions.length > 0}
                      fitViewOptions={{ padding: 0.1, minZoom: 0.15, maxZoom: 1.2 }}
                    >
                      <MiniMap zoomable pannable />
                      <Controls />
                      <Background />
                    </ReactFlow>
                  </ReactFlowProvider>
                </div>
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  拖拽节点调整布局，连线定义执行顺序，点击节点后在右侧编辑属性。
                </Typography.Paragraph>
              </Card>

              {selectedNode ? (
                <Card
                  title="节点属性"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 360,
                    maxHeight: 560,
                    overflowY: "auto",
                    zIndex: 20,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
                  }}
                >
                  <ValidationReportPanel issues={nodeValidationIssues} title="节点属性还有待处理问题" />
                  <Form form={nodeDetailForm} layout="vertical" disabled={builderReadonlyShared}>
                      <Form.Item name="name" label="节点名称" rules={[{ required: true, message: "请输入节点名称" }]}>
                        <Input placeholder="请输入节点名称" />
                      </Form.Item>
                      <Form.Item name="nodeType" hidden>
                        <Input />
                      </Form.Item>

                      {activeNodeType === "page_get" ? (
                        <>
                          <Form.Item name="field" label="读取字段" rules={[{ required: true, message: "请选择读取字段" }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={pageFieldOptions.length > 0 ? "请选择页面字段" : "当前页面无可配置字段"}
                              options={pageFieldOptions}
                              disabled={pageFieldOptions.length === 0}
                            />
                          </Form.Item>
                          {pageFieldOptions.length === 0 ? (
                            <Alert
                              type="warning"
                              showIcon
                              message="当前页面未配置业务字段"
                              description="请先在页面字段映射中配置字段后再使用页面取值节点。"
                              style={{ marginBottom: 12 }}
                            />
                          ) : null}
                        </>
                      ) : null}

                      {activeNodeType === "api_call" ? (
                        <>
                          {watchedApiRefactorRequired ? (
                            <Alert
                              type="warning"
                              showIcon
                              style={{ marginBottom: 12 }}
                              message="接口调用节点已升级"
                              description="该节点使用旧配置，已清空。请重新选择接口并配置入参与出参。"
                            />
                          ) : null}
                          <Form.Item name="apiRefactorRequired" hidden>
                            <Input />
                          </Form.Item>
                          <Form.Item name="apiInterfaceId" label="接口" rules={[{ required: true, message: "请选择接口" }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={interfaces.length > 0 ? "请选择接口" : "暂无可用接口"}
                              options={interfaces.map((item) => ({ label: `${item.name} (#${item.id})`, value: item.id }))}
                              disabled={interfaces.length === 0}
                            />
                          </Form.Item>
                          {interfaces.length === 0 ? (
                            <Alert
                              type="warning"
                              showIcon
                              style={{ marginBottom: 12 }}
                              message="当前没有可用接口"
                              description="请先到接口中心发布接口后，再配置接口调用节点。"
                            />
                          ) : null}

                          {selectedApiInputParams.length > 0 ? (
                            <Form.Item label="接口入参">
                              <Tabs
                                size="small"
                                items={apiInputTabItems.map((tab) => ({
                                  key: tab.key,
                                  label: tab.label,
                                  children: (
                                    <Space direction="vertical" size={8} style={{ width: "100%", paddingTop: 4 }}>
                                      {tab.params.map((param) => {
                                        const sourceType =
                                          watchedApiInputBindings?.[param.name]?.sourceType === "REFERENCE"
                                            ? "REFERENCE"
                                            : "STRING";
                                        return (
                                          <div
                                            key={param.name}
                                            style={{
                                              display: "grid",
                                              gridTemplateColumns: `${API_INPUT_LABEL_WIDTH}px ${API_INPUT_TYPE_WIDTH}px minmax(0, 1fr)`,
                                              alignItems: "center",
                                              columnGap: 8
                                            }}
                                          >
                                            <div style={{ minWidth: 0 }}>
                                              <Typography.Text strong>{param.name}</Typography.Text>
                                              {param.required ? (
                                                <Typography.Text type="danger" style={{ marginLeft: 4 }}>
                                                  *
                                                </Typography.Text>
                                              ) : null}
                                            </div>
                                            <Form.Item
                                              name={["apiInputBindings", param.name, "sourceType"]}
                                              noStyle
                                              initialValue="STRING"
                                            >
                                              <Select
                                                style={{ width: "100%" }}
                                                options={[
                                                  { label: "string", value: "STRING" },
                                                  { label: "引用", value: "REFERENCE" }
                                                ]}
                                              />
                                            </Form.Item>
                                            <Form.Item name={["apiInputBindings", param.name, "value"]} noStyle>
                                              {sourceType === "REFERENCE" ? (
                                                <Select
                                                  style={{ width: "100%" }}
                                                  showSearch
                                                  optionFilterProp="label"
                                                  placeholder="请选择上游输出引用"
                                                  options={nodeOutputReferenceOptions}
                                                  notFoundContent="暂无可用上游输出"
                                                />
                                              ) : (
                                                <Input style={{ width: "100%" }} placeholder="请输入字符串值" />
                                              )}
                                            </Form.Item>
                                          </div>
                                        );
                                      })}
                                    </Space>
                                  )
                                }))}
                              />
                            </Form.Item>
                          ) : (
                            <Alert
                              type="info"
                              showIcon
                              style={{ marginBottom: 12 }}
                              message="当前接口没有入参"
                              description="无需配置接口入参。"
                            />
                          )}

                          <Form.Item
                            name="apiOutputPaths"
                            label="接口出参"
                            rules={
                              isApiOutputSelectionRequired(selectedApiOutputOptions.length)
                                ? [{ required: true, message: "请至少选择一个出参字段" }]
                                : []
                            }
                          >
                            <Select
                              mode="multiple"
                              showSearch
                              optionFilterProp="label"
                              placeholder={selectedApiOutputOptions.length > 0 ? "请选择对下游可见的出参字段" : "当前接口无可用出参"}
                              options={selectedApiOutputOptions.map((item) => ({ label: item.label, value: item.path }))}
                              disabled={selectedApiOutputOptions.length === 0}
                            />
                          </Form.Item>
                        </>
                      ) : null}

                      {activeNodeType === "list_lookup" ? (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message="名单检索节点已下线"
                          description="请删除该节点并改用接口调用或脚本处理节点完成同类逻辑。"
                        />
                      ) : null}

                      {activeNodeType === "js_script" ? (
                        <>
                          <Form.Item name="scriptCode" label="脚本代码" rules={[{ required: true, message: "请输入脚本代码" }]}>
                            <Input.TextArea
                              autoSize={{ minRows: 5, maxRows: 10 }}
                              placeholder="例如：return { score: Number(input.riskRef || 0), level: 'HIGH' };"
                            />
                          </Form.Item>
                          <Form.Item label="输入变量">
                            <Form.List name="scriptInputs">
                              {(fields, { add, remove }) => (
                                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                  {fields.map((field) => {
                                    const sourceType = watchedScriptInputs?.[field.name]?.sourceType === "REFERENCE" ? "REFERENCE" : "STRING";
                                    return (
                                      <div
                                        key={field.key}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "180px 1fr auto",
                                          gap: 8,
                                          alignItems: "center"
                                        }}
                                      >
                                        <Form.Item
                                          {...field}
                                          name={[field.name, "name"]}
                                          style={{ marginBottom: 0 }}
                                          rules={[{ required: true, message: "请输入变量名" }]}
                                        >
                                          <Input placeholder="变量名，如 customerId" />
                                        </Form.Item>
                                        <Space.Compact style={{ width: "100%" }}>
                                          <Form.Item {...field} name={[field.name, "sourceType"]} noStyle initialValue="STRING">
                                            <Select
                                              style={{ width: INLINE_TYPE_WIDTH }}
                                              options={[
                                                { label: "string", value: "STRING" },
                                                { label: "引用", value: "REFERENCE" }
                                              ]}
                                            />
                                          </Form.Item>
                                          <Form.Item {...field} name={[field.name, "value"]} noStyle>
                                            {sourceType === "REFERENCE" ? (
                                              <Select
                                                style={{ width: `calc(100% - ${INLINE_TYPE_WIDTH}px)` }}
                                                showSearch
                                                allowClear
                                                optionFilterProp="label"
                                                placeholder="请选择上游输出引用"
                                                options={nodeOutputReferenceOptions}
                                                notFoundContent="暂无可用上游输出"
                                                disabled={nodeOutputReferenceOptions.length === 0}
                                              />
                                            ) : (
                                              <Input style={{ width: `calc(100% - ${INLINE_TYPE_WIDTH}px)` }} placeholder="请输入字符串常量" />
                                            )}
                                          </Form.Item>
                                        </Space.Compact>
                                        <Button
                                          danger
                                          type="text"
                                          icon={<DeleteOutlined />}
                                          aria-label="remove-script-input"
                                          onClick={() => remove(field.name)}
                                        />
                                      </div>
                                    );
                                  })}
                                  <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={() =>
                                      add({
                                        name: `input${fields.length + 1}`,
                                        sourceType: "STRING",
                                        value: ""
                                      })
                                    }
                                  >
                                    添加输入变量
                                  </Button>
                                </Space>
                              )}
                            </Form.List>
                          </Form.Item>
                          <Form.Item name="scriptOutputKeys" label="输出字段" rules={[{ required: true, message: "请至少配置一个输出字段" }]}>
                            <Select
                              mode="tags"
                              tokenSeparators={[",", " "]}
                              placeholder="输入输出字段名后回车，例如 score"
                            />
                          </Form.Item>
                        </>
                      ) : null}

                      {activeNodeType === "page_set" ? (
                        <>
                          <Form.Item name="target" label="写入目标字段" rules={[{ required: true, message: "请选择写入目标字段" }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={pageFieldOptions.length > 0 ? "请选择写入目标字段" : "当前页面无可配置字段"}
                              options={pageFieldOptions}
                              disabled={pageFieldOptions.length === 0}
                            />
                          </Form.Item>
                          {pageFieldOptions.length === 0 ? (
                            <Alert
                              type="warning"
                              showIcon
                              style={{ marginBottom: 12 }}
                              message="当前页面未配置业务字段"
                              description="请先到页面资源维护业务字段后，再配置页面写值节点。"
                            />
                          ) : null}
                          <Form.Item label="写入值">
                            <Space.Compact style={{ width: "100%" }}>
                              <Form.Item name="valueType" noStyle>
                                <Select
                                  style={{ width: INLINE_TYPE_WIDTH }}
                                  options={[
                                    { label: "string", value: "STRING" },
                                    { label: "引用", value: "REFERENCE" }
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item name="value" noStyle>
                                {watchedValueType === "REFERENCE" ? (
                                  <Select
                                    style={{ width: `calc(100% - ${INLINE_TYPE_WIDTH}px)` }}
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder="请选择上游输出引用"
                                    options={nodeOutputReferenceOptions}
                                    notFoundContent="暂无可用上游输出"
                                    disabled={nodeOutputReferenceOptions.length === 0}
                                  />
                                ) : (
                                  <Input style={{ width: `calc(100% - ${INLINE_TYPE_WIDTH}px)` }} placeholder="请输入常量值（可为空）" />
                                )}
                              </Form.Item>
                            </Space.Compact>
                          </Form.Item>
                        </>
                      ) : null}

                      {activeNodeType === "page_click" ? (
                        <>
                          <Form.Item name="target" label="点击目标字段" rules={[{ required: true, message: "请选择点击目标字段" }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={pageFieldOptions.length > 0 ? "请选择点击目标字段" : "当前页面无可配置字段"}
                              options={pageFieldOptions}
                              disabled={pageFieldOptions.length === 0}
                            />
                          </Form.Item>
                          {pageFieldOptions.length === 0 ? (
                            <Alert
                              type="warning"
                              showIcon
                              style={{ marginBottom: 12 }}
                              message="当前页面未配置业务字段"
                              description="请先到页面资源维护业务字段后，再配置页面点击节点。"
                            />
                          ) : null}
                        </>
                      ) : null}

                      {activeNodeType === "send_hotkey" ? (
                        <>
                          <Form.Item name="hotkeyModifiers" label="修饰键">
                            <Select
                              mode="multiple"
                              allowClear
                              placeholder="可选：Ctrl / Alt / Shift / Meta"
                              options={HOTKEY_MODIFIER_OPTIONS}
                            />
                          </Form.Item>
                          <Form.Item name="hotkeyKey" label="主键" rules={[{ required: true, message: "请选择主键" }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="请选择主键"
                              options={HOTKEY_MAIN_KEY_OPTIONS}
                            />
                          </Form.Item>
                        </>
                      ) : null}
                  </Form>

                </Card>
              ) : null}
            </div>
          </Card>
        </Space>
      </Drawer>

      <Modal
        title={previewScene ? `预览确认：${previewScene.name}` : "预览确认"}
        open={previewOpen}
        width={980}
        confirmLoading={previewExecuting}
        onCancel={() => setPreviewOpen(false)}
        onOk={() => void executePreview()}
        okText="确认写入"
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Card size="small" title="作业摘要">
            <Space wrap>
              <Tag>{previewScene?.name ?? "-"}</Tag>
              <Tag color="blue">
                {previewScene ? getTriggerModeLabel(deriveTriggerMode(previewScene.executionMode)) : "-"}
              </Tag>
              <Tag>字段总数 {previewRows.length}</Tag>
              <Tag color="processing">待写入 {previewSelectedKeys.length}</Tag>
              <Tag color={previewRows.some((item) => item.abnormal) ? "red" : "green"}>
                {previewRows.some((item) => item.abnormal) ? "存在异常字段" : "无异常字段"}
              </Tag>
            </Space>
          </Card>

          {previewRows.some((item) => item.abnormal) ? (
            <Alert
              type="warning"
              showIcon
              message="有异常字段，请先取消勾选后再执行。"
            />
          ) : (
            <Typography.Text type="secondary">请勾选需要写入的字段，确认后执行。</Typography.Text>
          )}

          <ValidationReportPanel issues={previewValidationIssues} title="预览提醒" />

          <Table<JobScenePreviewField>
            rowKey="key"
            loading={previewLoading}
            pagination={false}
            rowSelection={{
              selectedRowKeys: previewSelectedKeys,
              onChange: (keys) => setPreviewSelectedKeys(keys as string[]),
              getCheckboxProps: (record) => ({ disabled: record.abnormal })
            }}
            dataSource={previewRows}
            columns={[
              { title: "字段名称", dataIndex: "fieldName", width: 140 },
              { title: "原值", dataIndex: "originalValue", width: 160 },
              { title: "拟写入值", dataIndex: "nextValue", width: 180 },
              { title: "数据来源", dataIndex: "source", width: 220 },
              {
                title: "状态",
                width: 120,
                render: (_, row) =>
                  row.abnormal ? (
                    <Tooltip title="异常字段已被预览校验拦截，执行时会自动跳过。">
                      <Tag color="red">异常</Tag>
                    </Tooltip>
                  ) : (
                    <Tag color="green">正常</Tag>
                  )
              }
            ]}
            rowClassName={(record) => (record.abnormal ? "preview-row-abnormal" : "")}
          />
        </Space>
      </Modal>

      <Modal
        title={shareTargetScene ? `共享设置：${shareTargetScene.name}` : "共享设置"}
        open={Boolean(shareTargetScene)}
        onCancel={() => setShareTargetScene(null)}
        onOk={() => void submitShareSettings()}
        confirmLoading={shareSubmitting}
        okText="保存"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            创建者可设置共享范围；被共享方仅可查看并复制副本。
          </Typography.Text>
          <Form.Item label="共享模式" style={{ marginBottom: 0 }}>
            <Segmented
              value={shareModeDraft}
              options={[
                { label: "私有", value: "PRIVATE" },
                { label: "共享", value: "SHARED" }
              ]}
              onChange={(value) => setShareModeDraft(value as ShareMode)}
            />
          </Form.Item>
          {shareModeDraft === "SHARED" ? (
            <Form.Item label="共享机构" style={{ marginBottom: 0 }}>
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择可查看的机构"
                value={shareOrgIdsDraft}
                options={shareScopeOptions.filter((item) => item.value !== shareTargetScene?.ownerOrgId)}
                onChange={(value) => setShareOrgIdsDraft(value as string[])}
              />
            </Form.Item>
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
            setEffectiveStartAt("");
            setEffectiveEndAt("");
          }}
          onConfirm={() => void confirmEffectiveAction()}
        />
      ) : null}
    </div>
  );
}







