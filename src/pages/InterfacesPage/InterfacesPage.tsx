import {
  AutoComplete,
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography
} from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CopyOutlined, EditOutlined, MoreOutlined, PlayCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { EffectiveConfirmModal } from "../../components/EffectiveConfirmModal";
import { PublishContinuationAlert } from "../../components/PublishContinuationAlert";
import { ValidationReportPanel } from "../../components/ValidationReportPanel";
import { EffectiveScopeMode, getEffectiveActionMeta, getEffectivePermissionBlockedMessage } from "../../effectiveFlow";
import { lifecycleLabelMap } from "../../enumLabels";
import { getOrgLabel, orgOptions } from "../../orgOptions";
import { useMockSession } from "../../session/mockSession";
import { useInterfacesPageModel } from "./useInterfacesPageModel";
import {
  InputTabKey,
  statusColor,
  tabLabels,
  valueTypeOptions,
  type StatusFilter
} from "./interfacesPageShared";
import type { ApiOutputParam, ApiValueType, InterfaceDefinition, LifecycleState, PublishValidationReport } from "../../types";

export function getInterfaceEditorLayoutConfig() {
  return {
    hasStepWizard: false,
    leftSections: ["接口基础信息"],
    rightSections: ["参数示例"]
  };
}

type EffectiveTarget = {
  id: number;
  name: string;
  status: LifecycleState;
  source: "row" | "notice";
};

type OutputEditorRow = ApiOutputParam & {
  suggestedPath: string;
};

const PageHeader = styled.div`
  margin-bottom: var(--space-16);
`;

const ToolbarSection = styled.section`
  margin-bottom: var(--space-12);
`;

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
`;

const StepHint = styled(Alert)`
  margin-bottom: var(--space-12);
`;

const EditorLayout = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.48fr);

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
`;

const StatStrip = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatTile = styled.div<{ $accent: string }>`
  border: 1px solid var(--cc-border-subtle, rgba(31, 75, 122, 0.18));
  border-radius: 8px;
  padding: 8px 10px;
  background: ${({ $accent }) => $accent};

  .ant-typography.ant-typography-secondary {
    color: var(--color-text-secondary) !important;
    font-weight: 500;
  }
`;

const WorkbenchCard = styled(Card)`
  height: 100%;

  .ant-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

const OutputJsonPreview = styled.pre`
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, #f6f8fb 0%, #ffffff 100%);
  color: var(--color-text-primary);
  max-height: 420px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.55;
`;

function collectPathsFromSample(value: unknown, basePath = "$"): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [basePath];
    }
    const first = value[0];
    if (first !== null && typeof first === "object") {
      return [basePath, ...collectPathsFromSample(first, `${basePath}[0]`)];
    }
    return [basePath];
  }

  if (typeof value !== "object") {
    return [basePath];
  }

  const paths = [basePath];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    paths.push(...collectPathsFromSample(child, `${basePath}.${key}`));
  }
  return paths;
}

function collectOutputConfigPaths(rows: ApiOutputParam[]): string[] {
  const paths: string[] = [];
  const walk = (items: ApiOutputParam[]) => {
    for (const row of items) {
      if (row.path) {
        paths.push(row.path);
      }
      if (row.children && row.children.length > 0) {
        walk(row.children);
      }
    }
  };
  walk(rows);
  return paths;
}

export function InterfacesPage() {
  const [searchParams] = useSearchParams();
  const ownerOrgFilter = searchParams.get("ownerOrgId");
  const quickAction = searchParams.get("action");
  const useCase = searchParams.get("useCase");
  const autoOpenCreateRef = useRef(false);
  const [keyword, setKeyword] = useState("");
  const [outputEditorMode, setOutputEditorMode] = useState<"TABLE" | "JSON">("TABLE");
  const [outputPathAdvancedMode, setOutputPathAdvancedMode] = useState(false);

  const {
    holder,
    msgApi,
    statusFilter,
    setStatusFilter,
    openCreate,
    loading,
    filteredRows,
    openEdit,
    openClone,
    openDebug,
    switchStatus,
    editing,
    drawerWidth,
    drawerOpen,
    closeDrawer,
    submit,
    form,
    inputTab,
    setInputTab,
    parseBodyTemplate,
    addInputRow,
    inputColumns,
    inputConfig,
    addOutputRow,
    outputSampleJson,
    setOutputSampleJson,
    parseOutputSample,
    outputConfig,
    updateOutputRow,
    removeOutputRow,
    debugTarget,
    debugOpen,
    setDebugOpen,
    runDebug,
    debugPayload,
    setDebugPayload,
    debugResult,
    saveValidationReport,
    publishNotice,
    dismissPublishNotice,
    publishInterfaceNow,
    restoreInterfaceNow
  } = useInterfacesPageModel();
  const { hasResource } = useMockSession();
  const [effectiveTarget, setEffectiveTarget] = useState<EffectiveTarget | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [effectiveSubmitting, setEffectiveSubmitting] = useState(false);
  const [effectiveValidationReport, setEffectiveValidationReport] = useState<PublishValidationReport | null>(null);
  const [effectiveBlockedMessage, setEffectiveBlockedMessage] = useState<string | null>(null);
  const [effectiveScopeMode, setEffectiveScopeMode] = useState<EffectiveScopeMode>("ALL_ORGS");
  const [effectiveScopeOrgIds, setEffectiveScopeOrgIds] = useState<string[]>([]);
  const [effectiveStartAt, setEffectiveStartAt] = useState("");
  const [effectiveEndAt, setEffectiveEndAt] = useState("");
  const effectiveMeta = effectiveTarget ? getEffectiveActionMeta(effectiveTarget.status) : null;
  const effectiveScopeOptions = useMemo(
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

  const visibleRows = useMemo(() => {
    if (!ownerOrgFilter) {
      return filteredRows;
    }
    return filteredRows.filter((item) => item.ownerOrgId === ownerOrgFilter);
  }, [filteredRows, ownerOrgFilter]);

  const keywordValue = keyword.trim().toLowerCase();
  const searchedRows = useMemo(() => {
    if (!keywordValue) {
      return visibleRows;
    }
    return visibleRows.filter((item) => {
      return (
        item.name.toLowerCase().includes(keywordValue) ||
        item.description.toLowerCase().includes(keywordValue) ||
        item.prodPath.toLowerCase().includes(keywordValue)
      );
    });
  }, [keywordValue, visibleRows]);

  const pathAssistOptions = useMemo(() => {
    const set = new Set<string>();
    for (const path of collectOutputConfigPaths(outputConfig)) {
      if (path.trim()) {
        set.add(path.trim());
      }
    }

    const raw = outputSampleJson.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        for (const path of collectPathsFromSample(parsed, "$")) {
          if (path.trim()) {
            set.add(path.trim());
          }
        }
      } catch {
        // Ignore parse errors here; validation panel already reports them.
      }
    }

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value }));
  }, [outputConfig, outputSampleJson]);

  const requestParamTotal = useMemo(
    () => inputConfig.headers.length + inputConfig.query.length + inputConfig.path.length + inputConfig.body.length,
    [inputConfig]
  );

  const buildSuggestedPath = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "$";
    }
    return `$.${trimmed}`;
  };

  const outputEditorRows = useMemo<OutputEditorRow[]>(() => {
    return outputConfig.map((row) => ({
      ...row,
      suggestedPath: buildSuggestedPath(row.name ?? "")
    }));
  }, [outputConfig]);

  useEffect(() => {
    if (quickAction !== "create" || autoOpenCreateRef.current) {
      return;
    }
    autoOpenCreateRef.current = true;
    openCreate({
      ownerOrgId: ownerOrgFilter ?? "branch-east",
      name: "",
      description: useCase ?? ""
    });
  }, [openCreate, ownerOrgFilter, quickAction, useCase]);

  useEffect(() => {
    if (drawerOpen && editing) {
      // 编辑已有接口：确保表单值正确填入，解决 DOM 重新挂载后值丢失的问题
      form.setFieldsValue({
        name: editing.name,
        description: editing.description,
        method: editing.method,
        prodPath: editing.prodPath,
        bodyTemplateJson: editing.bodyTemplateJson
      });
    }
    if (drawerOpen) {
      setOutputEditorMode("TABLE");
      setOutputPathAdvancedMode(false);
    }
  }, [drawerOpen, editing, form]);

  function useTemplateCreate() {
    openCreate({
      ownerOrgId: ownerOrgFilter ?? "branch-east",
      name: "客户信息查询模板",
      description: "用于表单辅助录入的通用查询接口模板。",
      method: "POST",
      prodPath: "/customer/profile/query"
    });
  }

  function buildRowMenuItems(row: InterfaceDefinition): MenuProps["items"] {
    return [
      {
        key: "edit",
        label: "编辑",
        icon: <EditOutlined />,
        onClick: () => openEdit(row)
      },
      {
        key: "clone",
        label: "复制创建",
        icon: <CopyOutlined />,
        onClick: () => openClone(row)
      },
      {
        key: "debug",
        label: "在线测试",
        icon: <PlayCircleOutlined />,
        onClick: () => openDebug(row)
      }
    ];
  }

  function resetListFilters() {
    setKeyword("");
    setStatusFilter("ALL");
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
        const success = await publishInterfaceNow(
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
          const restored = await restoreInterfaceNow(
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

  function renderOutputEditorTable(rows: OutputEditorRow[]) {
    const patchRow = (row: OutputEditorRow, patch: Partial<ApiOutputParam>) => {
      updateOutputRow(row.id, patch);
    };

    const removeRowById = (row: OutputEditorRow) => removeOutputRow(row.id);

    return (
      <Table<OutputEditorRow>
        rowKey="id"
        pagination={false}
        size="small"
        dataSource={rows}
        scroll={{ x: 980 }}
        columns={[
          {
            title: "字段名",
            width: 160,
            render: (_, row) => {
              const isManualPath = row.pathMode === "MANUAL";
              return (
                <Input
                  value={row.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    patchRow(row, {
                      name: nextName,
                      path: isManualPath ? row.path : buildSuggestedPath(nextName),
                      pathMode: isManualPath ? "MANUAL" : "AUTO"
                    });
                  }}
                />
              );
            }
          },
          {
            title: "路径",
            width: outputPathAdvancedMode ? 320 : 280,
            render: (_, row) => {
              const isManualPath = row.pathMode === "MANUAL";
              const displayPath = isManualPath ? row.path : row.suggestedPath;
              if (!outputPathAdvancedMode) {
                return (
                  <Space size={6} wrap>
                    <Typography.Text code>{displayPath || "-"}</Typography.Text>
                    <Tag color={isManualPath ? "gold" : "blue"}>{isManualPath ? "手动" : "自动"}</Tag>
                  </Space>
                );
              }
              return (
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <AutoComplete
                    options={pathAssistOptions}
                    value={displayPath}
                    onChange={(value) => patchRow(row, { path: value, pathMode: "MANUAL" })}
                    placeholder="如 $.score"
                  />
                  <Space size={6} wrap>
                    <Tag color={isManualPath ? "gold" : "blue"}>{isManualPath ? "手动路径" : "自动路径"}</Tag>
                    {isManualPath ? (
                      <Button
                        size="small"
                        onClick={() => patchRow(row, { path: row.suggestedPath, pathMode: "AUTO" })}
                      >
                        恢复自动
                      </Button>
                    ) : null}
                  </Space>
                </Space>
              );
            }
          },
          {
            title: "描述",
            width: 160,
            render: (_, row) => (
              <Input value={row.description} onChange={(event) => patchRow(row, { description: event.target.value })} />
            )
          },
          {
            title: "类型",
            width: 120,
            render: (_, row) => (
              <Select
                value={row.valueType}
                options={valueTypeOptions}
                onChange={(value) =>
                  patchRow(row, {
                    valueType: value as ApiValueType,
                    children: value === "OBJECT" || value === "ARRAY" ? row.children ?? [] : []
                  })
                }
              />
            )
          },
          {
            title: "操作",
            width: 88,
            render: (_, row) => (
              <Space size={6}>
                <Button danger size="small" onClick={() => removeRowById(row)}>
                  删除
                </Button>
              </Space>
            )
          }
        ]}
      />
    );
  }

  return (
    <div>
      {holder}
      <PageHeader>
        <Typography.Title level={4}>API注册</Typography.Title>
      </PageHeader>
      {publishNotice ? (
        <PublishContinuationAlert
          objectLabel="API"
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
      {ownerOrgFilter ? (
        <Alert
          showIcon
          type="info"
          style={{ marginBottom: 12 }}
          message={`已按机构过滤：${getOrgLabel(ownerOrgFilter)}`}
          description="该过滤来自菜单管理详情中的“新建关联 API”快捷动作。"
        />
      ) : null}
      <ToolbarSection>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} lg={10}>
            <Input.Search
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索 API 名称、用途或生产路径"
            />
          </Col>
          <Col xs={24} lg={14}>
            <ActionBar>
              <Segmented
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                options={[
                  { label: "全部", value: "ALL" },
                  { label: "草稿", value: "DRAFT" },
                  { label: "生效", value: "ACTIVE" },
                  { label: "停用", value: "DISABLED" },
                  { label: "失效", value: "EXPIRED" }
                ]}
              />
              <Button onClick={resetListFilters}>重置筛选</Button>
              <Button onClick={useTemplateCreate}>从模板创建</Button>
              <Button type="primary" onClick={() => openCreate()}>
                新建 API注册
              </Button>
            </ActionBar>
          </Col>
        </Row>
      </ToolbarSection>

      <Card
        extra={
          <Typography.Text type="secondary">当前展示 {searchedRows.length} 条记录</Typography.Text>
        }
      >
        <Table<InterfaceDefinition>
          rowKey="id"
          loading={loading}
          dataSource={searchedRows}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
          columns={[
            { title: "API名称", dataIndex: "name", width: 180 },
            { title: "接口用途", dataIndex: "description", width: 220 },
            {
              title: "方法与路径",
              width: 280,
              render: (_, row) => (
                <Space>
                  <Tag color="cyan">{row.method}</Tag>
                  <Typography.Text>{row.prodPath || "-"}</Typography.Text>
                </Space>
              )
            },
            {
              title: "引用关系",
              width: 240,
              render: () => (
                <Space size={[4, 4]} wrap>
                  <Tag>页面</Tag>
                  <Tag>规则(2)</Tag>
                  <Tag>作业(1)</Tag>
                </Space>
              )
            },
            {
              title: "状态",
              width: 100,
              render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag>
            },
            {
              title: "操作",
              width: 220,
              render: (_, row) => {
                const actionMeta = getEffectiveActionMeta(row.status);
                const actionBlocked = getEffectivePermissionBlockedMessage(actionMeta.type, hasResource);
                return (
                  <Space>
                    <Button size="small" onClick={() => openEdit(row)}>
                      编辑
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

      <Drawer
        title={editing ? `编辑 API注册：${editing.name}` : "新建 API注册"}
        placement="right"
        width={drawerWidth}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        extra={
          <Button type="primary" onClick={() => void submit()}>
            保存接口
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <EditorLayout>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <ValidationReportPanel
                report={saveValidationReport}
                sections={["purpose", "basic"]}
                title="基础信息还有待处理问题"
              />
              <Card title="接口基础信息" size="small">
                <StepHint
                  showIcon
                  type="info"
                  message="用途与生产路径在同一区域维护，便于一次性提交。"
                />
                <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
                  <Input maxLength={128} />
                </Form.Item>
                <Form.Item name="description" label="用途说明" rules={[{ required: true, message: "请输入用途说明" }]}>
                  <Input.TextArea rows={3} maxLength={300} />
                </Form.Item>
                <Form.Item name="method" label="调用方式" rules={[{ required: true, message: "请选择方法" }]}>
                  <Select options={["GET", "POST"].map((v) => ({ label: v, value: v }))} />
                </Form.Item>
                <Form.Item name="prodPath" label="生产环境路径" rules={[{ required: true, message: "请输入生产路径" }]}>
                  <Input placeholder="如 /risk/score/query" />
                </Form.Item>
                <Space>
                  <Button onClick={useTemplateCreate}>从常用模板创建</Button>
                </Space>
              </Card>
            </Space>

            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Card title="参数示例" size="small">
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <WorkbenchCard
                    title={
                      <Space size={8} wrap>
                        <Typography.Text strong>请求参数示例</Typography.Text>
                        <Tag color="blue">请求参数 {requestParamTotal}</Tag>
                      </Space>
                    }
                    size="small"
                  >
                    <StatStrip>
                      <StatTile $accent="linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)">
                        <Typography.Text type="secondary">请求参数总数</Typography.Text>
                        <Typography.Title level={5} style={{ margin: 0 }}>{requestParamTotal}</Typography.Title>
                      </StatTile>
                      <StatTile $accent="linear-gradient(180deg, #f2f6f3 0%, #ffffff 100%)">
                        <Typography.Text type="secondary">Body 字段数</Typography.Text>
                        <Typography.Title level={5} style={{ margin: 0 }}>{inputConfig.body.length}</Typography.Title>
                      </StatTile>
                      <StatTile $accent="linear-gradient(180deg, #f9f5ee 0%, #ffffff 100%)">
                        <Typography.Text type="secondary">返回字段数</Typography.Text>
                        <Typography.Title level={5} style={{ margin: 0 }}>{outputConfig.length}</Typography.Title>
                      </StatTile>
                    </StatStrip>
                    <Tabs
                      activeKey={inputTab}
                      onChange={(key) => setInputTab(key as InputTabKey)}
                      items={(Object.keys(tabLabels) as InputTabKey[]).map((tab) => ({
                        key: tab,
                        label: `${tabLabels[tab]} (${inputConfig[tab].length})`,
                        children: (
                          <div>
                            {tab === "body" ? (
                              <>
                                <Form.Item name="bodyTemplateJson" label="Body JSON 模板">
                                  <Input.TextArea rows={6} placeholder="支持 JSON 解析为 Body 参数" />
                                </Form.Item>
                                <Space style={{ marginBottom: 12 }}>
                                  <Button type="primary" onClick={parseBodyTemplate}>解析并重建结构</Button>
                                  <Typography.Text type="secondary">当前 Body 参数数：{inputConfig.body.length}</Typography.Text>
                                </Space>
                              </>
                            ) : (
                              <Button style={{ marginBottom: 12 }} onClick={() => addInputRow(tab)}>
                                新增{tabLabels[tab]}参数
                              </Button>
                            )}

                            <Table size="small" rowKey="id" pagination={false} columns={inputColumns(tab)} dataSource={inputConfig[tab]} />
                          </div>
                        )
                      }))}
                    />
                  </WorkbenchCard>

                  <WorkbenchCard
                    title={
                      <Space size={8} wrap>
                        <Typography.Text strong>返回参数示例</Typography.Text>
                        <Tag color="cyan">根字段 {outputConfig.length}</Tag>
                      </Space>
                    }
                    size="small"
                    extra={
                      <Space size={8}>
                        <Segmented
                          value={outputEditorMode}
                          onChange={(value) => setOutputEditorMode(value as "TABLE" | "JSON")}
                          options={[
                            { label: "结构编辑", value: "TABLE" },
                            { label: "JSON预览", value: "JSON" }
                          ]}
                        />
                        <Button onClick={addOutputRow}>新增出参</Button>
                      </Space>
                    }
                  >
                    <Space style={{ marginTop: 8 }} wrap>
                      <Switch checked={outputPathAdvancedMode} onChange={setOutputPathAdvancedMode} />
                      <Typography.Text type="secondary">高级路径编辑</Typography.Text>
                    </Space>
                    <Input.TextArea
                      rows={5}
                      value={outputSampleJson}
                      onChange={(event) => setOutputSampleJson(event.target.value)}
                      placeholder="粘贴返回 JSON 示例"
                    />
                    <Space style={{ marginTop: 8, marginBottom: 12 }}>
                      <Button onClick={parseOutputSample}>解析返回 JSON</Button>
                      <Typography.Text type="secondary">路径建议数：{pathAssistOptions.length}</Typography.Text>
                    </Space>

                    {outputEditorMode === "TABLE" ? (
                      renderOutputEditorTable(outputEditorRows)
                    ) : (
                      <OutputJsonPreview>{JSON.stringify(outputConfig, null, 2)}</OutputJsonPreview>
                    )}
                  </WorkbenchCard>
                </Space>
              </Card>
            </Space>
          </EditorLayout>
        </Form>
      </Drawer>

      <Modal
        title={debugTarget ? `API在线测试：${debugTarget.name}` : "API在线测试"}
        open={debugOpen}
        width={980}
        onCancel={() => setDebugOpen(false)}
        onOk={runDebug}
        okText="执行测试"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Card size="small" title="请求路径">
            <Space>
              <Typography.Text type="secondary">
                请求路径：
                {debugTarget?.prodPath ?? "-"}
              </Typography.Text>
            </Space>
          </Card>
          <Card size="small" title="请求入参(JSON)">
            <Input.TextArea rows={8} value={debugPayload} onChange={(event) => setDebugPayload(event.target.value)} />
          </Card>
          {debugResult ? (
            <Row gutter={12}>
              <Col span={12}>
                <Card size="small" title="请求预览">
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                    耗时：{debugResult.latencyMs} ms
                  </Typography.Paragraph>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify({ path: debugResult.requestPath, body: debugResult.requestBody }, null, 2)}
                  </pre>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="响应预览">
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(debugResult.responseBody, null, 2)}</pre>
                </Card>
              </Col>
            </Row>
          ) : (
            <Typography.Text type="secondary">点击“执行测试”后会展示请求和响应结果。</Typography.Text>
          )}
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

