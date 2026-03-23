import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { lifecycleLabelMap } from "../../enumLabels";
import { configCenterService } from "../../services/configCenterService";
import type { DataProcessorDefinition, LifecycleState } from "../../types";

type DataProcessorForm = Pick<DataProcessorDefinition, "name" | "paramCount" | "functionCode" | "status">;

const statusColor: Record<LifecycleState, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  DISABLED: "orange",
  EXPIRED: "red"
};

const dataProcessorStatusOptions = [
  { label: lifecycleLabelMap.ACTIVE, value: "ACTIVE" as const },
  { label: lifecycleLabelMap.DISABLED, value: "DISABLED" as const }
];

function buildTransformTemplate(paramCount: number) {
  const safeCount = Number.isInteger(paramCount) && paramCount > 0 ? paramCount : 1;
  const params = ["input", ...Array.from({ length: Math.max(0, safeCount - 1) }, (_, i) => `arg${i + 1}`)];
  return `function transform(${params.join(", ")}) {\n  return input;\n}`;
}

export function PreprocessorsPage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DataProcessorDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DataProcessorDefinition | null>(null);
  const [form] = Form.useForm<DataProcessorForm>();
  const [msgApi, holder] = message.useMessage();

  async function loadData() {
    setLoading(true);
    try {
      const data = await configCenterService.listDataProcessors();
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
      name: "",
      paramCount: 1,
      functionCode: buildTransformTemplate(1),
      status: "ACTIVE"
    });
    setOpen(true);
  }

  function openEdit(row: DataProcessorDefinition) {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      paramCount: row.paramCount,
      functionCode: row.functionCode,
      status: row.status === "ACTIVE" ? "ACTIVE" : "DISABLED"
    });
    setOpen(true);
  }

  async function submit() {
    const values = await form.validateFields();
    await configCenterService.upsertDataProcessor({
      ...values,
      id: editing?.id ?? Date.now(),
      usedByCount: editing?.usedByCount ?? 0
    });
    msgApi.success(editing ? "数据处理函数已更新" : "数据处理函数已创建");
    setOpen(false);
    await loadData();
  }

  function closeModal() {
    if (!form.isFieldsTouched(true)) {
      setOpen(false);
      return;
    }

    Modal.confirm({
      title: "放弃未保存更改？",
      content: "当前表单有未保存内容，确认关闭后将丢失。",
      okText: "放弃并关闭",
      cancelText: "继续编辑",
      onOk: () => setOpen(false)
    });
  }

  async function switchStatus(item: DataProcessorDefinition) {
    const next: LifecycleState = item.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await configCenterService.updateDataProcessorStatus(item.id, next);
    msgApi.success(`状态已切换为 ${next}`);
    await loadData();
  }

  return (
    <div>
      {holder}
      {!embedded ? (
        <>
          <Typography.Title level={4}>数据处理函数</Typography.Title>
          <Typography.Paragraph type="secondary">
            在这里维护规则与作业可复用的数据处理函数。统一使用标准 JS 函数 `transform(input, ...args)`。
          </Typography.Paragraph>
        </>
      ) : null}

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} aria-label="create-data-processor" title="新建数据处理函数" onClick={openCreate} />
        }
      >
        <Table<DataProcessorDefinition>
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ["8", "16", "30"] }}
          columns={[
            { title: "名称", dataIndex: "name", width: 220 },
            { title: "参数个数", dataIndex: "paramCount", width: 110 },
            { title: "被引用次数", dataIndex: "usedByCount", width: 110 },
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
                    title={row.status === "ACTIVE" ? "确认停用该数据处理函数？" : "确认启用该数据处理函数？"}
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
        title={editing ? "编辑数据处理函数" : "新建数据处理函数"}
        open={open}
        onCancel={closeModal}
        onOk={() => void submit()}
        destroyOnClose
        width={860}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item name="paramCount" label="参数个数（含 input）" rules={[{ required: true, message: "请输入参数个数" }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, current) => prev.paramCount !== current.paramCount}>
            {() => (
              <Button
                size="small"
                style={{ marginBottom: 10 }}
                onClick={() => {
                  const paramCount = form.getFieldValue("paramCount") ?? 1;
                  form.setFieldValue("functionCode", buildTransformTemplate(Number(paramCount)));
                }}
              >
                生成函数模板
              </Button>
            )}
          </Form.Item>
          <Form.Item
            name="functionCode"
            label="函数代码"
            rules={[
              { required: true, message: "请输入函数代码" },
              { pattern: /^function\s+transform\s*\(/, message: "请使用 function transform(...) 声明函数" }
            ]}
          >
            <Input.TextArea
              rows={10}
              placeholder="function transform(input, arg1) { return input; }"
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="参数说明"
            description="第一个参数固定为 input。其余参数会在条件配置中按参数个数自动生成输入框。"
          />
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={dataProcessorStatusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
