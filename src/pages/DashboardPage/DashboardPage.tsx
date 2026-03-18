import { ArrowRightOutlined } from "@ant-design/icons";
import { Button, Card, Col, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { pendingTypeLabelMap, resourceTypeLabelMap } from "../../enumLabels";
import { getOrgLabel } from "../../orgOptions";
import { configCenterService } from "../../services/configCenterService";
import type { DashboardOverview, ExecutionLogItem, PublishPendingItem, PublishPendingSummary, TriggerLogItem } from "../../types";

type DropReminder = {
  key: string;
  pageName: string;
  scope: string;
  dropRatio: number;
  detail: string;
};

type DashboardPalette = {
  pageBg: string;
  pageBorder: string;
  panelBg: string;
  panelBorder: string;
  panelBorderSoft: string;
  heroBg: string;
  heroBorder: string;
  heroTitle: string;
  heroText: string;
  heroTagBg: string;
  heroTagBorder: string;
  heroTagText: string;
  heroButtonBg: string;
  heroButtonBorder: string;
  heroButtonHoverBg: string;
  heroButtonHoverBorder: string;
  headerHint: string;
  metricTones: [string, string, string, string];
};

const dashboardPalette: DashboardPalette = {
  pageBg: "linear-gradient(180deg, #f8fafd 0%, #f3f7fb 100%)",
  pageBorder: "#d9e3ee",
  panelBg: "#fdfefe",
  panelBorder: "#d8e2ed",
  panelBorderSoft: "#e4ebf3",
  heroBg: "linear-gradient(135deg, #f7fafd 0%, #eef4fa 100%)",
  heroBorder: "#d4dfeb",
  heroTitle: "#223142",
  heroText: "#4a5d72",
  heroTagBg: "#ecf3fa",
  heroTagBorder: "#c8d7e7",
  heroTagText: "#37506a",
  heroButtonBg: "#e8f1f8",
  heroButtonBorder: "#c2d5e7",
  heroButtonHoverBg: "#dae9f4",
  heroButtonHoverBorder: "#a8c1d8",
  headerHint: "#4b5f74",
  metricTones: [
    "linear-gradient(90deg, #6c88a8 0%, #89a3bf 100%)",
    "linear-gradient(90deg, #9a8567 0%, #b09b7c 100%)",
    "linear-gradient(90deg, #6f8095 0%, #8d9db2 100%)",
    "linear-gradient(90deg, #96747a 0%, #af8a90 100%)"
  ]
};

const DashboardShell = styled.div<{ $palette: DashboardPalette }>`
  border-radius: 12px;
  border: 1px solid ${({ $palette }) => $palette.pageBorder};
  background: ${({ $palette }) => $palette.pageBg};
  padding: var(--space-16);

  @media (max-width: 768px) {
    padding: var(--space-12);
  }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-12);
  margin-bottom: var(--space-24);

  @media (max-width: 768px) {
    flex-direction: column;
    margin-bottom: var(--space-16);
  }
`;

const HeaderMain = styled.div`
  min-width: 0;
`;

const PageTitle = styled(Typography.Title)`
  && {
    margin: 0;
  }
`;

const PageIntro = styled(Typography.Paragraph)`
  && {
    margin: var(--space-8) 0 0;
    color: var(--dash-header-hint);
  }
`;

const HeroCard = styled(Card)`
  margin-bottom: var(--space-16);
  border: 1px solid var(--dash-hero-border);
  overflow: hidden;
  background: var(--dash-hero-bg);
  box-shadow: 0 6px 18px rgba(38, 46, 56, 0.08);

  .ant-card-body {
    padding: 20px 22px;
  }
`;

const HeroTitle = styled(Typography.Title)`
  && {
    margin: 0;
    color: var(--dash-hero-title);
  }
`;

const HeroIntro = styled(Typography.Paragraph)`
  && {
    margin: 8px 0 0;
    color: var(--dash-hero-text);
  }
`;

const HeroSummaryTag = styled(Tag)`
  border-radius: 6px;
  padding-inline: 10px;
  border: 1px solid var(--dash-hero-tag-border);
  color: var(--dash-hero-tag-text);
  background: var(--dash-hero-tag-bg);
`;

const HeroActionButton = styled(Button)`
  margin-top: 8px;
  color: var(--dash-hero-tag-text);
  border-color: var(--dash-hero-button-border);
  background: var(--dash-hero-button-bg);

  &:hover,
  &:focus {
    color: var(--dash-hero-tag-text) !important;
    border-color: var(--dash-hero-button-hover-border) !important;
    background: var(--dash-hero-button-hover-bg) !important;
  }
`;

const MetricCard = styled(Card)<{ $tone: string }>`
  height: 100%;
  overflow: hidden;

  &::before {
    content: "";
    display: block;
    height: 4px;
    background: ${({ $tone }) => $tone};
  }

  .ant-card-body {
    padding-top: 14px;
  }
`;

const SectionRow = styled(Row)`
  margin-top: var(--space-16);
`;

const DataCard = styled(Card)`
  border-color: var(--dash-panel-border);
  background: var(--dash-panel-bg);

  .ant-card-head {
    border-bottom-color: var(--dash-panel-border-soft);
  }
`;

const RecentCard = styled(DataCard)`
  margin-top: var(--space-16);
`;

const DashboardSpace = styled(Space)`
  width: 100%;
`;

const ListSection = styled.div`
  margin-top: var(--space-12);
`;

const QuickActionCard = styled(DataCard)`
  .ant-btn {
    justify-content: flex-start;
  }
`;

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [pendingSummary, setPendingSummary] = useState<PublishPendingSummary | null>(null);
  const [pendingItems, setPendingItems] = useState<PublishPendingItem[]>([]);
  const [triggerLogs, setTriggerLogs] = useState<TriggerLogItem[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const [overviewData, pendingSummaryData, pendingRows, triggerRows, executionRows] = await Promise.all([
          configCenterService.getDashboardOverview(),
          configCenterService.getPendingSummary(),
          configCenterService.listPendingItems(),
          configCenterService.listTriggerLogs(),
          configCenterService.listExecutionLogs()
        ]);
        if (!active) {
          return;
        }
        setOverview(overviewData);
        setPendingSummary(pendingSummaryData);
        setPendingItems(pendingRows.slice(0, 6));
        setTriggerLogs(triggerRows);
        setExecutionLogs(executionRows);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const dropReminders = useMemo<DropReminder[]>(() => {
    const grouped = new Map<string, { total: number; failOrMiss: number }>();
    for (const row of triggerLogs) {
      const key = row.pageResourceName;
      const prev = grouped.get(key) ?? { total: 0, failOrMiss: 0 };
      prev.total += 1;
      if (row.triggerResult !== "HIT") {
        prev.failOrMiss += 1;
      }
      grouped.set(key, prev);
    }
    return Array.from(grouped.entries())
      .map(([pageName, metric], index) => {
        const ratio = metric.total === 0 ? 0 : Number(((metric.failOrMiss / metric.total) * 100).toFixed(1));
        return {
          key: `${pageName}-${index}`,
          pageName,
          scope: index % 2 === 0 ? "branch-east" : "branch-south",
          dropRatio: ratio,
          detail: ratio >= 50 ? "触发命中下降明显，请复核规则和发布变更。" : "波动可控，持续观察。"
        };
      })
      .filter((item) => item.dropRatio >= 30)
      .slice(0, 4);
  }, [triggerLogs]);

  const triggerCount = triggerLogs.length;
  const executionCount = executionLogs.length;
  const totalPending =
    (pendingSummary?.draftCount ?? 0) +
    (pendingSummary?.riskConfirmPendingCount ?? 0) +
    (pendingSummary?.validationFailedCount ?? 0);
  const recentEdits = useMemo(
    () =>
      [...pendingItems]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 5)
        .map((item, index) => ({
          key: `${item.id}-${index}`,
          name: item.resourceName,
          type: item.resourceType,
          updatedAt: item.updatedAt
        })),
    [pendingItems]
  );
  const palette = dashboardPalette;

  return (
    <DashboardShell
      $palette={palette}
      style={{
        ["--dash-header-hint" as string]: palette.headerHint,
        ["--dash-panel-bg" as string]: palette.panelBg,
        ["--dash-panel-border" as string]: palette.panelBorder,
        ["--dash-panel-border-soft" as string]: palette.panelBorderSoft,
        ["--dash-hero-bg" as string]: palette.heroBg,
        ["--dash-hero-border" as string]: palette.heroBorder,
        ["--dash-hero-title" as string]: palette.heroTitle,
        ["--dash-hero-text" as string]: palette.heroText,
        ["--dash-hero-tag-bg" as string]: palette.heroTagBg,
        ["--dash-hero-tag-border" as string]: palette.heroTagBorder,
        ["--dash-hero-tag-text" as string]: palette.heroTagText,
        ["--dash-hero-button-bg" as string]: palette.heroButtonBg,
        ["--dash-hero-button-border" as string]: palette.heroButtonBorder,
        ["--dash-hero-button-hover-bg" as string]: palette.heroButtonHoverBg,
        ["--dash-hero-button-hover-border" as string]: palette.heroButtonHoverBorder
      }}
    >
      <PageHeader>
        <HeaderMain>
          <PageTitle className="type-24">我的工作台</PageTitle>
          <PageIntro className="type-14">
            今天先看待处理和下降提醒，再从“菜单管理”进入主路径，继续完成配置、发布和结果查看。
          </PageIntro>
        </HeaderMain>
      </PageHeader>

      <HeroCard>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <HeroTitle level={4}>今日重点</HeroTitle>
            <HeroIntro>
              当前有 {totalPending} 项待处理，建议先从菜单管理进入页面，优先处理待发布与待确认事项。
            </HeroIntro>
          </div>
          <Space size={[8, 8]} wrap>
            <HeroSummaryTag>待发布 {pendingSummary?.draftCount ?? 0}</HeroSummaryTag>
            <HeroSummaryTag>待确认 {pendingSummary?.riskConfirmPendingCount ?? 0}</HeroSummaryTag>
            <HeroSummaryTag>待补充配置 {pendingSummary?.validationFailedCount ?? 0}</HeroSummaryTag>
            <HeroSummaryTag>下降提醒 {dropReminders.length}</HeroSummaryTag>
          </Space>
          <HeroActionButton icon={<ArrowRightOutlined />} onClick={() => navigate("/page-management")}>
            前往菜单管理继续处理
          </HeroActionButton>
        </Space>
      </HeroCard>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard $tone={palette.metricTones[0]} loading={loading}>
            <Statistic title="待发布事项" value={pendingSummary?.draftCount ?? 0} />
          </MetricCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard $tone={palette.metricTones[1]} loading={loading}>
            <Statistic title="待确认事项" value={pendingSummary?.riskConfirmPendingCount ?? 0} />
          </MetricCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard $tone={palette.metricTones[2]} loading={loading}>
            <Statistic title="待补充配置" value={pendingSummary?.validationFailedCount ?? 0} />
          </MetricCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard $tone={palette.metricTones[3]} loading={loading}>
            <Statistic title="下降提醒" value={dropReminders.length} />
          </MetricCard>
        </Col>
      </Row>

      <SectionRow gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <DataCard title="我的待处理" loading={loading}>
            <Space wrap size={8}>
              <Tag>待发布 {pendingSummary?.draftCount ?? 0}</Tag>
              <Tag>待确认 {pendingSummary?.riskConfirmPendingCount ?? 0}</Tag>
              <Tag>待补充配置 {pendingSummary?.validationFailedCount ?? 0}</Tag>
            </Space>
            <ListSection>
              <List
                size="small"
                dataSource={pendingItems}
                locale={{ emptyText: "暂无待处理事项" }}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Tag>{pendingTypeLabelMap[item.pendingType]}</Tag>
                      <Typography.Text className="card-info">{item.resourceName}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </ListSection>
          </DataCard>
        </Col>

        <Col xs={24} lg={12}>
          <DataCard title="运行提醒（触发下降）" loading={loading}>
            <List
              size="small"
              dataSource={dropReminders}
              locale={{ emptyText: "暂无明显下降提醒" }}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>{item.pageName}</Typography.Text>
                    <Typography.Text type="secondary" className="card-info">
                      {getOrgLabel(item.scope)} · 下降 {item.dropRatio}%
                    </Typography.Text>
                    <Typography.Text type="secondary" className="card-info">{item.detail}</Typography.Text>
                  </Space>
                </List.Item>
                )}
              />
          </DataCard>
        </Col>
      </SectionRow>

      <RecentCard title="我最近改过" loading={loading}>
        <List
          size="small"
          dataSource={recentEdits}
          locale={{ emptyText: "暂无最近修改记录" }}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Tag>{resourceTypeLabelMap[item.type]}</Tag>
                <Typography.Text className="card-info">{item.name}</Typography.Text>
                <Typography.Text type="secondary" className="type-12">
                  {item.updatedAt}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </RecentCard>

      <SectionRow gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <QuickActionCard title="常用入口">
            <DashboardSpace direction="vertical" size={12}>
              <Button block icon={<ArrowRightOutlined />} onClick={() => navigate("/page-management")}>进入菜单管理</Button>
              <Button block icon={<ArrowRightOutlined />} onClick={() => navigate("/prompts?action=create")}>新建提示规则</Button>
              <Button block icon={<ArrowRightOutlined />} onClick={() => navigate("/prompts")}>复制已有规则</Button>
              <Button block icon={<ArrowRightOutlined />} onClick={() => navigate("/interfaces")}>注册 API</Button>
              <Button block icon={<ArrowRightOutlined />} onClick={() => navigate("/stats")}>查看运行统计</Button>
            </DashboardSpace>
          </QuickActionCard>
        </Col>

        <Col xs={24} lg={12}>
          <DataCard title="业务看板" loading={loading}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="已启用页面数" value={overview?.pageResourceCount ?? 0} />
              </Col>
              <Col span={12}>
                <Statistic title="提示触发量" value={triggerCount} />
              </Col>
              <Col span={12}>
                <Statistic title="作业执行量" value={executionCount} />
              </Col>
              <Col span={12}>
                <Statistic title="下降提醒数" value={dropReminders.length} />
              </Col>
            </Row>
          </DataCard>
        </Col>
      </SectionRow>
    </DashboardShell>
  );
}
