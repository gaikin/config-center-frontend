import { Form, Grid, Modal, message } from "antd";
import { addEdge, type Connection, MarkerType, type NodeChange, Position, useEdgesState, useNodesState } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOrgLabel } from "../../orgOptions";
import { configCenterService } from "../../services/configCenterService";
import { workflowService } from "../../services/workflowService";
import { getRightOverlayDrawerWidth } from "../../utils";
import { createFieldIssue, validateJobSceneDraftPayload } from "../../validation/formRules";
import type {
  BusinessFieldDefinition,
  ExecutionMode,
  FieldValidationIssue,
  InterfaceDefinition,
  JobNodeDefinition,
  JobSceneDefinition,
  JobScenePreviewField,
  LifecycleState,
  ListDataDefinition,
  PageElement,
  PageFieldBinding,
  PageResource,
  RuleDefinition,
  SaveValidationReport
} from "../../types";
import {
  buildExecutionMode,
  buildFormValuesFromNode,
  buildFlowFromNodeRows,
  buildNodeConfigFromForm,
  deriveNodeOutputReferenceOptions,
  derivePreviewBeforeExecute,
  deriveOrderedNodeIds,
  executionLabel,
  FlowEdge,
  FlowNode,
  NodeDetailForm,
  getDefaultNodeConfig,
  getFlowNodeStyle,
  getFlowPosition,
  mergeFlowNextNodeIds,
  mergeFlowPosition,
  parseApiCallInputParams,
  parseApiCallOutputOptions,
  nodeLibrary,
  nodeTypeLabel,
  SceneForm,
  StatusFilter,
  statusColor
} from "./jobScenesPageShared";
import type { ReactFlowInstance } from "@xyflow/react";

const DEFAULT_FLOATING_BUTTON_LABEL = "重新执行";
const DEFAULT_FLOATING_BUTTON_X = 86;
const DEFAULT_FLOATING_BUTTON_Y = 78;

type JobScenesPageModelOptions = {
  viewerOrgId?: string;
  viewerOperatorId?: string;
};

function toSceneDraftPayload(row: JobSceneDefinition): Omit<JobSceneDefinition, "updatedAt"> & { updatedAt?: string } {
  return {
    ...row,
    status: "DRAFT"
  };
}

export function useJobScenesPageModel(options: JobScenesPageModelOptions = {}) {
  const screens = Grid.useBreakpoint();
  const drawerWidth = getRightOverlayDrawerWidth(Boolean(screens.lg));

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobSceneDefinition[]>([]);
  const [resources, setResources] = useState<PageResource[]>([]);
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceDefinition[]>([]);
  const [listDatas, setListDatas] = useState<ListDataDefinition[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JobSceneDefinition | null>(null);
  const [form] = Form.useForm<SceneForm>();
  const [sceneSnapshot, setSceneSnapshot] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderScene, setBuilderScene] = useState<JobSceneDefinition | null>(null);
  const [nodeRows, setNodeRows] = useState<JobNodeDefinition[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLibraryNodeType, setSelectedLibraryNodeType] = useState<JobNodeDefinition["nodeType"] | null>(nodeLibrary[0]?.nodeType ?? null);
  const [pageFieldOptions, setPageFieldOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [savingFlow, setSavingFlow] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  const [flowNodes, setFlowNodes, onFlowNodesChangeBase] = useNodesState<FlowNode>([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<FlowEdge>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScene, setPreviewScene] = useState<JobSceneDefinition | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewExecuting, setPreviewExecuting] = useState(false);
  const [previewRows, setPreviewRows] = useState<JobScenePreviewField[]>([]);
  const [previewSelectedKeys, setPreviewSelectedKeys] = useState<string[]>([]);
  const [sceneSaveValidationReport, setSceneSaveValidationReport] = useState<SaveValidationReport | null>(null);
  const [nodeValidationIssues, setNodeValidationIssues] = useState<FieldValidationIssue[]>([]);
  const [previewValidationIssues, setPreviewValidationIssues] = useState<FieldValidationIssue[]>([]);
  const [publishNotice, setPublishNotice] = useState<{ objectName: string; warningCount: number; resourceId: number } | null>(null);
  const [invalidNodeIds, setInvalidNodeIds] = useState<string[]>([]);
  const autoOpenCreateRef = useRef(false);
  const switchingNodeRef = useRef(false);

  const [nodeDetailForm] = Form.useForm<NodeDetailForm>();
  const watchedNodeType = Form.useWatch("nodeType", nodeDetailForm);
  const watchedNodeListDataId = Form.useWatch("listDataId", nodeDetailForm);
  const watchedApiInterfaceId = Form.useWatch("apiInterfaceId", nodeDetailForm);
  const watchedSceneValues = Form.useWatch([], form) as Partial<SceneForm> | undefined;
  const watchedNodeValues = Form.useWatch([], nodeDetailForm) as Partial<NodeDetailForm> | undefined;
  const [msgApi, holder] = message.useMessage();

  const selectedNode = useMemo(
    () => nodeRows.find((item) => String(item.id) === selectedNodeId) ?? null,
    [nodeRows, selectedNodeId]
  );
  const nodeOutputReferenceOptions = useMemo(
    () => deriveNodeOutputReferenceOptions(nodeRows, selectedNode?.id, flowEdges),
    [flowEdges, nodeRows, selectedNode?.id]
  );
  const selectedNodeListData = useMemo(
    () => listDatas.find((item) => item.id === watchedNodeListDataId) ?? null,
    [listDatas, watchedNodeListDataId]
  );
  const selectedApiInterface = useMemo(
    () => interfaces.find((item) => item.id === watchedApiInterfaceId) ?? null,
    [interfaces, watchedApiInterfaceId]
  );
  const selectedApiInputParams = useMemo(
    () => (selectedApiInterface ? parseApiCallInputParams(selectedApiInterface.inputConfigJson) : []),
    [selectedApiInterface]
  );
  const selectedApiOutputOptions = useMemo(
    () => (selectedApiInterface ? parseApiCallOutputOptions(selectedApiInterface.outputConfigJson) : []),
    [selectedApiInterface]
  );

  useEffect(() => {
    if (!selectedNode) {
      nodeDetailForm.resetFields();
      setNodeValidationIssues([]);
      return;
    }
    nodeDetailForm.resetFields();
    nodeDetailForm.setFieldsValue(buildFormValuesFromNode(selectedNode));
    setNodeValidationIssues([]);
  }, [selectedNode, nodeDetailForm]);

  useEffect(() => {
    if (watchedNodeType !== "api_call") {
      return;
    }
    const inputParams = selectedApiInputParams;
    const outputOptions = selectedApiOutputOptions;
    const rawBindings = (nodeDetailForm.getFieldValue("apiInputBindings") ?? {}) as Record<
      string,
      { sourceType?: "STRING" | "REFERENCE"; value?: string }
    >;
    const nextBindings: Record<string, { sourceType: "STRING" | "REFERENCE"; value: string }> = {};
    for (const item of inputParams) {
      const current = rawBindings[item.name];
      nextBindings[item.name] = {
        sourceType: current?.sourceType === "REFERENCE" ? "REFERENCE" : "STRING",
        value: typeof current?.value === "string" ? current.value : ""
      };
    }
    const rawOutputPaths = ((nodeDetailForm.getFieldValue("apiOutputPaths") as string[] | undefined) ?? []).filter(Boolean);
    const validOutputPathSet = new Set(outputOptions.map((item) => item.path));
    const nextOutputPaths = rawOutputPaths.filter((item) => validOutputPathSet.has(item));

    const shouldUpdateBindings = JSON.stringify(rawBindings) !== JSON.stringify(nextBindings);
    const shouldUpdateOutputs = JSON.stringify(rawOutputPaths) !== JSON.stringify(nextOutputPaths);
    if (shouldUpdateBindings || shouldUpdateOutputs) {
      nodeDetailForm.setFieldsValue({
        apiInputBindings: nextBindings,
        apiOutputPaths: nextOutputPaths
      });
    }
  }, [nodeDetailForm, selectedApiInputParams, selectedApiOutputOptions, watchedNodeType]);

  async function loadData() {
    setLoading(true);
    try {
      const [sceneData, resourceData, ruleData, interfaceRows, listDataRows] = await Promise.all([
        configCenterService.listJobScenes({ viewerOrgId: options.viewerOrgId }),
        configCenterService.listPageResources(),
        configCenterService.listRules({ viewerOrgId: options.viewerOrgId }),
        configCenterService.listInterfaces(),
        configCenterService.listListDatas()
      ]);
      const sceneNodeCounts = await Promise.all(
        sceneData.map(async (scene) => ({
          sceneId: scene.id,
          count: (await workflowService.listJobNodes(scene.id)).length
        }))
      );
      setRows(
        sceneData.map((scene) => ({
          ...scene,
          nodeCount: sceneNodeCounts.find((item) => item.sceneId === scene.id)?.count ?? 0
        }))
      );
      setResources(resourceData);
      setRules(ruleData);
      setInterfaces(interfaceRows);
      setListDatas(listDataRows);
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

  const linkedRulesByScene = useMemo(() => {
    const grouped = new Map<number, RuleDefinition[]>();
    for (const rule of rules) {
      if (!rule.sceneId) {
        continue;
      }
      const existing = grouped.get(rule.sceneId) ?? [];
      existing.push(rule);
      grouped.set(rule.sceneId, existing);
    }
    return grouped;
  }, [rules]);

  function buildSceneSnapshot(values: Partial<SceneForm>) {
    return JSON.stringify({
      name: values.name ?? "",
      pageResourceId: values.pageResourceId ?? null,
      executionMode: values.executionMode ?? "AUTO_AFTER_PROMPT",
      previewBeforeExecute: values.previewBeforeExecute ?? false,
      floatingButtonEnabled: values.floatingButtonEnabled ?? false,
      floatingButtonLabel: values.floatingButtonLabel ?? "",
      floatingButtonX: values.floatingButtonX ?? null,
      floatingButtonY: values.floatingButtonY ?? null,
      status: values.status ?? "DRAFT",
      manualDurationSec: values.manualDurationSec ?? 1
    });
  }

  function updateSceneNodeCount(sceneId: number, nextCount: number) {
    setRows((previous) => previous.map((item) => (item.id === sceneId ? { ...item, nodeCount: nextCount } : item)));
    setBuilderScene((previous) => (previous && previous.id === sceneId ? { ...previous, nodeCount: nextCount } : previous));
    setEditing((previous) => (previous && previous.id === sceneId ? { ...previous, nodeCount: nextCount } : previous));
  }

  function closeSceneModalDirectly() {
    setOpen(false);
    setEditing(null);
    setSceneSnapshot("");
    setSceneSaveValidationReport(null);
  }

  function closeSceneModal() {
    const current = buildSceneSnapshot(form.getFieldsValue() as Partial<SceneForm>);
    if (sceneSnapshot && current !== sceneSnapshot) {
      Modal.confirm({
        title: "存在未保存修改",
        content: "关闭后将丢失当前场景编辑内容，是否继续？",
        okText: "仍然关闭",
        cancelText: "继续编辑",
        onOk: closeSceneModalDirectly
      });
      return;
    }
    closeSceneModalDirectly();
  }

  async function loadBuilderData(sceneId: number) {
    const nodes = await workflowService.listJobNodes(sceneId);
    setNodeRows(nodes);
    const flow = buildFlowFromNodeRows(nodes);
    const invalidSet = new Set(invalidNodeIds);
    setFlowNodes(
      flow.nodes.map((item) => ({
        ...item,
        style: getFlowNodeStyle(Boolean(item.data.enabled), invalidSet.has(item.id))
      }))
    );
    setFlowEdges(flow.edges);
    updateSceneNodeCount(sceneId, nodes.length);

    if (selectedNodeId && !nodes.some((item) => String(item.id) === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }

  async function loadBuilderPageFieldOptions(pageResourceId: number) {
    const [bindings, elements, businessFields] = await Promise.all([
      configCenterService.listPageFieldBindings(pageResourceId),
      configCenterService.listPageElements(pageResourceId),
      configCenterService.listBusinessFields(pageResourceId)
    ]);
    const elementMap = new Map<number, PageElement>(elements.map((item) => [item.id, item]));
    const fieldMap = new Map<string, BusinessFieldDefinition>(businessFields.map((item) => [item.code, item]));
    const options = bindings.map((binding: PageFieldBinding) => {
      const field = fieldMap.get(binding.businessFieldCode);
      const element = elementMap.get(binding.pageElementId);
      return {
        value: binding.businessFieldCode,
        label: `${field?.name ?? binding.businessFieldCode}（${binding.businessFieldCode}${element ? ` · ${element.logicName}` : ""}）`
      };
    });
    setPageFieldOptions(options);
  }

  function openCreate(preset?: { pageResourceId?: number; executionMode?: ExecutionMode; name?: string }) {
    const pickedExecutionMode: ExecutionMode =
      preset?.executionMode && ["AUTO_WITHOUT_PROMPT", "AUTO_AFTER_PROMPT", "PREVIEW_THEN_EXECUTE", "FLOATING_BUTTON"].includes(preset.executionMode)
        ? preset.executionMode
        : "AUTO_AFTER_PROMPT";
    const pickedPageId =
      typeof preset?.pageResourceId === "number" && resources.some((item) => item.id === preset.pageResourceId)
        ? preset.pageResourceId
        : resources[0]?.id ?? 0;
    const values: SceneForm = {
      name: preset?.name ?? "",
      pageResourceId: pickedPageId,
      executionMode: pickedExecutionMode,
      previewBeforeExecute: derivePreviewBeforeExecute({
        executionMode: pickedExecutionMode
      }),
      floatingButtonEnabled: pickedExecutionMode === "FLOATING_BUTTON",
      floatingButtonLabel: DEFAULT_FLOATING_BUTTON_LABEL,
      floatingButtonX: DEFAULT_FLOATING_BUTTON_X,
      floatingButtonY: DEFAULT_FLOATING_BUTTON_Y,
      status: "DRAFT",
      manualDurationSec: 30
    };
    setEditing(null);
    setPublishNotice(null);
    form.setFieldsValue(values);
    setSceneSnapshot(buildSceneSnapshot(values));
    setSceneSaveValidationReport(null);
    setOpen(true);
  }

  function openEdit(row: JobSceneDefinition) {
    const values: SceneForm = {
      name: row.name,
      pageResourceId: row.pageResourceId,
      executionMode: row.executionMode,
      previewBeforeExecute: derivePreviewBeforeExecute(row),
      floatingButtonEnabled: row.floatingButtonEnabled ?? row.executionMode === "FLOATING_BUTTON",
      floatingButtonLabel: row.floatingButtonLabel ?? DEFAULT_FLOATING_BUTTON_LABEL,
      floatingButtonX: row.floatingButtonX ?? DEFAULT_FLOATING_BUTTON_X,
      floatingButtonY: row.floatingButtonY ?? DEFAULT_FLOATING_BUTTON_Y,
      status: row.status,
      manualDurationSec: row.manualDurationSec
    };
    setEditing(row);
    setPublishNotice(null);
    form.setFieldsValue(values);
    setSceneSnapshot(buildSceneSnapshot(values));
    setSceneSaveValidationReport(null);
    setOpen(true);
  }

  const liveSceneSaveValidationReport = useMemo(() => {
    if (!open) {
      return null;
    }
    const values = watchedSceneValues ?? {};
    return validateJobSceneDraftPayload(
      {
        id: editing?.id ?? -1,
        name: values.name ?? "",
        pageResourceId: values.pageResourceId ?? 0,
        executionMode: values.executionMode ?? "AUTO_AFTER_PROMPT",
        floatingButtonEnabled:
          values.floatingButtonEnabled ??
          editing?.floatingButtonEnabled ??
          (values.executionMode === "FLOATING_BUTTON"),
        floatingButtonLabel: values.floatingButtonLabel ?? editing?.floatingButtonLabel ?? DEFAULT_FLOATING_BUTTON_LABEL,
        floatingButtonX: values.floatingButtonX ?? editing?.floatingButtonX ?? DEFAULT_FLOATING_BUTTON_X,
        floatingButtonY: values.floatingButtonY ?? editing?.floatingButtonY ?? DEFAULT_FLOATING_BUTTON_Y,
        nodeCount: editing?.nodeCount ?? 0,
        manualDurationSec: values.manualDurationSec ?? 0,
        riskConfirmed: editing?.riskConfirmed ?? false
      },
      rows,
      {
        linkedRules: editing?.id ? linkedRulesByScene.get(editing.id) ?? [] : []
      }
    );
  }, [editing?.id, editing?.riskConfirmed, linkedRulesByScene, open, rows, watchedSceneValues]);

  const activeSceneSaveValidationReport = liveSceneSaveValidationReport ?? sceneSaveValidationReport;

  async function submitScene() {
    const values = await form.validateFields();
    const resource = resources.find((item) => item.id === values.pageResourceId);
    if (!resource) {
      msgApi.error("页面资源不存在");
      return;
    }
    const sceneId = editing?.id ?? Date.now() + Math.floor(Math.random() * 1000);
    const persistedNodeCount = rows.find((item) => item.id === sceneId)?.nodeCount ?? editing?.nodeCount ?? 0;
    const nextExecutionMode = buildExecutionMode(
      values.executionMode === "FLOATING_BUTTON" ? "BUTTON" : "AUTO",
      Boolean(values.previewBeforeExecute)
    );
    const result = await configCenterService.saveJobSceneDraft({
      id: sceneId,
      ...values,
      status: "DRAFT",
      executionMode: nextExecutionMode,
      previewBeforeExecute: Boolean(values.previewBeforeExecute),
      floatingButtonEnabled:
        values.floatingButtonEnabled === undefined
          ? nextExecutionMode === "FLOATING_BUTTON"
          : Boolean(values.floatingButtonEnabled),
      nodeCount: persistedNodeCount,
      currentVersion: editing?.currentVersion ?? 1,
      pageResourceName: resource.name,
      floatingButtonLabel: values.floatingButtonLabel?.trim() || DEFAULT_FLOATING_BUTTON_LABEL,
      floatingButtonX: typeof values.floatingButtonX === "number" ? values.floatingButtonX : DEFAULT_FLOATING_BUTTON_X,
      floatingButtonY: typeof values.floatingButtonY === "number" ? values.floatingButtonY : DEFAULT_FLOATING_BUTTON_Y,
      riskConfirmed: editing?.riskConfirmed ?? false
    });
    setSceneSaveValidationReport(result.report);
    if (!result.success) {
      msgApi.error(result.report.summary);
      return;
    }
    msgApi.success(
      result.report.warningCount > 0
        ? `场景已保存草稿，另有 ${result.report.warningCount} 个待处理项`
        : editing
          ? "场景已更新，并已进入待发布列表"
          : "场景已创建，并已进入待发布列表"
    );
    setPublishNotice({
      objectName: result.data?.name ?? values.name,
      warningCount: result.report.warningCount,
      resourceId: result.data?.id ?? sceneId
    });
    closeSceneModalDirectly();
    await loadData();
  }

  async function publishSceneNow(sceneId: number, sceneName: string, effectiveOrgIds: string[] = []): Promise<boolean> {
    const pendingRows = await configCenterService.listPendingItems();
    const pending = pendingRows.find((item) => item.resourceType === "JOB_SCENE" && item.resourceId === sceneId);
    if (!pending) {
      msgApi.warning("当前作业场景没有可生效版本，请先保存草稿。");
      return false;
    }
    const result = await configCenterService.publishPendingItem(pending.id, "person-business-manager", effectiveOrgIds);
    if (!result.success) {
      msgApi.error("生效未通过，请先处理阻断项后再试。");
      return false;
    }
    msgApi.success(`已生效：${sceneName}（${effectiveOrgIds.length > 0 ? effectiveOrgIds.map((orgId) => getOrgLabel(orgId)).join("、") : "全部机构"}）`);
    await loadData();
    return true;
  }

  async function restoreSceneNow(
    row: JobSceneDefinition,
    effectiveOrgIds: string[] = []
  ): Promise<boolean> {
    const draftResult = await configCenterService.saveJobSceneDraft(toSceneDraftPayload(row));
    if (!draftResult.success || !draftResult.data) {
      msgApi.error(draftResult.report.summary);
      return false;
    }
    return publishSceneNow(draftResult.data.id, draftResult.data.name, effectiveOrgIds);
  }

  async function publishNoticeNow() {
    if (!publishNotice) {
      return;
    }
    const success = await publishSceneNow(publishNotice.resourceId, publishNotice.objectName);
    if (success) {
      setPublishNotice(null);
    }
  }

  async function switchStatus(item: JobSceneDefinition) {
    const next: LifecycleState = item.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateJobSceneStatus(item.id, next);
    msgApi.success(`场景状态已切换为 ${next}`);
    await loadData();
  }

  async function confirmRisk(item: JobSceneDefinition) {
    await configCenterService.confirmJobSceneRisk(item.id);
    msgApi.success(`风险已确认: ${item.name}`);
    await loadData();
  }

  async function cloneSceneToViewerOrg(row: JobSceneDefinition) {
    const targetOrgId = options.viewerOrgId ?? "branch-east";
    const operatorId = options.viewerOperatorId ?? "person-zhao-yi";
    await configCenterService.cloneJobSceneToOrg(row.id, targetOrgId, operatorId);
    msgApi.success("已复制为我的版本");
    await loadData();
  }

  async function openPreview(scene: JobSceneDefinition) {
    setPreviewScene(scene);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewValidationIssues([]);
    try {
      const fields = await configCenterService.previewJobScene(scene.id);
      setPreviewRows(fields);
      setPreviewSelectedKeys(fields.filter((item) => !item.abnormal).map((item) => item.key));
      setPreviewValidationIssues(
        fields
          .filter((item) => item.abnormal)
          .map((item) =>
            createFieldIssue({
              section: "preview",
              field: item.key,
              label: item.fieldName,
              message: `预览发现异常来源：${item.source}`,
              level: "warning",
              action: "请先取消勾选异常字段，再执行写入。"
            })
          )
      );
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "预览确认加载失败");
      setPreviewRows([]);
      setPreviewSelectedKeys([]);
      setPreviewValidationIssues([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function executePreview() {
    if (!previewScene) {
      return;
    }
    setPreviewExecuting(true);
    try {
      const result = await configCenterService.executeJobScenePreview(previewScene.id, previewSelectedKeys);
      msgApi.success(`执行完成：${result.detail}`);
      setPreviewOpen(false);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "执行失败");
    } finally {
      setPreviewExecuting(false);
    }
  }

  async function triggerFloating(scene: JobSceneDefinition) {
    try {
      const execution = await workflowService.executeJobScene(scene.id, scene.name, "FLOATING_BUTTON");
      msgApi.success(`已创建新执行实例 #${execution.id}（悬浮按钮触发）`);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "悬浮触发失败");
    }
  }

  async function openBuilder(scene: JobSceneDefinition) {
    setBuilderScene(scene);
    setBuilderOpen(true);
    setSelectedNodeId(null);
    setInvalidNodeIds([]);
    setSelectedLibraryNodeType(nodeLibrary[0]?.nodeType ?? null);
    setNodeValidationIssues([]);
    try {
      await Promise.all([loadBuilderData(scene.id), loadBuilderPageFieldOptions(scene.pageResourceId)]);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "加载作业编排失败");
    }
  }

  function closeBuilderDirectly() {
    setBuilderOpen(false);
    setSelectedNodeId(null);
    setInvalidNodeIds([]);
    setPageFieldOptions([]);
    setNodeValidationIssues([]);
  }

  function closeBuilder() {
    if (selectedNode && nodeDetailForm.isFieldsTouched()) {
      Modal.confirm({
        title: "节点属性尚未保存",
        content: "关闭后将丢失节点属性改动，是否继续？",
        okText: "仍然关闭",
        cancelText: "继续编辑",
        onOk: closeBuilderDirectly
      });
      return;
    }
    closeBuilderDirectly();
  }

  async function addNodeFromLibrary(nodeType: JobNodeDefinition["nodeType"], dropPosition?: { x: number; y: number }) {
    if (!builderScene) {
      return;
    }

    const nextOrder = (nodeRows[nodeRows.length - 1]?.orderNo ?? 0) + 1;
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const maxX = flowNodes.length > 0 ? Math.max(...flowNodes.map((item) => item.position.x)) : 0;
    const autoPosition = { x: Math.max(80, maxX + 260), y: 120 + ((nextOrder - 1) % 3) * 120 };
    const position = dropPosition
      ? { x: Math.round(Math.max(40, dropPosition.x)), y: Math.round(Math.max(40, dropPosition.y)) }
      : autoPosition;
    const defaultListData = listDatas[0];
    const configJson = mergeFlowPosition(
      JSON.stringify(
        getDefaultNodeConfig(nodeType, {
          field: pageFieldOptions[0]?.value,
          listDataId: defaultListData?.id,
          matchColumn: defaultListData?.importColumns[0],
          inputSource: defaultListData?.importColumns[0],
          resultKeys: (defaultListData?.outputFields?.length ? defaultListData.outputFields : defaultListData?.importColumns ?? []).slice(0, 1),
          target: pageFieldOptions[0]?.value
        })
      ),
      position
    );

    const savedNode = await workflowService.upsertJobNode({
      id,
      sceneId: builderScene.id,
      nodeType,
      name: `${nodeTypeLabel[nodeType]}${nextOrder}`,
      orderNo: nextOrder,
      enabled: true,
      configJson
    });

    setNodeRows((items) => [...items, savedNode].sort((a, b) => a.orderNo - b.orderNo));
    setFlowNodes((items) => [
      ...items,
      {
        id: String(savedNode.id),
        type: "jobNode",
        data: {
          label: `${savedNode.orderNo}. ${savedNode.name}`,
          nodeType: savedNode.nodeType,
          enabled: savedNode.enabled
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: getFlowPosition(savedNode.configJson, position.x, position.y),
        style: getFlowNodeStyle(savedNode.enabled)
      }
    ]);
    setInvalidNodeIds((items) => items.filter((item) => item !== String(savedNode.id)));
    updateSceneNodeCount(builderScene.id, nodeRows.length + 1);
    msgApi.success(`${nodeTypeLabel[nodeType]}节点已添加`);
    setSelectedNodeId(String(savedNode.id));
  }

  function previewLibraryNode(nodeType: JobNodeDefinition["nodeType"]) {
    setSelectedLibraryNodeType(nodeType);
  }

  async function addNodeFromLibraryAtClientPosition(
    nodeType: JobNodeDefinition["nodeType"],
    clientPosition: { x: number; y: number }
  ) {
    const flowPosition = reactFlowInstance?.screenToFlowPosition(clientPosition) ?? clientPosition;
    await addNodeFromLibrary(nodeType, flowPosition);
  }

  function validateNodeDetail(values: Partial<NodeDetailForm>) {
    const nextIssues: FieldValidationIssue[] = [];
    if (values.nodeType === "page_get") {
      if (!values.field?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "field", label: "读取字段", message: "请选择读取字段" }));
      } else if (!pageFieldOptions.some((item) => item.value === values.field)) {
        nextIssues.push(createFieldIssue({ section: "node", field: "field", label: "读取字段", message: "所选字段已失效，请重新选择" }));
      }
    }
    if (values.nodeType === "api_call") {
      if (values.apiRefactorRequired) {
        nextIssues.push(
          createFieldIssue({
            section: "node",
            field: "apiInterfaceId",
            label: "接口调用",
            message: "接口调用节点已升级，请重新选择接口并补全入参与出参配置"
          })
        );
      }
      if (!values.apiInterfaceId) {
        nextIssues.push(createFieldIssue({ section: "node", field: "apiInterfaceId", label: "接口", message: "请选择接口" }));
      } else {
        const targetInterface = interfaces.find((item) => item.id === values.apiInterfaceId);
        if (!targetInterface) {
          nextIssues.push(createFieldIssue({ section: "node", field: "apiInterfaceId", label: "接口", message: "所选接口不存在" }));
        } else {
          const inputParams = parseApiCallInputParams(targetInterface.inputConfigJson);
          const outputOptions = parseApiCallOutputOptions(targetInterface.outputConfigJson);
          const outputPathSet = new Set(outputOptions.map((item) => item.path));
          const bindings = values.apiInputBindings ?? {};
          for (const param of inputParams) {
            const binding = bindings[param.name];
            if (param.required && (!binding || !binding.value?.trim())) {
              nextIssues.push(
                createFieldIssue({
                  section: "node",
                  field: `apiInputBindings.${param.name}.value`,
                  label: `入参 ${param.name}`,
                  message: "该入参为必填，请配置取值"
                })
              );
            }
            if (binding?.sourceType === "REFERENCE" && binding.value?.trim()) {
              if (!/^\{\{[a-zA-Z0-9_]+\}\}$/.test(binding.value.trim())) {
                nextIssues.push(
                  createFieldIssue({
                    section: "node",
                    field: `apiInputBindings.${param.name}.value`,
                    label: `入参 ${param.name}`,
                    message: "引用模式下请选择有效变量（格式：{{node_xxx}}）"
                  })
                );
              } else if (!nodeOutputReferenceOptions.some((item) => item.value === binding.value?.trim())) {
                nextIssues.push(
                  createFieldIssue({
                    section: "node",
                    field: `apiInputBindings.${param.name}.value`,
                    label: `入参 ${param.name}`,
                    message: "所选引用已失效，请重新选择"
                  })
                );
              }
            }
          }
          const outputPaths = (values.apiOutputPaths ?? []).filter((item) => item.trim());
          if (outputPaths.length === 0) {
            nextIssues.push(createFieldIssue({ section: "node", field: "apiOutputPaths", label: "接口出参", message: "请至少选择一个出参字段" }));
          } else if (outputPaths.some((item) => !outputPathSet.has(item))) {
            nextIssues.push(createFieldIssue({ section: "node", field: "apiOutputPaths", label: "接口出参", message: "存在失效出参，请重新选择" }));
          }
        }
      }
    }
    if (values.nodeType === "list_lookup") {
      const selectedListData = values.listDataId ? listDatas.find((item) => item.id === values.listDataId) : undefined;
      const availableOutputFields = selectedListData
        ? (selectedListData.outputFields.length > 0 ? selectedListData.outputFields : selectedListData.importColumns)
        : [];
      if (!values.listDataId) {
        nextIssues.push(createFieldIssue({ section: "node", field: "listDataId", label: "名单数据", message: "请选择名单数据" }));
      } else if (!listDatas.some((item) => item.id === values.listDataId)) {
        nextIssues.push(createFieldIssue({ section: "node", field: "listDataId", label: "名单数据", message: "所选名单不存在" }));
      }
      if (!values.matchColumn?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "matchColumn", label: "匹配字段", message: "请选择匹配字段" }));
      }
      if (!values.inputSource?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "inputSource", label: "输入来源", message: "请输入输入来源" }));
      } else if (values.inputSourceType === "REFERENCE" && !/^\{\{[a-zA-Z0-9_]+\}\}$/.test(values.inputSource.trim())) {
        nextIssues.push(
          createFieldIssue({
            section: "node",
            field: "inputSource",
            label: "输入来源",
            message: "引用模式下请选择有效变量（格式：{{node_xxx}}）"
          })
        );
      }
      const resultKeys = Array.from(
        new Set(
          (values.resultKeys ?? (values.resultKey ? [values.resultKey] : []))
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );
      if (resultKeys.length === 0) {
        nextIssues.push(createFieldIssue({ section: "node", field: "resultKeys", label: "输出字段", message: "请至少选择一个输出字段" }));
      } else if (availableOutputFields.length > 0 && resultKeys.some((item) => !availableOutputFields.includes(item))) {
        nextIssues.push(createFieldIssue({ section: "node", field: "resultKeys", label: "输出字段", message: "存在失效输出字段，请重新选择" }));
      }
    }
    if (values.nodeType === "js_script") {
      if (!values.scriptCode?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "scriptCode", label: "脚本代码", message: "请输入脚本代码" }));
      }
      const scriptInputs = values.scriptInputs ?? [];
      const inputNameSet = new Set<string>();
      scriptInputs.forEach((item, index) => {
        const inputName = item?.name?.trim() ?? "";
        if (!inputName) {
          nextIssues.push(
            createFieldIssue({
              section: "node",
              field: `scriptInputs.${index}.name`,
              label: "输入变量",
              message: "请输入输入变量名"
            })
          );
        } else if (inputNameSet.has(inputName)) {
          nextIssues.push(
            createFieldIssue({
              section: "node",
              field: `scriptInputs.${index}.name`,
              label: "输入变量",
              message: "输入变量名不能重复"
            })
          );
        } else {
          inputNameSet.add(inputName);
        }
        const sourceType = item?.sourceType === "REFERENCE" ? "REFERENCE" : "STRING";
        const value = item?.value?.trim() ?? "";
        if (sourceType === "REFERENCE" && value) {
          if (!/^\{\{[a-zA-Z0-9_]+\}\}$/.test(value)) {
            nextIssues.push(
              createFieldIssue({
                section: "node",
                field: `scriptInputs.${index}.value`,
                label: "输入来源",
                message: "引用模式下请选择有效变量（格式：{{node_xxx}}）"
              })
            );
          } else if (!nodeOutputReferenceOptions.some((option) => option.value === value)) {
            nextIssues.push(
              createFieldIssue({
                section: "node",
                field: `scriptInputs.${index}.value`,
                label: "输入来源",
                message: "所选引用已失效，请重新选择"
              })
            );
          }
        }
      });
      const scriptOutputKeys = Array.from(
        new Set(
          (values.scriptOutputKeys ?? [])
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );
      if (scriptOutputKeys.length === 0) {
        nextIssues.push(createFieldIssue({ section: "node", field: "scriptOutputKeys", label: "输出字段", message: "请至少配置一个输出字段" }));
      }
    }
    if (values.nodeType === "page_set") {
      if (!values.target?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "target", label: "写入目标字段", message: "请选择写入目标字段" }));
      } else if (!pageFieldOptions.some((item) => item.value === values.target)) {
        nextIssues.push(createFieldIssue({ section: "node", field: "target", label: "写入目标字段", message: "所选目标字段已失效，请重新选择" }));
      }
    }
    if (values.nodeType === "page_click") {
      if (!values.target?.trim()) {
        nextIssues.push(createFieldIssue({ section: "node", field: "target", label: "点击目标字段", message: "请选择点击目标字段" }));
      } else if (!pageFieldOptions.some((item) => item.value === values.target)) {
        nextIssues.push(createFieldIssue({ section: "node", field: "target", label: "点击目标字段", message: "所选目标字段已失效，请重新选择" }));
      }
    }
    if (values.nodeType === "send_hotkey") {
      const hotkeyKey = values.hotkeyKey?.trim() ?? "";
      if (!hotkeyKey) {
        nextIssues.push(createFieldIssue({ section: "node", field: "hotkeyKey", label: "主键", message: "请选择主键" }));
      }
    }
    if (values.nodeType === "page_set" && values.valueType === "REFERENCE" && values.value?.trim()) {
      if (!/^\{\{[a-zA-Z0-9_]+\}\}$/.test(values.value.trim())) {
        nextIssues.push(
          createFieldIssue({
            section: "node",
            field: "value",
            label: "写入值",
            message: "引用模式下请选择有效变量（格式：{{node_xxx}}）"
          })
        );
      } else if (!nodeOutputReferenceOptions.some((item) => item.value === values.value?.trim())) {
        nextIssues.push(
          createFieldIssue({
            section: "node",
            field: "value",
            label: "写入值",
            message: "所选引用已失效，请重新选择"
          })
        );
      }
    }
    return nextIssues;
  }

  async function saveSelectedNode(options?: { silent?: boolean; persist?: boolean }) {
    if (!selectedNode || !builderScene) {
      return true;
    }

    let values: Partial<NodeDetailForm>;
    if (options?.silent) {
      values = nodeDetailForm.getFieldsValue(true) as Partial<NodeDetailForm>;
    } else {
      try {
        values = await nodeDetailForm.validateFields();
      } catch {
        return false;
      }
    }
    const normalizedValues: NodeDetailForm = {
      ...values,
      name: values.name?.trim() || selectedNode.name,
      nodeType: values.nodeType ?? selectedNode.nodeType,
      enabled: typeof values.enabled === "boolean" ? values.enabled : selectedNode.enabled
    };
    const flowNode = flowNodes.find((item) => item.id === String(selectedNode.id));
    const fallbackPosition = getFlowPosition(selectedNode.configJson, 80, 120);
    const configJson = mergeFlowPosition(
      JSON.stringify(buildNodeConfigFromForm(normalizedValues)),
      flowNode?.position ?? fallbackPosition
    );
    const nextIssues = validateNodeDetail(normalizedValues);
    setNodeValidationIssues(nextIssues);
    const hasIssues = nextIssues.length > 0;
    const nextNode: JobNodeDefinition = {
      ...selectedNode,
      name: normalizedValues.name,
      nodeType: normalizedValues.nodeType,
      enabled: normalizedValues.enabled,
      configJson
    };
    const currentNodeId = String(nextNode.id);
    if (hasIssues) {
      setInvalidNodeIds((items) => (items.includes(currentNodeId) ? items : [...items, currentNodeId]));
    } else {
      setInvalidNodeIds((items) => items.filter((item) => item !== currentNodeId));
    }

    setNodeRows((items) => items.map((item) => (item.id === nextNode.id ? nextNode : item)));
    setFlowNodes((items) =>
      items.map((item) =>
        item.id === String(nextNode.id)
          ? {
              ...item,
              data: {
                ...item.data,
                label: `${nextNode.orderNo}. ${nextNode.name}`,
                nodeType: nextNode.nodeType,
                enabled: nextNode.enabled
              },
              style: getFlowNodeStyle(nextNode.enabled, hasIssues)
            }
          : item
      )
    );

    if (hasIssues) {
      if (!options?.silent) {
        msgApi.error("节点属性还有待处理问题，请先修复");
      }
      return options?.persist === false;
    }

    if (options?.persist === false) {
      setNodeValidationIssues([]);
      return true;
    }

    await workflowService.upsertJobNode(nextNode);

    if (!options?.silent) {
      msgApi.success("节点属性已保存");
    }
    setNodeValidationIssues([]);
    await loadBuilderData(builderScene.id);
    setSelectedNodeId(String(nextNode.id));
    return true;
  }

  const liveNodeValidationIssues = useMemo(() => {
    if (!selectedNode) {
      return [] as FieldValidationIssue[];
    }
    return validateNodeDetail(watchedNodeValues ?? {});
  }, [interfaces, listDatas, nodeOutputReferenceOptions, selectedNode, watchedNodeValues]);

  async function removeFlowNode(nodeId: string, options?: { silent?: boolean }) {
    if (!builderScene) {
      return;
    }
    const numericNodeId = Number(nodeId);
    if (!Number.isFinite(numericNodeId)) {
      return;
    }

    await workflowService.deleteJobNode(numericNodeId);
    setNodeRows((items) => {
      const next = items.filter((item) => String(item.id) !== nodeId);
      updateSceneNodeCount(builderScene.id, next.length);
      return next;
    });
    setFlowNodes((items) => items.filter((item) => item.id !== nodeId));
    setFlowEdges((items) => items.filter((item) => item.source !== nodeId && item.target !== nodeId));
    setInvalidNodeIds((items) => items.filter((item) => item !== nodeId));
    setSelectedNodeId((current) => (current === nodeId ? null : current));
    if (!options?.silent) {
      msgApi.success("节点已删除");
    }
  }

  async function removeSelectedNode() {
    if (!selectedNode) {
      return;
    }
    await removeFlowNode(String(selectedNode.id));
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setFlowEdges((oldEdges) =>
        addEdge(
          {
            ...connection,
            type: "bezier",
            markerEnd: { type: MarkerType.ArrowClosed }
          },
          oldEdges
        )
      );
    },
    [setFlowEdges]
  );

  const onFlowNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      onFlowNodesChangeBase(changes);

      const removedIds = changes
        .filter((item) => item.type === "remove")
        .map((item) => item.id);
      if (removedIds.length === 0 || !builderScene) {
        return;
      }

      const removedSet = new Set(removedIds);
      setNodeRows((items) => {
        const next = items.filter((item) => !removedSet.has(String(item.id)));
        updateSceneNodeCount(builderScene.id, next.length);
        return next;
      });
      setInvalidNodeIds((items) => items.filter((item) => !removedSet.has(item)));
      setSelectedNodeId((current) => (current && removedSet.has(current) ? null : current));

      void Promise.all(
        removedIds.map(async (rawId) => {
          const nodeId = Number(rawId);
          if (!Number.isFinite(nodeId)) {
            return;
          }
          await workflowService.deleteJobNode(nodeId);
        })
      );
    },
    [builderScene, onFlowNodesChangeBase]
  );

  function autoLayoutNodes() {
    if (flowNodes.length === 0) {
      return;
    }

    const orderedIds = deriveOrderedNodeIds(flowNodes, flowEdges);
    const columnCount = Math.max(2, Math.ceil(Math.sqrt(orderedIds.length)));
    const startX = 40;
    const startY = 50;
    const gapX = 250;
    const gapY = 140;

    const positionMap = new Map<string, { x: number; y: number }>();
    orderedIds.forEach((id, index) => {
      const col = index % columnCount;
      const row = Math.floor(index / columnCount);
      positionMap.set(id, { x: startX + col * gapX, y: startY + row * gapY });
    });

    setFlowNodes((items) =>
      items.map((item) => ({
        ...item,
        position: positionMap.get(item.id) ?? item.position
      }))
    );

    window.setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.1, duration: 240, minZoom: 0.15, maxZoom: 1.2 });
    }, 60);
  }
  async function saveFlowLayout() {
    if (!builderScene) {
      return;
    }

    setSavingFlow(true);
    try {
      const nodeSaved = await saveSelectedNode({ silent: true });
      if (!nodeSaved) {
        msgApi.error("当前节点属性未通过校验，请先修复再保存编排");
        return;
      }
      const nodeMap = new Map(nodeRows.map((item) => [String(item.id), item]));
      const orderedIds = deriveOrderedNodeIds(flowNodes, flowEdges);
      const orderedIndexMap = new Map(orderedIds.map((id, index) => [id, index]));
      const nextNodeIdsBySource = new Map<string, string[]>();

      for (const edge of flowEdges) {
        if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
          continue;
        }
        const existing = nextNodeIdsBySource.get(edge.source) ?? [];
        if (!existing.includes(edge.target)) {
          existing.push(edge.target);
        }
        nextNodeIdsBySource.set(edge.source, existing);
      }
      for (const [source, targets] of nextNodeIdsBySource.entries()) {
        targets.sort((left, right) => (orderedIndexMap.get(left) ?? Number.MAX_SAFE_INTEGER) - (orderedIndexMap.get(right) ?? Number.MAX_SAFE_INTEGER));
        nextNodeIdsBySource.set(source, targets);
      }

      for (let i = 0; i < orderedIds.length; i += 1) {
        const id = orderedIds[i];
        const rawNode = nodeMap.get(id);
        const flowNode = flowNodes.find((item) => item.id === id);
        if (!rawNode || !flowNode) {
          continue;
        }
        await workflowService.upsertJobNode({
          ...rawNode,
          orderNo: i + 1,
          configJson: mergeFlowPosition(
            mergeFlowNextNodeIds(rawNode.configJson, nextNodeIdsBySource.get(id) ?? []),
            flowNode.position
          )
        });
      }

      msgApi.success("编排已保存");
      await loadBuilderData(builderScene.id);
    } catch (error) {
      msgApi.error(error instanceof Error ? error.message : "编排保存失败");
    } finally {
      setSavingFlow(false);
    }
  }

  async function selectFlowNode(nextNodeId: string | null) {
    if (nextNodeId === selectedNodeId || switchingNodeRef.current) {
      return;
    }
    switchingNodeRef.current = true;
    try {
      if (selectedNode && nodeDetailForm.isFieldsTouched()) {
        await saveSelectedNode({ silent: true, persist: false });
      }
      setSelectedNodeId(nextNodeId);
    } finally {
      switchingNodeRef.current = false;
    }
  }

  return {
    drawerWidth, loading, statusFilter, setStatusFilter, filteredRows, openCreate, openEdit, switchStatus,
    openBuilder, openPreview, triggerFloating, confirmRisk, rows, linkedRulesByScene, open, closeSceneModal,
    submitScene, form, resources, executionLabel, editing, builderOpen, closeBuilder, savingFlow, saveFlowLayout,
    autoLayoutNodes, builderScene, nodeRows, selectedNodeId, setSelectedNodeId, selectFlowNode, flowNodes, flowEdges,
    onFlowNodesChange, onFlowEdgesChange, onConnect, setReactFlowInstance, nodeLibrary, nodeTypeLabel,
    addNodeFromLibrary, addNodeFromLibraryAtClientPosition, selectedLibraryNodeType, previewLibraryNode, selectedNode, selectedNodeListData, pageFieldOptions, interfaces, listDatas, nodeDetailForm, watchedNodeType, removeSelectedNode, removeFlowNode,
    selectedApiInputParams,
    selectedApiOutputOptions,
    nodeOutputReferenceOptions,
    previewOpen, setPreviewOpen, previewScene, previewRows, previewSelectedKeys, setPreviewSelectedKeys,
    previewLoading, previewExecuting, executePreview, holder, statusColor, autoOpenCreateRef,
    sceneSaveValidationReport: activeSceneSaveValidationReport,
    nodeValidationIssues: liveNodeValidationIssues.length > 0 ? liveNodeValidationIssues : nodeValidationIssues,
    previewValidationIssues,
    publishNotice,
    dismissPublishNotice: () => setPublishNotice(null),
    publishNoticeNow,
    publishSceneNow,
    restoreSceneNow,
    cloneSceneToViewerOrg
  };
}
