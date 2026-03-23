import { Alert, Col, Empty, Input, Row, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { executionResultLabelMap, promptModeLabelMap, triggerSourceLabelMap } from "../../enumLabels";
import { formatDurationMs } from "./runRecordsPageShared";
import { useRunRecordsPageModel } from "./useRunRecordsPageModel";
import type { JobExecutionRecord, PromptHitRecord } from "../../types";

function formatDateInputValue(value: string | undefined) {
  return value ?? "";
}

function renderPromptFilters(model: ReturnType<typeof useRunRecordsPageModel>) {
  const { promptFilters, setPromptFilters, pageOptions, promptOrgOptions } = model;
  return (
    <Row gutter={[10, 10]}>
      <Col xs={24} md={8}>
        <Input
          allowClear
          placeholder="搜索规则名 / 内容摘要"
          value={promptFilters.keyword ?? ""}
          onChange={(event) => {
            setPromptFilters({ ...promptFilters, keyword: event.target.value || undefined });
          }}
        />
      </Col>
      <Col xs={24} md={5}>
        <Select
          allowClear
          style={{ width: "100%" }}
          placeholder="页面"
          value={promptFilters.pageResourceId}
          options={pageOptions}
          onChange={(value) => setPromptFilters({ ...promptFilters, pageResourceId: value })}
        />
      </Col>
      <Col xs={24} md={5}>
        <Select
          allowClear
          style={{ width: "100%" }}
          placeholder="机构"
          value={promptFilters.orgId}
          options={promptOrgOptions}
          onChange={(value) => setPromptFilters({ ...promptFilters, orgId: value })}
        />
      </Col>
      <Col xs={12} md={3}>
        <Input
          type="date"
          value={formatDateInputValue(promptFilters.startAt)}
          onChange={(event) => setPromptFilters({ ...promptFilters, startAt: event.target.value || undefined })}
        />
      </Col>
      <Col xs={12} md={3}>
        <Input
          type="date"
          value={formatDateInputValue(promptFilters.endAt)}
          onChange={(event) => setPromptFilters({ ...promptFilters, endAt: event.target.value || undefined })}
        />
      </Col>
    </Row>
  );
}

function renderJobFilters(model: ReturnType<typeof useRunRecordsPageModel>) {
  const { jobFilters, setJobFilters, pageOptions, jobOrgOptions } = model;
  return (
    <Row gutter={[10, 10]}>
      <Col xs={24} md={6}>
        <Input
          allowClear
          placeholder="搜索作业名 / 失败摘要"
          value={jobFilters.keyword ?? ""}
          onChange={(event) => setJobFilters({ ...jobFilters, keyword: event.target.value || undefined })}
        />
      </Col>
      <Col xs={12} md={4}>
        <Select
          style={{ width: "100%" }}
          placeholder="执行结果"
          value={jobFilters.result ?? "ALL"}
          options={[
            { label: "全部结果", value: "ALL" },
            { label: "成功", value: "SUCCESS" },
            { label: "部分成功", value: "PARTIAL_SUCCESS" },
            { label: "失败", value: "FAILED" }
          ]}
          onChange={(value) => setJobFilters({ ...jobFilters, result: value })}
        />
      </Col>
      <Col xs={12} md={4}>
        <Select
          allowClear
          style={{ width: "100%" }}
          placeholder="页面"
          value={jobFilters.pageResourceId}
          options={pageOptions}
          onChange={(value) => setJobFilters({ ...jobFilters, pageResourceId: value })}
        />
      </Col>
      <Col xs={12} md={4}>
        <Select
          allowClear
          style={{ width: "100%" }}
          placeholder="机构"
          value={jobFilters.orgId}
          options={jobOrgOptions}
          onChange={(value) => setJobFilters({ ...jobFilters, orgId: value })}
        />
      </Col>
      <Col xs={12} md={3}>
        <Input
          type="date"
          value={formatDateInputValue(jobFilters.startAt)}
          onChange={(event) => setJobFilters({ ...jobFilters, startAt: event.target.value || undefined })}
        />
      </Col>
      <Col xs={12} md={3}>
        <Input
          type="date"
          value={formatDateInputValue(jobFilters.endAt)}
          onChange={(event) => setJobFilters({ ...jobFilters, endAt: event.target.value || undefined })}
        />
      </Col>
    </Row>
  );
}

function renderPromptTable(model: ReturnType<typeof useRunRecordsPageModel>) {
  const { promptRows, promptState } = model;
  if (promptState.error) {
    return <Alert type="error" showIcon message="记录加载失败，请稍后重试" description={promptState.error} />;
  }
  return (
    <Table<PromptHitRecord>
      rowKey="id"
      loading={promptState.loading}
      dataSource={promptRows}
      locale={{ emptyText: <Empty description="当前筛选条件下暂无提示触发日志" /> }}
      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
      columns={[
        { title: "规则名", dataIndex: "ruleName", width: 180 },
        { title: "页面名称", dataIndex: "pageResourceName", width: 160 },
        { title: "所属机构", dataIndex: "orgName", width: 120 },
        {
          title: "提示方式",
          width: 110,
          render: (_, row) => <Tag>{promptModeLabelMap[row.promptMode]}</Tag>
        },
        { title: "触发时间", dataIndex: "triggerAt", width: 190 },
        { title: "提示内容摘要", dataIndex: "promptContentSummary" },
        {
          title: "关联作业场景",
          width: 180,
          render: (_, row) => row.sceneName ?? "-"
        }
      ]}
    />
  );
}

function renderJobTable(model: ReturnType<typeof useRunRecordsPageModel>) {
  const { jobRows, jobState } = model;
  if (jobState.error) {
    return <Alert type="error" showIcon message="记录加载失败，请稍后重试" description={jobState.error} />;
  }
  return (
    <Table<JobExecutionRecord>
      rowKey="id"
      loading={jobState.loading}
      dataSource={jobRows}
      locale={{ emptyText: <Empty description="当前筛选条件下暂无作业运行记录" /> }}
      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
      columns={[
        { title: "作业名称", dataIndex: "sceneName", width: 180 },
        {
          title: "执行结果",
          width: 110,
          render: (_, row) => (
            <Tag color={row.result === "FAILED" ? "red" : row.result === "PARTIAL_SUCCESS" ? "gold" : "green"}>
              {executionResultLabelMap[row.result]}
            </Tag>
          )
        },
        { title: "页面名称", dataIndex: "pageResourceName", width: 160 },
        { title: "所属机构", dataIndex: "orgName", width: 120 },
        {
          title: "触发来源",
          width: 110,
          render: (_, row) => triggerSourceLabelMap[row.triggerSource]
        },
        { title: "开始时间", dataIndex: "startedAt", width: 190 },
        {
          title: "执行耗时",
          width: 120,
          render: (_, row) => {
            const duration = Date.parse(row.finishedAt) - Date.parse(row.startedAt);
            return formatDurationMs(Number.isFinite(duration) && duration >= 0 ? duration : 0);
          }
        },
        {
          title: "失败原因摘要",
          dataIndex: "failureReasonSummary",
          render: (value: string | undefined) => value?.trim() || "暂无失败原因"
        }
      ]}
    />
  );
}

export function RunRecordsPage() {
  const model = useRunRecordsPageModel();
  const { activeTab, setActiveTab, resourceState } = model;

  return (
    <div data-section="run-record-center">
      <Typography.Title level={4}>运行记录中心</Typography.Title>
      <Typography.Paragraph type="secondary">
        支持按名称、状态、时间、页面、机构查询提示触发日志和作业运行记录。
      </Typography.Paragraph>

      {resourceState.error ? <Alert type="warning" showIcon message="页面资源加载失败" description={resourceState.error} /> : null}

      <Tabs
        activeKey={activeTab}
        onChange={(value) => setActiveTab(value as "prompts" | "jobs")}
        items={[
          {
            key: "prompts",
            label: "提示触发日志",
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {renderPromptFilters(model)}
                {renderPromptTable(model)}
              </Space>
            )
          },
          {
            key: "jobs",
            label: "作业运行记录",
            children: (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {renderJobFilters(model)}
                {renderJobTable(model)}
              </Space>
            )
          }
        ]}
      />
    </div>
  );
}

