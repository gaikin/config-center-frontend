import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ContextVariablesPage } from "../ContextVariablesPage/ContextVariablesPage";
import { PreprocessorsPage } from "../PreprocessorsPage/PreprocessorsPage";
import { SdkVersionCenterPage } from "../SdkVersionCenterPage/SdkVersionCenterPage";
import { useMockSession } from "../../session/mockSession";
import { lifecycleLabelMap } from "../../enumLabels";
import { configCenterService } from "../../services/configCenterService";
import type { GeneralConfigItem, LifecycleState } from "../../types";

type GeneralConfigForm = Omit<GeneralConfigItem, "id" | "updatedAt">;

const statusColor: Record<LifecycleState, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  DISABLED: "orange",
  EXPIRED: "red"
};

const simplifiedStatusOptions = [
  { label: lifecycleLabelMap.ACTIVE, value: "ACTIVE" as const },
  { label: lifecycleLabelMap.DISABLED, value: "DISABLED" as const }
];

function normalizeSimplifiedStatus(status: LifecycleState): LifecycleState {
  return status === "ACTIVE" ? "ACTIVE" : "DISABLED";
}

function GeneralConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GeneralConfigItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GeneralConfigItem | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [form] = Form.useForm<GeneralConfigForm>();
  const [msgApi, holder] = message.useMessage();

  const groupOptions = useMemo(() => {
    const groups = Array.from(new Set(rows.map((item) => item.groupKey.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return [{ label: "全部分组", value: "ALL" }, ...groups.map((groupKey) => ({ label: groupKey, value: groupKey }))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (groupFilter === "ALL") {
      return rows;
    }
    return rows.filter((item) => item.groupKey === groupFilter);
  }, [groupFilter, rows]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await configCenterService.listGeneralConfigItems();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    form.setFieldsValue({
      groupKey: groupFilter === "ALL" ? "" : groupFilter,
      itemKey: "",
      itemValue: "",
      description: "",
      status: "ACTIVE"
    });
    setOpen(true);
  }

  function openEdit(row: GeneralConfigItem) {
    setEditing(row);
    form.setFieldsValue({
      groupKey: row.groupKey,
      itemKey: row.itemKey,
      itemValue: row.itemValue,
      description: row.description ?? "",
      status: normalizeSimplifiedStatus(row.status)
    });
    setOpen(true);
  }

  async function submit() {
    const values = await form.validateFields();
    await configCenterService.upsertGeneralConfigItem(
      editing
        ? {
            ...values,
            status: normalizeSimplifiedStatus(values.status),
            orderNo: editing.orderNo,
            id: editing.id
          }
        : {
            ...values,
            status: normalizeSimplifiedStatus(values.status),
            orderNo: 0
          }
    );
    msgApi.success(editing ? "通用配置已更新" : "通用配置已创建");
    setOpen(false);
    await loadData();
  }

  async function switchStatus(item: GeneralConfigItem) {
    const next: LifecycleState = item.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateGeneralConfigItemStatus(item.id, next);
    msgApi.success(`状态已切换为 ${next}`);
    await loadData();
  }

  function closeModal() {
    if (!form.isFieldsTouched(true)) {
      setOpen(false);
      return;
    }
    Modal.confirm({
      title: "放弃未保存更改？",
      content: "当前通用配置有未保存内容，关闭后将丢失。",
      okText: "放弃并关闭",
      cancelText: "继续编辑",
      onOk: () => setOpen(false)
    });
  }

  return (
    <Card size="small" title="通用配置">
      {holder}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="平台参数已迁移到通用配置"
        description="按 groupKey + itemKey 管理配置。groupKey 和 itemKey 同时作为标识与展示。"
      />

      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }} wrap>
        <Select
          style={{ minWidth: 220 }}
          value={groupFilter}
          options={groupOptions}
          onChange={setGroupFilter}
        />
        <Button type="primary" onClick={openCreate}>
          新增配置
        </Button>
      </Space>

      <Table<GeneralConfigItem>
        rowKey="id"
        loading={loading}
        dataSource={filteredRows}
        pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ["8", "16", "30"] }}
        columns={[
          { title: "分组", dataIndex: "groupKey", width: 180 },
          { title: "配置项", dataIndex: "itemKey", width: 220 },
          { title: "值", dataIndex: "itemValue", width: 240, render: (value: string) => <Typography.Text code>{value || "-"}</Typography.Text> },
          { title: "说明", dataIndex: "description", render: (value?: string) => value?.trim() || "-" },
          {
            title: "状态",
            width: 100,
            render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag>
          },
          {
            title: "操作",
            width: 220,
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => openEdit(row)}>
                  编辑
                </Button>
                <Popconfirm
                  title={row.status === "ACTIVE" ? "确认停用该配置？" : "确认启用该配置？"}
                  onConfirm={() => void switchStatus(row)}
                >
                  <Button size="small">{row.status === "ACTIVE" ? "停用" : "启用"}</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editing ? "编辑通用配置" : "新增通用配置"}
        open={open}
        onCancel={closeModal}
        onOk={() => void submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="groupKey"
            label="分组Key"
            rules={[
              { required: true, message: "请输入分组Key" },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: "仅支持字母开头，后续可包含字母、数字、下划线、中划线" }
            ]}
          >
            <Input placeholder="例如：platform-runtime" />
          </Form.Item>
          <Form.Item
            name="itemKey"
            label="配置项Key"
            rules={[
              { required: true, message: "请输入配置项Key" },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: "仅支持字母开头，后续可包含字母、数字、下划线、中划线" }
            ]}
          >
            <Input placeholder="例如：promptStableVersion" />
          </Form.Item>
          <Form.Item name="itemValue" label="配置值" rules={[{ required: true, message: "请输入配置值" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={simplifiedStatusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export function AdvancedConfigPage() {
  const { hasResource } = useMockSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const canConfig = hasResource("/action/common/base/config");

  const tabItems = [
    ...(canConfig ? [{ key: "general-config", label: "通用配置", children: <GeneralConfigPanel /> }] : []),
    ...(canConfig ? [{ key: "gray-center", label: "灰度中心", children: <SdkVersionCenterPage /> }] : []),
    ...(canConfig ? [{ key: "context-variables", label: "上下文变量", children: <ContextVariablesPage embedded /> }] : []),
    ...(canConfig ? [{ key: "preprocessors", label: "数据处理", children: <PreprocessorsPage embedded /> }] : [])
  ];

  const activeTab = (() => {
    if (tabItems.length === 0) {
      return "";
    }
    const picked = searchParams.get("tab");
    if (picked && tabItems.some((item) => item.key === picked)) {
      return picked;
    }
    return tabItems[0].key;
  })();

  return (
    <div>
      <Typography.Title level={4}>高级配置</Typography.Title>
      <Typography.Paragraph type="secondary">
        收纳低频复杂能力，默认按角色后置展示。业务人员主路径不需要先进入本页面。
      </Typography.Paragraph>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="修改高级配置前请确认影响范围"
        description="请先确认生效机构和发布时间，再执行高风险改动。"
      />

      {tabItems.length > 0 ? (
        <Tabs
          activeKey={activeTab}
          destroyInactiveTabPane
          onChange={(key) => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("tab", key);
            setSearchParams(nextParams);
          }}
          items={tabItems}
        />
      ) : (
        <Alert showIcon type="info" message="当前身份暂无可访问的高级配置项" />
      )}
    </div>
  );
}
