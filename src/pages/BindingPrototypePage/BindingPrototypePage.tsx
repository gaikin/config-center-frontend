import { Alert, Button, Card, Col, Form, Input, Row, Select, Table, Tabs, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { configCenterService } from "../../services/configCenterService";
import { useRegionConfig } from "../../hooks/useRegionConfig";
import { getRegionLabel } from "../../regionConfig";

export type MenuRow = {
  id: number;
  regionId: string;
  menuCode: string;
  menuName: string;
};

export type PageRow = {
  menuCode?: string;
  pageCode: string;
  pageName: string;
};

type MenuFormValues = MenuRow;
type PageFormValues = PageRow;

export function canAddMenuPage(existingRows: PageRow[], menuCode: string, pageCode: string) {
  return !existingRows.some((item) => item.menuCode === menuCode && item.pageCode === pageCode);
}

export function BindingPrototypePage() {
  return <BindingPrototypePanel />;
}

export function BindingPrototypePanel({
  embedded = false,
  menuRows = [],
  pageRows = [],
  onMenuCreated,
  onPageCreated
}: {
  embedded?: boolean;
  menuRows?: MenuRow[];
  pageRows?: PageRow[];
  onMenuCreated?: (menu: MenuRow) => void;
  onPageCreated?: (page: PageRow) => void;
}) {
  const [manualMenuRows, setManualMenuRows] = useState<MenuRow[]>(menuRows);
  const [manualPageRows, setManualPageRows] = useState<PageRow[]>(pageRows);
  const [menuForm] = Form.useForm<MenuFormValues>();
  const [pageForm] = Form.useForm<PageFormValues>();
  const { items: regionItems, options: regionOptions } = useRegionConfig();

  useEffect(() => {
    setManualMenuRows(menuRows);
    setManualPageRows(pageRows);
  }, [menuRows, pageRows]);

  const menuCodeOptions = useMemo(
    () => manualMenuRows.map((item) => ({ label: `${item.menuCode} - ${item.menuName}`, value: item.menuCode })),
    [manualMenuRows]
  );

  async function addMenu() {
    const values = await menuForm.validateFields();
    const menuCode = values.menuCode.trim();
    const menuName = values.menuName.trim();
    const regionId = values.regionId.trim();
    const urlPattern = `/${menuCode.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}`;
    const saved = await configCenterService.upsertPageMenu({
      regionId,
      menuCode,
      menuName,
      urlPattern,
      status: "ACTIVE"
    });
    setManualMenuRows((current) => {
      if (current.some((item) => item.menuCode === saved.menuCode)) {
        return current;
      }
      return [...current, { id: saved.id, regionId: saved.regionId, menuCode: saved.menuCode, menuName: saved.menuName }];
    });
    onMenuCreated?.({ id: saved.id, regionId: saved.regionId, menuCode: saved.menuCode, menuName: saved.menuName });
    menuForm.resetFields();
  }

  async function addPage() {
    const values = await pageForm.validateFields();
    const targetMenu = manualMenuRows.find((item) => item.menuCode === values.menuCode);
    if (!targetMenu) {
      throw new Error("请选择有效菜单");
    }
    const saved = await configCenterService.upsertPageResource({
      menuCode: targetMenu.menuCode,
      pageCode: values.pageCode,
      name: values.pageName,
      frameCode: "main-frame",
      status: "DRAFT",
      ownerOrgId: "head-office",
      detectRulesSummary: "业务标识优先 + URL兜底"
    });
    setManualPageRows((current) => {
      if (!canAddMenuPage(current, values.menuCode ?? "", values.pageCode)) {
        return current;
      }
      return [
        ...current,
        {
          menuCode: saved.menuCode || undefined,
          pageCode: saved.pageCode,
          pageName: saved.name
        }
      ];
    });
    onPageCreated?.({
      menuCode: saved.menuCode || undefined,
      pageCode: saved.pageCode,
      pageName: saved.name
    });
    pageForm.resetFields();
  }

  return (
    <div>
      {!embedded ? <Typography.Title level={4}>手工维护菜单/页面</Typography.Title> : null}
      {!embedded ? (
        <Typography.Paragraph type="secondary">
          这里用于补录菜单和页面主数据。提示、作业联动不在这个入口里展示。
        </Typography.Paragraph>
      ) : null}

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={embedded ? "手工新增菜单/页面入口" : "手工维护菜单/页面"}
        description="这里只负责手工添加菜单和页面，现有提示、作业联动信息不在此处展示。"
      />

      <Tabs
        defaultActiveKey="menu-page"
        items={[
          {
            key: "menu-page",
            label: "菜单/页面",
            children: (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card size="small" title="新增菜单">
                      <Form form={menuForm} layout="vertical">
                        <Form.Item name="regionId" label="专区" rules={[{ required: true, message: "请选择专区" }]}>
                          <Select options={regionOptions} placeholder="请选择专区" />
                        </Form.Item>
                        <Form.Item name="menuCode" label="menuCode" rules={[{ required: true, message: "请输入 menuCode" }]}>
                          <Input placeholder="例如：TASK_CENTER" />
                        </Form.Item>
                        <Form.Item name="menuName" label="menuName" rules={[{ required: true, message: "请输入 menuName" }]}>
                          <Input placeholder="例如：任务中心" />
                        </Form.Item>
                        <Button type="primary" onClick={() => void addMenu()}>
                          新增菜单
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card size="small" title="新增页面">
                      <Form form={pageForm} layout="vertical">
                        <Form.Item name="menuCode" label="menuCode" rules={[{ required: true, message: "请选择所属菜单" }]}>
                          <Select options={menuCodeOptions} placeholder="请选择所属菜单" />
                        </Form.Item>
                        <Form.Item name="pageCode" label="pageCode" rules={[{ required: true, message: "请输入 pageCode" }]}>
                          <Input placeholder="例如：task-entry / taskEntry / TASK_ENTRY" />
                        </Form.Item>
                        <Form.Item name="pageName" label="pageName" rules={[{ required: true, message: "请输入 pageName" }]}>
                          <Input placeholder="例如：任务入口页" />
                        </Form.Item>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                          pageCode 以当前菜单为作用域，同一个 pageCode 可以在不同菜单下重复。
                        </Typography.Paragraph>
                        <Button type="primary" onClick={() => void addPage()}>
                          新增页面
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={10}>
                    <Card size="small" title="当前菜单">
                      <Table<MenuRow>
                        size="small"
                        rowKey="menuCode"
                        dataSource={manualMenuRows}
                        pagination={false}
                        columns={[
                          {
                            title: "专区",
                            dataIndex: "regionId",
                            render: (value) => <Typography.Text>{getRegionLabel(value, regionItems)}</Typography.Text>
                          },
                          { title: "menuCode", dataIndex: "menuCode", render: (value) => <Typography.Text code>{value}</Typography.Text> },
                          { title: "menuName", dataIndex: "menuName" }
                        ]}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={14}>
                    <Card size="small" title="当前页面">
                      <Table<PageRow>
                        size="small"
                        rowKey={(row) => `${row.menuCode ?? "unknown"}-${row.pageCode}`}
                        dataSource={manualPageRows}
                        pagination={false}
                        columns={[
                          {
                            title: "归属菜单",
                            render: (_, row) => <Typography.Text code>{row.menuCode ?? "-"}</Typography.Text>
                          },
                          {
                            title: "pageCode",
                            dataIndex: "pageCode",
                            render: (value) => <Typography.Text code>{value}</Typography.Text>
                          },
                          { title: "pageName", dataIndex: "pageName" }
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            )
          }
        ]}
      />
    </div>
  );
}
