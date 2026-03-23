import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { evaluateContextVariableValue } from "../../contextVariables";
import { lifecycleLabelMap, lifecycleOptions } from "../../enumLabels";
import { configCenterService } from "../../services/configCenterService";
import type { ContextVariableDefinition, ContextVariableValueSource, LifecycleState } from "../../types";

type ContextVariableForm = Pick<
  ContextVariableDefinition,
  "key" | "label" | "valueSource" | "staticValue" | "scriptContent" | "status"
>;

const statusColor: Record<LifecycleState, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  DISABLED: "orange",
  EXPIRED: "red"
};

const valueSourceLabel: Record<ContextVariableValueSource, string> = {
  STATIC: "固定值",
  SCRIPT: "JS脚本"
};

const exampleContext: Record<string, string> = {
  org_id: "branch-east",
  operator_role: "客户经理",
  channel: "柜面",
  user_role: "新员工"
};

function buildExampleValue(row: ContextVariableDefinition) {
  return evaluateContextVariableValue(row, exampleContext);
}

export function ContextVariablesPage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ContextVariableDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContextVariableDefinition | null>(null);
  const [form] = Form.useForm<ContextVariableForm>();
  const watchedValueSource = Form.useWatch("valueSource", form);
  const [msgApi, holder] = message.useMessage();

  const rowsWithPreview = useMemo(
    () =>
      rows.map((item) => ({
        ...item,
        exampleValue: buildExampleValue(item)
      })),
    [rows]
  );

  async function loadData() {
    setLoading(true);
    try {
      const data = await configCenterService.listContextVariables();
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
      key: "",
      label: "",
      valueSource: "STATIC",
      staticValue: "",
      scriptContent: "",
      status: "DRAFT"
    });
    setOpen(true);
  }

  function openEdit(row: ContextVariableDefinition) {
    setEditing(row);
    form.setFieldsValue({
      key: row.key,
      label: row.label,
      valueSource: row.valueSource,
      staticValue: row.staticValue ?? "",
      scriptContent: row.scriptContent ?? "",
      status: row.status
    });
    setOpen(true);
  }

  async function submit() {
    const values = await form.validateFields();
    await configCenterService.upsertContextVariable({
      ...values,
      id: editing?.id ?? Date.now(),
      staticValue: values.valueSource === "STATIC" ? values.staticValue ?? "" : "",
      scriptContent: values.valueSource === "SCRIPT" ? values.scriptContent ?? "" : "",
      ownerOrgId: "head-office"
    });
    msgApi.success(editing ? "上下文变量已更新" : "上下文变量已创建");
    setOpen(false);
    await loadData();
  }

  async function switchStatus(item: ContextVariableDefinition) {
    const next: LifecycleState = item.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateContextVariableStatus(item.id, next);
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
      content: "当前上下文变量有未保存内容，关闭后将丢失。",
      okText: "放弃并关闭",
      cancelText: "继续编辑",
      onOk: () => setOpen(false)
    });
  }

  return (
    <div>
      {holder}
      {!embedded ? (
        <>
          <Typography.Title level={4}>上下文变量</Typography.Title>
          <Typography.Paragraph type="secondary">
            规则配置中的上下文来源统一在这里维护，支持固定值与 JS 动态取值。上下文变量默认全员可见。
          </Typography.Paragraph>
        </>
      ) : null}

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建变量
          </Button>
        }
      >
        <Table<(ContextVariableDefinition & { exampleValue: string })>
          rowKey="id"
          loading={loading}
          dataSource={rowsWithPreview}
          pagination={{ pageSize: 6, showSizeChanger: true, pageSizeOptions: ["6", "10", "20"] }}
          columns={[
            { title: "变量Key", dataIndex: "key", width: 160, render: (value: string) => <Typography.Text code>{value}</Typography.Text> },
            { title: "名称", dataIndex: "label", width: 140 },
            {
              title: "取值方式",
              width: 110,
              render: (_, row) => <Tag color={row.valueSource === "SCRIPT" ? "volcano" : "blue"}>{valueSourceLabel[row.valueSource]}</Tag>
            },
            {
              title: "示例值",
              dataIndex: "exampleValue",
              width: 180,
              render: (value: string) => <Typography.Text>{value || "-"}</Typography.Text>
            },
            {
              title: "状态",
              width: 90,
              render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag>
            },
            {
              title: "操作",
              width: 210,
              render: (_, row) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(row)}>
                    编辑
                  </Button>
                  <Popconfirm
                    title={row.status === "ACTIVE" ? "确认停用该变量？" : "确认启用该变量？"}
                    onConfirm={() => void switchStatus(row)}
                  >
                    <Button size="small">{row.status === "ACTIVE" ? "停用" : "启用"}</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editing ? "编辑上下文变量" : "新建上下文变量"}
        open={open}
        onCancel={closeModal}
        onOk={() => void submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="脚本执行约定"
            description="脚本入参为 context 对象。可直接返回表达式结果，或使用 return 显式返回。"
          />
          <Form.Item
            name="key"
            label="变量Key"
            rules={[
              { required: true, message: "请输入变量Key" },
              { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: "仅支持字母开头，后续可包含字母、数字、下划线" },
              {
                validator: (_, value: string | undefined) => {
                  const key = value?.trim() ?? "";
                  if (!key) {
                    return Promise.resolve();
                  }
                  const duplicated = rows.some((item) => item.key === key && item.id !== editing?.id);
                  return duplicated ? Promise.reject(new Error("变量Key已存在，请更换")) : Promise.resolve();
                }
              }
            ]}
          >
            <Input placeholder="例如：operator_role" />
          </Form.Item>
          <Form.Item name="label" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="例如：操作员角色" />
          </Form.Item>
          <Form.Item name="valueSource" label="取值方式" rules={[{ required: true, message: "请选择取值方式" }]}>
            <Select
              options={[
                { label: "固定值", value: "STATIC" },
                { label: "JS脚本", value: "SCRIPT" }
              ]}
            />
          </Form.Item>
          {watchedValueSource === "SCRIPT" ? (
            <Form.Item name="scriptContent" label="JS脚本" rules={[{ required: true, message: "脚本模式需要填写JS内容" }]}>
              <Input.TextArea
                rows={8}
                placeholder="示例：return context.org_id || 'branch-east';"
                style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              />
            </Form.Item>
          ) : (
            <Form.Item name="staticValue" label="固定值" rules={[{ required: true, message: "固定值模式需要填写取值" }]}>
              <Input placeholder="例如：柜面" />
            </Form.Item>
          )}
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={lifecycleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
