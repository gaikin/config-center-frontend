import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { OrgSelect } from "../../components/DirectoryFields";
import { useRegionConfig } from "../../hooks/useRegionConfig";
import { lifecycleLabelMap, lifecycleOptions } from "../../enumLabels";
import { getOrgLabel } from "../../orgOptions";
import { buildRegionOptions, getRegionLabel } from "../../regionConfig";
import { configCenterService } from "../../services/configCenterService";
import { validateMenuSdkPolicy } from "../../sdkGovernance";
import type {
  LifecycleState,
  MenuCapabilityPolicy,
  MenuSdkPolicy,
  PageMenu,
  PlatformRuntimeConfig
} from "../../types";

type PolicyForm = Omit<MenuSdkPolicy, "id">;
type EffectiveShortcutKey = "THIS_MONTH" | "NEXT_MONTH" | "THIS_YEAR" | "NEXT_YEAR";

const statusColor: Record<LifecycleState, string> = {
  DRAFT: "default",
  ACTIVE: "green",
  DISABLED: "orange",
  EXPIRED: "red"
};

const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm";
const effectiveShortcutOptions: Array<{ key: EffectiveShortcutKey; label: string }> = [
  { key: "THIS_MONTH", label: "本月" },
  { key: "NEXT_MONTH", label: "下月" },
  { key: "THIS_YEAR", label: "本年" },
  { key: "NEXT_YEAR", label: "明年" }
];

function resolveEffectiveShortcutRange(shortcut: EffectiveShortcutKey, base: Dayjs = dayjs()) {
  if (shortcut === "THIS_MONTH") {
    return {
      start: base.startOf("month"),
      end: base.endOf("month")
    };
  }
  if (shortcut === "NEXT_MONTH") {
    const nextMonth = base.add(1, "month");
    return {
      start: nextMonth.startOf("month"),
      end: nextMonth.endOf("month")
    };
  }
  if (shortcut === "THIS_YEAR") {
    return {
      start: base.startOf("year"),
      end: base.endOf("year")
    };
  }
  const nextYear = base.add(1, "year");
  return {
    start: nextYear.startOf("year"),
    end: nextYear.endOf("year")
  };
}

function parseDateTimeInput(value: unknown): Dayjs | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return null;
  }
  const normalized = text.replace(/\//g, "-");
  const parsed = dayjs(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));
  return parsed.isValid() ? parsed : null;
}

export function formatCapabilityStatusLabel(status?: MenuCapabilityPolicy["promptStatus"]) {
  if (status === "ENABLED") {
    return "已开通";
  }
  if (status === "PENDING") {
    return "历史状态";
  }
  return "未开通";
}

export function SdkVersionCenterPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<PageMenu[]>([]);
  const [policies, setPolicies] = useState<MenuSdkPolicy[]>([]);
  const [menuCapabilities, setMenuCapabilities] = useState<MenuCapabilityPolicy[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformRuntimeConfig | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [focusedPolicyId, setFocusedPolicyId] = useState<number>();
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(6);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuSdkPolicy | null>(null);
  const [form] = Form.useForm<PolicyForm>();
  const [msgApi, holder] = message.useMessage();
  const autoOpenKeyRef = useRef("");
  const { items: regionItems } = useRegionConfig();

  const selectedRegionId = regionFilter === "ALL" ? undefined : regionFilter;

  const menuLabelMap = useMemo(
    () =>
      Object.fromEntries(
        menus.map((menu) => [menu.id, `${getRegionLabel(menu.regionId, regionItems)} / ${menu.menuName}`])
      ),
    [menus, regionItems]
  );
  const menuCapabilityMap = useMemo(
    () => Object.fromEntries(menuCapabilities.map((item) => [item.menuId, item])),
    [menuCapabilities]
  );
  const promptVersionOptions = useMemo(() => {
    const options = [
      platformConfig?.promptStableVersion
        ? { label: `正式版本：${platformConfig.promptStableVersion}`, value: platformConfig.promptStableVersion }
        : undefined,
      platformConfig?.promptGrayDefaultVersion
        ? { label: `默认灰度：${platformConfig.promptGrayDefaultVersion}`, value: platformConfig.promptGrayDefaultVersion }
        : undefined
    ].filter((item): item is { label: string; value: string } => Boolean(item));
    return options;
  }, [platformConfig]);
  const jobVersionOptions = useMemo(() => {
    const options = [
      platformConfig?.jobStableVersion
        ? { label: `正式版本：${platformConfig.jobStableVersion}`, value: platformConfig.jobStableVersion }
        : undefined,
      platformConfig?.jobGrayDefaultVersion
        ? { label: `默认灰度：${platformConfig.jobGrayDefaultVersion}`, value: platformConfig.jobGrayDefaultVersion }
        : undefined
    ].filter((item): item is { label: string; value: string } => Boolean(item));
    return options;
  }, [platformConfig]);

  const regionOptions = useMemo(
    () => buildRegionOptions(regionItems),
    [regionItems]
  );

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      if (selectedRegionId && menu.regionId !== selectedRegionId) {
        return false;
      }
      return true;
    });
  }, [menus, selectedRegionId]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      if (selectedRegionId && policy.regionId !== selectedRegionId) {
        return false;
      }
      return true;
    });
  }, [policies, selectedRegionId]);

  async function loadData() {
      setLoading(true);
      try {
      const [menuData, policyData, capabilityData, runtimeConfig] = await Promise.all([
        configCenterService.listPageMenus(),
        configCenterService.listMenuSdkPolicies(),
        configCenterService.listMenuCapabilityPolicies(),
        configCenterService.getPlatformRuntimeConfig()
      ]);
      setMenus(menuData);
      setPolicies(policyData);
      setMenuCapabilities(capabilityData);
      setPlatformConfig(runtimeConfig);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const regionId = searchParams.get("regionId");
    const menuIdRaw = searchParams.get("menuId");
    const action = searchParams.get("action");
    const menuId = menuIdRaw ? Number(menuIdRaw) : undefined;

    if (regionId) {
      setRegionFilter(regionId);
    }
    if (!menuId || Number.isNaN(menuId)) {
      setFocusedPolicyId(undefined);
      return;
    }
    const matchedPolicy = policies.find((policy) => policy.menuId === menuId);
    setFocusedPolicyId(matchedPolicy?.id);
    if (matchedPolicy && !regionId) {
      setRegionFilter(matchedPolicy.regionId ?? "");
    }
    if (loading || action !== "edit") {
      return;
    }
    const autoOpenKey = `${action}:${menuId}`;
    if (autoOpenKeyRef.current === autoOpenKey) {
      return;
    }
    autoOpenKeyRef.current = autoOpenKey;
    if (matchedPolicy) {
      openEdit(matchedPolicy);
      msgApi.info("已定位到目标菜单，并打开灰度策略编辑弹窗");
      return;
    }
    const targetMenu = menus.find((menu) => menu.id === menuId);
    if (targetMenu) {
      openCreate(targetMenu);
      msgApi.info("目标菜单暂无策略，已打开新建弹窗并预填菜单");
    }
  }, [loading, menus, policies, searchParams]);

  useEffect(() => {
    if (!focusedPolicyId) {
      setTablePage(1);
      return;
    }
    const index = filteredPolicies.findIndex((item) => item.id === focusedPolicyId);
    if (index < 0) {
      return;
    }
    setTablePage(Math.floor(index / tablePageSize) + 1);
  }, [filteredPolicies, focusedPolicyId, tablePageSize]);

  function openCreate(targetMenu?: PageMenu) {
    const defaultMenu = targetMenu ?? filteredMenus[0] ?? menus[0];
    const defaultStart = dayjs();
    const defaultEnd = dayjs().endOf("month");
    setEditing(null);
    form.setFieldsValue({
      regionId: defaultMenu?.regionId ?? filteredMenus[0]?.regionId ?? menus[0]?.regionId ?? "",
      menuId: defaultMenu?.id ?? 0,
      menuCode: defaultMenu?.menuCode ?? "",
      promptGrayEnabled: false,
      promptGrayVersion: platformConfig?.promptGrayDefaultVersion,
      promptGrayOrgIds: [],
      jobGrayEnabled: false,
      jobGrayVersion: platformConfig?.jobGrayDefaultVersion,
      jobGrayOrgIds: [],
      effectiveStart: defaultStart.format(DATE_TIME_FORMAT),
      effectiveEnd: defaultEnd.format(DATE_TIME_FORMAT),
      status: "DRAFT",
      ownerOrgId: "head-office"
    });
    setOpen(true);
  }

  function openEdit(row: MenuSdkPolicy) {
    setEditing(row);
    form.setFieldsValue({
      regionId: row.regionId,
      menuId: row.menuId,
      menuCode: row.menuCode,
      promptGrayEnabled: row.promptGrayEnabled,
      promptGrayVersion: row.promptGrayVersion,
      promptGrayOrgIds: row.promptGrayOrgIds,
      jobGrayEnabled: row.jobGrayEnabled,
      jobGrayVersion: row.jobGrayVersion,
      jobGrayOrgIds: row.jobGrayOrgIds,
      effectiveStart: row.effectiveStart,
      effectiveEnd: row.effectiveEnd,
      status: row.status,
      ownerOrgId: row.ownerOrgId
    });
    setOpen(true);
  }

  function applyEffectiveShortcut(shortcut: EffectiveShortcutKey) {
    const startValue = parseDateTimeInput(form.getFieldValue("effectiveStart")) ?? dayjs();
    const { end } = resolveEffectiveShortcutRange(shortcut, startValue);
    form.setFieldsValue({
      effectiveEnd: end.format(DATE_TIME_FORMAT)
    });
    if (!parseDateTimeInput(form.getFieldValue("effectiveStart"))) {
      form.setFieldValue("effectiveStart", startValue.format(DATE_TIME_FORMAT));
    }
  }

  async function submit() {
    if (!platformConfig) {
      msgApi.error("平台参数未加载完成，请稍后再试");
      return;
    }
    const values = await form.validateFields();
    const matchedMenu = menus.find((item) => item.id === values.menuId);
    const capability = menuCapabilityMap[values.menuId];
    const validation = validateMenuSdkPolicy({
      policy: values,
      platformConfig,
      capabilityStatus: capability
        ? {
            promptStatus: capability.promptStatus,
            jobStatus: capability.jobStatus
          }
        : undefined
    });
    if (!validation.ok) {
      msgApi.error(validation.errors.join("；") || "菜单灰度策略校验失败");
      return;
    }

    await configCenterService.upsertMenuSdkPolicy({
      ...values,
      menuCode: matchedMenu?.menuCode ?? editing?.menuCode ?? "",
      id: editing?.id ?? Date.now()
    });
    msgApi.success(editing ? "版本灰度策略已更新并立即生效" : "版本灰度策略已创建并立即生效");
    setOpen(false);
    await loadData();
  }

  const promptGrayPolicies = policies.filter((item) => item.promptGrayEnabled).length;
  const jobGrayPolicies = policies.filter((item) => item.jobGrayEnabled).length;

  return (
    <div>
      {holder}
      <Typography.Title level={4}>菜单灰度中心</Typography.Title>
      <Typography.Paragraph type="secondary">维护菜单提示与作业灰度策略，按菜单与机构进行覆盖配置。</Typography.Paragraph>

      <Space size={12} style={{ marginBottom: 16 }} wrap>
        <Tag color="geekblue">策略总数：{policies.length}</Tag>
        <Tag color="orange">提示灰度菜单：{promptGrayPolicies}</Tag>
        <Tag color="purple">作业灰度菜单：{jobGrayPolicies}</Tag>
      </Space>

      <Card
        title="菜单灰度策略"
        extra={
          <Space wrap>
            <Select
              style={{ width: 180 }}
              value={regionFilter}
              options={[
                { label: "全部专区", value: "ALL" },
                ...regionOptions
              ]}
              onChange={(value) => setRegionFilter(value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              新建灰度策略
            </Button>
          </Space>
        }
      >
        <Table<MenuSdkPolicy>
          rowKey="id"
          loading={loading}
          dataSource={filteredPolicies}
          onRow={(row) =>
            row.id === focusedPolicyId
              ? {
                  style: { backgroundColor: "#fffbe6" }
                }
              : {}
          }
          pagination={{
            current: tablePage,
            pageSize: tablePageSize,
            showSizeChanger: true,
            pageSizeOptions: ["6", "10", "20"],
            onChange: (page) => setTablePage(page),
            onShowSizeChange: (_, size) => {
              const nextPage = size > 0 ? Math.max(1, Math.ceil(((tablePage - 1) * tablePageSize + 1) / size)) : 1;
              setTablePageSize(size);
              setTablePage(nextPage);
            }
          }}
          columns={[
            {
              title: "菜单",
              width: 220,
              render: (_, row) => (
                <Space size={6}>
                  <Typography.Text>{menuLabelMap[row.menuId] ?? row.menuName ?? "未识别菜单"}</Typography.Text>
                  {row.id === focusedPolicyId ? <Tag color="gold">定位目标</Tag> : null}
                </Space>
              )
            },
            {
              title: "提示灰度版本",
              width: 160,
              render: (_, row) =>
                row.promptGrayEnabled ? (
                  row.promptGrayVersion ?? "-"
                ) : (
                  <Typography.Text type="secondary">未开启</Typography.Text>
                )
            },
            {
              title: "提示灰度机构",
              width: 220,
              render: (_, row) =>
                row.promptGrayEnabled && row.promptGrayOrgIds.length > 0 ? (
                  <Space wrap>
                    {row.promptGrayOrgIds.map((orgId) => (
                      <Tag key={orgId}>{getOrgLabel(orgId)}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">-</Typography.Text>
                )
            },
            {
              title: "作业灰度版本",
              width: 160,
              render: (_, row) =>
                row.jobGrayEnabled ? row.jobGrayVersion ?? "-" : <Typography.Text type="secondary">未开启</Typography.Text>
            },
            {
              title: "作业灰度机构",
              width: 220,
              render: (_, row) =>
                row.jobGrayEnabled && row.jobGrayOrgIds.length > 0 ? (
                  <Space wrap>
                    {row.jobGrayOrgIds.map((orgId) => (
                      <Tag key={orgId}>{getOrgLabel(orgId)}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">-</Typography.Text>
                )
            },
            { title: "生效时间", width: 220, render: (_, row) => `${row.effectiveStart} ~ ${row.effectiveEnd}` },
            {
              title: "状态",
              width: 100,
              render: (_, row) => <Tag color={statusColor[row.status]}>{lifecycleLabelMap[row.status]}</Tag>
            },
            {
              title: "操作",
              width: 120,
              render: (_, row) => (
                <Button type="link" onClick={() => openEdit(row)}>
                  编辑
                </Button>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editing ? "编辑菜单灰度策略" : "新建菜单灰度策略"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
      >
        <Form form={form} layout="vertical">
          <Form.Item noStyle shouldUpdate>
            {() => {
              const currentRegionId = form.getFieldValue("regionId");
              const currentMenuId = form.getFieldValue("menuId");
              const capability = menuCapabilityMap[currentMenuId];
              const menuOptions = menus
                .filter((menu) => !currentRegionId || menu.regionId === currentRegionId)
                .map((menu) => ({
                  label: `${getRegionLabel(menu.regionId, regionItems)} / ${menu.menuName}`,
                  value: menu.id
                }));
              return (
                <>
                  <Form.Item name="regionId" label="专区" rules={[{ required: true, message: "请选择专区" }]}>
                    <Select
                      options={regionOptions}
                      onChange={() => {
                        form.setFieldValue("menuId", undefined);
                        form.setFieldValue("menuCode", "");
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="menuId" label="菜单" rules={[{ required: true, message: "请选择菜单" }]}>
                    <Select
                      options={menuOptions}
                      onChange={(menuId) => {
                        const matched = menus.find((item) => item.id === menuId);
                        form.setFieldValue("menuCode", matched?.menuCode ?? "");
                      }}
                    />
                  </Form.Item>
                  <Space size={[6, 6]} wrap style={{ marginBottom: 8 }}>
                    <Tag color={capability?.promptStatus === "ENABLED" ? "green" : "default"}>
                      提示能力: {formatCapabilityStatusLabel(capability?.promptStatus)}
                    </Tag>
                    <Tag color={capability?.jobStatus === "ENABLED" ? "green" : "default"}>
                      作业能力: {formatCapabilityStatusLabel(capability?.jobStatus)}
                    </Tag>
                  </Space>
                </>
              );
            }}
          </Form.Item>
          <Form.Item name="menuCode" hidden>
            <Input />
          </Form.Item>

          <Card size="small" title="智能提示灰度" style={{ marginBottom: 12 }}>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const menuId = form.getFieldValue("menuId");
                const capability = menuCapabilityMap[menuId];
                const promptCapabilityEnabled = capability?.promptStatus === "ENABLED";
                return (
                  <Form.Item
                    name="promptGrayEnabled"
                    label="开启提示灰度"
                    valuePropName="checked"
                    extra={promptCapabilityEnabled ? "开启后需配置灰度版本和灰度机构。" : "菜单提示能力未开通，暂不可配置提示灰度。"}
                  >
                    <Switch
                      disabled={!promptCapabilityEnabled}
                      onChange={(checked) => {
                        if (checked && !form.getFieldValue("promptGrayVersion")) {
                          form.setFieldValue("promptGrayVersion", platformConfig?.promptGrayDefaultVersion);
                        }
                        if (!checked) {
                          form.setFieldValue("promptGrayVersion", undefined);
                          form.setFieldValue("promptGrayOrgIds", []);
                        }
                      }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const enabled = Boolean(form.getFieldValue("promptGrayEnabled"));
                return (
                  <>
                      <Form.Item
                        name="promptGrayVersion"
                        label="提示灰度版本"
                        rules={
                          enabled
                          ? [
                              { required: true, message: "请先选择提示灰度版本" },
                              () => ({
                                validator(_, value) {
                                  if (!value || !platformConfig || value !== platformConfig.promptStableVersion) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error("提示灰度版本不能与提示正式版本相同"));
                                }
                              })
                            ]
                          : []
                      }
                    >
                      <Select allowClear disabled={!enabled} options={promptVersionOptions} />
                    </Form.Item>
                    <Form.Item
                      name="promptGrayOrgIds"
                      label="提示灰度机构"
                      rules={enabled ? [{ required: true, type: "array", min: 1, message: "请至少选择 1 个提示灰度机构" }] : []}
                    >
                      <OrgSelect mode="multiple" disabled={!enabled} placeholder="请选择提示灰度机构" />
                    </Form.Item>
                  </>
                );
              }}
            </Form.Item>
          </Card>

          <Card size="small" title="智能作业灰度" style={{ marginBottom: 12 }}>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const menuId = form.getFieldValue("menuId");
                const capability = menuCapabilityMap[menuId];
                const jobCapabilityEnabled = capability?.jobStatus === "ENABLED";
                return (
                  <Form.Item
                    name="jobGrayEnabled"
                    label="开启作业灰度"
                    valuePropName="checked"
                    extra={jobCapabilityEnabled ? "开启后需配置灰度版本和灰度机构。" : "菜单作业能力未开通，暂不可配置作业灰度。"}
                  >
                    <Switch
                      disabled={!jobCapabilityEnabled}
                      onChange={(checked) => {
                        if (checked && !form.getFieldValue("jobGrayVersion")) {
                          form.setFieldValue("jobGrayVersion", platformConfig?.jobGrayDefaultVersion);
                        }
                        if (!checked) {
                          form.setFieldValue("jobGrayVersion", undefined);
                          form.setFieldValue("jobGrayOrgIds", []);
                        }
                      }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const enabled = Boolean(form.getFieldValue("jobGrayEnabled"));
                return (
                  <>
                    <Form.Item
                      name="jobGrayVersion"
                      label="作业灰度版本"
                      rules={
                        enabled
                          ? [
                              { required: true, message: "请先选择作业灰度版本" },
                              () => ({
                                validator(_, value) {
                                  if (!value || !platformConfig || value !== platformConfig.jobStableVersion) {
                                    return Promise.resolve();
                                  }
                                  return Promise.reject(new Error("作业灰度版本不能与作业正式版本相同"));
                                }
                              })
                            ]
                          : []
                      }
                    >
                      <Select allowClear disabled={!enabled} options={jobVersionOptions} />
                    </Form.Item>
                    <Form.Item
                      name="jobGrayOrgIds"
                      label="作业灰度机构"
                      rules={enabled ? [{ required: true, type: "array", min: 1, message: "请至少选择 1 个作业灰度机构" }] : []}
                    >
                      <OrgSelect mode="multiple" disabled={!enabled} placeholder="请选择作业灰度机构" />
                    </Form.Item>
                  </>
                );
              }}
            </Form.Item>
          </Card>

          <Form.Item label="生效时间快捷">
            <Space wrap>
              {effectiveShortcutOptions.map((item) => (
                <Button key={item.key} size="small" onClick={() => applyEffectiveShortcut(item.key)}>
                  {item.label}
                </Button>
              ))}
            </Space>
          </Form.Item>
          <Form.Item name="effectiveStart" label="生效开始" rules={[{ required: true, message: "请输入开始时间" }]}>
            <Input placeholder={DATE_TIME_FORMAT} />
          </Form.Item>
          <Form.Item
            name="effectiveEnd"
            label="生效结束"
            rules={[
              { required: true, message: "请输入结束时间" },
              () => ({
                validator(_, value) {
                  const start = form.getFieldValue("effectiveStart");
                  if (!start || !value || start <= value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("生效结束时间不能早于开始时间"));
                }
              })
            ]}
          >
            <Input placeholder={DATE_TIME_FORMAT} />
          </Form.Item>
          <Form.Item name="ownerOrgId" label="归属组织" rules={[{ required: true, message: "请选择归属组织" }]}>
            <OrgSelect />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={lifecycleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
