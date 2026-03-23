import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Typography,
  message
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { BindingPrototypePanel } from "../BindingPrototypePage/BindingPrototypePage";
import { useRegionConfig } from "../../hooks/useRegionConfig";
import { OrgSelect } from "../../components/DirectoryFields";
import { lifecycleLabelMap, lifecycleOptions } from "../../enumLabels";
import { toOrgOption } from "../../orgOptions";
import { buildRegionOptions, getRegionLabel } from "../../regionConfig";
import { configCenterService } from "../../services/configCenterService";
import { useMockSession } from "../../session/mockSession";
import { createId } from "../../utils";
import type {
  BusinessFieldDefinition,
  CapabilityOpenStatus,
  JobSceneDefinition,
  MenuSdkPolicy,
  MenuCapabilityPolicy,
  PageElement,
  PageFieldBinding,
  PageMenu,
  PageResource,
  RuleDefinition
} from "../../types";

type WorkFilter = "ALL" | "READY" | "NEED_REQUEST";
type RequestCapabilityType = "PROMPT" | "JOB";
type MenuCapabilityAction = "ENABLE" | "DISABLE";
type FieldFormValues = Pick<BusinessFieldDefinition, "name" | "description" | "required" | "ownerOrgId" | "status">;
type BindingFormValues = Pick<PageFieldBinding, "businessFieldCode" | "pageElementId" | "required">;
type QuickBindFormValues = {
  usePublicField?: boolean;
  fieldName?: string;
  businessFieldCode?: string;
  elementLogicName?: string;
  elementSelector?: string;
  elementSelectorType?: PageElement["selectorType"];
  frameLocation?: string;
};

type EnhancedPageRow = PageResource & {
  menuId: number;
  regionName: string;
  menuName: string;
  hasPrompt: boolean;
  hasJob: boolean;
  promptRuleCount: number;
  jobSceneCount: number;
  trend7d: number;
  dropRate: number;
  menuPromptStatus: CapabilityOpenStatus;
  menuJobStatus: CapabilityOpenStatus;
};

type MenuOverviewRow = {
  id: number;
  regionName: string;
  menuName: string;
  ownerOrgIds: string[];
  promptStatus: CapabilityOpenStatus;
  jobStatus: CapabilityOpenStatus;
  pageCount: number;
  configuredPromptPages: number;
  configuredJobPages: number;
  promptRuleTotal: number;
  jobSceneTotal: number;
};

export type PageSelectorPage = Pick<EnhancedPageRow, "id" | "name" | "promptRuleCount" | "jobSceneCount">;

export function getMenuDetailTabs() {
  return ["overview", "page"] as const;
}

export function PageSelector({
  pages,
  selectedPageId,
  onSelect
}: {
  pages: PageSelectorPage[];
  selectedPageId?: number;
  onSelect: (pageId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const manyPages = pages.length > 7;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPages = useMemo(() => {
    if (!manyPages || !normalizedQuery) {
      return pages;
    }
    return pages.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [manyPages, normalizedQuery, pages]);

  if (!manyPages) {
    return (
      <Card size="small" title="页面选择" extra={<Tag>{pages.length} 页</Tag>}>
        <Space size={[8, 8]} wrap>
          {pages.map((item) => {
            const isActive = item.id === selectedPageId;
            return (
              <Button
                key={item.id}
                size="small"
                type={isActive ? "primary" : "default"}
                onClick={() => onSelect(item.id)}
              >
                {item.name}
              </Button>
            );
          })}
        </Space>
      </Card>
    );
  }

  return (
    <Card size="small" title="页面选择" extra={<Tag>{pages.length} 页</Tag>}>
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <Input.Search
          value={query}
          allowClear
          placeholder="搜索页面"
          onChange={(event) => setQuery(event.target.value)}
          onSearch={(value) => setQuery(value)}
        />
        <List<PageSelectorPage>
          size="small"
          dataSource={filteredPages}
          locale={{ emptyText: "没有匹配到页面" }}
          renderItem={(item) => {
            const isActive = item.id === selectedPageId;
            return (
              <List.Item style={{ paddingInline: 0 }}>
                <Button
                  block
                  type={isActive ? "primary" : "default"}
                  onClick={() => onSelect(item.id)}
                  style={{ textAlign: "left" }}
                >
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <span>{item.name}</span>
                    <Typography.Text type="secondary">
                      提示 {item.promptRuleCount} / 作业 {item.jobSceneCount}
                    </Typography.Text>
                  </Space>
                </Button>
              </List.Item>
            );
          }}
        />
      </Space>
    </Card>
  );
}

export function getMenuCapabilityToggleMeta(policy?: Pick<MenuCapabilityPolicy, "promptStatus" | "jobStatus"> | null) {
  const isFullyEnabled = Boolean(policy && policy.promptStatus === "ENABLED" && policy.jobStatus === "ENABLED");
  return {
    action: (isFullyEnabled ? "DISABLE" : "ENABLE") as MenuCapabilityAction,
    label: isFullyEnabled ? "停用能力" : "启用能力",
    confirmText: isFullyEnabled ? "确认停用" : "确认启用"
  };
}

export function getMenuManagementActionLabels() {
  return {
    manualMaintenance: "补录菜单/页面",
    versionCenter: "查看版本",
    createPrompt: "新增提示",
    createJob: "新增作业",
    fieldMapping: "映射",
    publicFieldGovernance: "公共字段"
  } as const;
}

const capabilityStatusMeta: Record<CapabilityOpenStatus, { label: string; color: string }> = {
  ENABLED: { label: "已开通", color: "green" },
  DISABLED: { label: "未开通", color: "default" },
  PENDING: { label: "历史状态", color: "default" }
};

const PageHeader = styled.div`
  margin-bottom: var(--space-16);
`;

const FilterSection = styled.section`
  margin-bottom: 12px;
`;

const FilterActions = styled(Space)`
  width: 100%;
  justify-content: flex-end;
`;

const FilterLabel = styled(Typography.Text)`
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
`;

const MenuListCard = styled(Card)`
  height: 100%;

  .ant-list-pagination {
    margin-top: 10px;
    text-align: right;
  }
`;

const MenuItemCard = styled(Card)<{ $active: boolean }>`
  width: 100%;
  cursor: pointer;
  border-color: ${({ $active }) => ($active ? "var(--color-primary)" : "var(--color-border)")};
  background: ${({ $active }) => ($active ? "var(--color-primary-soft)" : "var(--color-surface)")};
`;

const DetailCard = styled(Card)`
  height: 100%;
`;

export function PageManagementPage() {
  const { hasResource, meta } = useMockSession();
  const navigate = useNavigate();
  const [msgApi, holder] = message.useMessage();
  const [requestForm] = Form.useForm<{ capabilityTypes: RequestCapabilityType[]; reason: string }>();
  const { items: regionItems } = useRegionConfig();

  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<PageMenu[]>([]);
  const [resources, setResources] = useState<PageResource[]>([]);
  const [menuCapabilities, setMenuCapabilities] = useState<MenuCapabilityPolicy[]>([]);
  const [menuSdkPolicies, setMenuSdkPolicies] = useState<MenuSdkPolicy[]>([]);
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [scenes, setScenes] = useState<JobSceneDefinition[]>([]);
  const [pageFieldBindingCounts, setPageFieldBindingCounts] = useState<Record<number, number>>({});
  const [fieldDrawerPage, setFieldDrawerPage] = useState<EnhancedPageRow | null>(null);
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [fieldDrawerLoading, setFieldDrawerLoading] = useState(false);
  const [fieldDrawerFields, setFieldDrawerFields] = useState<BusinessFieldDefinition[]>([]);
  const [fieldDrawerBindings, setFieldDrawerBindings] = useState<PageFieldBinding[]>([]);
  const [fieldDrawerElements, setFieldDrawerElements] = useState<PageElement[]>([]);
  const [quickBindOpen, setQuickBindOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [bindingOpen, setBindingOpen] = useState(false);
  const [manualBindingEntryOpen, setManualBindingEntryOpen] = useState(false);
  const [editingField, setEditingField] = useState<BusinessFieldDefinition | null>(null);
  const [editingBinding, setEditingBinding] = useState<PageFieldBinding | null>(null);
  const [quickBindForm] = Form.useForm<QuickBindFormValues>();
  const [fieldForm] = Form.useForm<FieldFormValues>();
  const [bindingForm] = Form.useForm<BindingFormValues>();

  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [keyword, setKeyword] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("ALL");
  const [workFilter, setWorkFilter] = useState<WorkFilter>("ALL");

  const [selectedMenuId, setSelectedMenuId] = useState<number>();
  const [selectedPageId, setSelectedPageId] = useState<number>();

  const [requestMenuId, setRequestMenuId] = useState<number>();
  const [requestAction, setRequestAction] = useState<MenuCapabilityAction>("ENABLE");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const canDirectEnableMenuCapability = hasResource("/action/page-management/capability/manage");
  const mountedRef = useRef(true);

  async function loadAll() {
    try {
      setLoading(true);
      const [menuRows, resourceRows, capabilityRows, sdkPolicyRows, ruleRows, sceneRows] = await Promise.all([
        configCenterService.listPageMenus(),
        configCenterService.listPageResources(),
        configCenterService.listMenuCapabilityPolicies(),
        configCenterService.listMenuSdkPolicies(),
        configCenterService.listRules(),
        configCenterService.listJobScenes()
      ]);
      if (!mountedRef.current) {
        return;
      }
      setMenus(menuRows);
      setResources(resourceRows);
      setMenuCapabilities(capabilityRows);
      setMenuSdkPolicies(sdkPolicyRows);
      setRules(ruleRows);
      setScenes(sceneRows);
      setPageFieldBindingCounts({});
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void loadAll();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const regionOptions = useMemo(
    () => buildRegionOptions(regionItems),
    [regionItems]
  );
  const menuMap = useMemo(() => Object.fromEntries(menus.map((item) => [item.id, item])), [menus]);
  const menuByCodeMap = useMemo(() => Object.fromEntries(menus.map((item) => [item.menuCode, item])), [menus]);
  const menuCapabilityMap = useMemo(
    () => Object.fromEntries(menuCapabilities.map((item) => [item.menuId, item])),
    [menuCapabilities]
  );
  const menuSdkPolicyMap = useMemo(
    () => Object.fromEntries(menuSdkPolicies.map((item) => [item.menuId, item])),
    [menuSdkPolicies]
  );

  const sharedTemplateId = useMemo(
    () => rules.find((item) => item.ruleScope === "SHARED")?.id,
    [rules]
  );

  const tableRows = useMemo<EnhancedPageRow[]>(() => {
    return resources.map((page) => {
      const menu = menuByCodeMap[page.menuCode];
      const menuCapability = menu ? menuCapabilityMap[menu.id] : undefined;
      const relatedRules = rules.filter((rule) => rule.pageResourceId === page.id);
      const relatedScenes = scenes.filter((scene) => scene.pageResourceId === page.id);
      return {
        ...page,
        menuId: menu?.id ?? 0,
        regionName: menu ? getRegionLabel(menu.regionId, regionItems) : "-",
        menuName: menu?.menuName ?? "-",
        hasPrompt: relatedRules.length > 0,
        hasJob: relatedScenes.length > 0,
        promptRuleCount: relatedRules.length,
        jobSceneCount: relatedScenes.length,
        trend7d: 120 + (page.id % 37),
        dropRate: Number(((page.id % 17) * 1.3).toFixed(1)),
        menuPromptStatus: menuCapability?.promptStatus ?? "DISABLED",
        menuJobStatus: menuCapability?.jobStatus ?? "DISABLED",
      };
    });
  }, [menuByCodeMap, menuCapabilityMap, regionItems, resources, rules, scenes]);

  const menuPagesMap = useMemo(() => {
    const grouped: Record<number, EnhancedPageRow[]> = {};
    for (const page of tableRows) {
      if (!grouped[page.menuId]) {
        grouped[page.menuId] = [];
      }
      grouped[page.menuId].push(page);
    }
    return grouped;
  }, [tableRows]);

  const menuRows = useMemo<MenuOverviewRow[]>(() => {
    return menus.map((menu) => {
      const pages = menuPagesMap[menu.id] ?? [];
      const capability = menuCapabilityMap[menu.id];
      const promptStatus = capability?.promptStatus ?? "DISABLED";
      const jobStatus = capability?.jobStatus ?? "DISABLED";
      const configuredPromptPages = pages.filter((page) => page.hasPrompt).length;
      const configuredJobPages = pages.filter((page) => page.hasJob).length;
      const promptRuleTotal = pages.reduce((sum, page) => sum + page.promptRuleCount, 0);
      const jobSceneTotal = pages.reduce((sum, page) => sum + page.jobSceneCount, 0);

      return {
        id: menu.id,
        regionName: getRegionLabel(menu.regionId, regionItems),
        menuName: menu.menuName,
        ownerOrgIds: Array.from(new Set(pages.map((page) => page.ownerOrgId))),
        promptStatus,
        jobStatus,
        pageCount: pages.length,
        configuredPromptPages,
        configuredJobPages,
        promptRuleTotal,
        jobSceneTotal
      };
    });
  }, [menuCapabilityMap, menuPagesMap, menus, regionItems]);

  const manualMenuRows = useMemo(
    () =>
      menus.map((item) => ({
        id: item.id,
        regionId: item.regionId,
        menuCode: item.menuCode,
        menuName: item.menuName
      })),
    [menus]
  );

  const manualPageRows = useMemo(
    () =>
      tableRows.map((item) => ({
        menuCode: item.menuCode || undefined,
        pageCode: item.pageCode,
        pageName: item.name
      })),
    [tableRows]
  );

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredMenuRows = useMemo(() => {
    return menuRows.filter((row) => {
      if (regionFilter !== "ALL") {
        const menu = menuMap[row.id];
        if (!menu || String(menu.regionId) !== regionFilter) {
          return false;
        }
      }
      if (orgFilter !== "ALL" && !row.ownerOrgIds.includes(orgFilter)) {
        return false;
      }
      if (workFilter === "READY" && (row.promptStatus !== "ENABLED" || row.jobStatus !== "ENABLED")) {
        return false;
      }
      if (workFilter === "NEED_REQUEST" && row.promptStatus !== "DISABLED" && row.jobStatus !== "DISABLED") {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      const pages = menuPagesMap[row.id] ?? [];
      return (
        row.menuName.toLowerCase().includes(normalizedKeyword) ||
        pages.some((item) => item.name.toLowerCase().includes(normalizedKeyword))
      );
    });
  }, [menuMap, menuPagesMap, menuRows, normalizedKeyword, orgFilter, regionFilter, workFilter]);

  useEffect(() => {
    if (!selectedMenuId && filteredMenuRows.length > 0) {
      setSelectedMenuId(filteredMenuRows[0].id);
      return;
    }
    if (selectedMenuId && !filteredMenuRows.some((item) => item.id === selectedMenuId)) {
      setSelectedMenuId(filteredMenuRows[0]?.id);
    }
  }, [filteredMenuRows, selectedMenuId]);

  const selectedMenu = filteredMenuRows.find((item) => item.id === selectedMenuId) ?? null;
  const selectedMenuPages = useMemo(() => {
    if (!selectedMenu) {
      return [] as EnhancedPageRow[];
    }
    return menuPagesMap[selectedMenu.id] ?? [];
  }, [menuPagesMap, selectedMenu]);

  useEffect(() => {
    if (!selectedMenu) {
      setSelectedPageId(undefined);
      return;
    }
    const currentInMenu = selectedMenuPages.some((item) => item.id === selectedPageId);
    if (!currentInMenu) {
      setSelectedPageId(selectedMenuPages[0]?.id);
    }
  }, [selectedMenu, selectedMenuPages, selectedPageId]);

  const selectedPage = selectedMenuPages.find((item) => item.id === selectedPageId) ?? null;
  const selectedMenuNeedRequest = selectedMenu
    ? selectedMenu.promptStatus === "DISABLED" || selectedMenu.jobStatus === "DISABLED"
    : false;
  const selectedMenuSdkPolicy = selectedMenu ? menuSdkPolicyMap[selectedMenu.id] : undefined;
  const selectedMenuGrayEnabled = Boolean(selectedMenuSdkPolicy?.promptGrayEnabled || selectedMenuSdkPolicy?.jobGrayEnabled);
  const selectedMenuActionMeta = getMenuCapabilityToggleMeta(selectedMenu);

  const selectedPageFieldBindingCount = selectedPage ? pageFieldBindingCounts[selectedPage.id] ?? 0 : 0;
  const selectedPageActionState = selectedPage ? getPageActionState(selectedPage) : null;
  const pageSpecificFields = useMemo(
    () =>
      fieldDrawerFields.filter(
        (item) => item.scope === "PAGE_RESOURCE" && item.pageResourceId === fieldDrawerPage?.id
      ),
    [fieldDrawerFields, fieldDrawerPage?.id]
  );
  const reusableGlobalFields = useMemo(
    () => fieldDrawerFields.filter((item) => item.scope === "GLOBAL"),
    [fieldDrawerFields]
  );
  const quickBindUsePublicField = Form.useWatch("usePublicField", quickBindForm) ?? false;
  const quickBindElementLogicName = Form.useWatch("elementLogicName", quickBindForm) ?? "";
  const businessFieldMap = useMemo(
    () => Object.fromEntries(fieldDrawerFields.map((item) => [item.code, item])),
    [fieldDrawerFields]
  );
  const elementLabelMap = useMemo(
    () => Object.fromEntries(fieldDrawerElements.map((item) => [item.id, item.logicName])),
    [fieldDrawerElements]
  );

  useEffect(() => {
    if (!quickBindOpen || quickBindUsePublicField) {
      return;
    }
    quickBindForm.setFieldValue("fieldName", quickBindElementLogicName.trim());
  }, [quickBindElementLogicName, quickBindForm, quickBindOpen, quickBindUsePublicField]);

  const orgOptions = useMemo(() => {
    return Array.from(new Set(resources.map((item) => item.ownerOrgId))).map((item) => toOrgOption(item));
  }, [resources]);

  const requestMenu = menuRows.find((item) => item.id === requestMenuId) ?? null;
  const requestMenuActionMeta = getMenuCapabilityToggleMeta(requestMenu);
  const menuManagementActionLabels = getMenuManagementActionLabels();

  function resetFilters() {
    setRegionFilter("ALL");
    setKeyword("");
    setOrgFilter("ALL");
    setWorkFilter("ALL");
  }

  function openRequest(menuId: number, action?: MenuCapabilityAction) {
    if (!canDirectEnableMenuCapability) {
      msgApi.warning("当前账号没有菜单能力开通权限");
      return;
    }
    const menuRow = menuRows.find((item) => item.id === menuId);
    if (!menuRow) {
      return;
    }
    const nextAction = action ?? getMenuCapabilityToggleMeta(menuRow).action;
    const defaultCapabilityTypes: RequestCapabilityType[] = [];
    if (nextAction === "ENABLE") {
      if (menuRow.promptStatus === "DISABLED") {
        defaultCapabilityTypes.push("PROMPT");
      }
      if (menuRow.jobStatus === "DISABLED") {
        defaultCapabilityTypes.push("JOB");
      }
    } else {
      if (menuRow.promptStatus === "ENABLED") {
        defaultCapabilityTypes.push("PROMPT");
      }
      if (menuRow.jobStatus === "ENABLED") {
        defaultCapabilityTypes.push("JOB");
      }
    }
    requestForm.setFieldsValue({
      capabilityTypes: defaultCapabilityTypes,
      reason: nextAction === "ENABLE" ? `菜单「${menuRow.menuName}」当前业务需要启用能力。` : `菜单「${menuRow.menuName}」当前业务需要停用能力。`
    });
    setRequestAction(nextAction);
    setRequestMenuId(menuId);
  }

  async function submitRequest() {
    if (!requestMenuId) {
      return;
    }
    try {
      const values = await requestForm.validateFields();
      setRequestSubmitting(true);
      await configCenterService.submitMenuCapabilityRequest({
        menuId: requestMenuId,
        capabilityTypes: values.capabilityTypes,
        reason: values.reason,
        applicant: meta.operatorId,
        action: requestAction
      });
      const latestPolicies = await configCenterService.listMenuCapabilityPolicies();
      setMenuCapabilities(latestPolicies);
      setRequestMenuId(undefined);
      msgApi.success(requestAction === "ENABLE" ? "能力已启用" : "能力已停用");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "申请提交失败";
      msgApi.error(errorMessage);
    } finally {
      setRequestSubmitting(false);
    }
  }

  function createPrompt(page: EnhancedPageRow) {
    const presetSceneId = scenes.find((item) => item.pageResourceId === page.id)?.id;
    navigate(
      `/prompts?pageResourceId=${page.id}&action=create${sharedTemplateId ? `&templateRuleId=${sharedTemplateId}` : ""}${
        presetSceneId ? `&sceneId=${presetSceneId}` : ""
      }`
    );
  }

  function createJob(page: EnhancedPageRow) {
    const presetExecutionMode = scenes.find((item) => item.pageResourceId === page.id)?.executionMode ?? "PREVIEW_THEN_EXECUTE";
    navigate(
      `/jobs?pageResourceId=${page.id}&action=create&executionMode=${presetExecutionMode}&sceneName=${encodeURIComponent(
        `${page.name}-自动化场景`
      )}`
    );
  }

  async function loadFieldDrawerModel(pageId: number) {
    setFieldDrawerLoading(true);
    try {
      const [fieldRows, bindingRows, elementRows] = await Promise.all([
        configCenterService.listBusinessFields(pageId),
        configCenterService.listPageFieldBindings(pageId),
        configCenterService.listPageElements(pageId)
      ]);
      setFieldDrawerFields(fieldRows);
      setFieldDrawerBindings(bindingRows);
      setFieldDrawerElements(elementRows);
      setPageFieldBindingCounts((previous) => ({
        ...previous,
        [pageId]: bindingRows.length
      }));
    } finally {
      setFieldDrawerLoading(false);
    }
  }

  async function openFieldMaintenance(page: EnhancedPageRow) {
    setFieldDrawerPage(page);
    setFieldDrawerOpen(true);
    setEditingField(null);
    setEditingBinding(null);
    await loadFieldDrawerModel(page.id);
  }

  function openQuickBind() {
    if (!fieldDrawerPage) {
      return;
    }
    quickBindForm.setFieldsValue({
      usePublicField: false,
      fieldName: "",
      businessFieldCode: undefined,
      elementLogicName: "",
      elementSelector: "",
      elementSelectorType: "XPATH",
      frameLocation: fieldDrawerPage.frameCode ?? "main-frame"
    });
    setQuickBindOpen(true);
  }

  async function submitQuickBind() {
    if (!fieldDrawerPage) {
      return;
    }
    const values = await quickBindForm.validateFields();
    const createdElement = await configCenterService.upsertPageElement({
      id: Date.now(),
      pageResourceId: fieldDrawerPage.id,
      logicName: values.elementLogicName ?? "",
      selector: values.elementSelector ?? "",
      selectorType: values.elementSelectorType ?? "XPATH",
      frameLocation: values.frameLocation?.trim() || fieldDrawerPage.frameCode || "main-frame"
    });

    let businessFieldCode = values.businessFieldCode;
    if (!values.usePublicField) {
      const createdField = await configCenterService.upsertBusinessField({
        id: Date.now() + 1,
        code: createId("field"),
        name: values.fieldName ?? values.elementLogicName ?? "",
        scope: "PAGE_RESOURCE",
        pageResourceId: fieldDrawerPage.id,
        valueType: "STRING",
        required: false,
        description: "",
        ownerOrgId: fieldDrawerPage.ownerOrgId,
        status: "DRAFT",
        currentVersion: 1,
        aliases: []
      });
      businessFieldCode = createdField.code;
    }

    await configCenterService.upsertPageFieldBinding({
      id: Date.now() + 2,
      pageResourceId: fieldDrawerPage.id,
      businessFieldCode: businessFieldCode ?? "",
      pageElementId: createdElement.id,
      required: false
    });
    msgApi.success(values.usePublicField ? "元素已绑定到公共字段" : "元素已生成页面字段并完成绑定");
    setQuickBindOpen(false);
    await loadFieldDrawerModel(fieldDrawerPage.id);
  }

  function openEditField(row: BusinessFieldDefinition) {
    setEditingField(row);
    fieldForm.setFieldsValue({
      name: row.name,
      description: row.description,
      required: row.required,
      ownerOrgId: row.ownerOrgId,
      status: row.status
    });
    setFieldOpen(true);
  }

  async function submitField() {
    if (!fieldDrawerPage) {
      return;
    }
    const values = await fieldForm.validateFields();
    await configCenterService.upsertBusinessField({
      id: editingField?.id ?? Date.now(),
      code: editingField?.code ?? createId("field"),
      name: values.name,
      scope: "PAGE_RESOURCE",
      pageResourceId: fieldDrawerPage.id,
      valueType: editingField?.valueType ?? "STRING",
      required: values.required,
      description: values.description,
      ownerOrgId: values.ownerOrgId,
      status: values.status,
      currentVersion: editingField?.currentVersion ?? 1,
      aliases: editingField?.aliases ?? []
    });
    msgApi.success(editingField ? "页面字段已更新" : "页面字段已创建");
    setFieldOpen(false);
    await loadFieldDrawerModel(fieldDrawerPage.id);
  }

  function openEditBinding(row: PageFieldBinding) {
    setEditingBinding(row);
    bindingForm.setFieldsValue({
      businessFieldCode: row.businessFieldCode,
      pageElementId: row.pageElementId,
      required: row.required
    });
    setBindingOpen(true);
  }

  async function submitBinding() {
    if (!fieldDrawerPage) {
      return;
    }
    const values = await bindingForm.validateFields();
    await configCenterService.upsertPageFieldBinding({
      id: editingBinding?.id ?? Date.now(),
      pageResourceId: fieldDrawerPage.id,
      businessFieldCode: values.businessFieldCode,
      pageElementId: values.pageElementId,
      required: values.required
    });
    msgApi.success(editingBinding ? "字段绑定已更新" : "字段绑定已创建");
    setBindingOpen(false);
    await loadFieldDrawerModel(fieldDrawerPage.id);
  }

  async function removeBinding(row: PageFieldBinding) {
    if (!fieldDrawerPage) {
      return;
    }
    await configCenterService.deletePageFieldBinding(row.id);
    msgApi.success("字段绑定已删除");
    await loadFieldDrawerModel(fieldDrawerPage.id);
  }

  function openPublicFieldGovernance() {
    navigate("/public-fields");
  }

  function getPageActionState(page: EnhancedPageRow) {
    return {
      needRequest: page.menuPromptStatus === "DISABLED" || page.menuJobStatus === "DISABLED"
    };
  }

  return (
    <div>
      {holder}
      <PageHeader>
        <Space style={{ width: "100%", justifyContent: "space-between" }} align="start" wrap>
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              菜单管理
            </Typography.Title>
            <Typography.Text style={{ color: "var(--color-text-secondary)" }}>
              以菜单为入口查看能力开通状态、页面配置覆盖率和下一步动作，减少在多个页面之间切换。
            </Typography.Text>
          </Space>
          <Button onClick={() => setManualBindingEntryOpen(true)}>{menuManagementActionLabels.manualMaintenance}</Button>
        </Space>
      </PageHeader>

      <FilterSection>
        <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
          筛选条件
        </Typography.Text>
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} lg={6}>
            <div>
              <FilterLabel>专区</FilterLabel>
              <Select
                value={regionFilter}
                style={{ width: "100%" }}
                onChange={setRegionFilter}
                options={[
                  { label: "全部专区", value: "ALL" },
                  ...regionOptions
                ]}
              />
            </div>
          </Col>
          <Col xs={24} lg={7}>
            <div>
              <FilterLabel>关键词</FilterLabel>
              <Input.Search
                value={keyword}
                allowClear
                style={{ width: "100%" }}
                placeholder="搜索菜单 / 页面"
                onChange={(event) => setKeyword(event.target.value)}
                onSearch={(value) => setKeyword(value)}
              />
            </div>
          </Col>
          <Col xs={24} lg={5}>
            <div>
              <FilterLabel>组织</FilterLabel>
              <OrgSelect
                includeAll
                value={orgFilter}
                style={{ width: "100%" }}
                onChange={setOrgFilter}
                options={orgOptions}
              />
            </div>
          </Col>
          <Col xs={24} lg={4}>
            <div>
              <FilterLabel>工作状态</FilterLabel>
              <Select
                value={workFilter}
                style={{ width: "100%" }}
                onChange={(value) => setWorkFilter(value as WorkFilter)}
                options={[
                  { label: "全部状态", value: "ALL" },
                  { label: "能力已开通", value: "READY" },
                  { label: "待开通", value: "NEED_REQUEST" }
                ]}
              />
            </div>
          </Col>
          <Col xs={24} lg={2}>
            <FilterActions>
              <Button onClick={resetFilters}>重置筛选</Button>
            </FilterActions>
          </Col>
        </Row>
      </FilterSection>

      <Row gutter={[12, 12]} align="stretch">
        <Col xs={24} xl={11}>
          <MenuListCard title="菜单列表">
            <List<MenuOverviewRow>
              loading={loading}
              dataSource={filteredMenuRows}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
              locale={{ emptyText: "暂无符合条件的菜单" }}
              renderItem={(row) => {
                const active = row.id === selectedMenuId;
                const rowGrayEnabled = Boolean(menuSdkPolicyMap[row.id]?.promptGrayEnabled || menuSdkPolicyMap[row.id]?.jobGrayEnabled);
                return (
                  <List.Item style={{ paddingInline: 0 }}>
                    <MenuItemCard hoverable size="small" onClick={() => setSelectedMenuId(row.id)} $active={active}>
                      <Space size={8} align="center" wrap style={{ width: "100%" }}>
                        <Typography.Text strong>{row.menuName}</Typography.Text>
                        {rowGrayEnabled ? <Tag color="default">灰度</Tag> : null}
                      </Space>
                    </MenuItemCard>
                  </List.Item>
                );
              }}
            />
          </MenuListCard>
        </Col>

        <Col xs={24} xl={13}>
          <DetailCard
            title={selectedMenu ? `菜单详情：${selectedMenu.menuName}` : "菜单详情"}
            extra={
              selectedMenu ? (
                <Space>
                  <Button size="small" onClick={() => setManualBindingEntryOpen(true)}>
                    {menuManagementActionLabels.manualMaintenance}
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      navigate(`/advanced?tab=gray-center&action=edit&menuId=${selectedMenu.id}&regionId=${menuMap[selectedMenu.id]?.regionId ?? ""}`)
                    }
                  >
                    {menuManagementActionLabels.versionCenter}
                  </Button>
                </Space>
              ) : null
            }
          >
            {selectedMenu ? (
              <Tabs
                defaultActiveKey="overview"
                items={[
                  {
                    key: "overview",
                    label: "概览",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        <Alert
                          showIcon
                          type="info"
                          message={
                            selectedMenuNeedRequest
                              ? "当前菜单部分能力尚未开通"
                              : "当前菜单能力已就绪"
                          }
                          description="更多信息见菜单灰度中心。"
                        />
                        <Card
                          size="small"
                          title="菜单信息"
                          extra={
                            <Space size={8}>
                              {canDirectEnableMenuCapability ? (
                                <Button
                                  size="small"
                                  type={selectedMenuNeedRequest ? "primary" : "default"}
                                  danger={!selectedMenuNeedRequest}
                                  onClick={() => openRequest(selectedMenu.id, selectedMenuNeedRequest ? "ENABLE" : "DISABLE")}
                                >
                                  {selectedMenuActionMeta.label}
                                </Button>
                              ) : selectedMenuNeedRequest ? (
                                <Button size="small" disabled>
                                  无开通权限
                                </Button>
                              ) : null}
                              {selectedMenuGrayEnabled ? <Tag color="gold">灰度已配置</Tag> : null}
                            </Space>
                          }
                        >
                          <Descriptions size="small" column={2}>
                            <Descriptions.Item label="菜单名称">{selectedMenu.menuName}</Descriptions.Item>
                            <Descriptions.Item label="菜单编码">
                              <Typography.Text code>{menuMap[selectedMenu.id]?.menuCode ?? "-"}</Typography.Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="所属专区">{selectedMenu.regionName}</Descriptions.Item>
                            <Descriptions.Item label="页面数量">{selectedMenu.pageCount}</Descriptions.Item>
                          </Descriptions>
                        </Card>
                      </Space>
                    )
                  },
                  {
                    key: "page",
                    label: "页面与能力",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        {selectedMenuPages.length > 0 ? (
                          <PageSelector
                            pages={selectedMenuPages}
                            selectedPageId={selectedPageId}
                            onSelect={(pageId) => setSelectedPageId(pageId)}
                          />
                        ) : (
                          <Typography.Text type="secondary">暂无页面。</Typography.Text>
                        )}

                        {selectedPage ? (
                          <Card
                            size="small"
                            title={`当前页面：${selectedPage.name}`}
                            extra={
                              <Space>
                                {selectedPageActionState?.needRequest ? (
                                  canDirectEnableMenuCapability ? (
                                    <Button size="small" type="primary" onClick={() => openRequest(selectedPage.menuId, "ENABLE")}>
                                      启用能力
                                    </Button>
                                  ) : (
                                    <Button size="small" disabled>
                                      无开通权限
                                    </Button>
                                  )
                                ) : (
                                  <>
                                    <Button type="primary" onClick={() => createPrompt(selectedPage)}>
                                      新增提示
                                    </Button>
                                    <Button onClick={() => createJob(selectedPage)}>{menuManagementActionLabels.createJob}</Button>
                                  </>
                                )}
                                <Button size="small" onClick={() => void openFieldMaintenance(selectedPage)}>
                                  {menuManagementActionLabels.fieldMapping}
                                </Button>
                              </Space>
                            }
                          >
                            <Descriptions size="small" column={2}>
                              <Descriptions.Item label="页面名称">{selectedPage.name}</Descriptions.Item>
                              <Descriptions.Item label="所属菜单">{selectedPage.menuName}</Descriptions.Item>
                              <Descriptions.Item label="页面状态">{lifecycleLabelMap[selectedPage.status]}</Descriptions.Item>
                              <Descriptions.Item label="已绑定字段数">{selectedPageFieldBindingCount}</Descriptions.Item>
                            </Descriptions>
                          </Card>
                        ) : null}
                      </Space>
                    )
                  }
                ]}
              />
            ) : (
              <Typography.Text type="secondary">请选择一个菜单查看详情。</Typography.Text>
            )}
          </DetailCard>
        </Col>
      </Row>

      <Drawer
        title={menuManagementActionLabels.manualMaintenance}
        placement="right"
        width={1120}
        open={manualBindingEntryOpen}
        onClose={() => setManualBindingEntryOpen(false)}
        destroyOnClose
      >
        <BindingPrototypePanel
          embedded
          menuRows={manualMenuRows}
          pageRows={manualPageRows}
          onPageCreated={() => {
            void loadAll();
          }}
          onMenuCreated={(menu) => {
            setMenus((current) =>
              current.some((item) => item.menuCode === menu.menuCode)
                ? current
                : [
                    ...current,
                    {
                      id: menu.id,
                      regionId: menu.regionId,
                      menuCode: menu.menuCode,
                      menuName: menu.menuName,
                      status: "ACTIVE",
                      ownerOrgId: "head-office"
                    }
                  ]
            );
          }}
        />
      </Drawer>

      <Drawer
        title={fieldDrawerPage ? `元素映射：${fieldDrawerPage.name}` : "元素映射"}
        placement="right"
        width={720}
        open={fieldDrawerOpen}
        onClose={() => {
          setFieldDrawerOpen(false);
          setQuickBindOpen(false);
          setFieldOpen(false);
          setBindingOpen(false);
        }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            showIcon
            type="info"
            message="先录元素，再映射"
          />

          <Card
            size="small"
            title="当前页面字段"
            extra={
              <Space>
                <Button onClick={openPublicFieldGovernance}>{menuManagementActionLabels.publicFieldGovernance}</Button>
                <Button type="primary" onClick={openQuickBind} disabled={!fieldDrawerPage}>
                  {menuManagementActionLabels.fieldMapping}
                </Button>
              </Space>
            }
          >
            <Table<BusinessFieldDefinition>
              rowKey="id"
              loading={fieldDrawerLoading}
              dataSource={pageSpecificFields}
              pagination={false}
              locale={{ emptyText: "暂无页面字段。" }}
              columns={[
                { title: "字段名称", dataIndex: "name", width: 180 },
                { title: "说明", dataIndex: "description" },
                {
                  title: "状态",
                  width: 100,
                  render: (_, row) => <Tag>{lifecycleLabelMap[row.status]}</Tag>
                },
                {
                  title: "操作",
                  width: 100,
                  render: (_, row) => (
                    <Button size="small" onClick={() => openEditField(row)}>
                      编辑
                    </Button>
                  )
                }
              ]}
            />
          </Card>

          <Card
            size="small"
            title="绑定"
          >
            <Table<PageFieldBinding>
              rowKey="id"
              loading={fieldDrawerLoading}
              dataSource={fieldDrawerBindings}
              pagination={false}
              locale={{ emptyText: "暂无字段绑定。" }}
              columns={[
                {
                  title: "字段",
                  width: 220,
                  render: (_, row) => {
                    const field = businessFieldMap[row.businessFieldCode];
                    if (!field) {
                      return <Typography.Text type="secondary">字段已不存在</Typography.Text>;
                    }
                    return (
                      <Space size={6}>
                        <Typography.Text>{field.name}</Typography.Text>
                        <Tag color={field.scope === "GLOBAL" ? "blue" : "geekblue"}>
                          {field.scope === "GLOBAL" ? "公共字段" : "页面字段"}
                        </Tag>
                      </Space>
                    );
                  }
                },
                {
                  title: "元素",
                  width: 180,
                  render: (_, row) => elementLabelMap[row.pageElementId] ?? <Typography.Text type="secondary">元素已删除</Typography.Text>
                },
                {
                  title: "必填",
                  width: 80,
                  render: (_, row) => (row.required ? <Tag color="red">是</Tag> : <Tag>否</Tag>)
                },
                {
                  title: "操作",
                  width: 140,
                  render: (_, row) => (
                    <Space>
                      <Button size="small" onClick={() => openEditBinding(row)}>
                        编辑
                      </Button>
                      <Popconfirm title="确认删除该字段绑定？" onConfirm={() => void removeBinding(row)}>
                        <Button size="small" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </Card>

          <Card size="small" title="可引用公共字段">
            <Space size={[8, 8]} wrap>
              {reusableGlobalFields.length > 0 ? (
                reusableGlobalFields.map((field) => <Tag key={field.id}>{field.name}</Tag>)
              ) : (
                <Typography.Text type="secondary">暂无公共字段。</Typography.Text>
              )}
            </Space>
          </Card>
        </Space>
      </Drawer>

      <Modal
        title="元素映射"
        open={quickBindOpen}
        onCancel={() => setQuickBindOpen(false)}
        onOk={() => void submitQuickBind()}
      >
        <Form form={quickBindForm} layout="vertical">
          <Form.Item name="elementLogicName" label="元素名" rules={[{ required: true, message: "请输入元素名" }]}>
            <Input placeholder="例如：客户号输入框" />
          </Form.Item>
          <Form.Item label="自动生成字段名">
            <Input value={quickBindElementLogicName.trim()} disabled placeholder="输入元素名后自动生成" />
          </Form.Item>
          <Form.Item name="elementSelectorType" label="选择器类型" rules={[{ required: true, message: "请选择选择器类型" }]}>
            <Select
              options={[
                { label: "XPATH", value: "XPATH" },
                { label: "CSS", value: "CSS" }
              ]}
            />
          </Form.Item>
          <Form.Item name="elementSelector" label="元素选择器" rules={[{ required: true, message: "请输入元素选择器" }]}>
            <Input placeholder="例如：//*[@id='customerNo']" />
          </Form.Item>
          <Form.Item name="frameLocation" label="frameLocation">
            <Input placeholder="例如：main-frame / collateral-iframe" />
          </Form.Item>
          <Form.Item name="usePublicField" label="使用公共字段" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          {quickBindUsePublicField ? (
            <Form.Item name="businessFieldCode" label="公共字段" rules={[{ required: true, message: "请选择公共字段" }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={reusableGlobalFields.map((field) => ({
                  label: field.name,
                  value: field.code
                }))}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal
        title="编辑页面字段"
        open={fieldOpen}
        onCancel={() => setFieldOpen(false)}
        onOk={() => void submitField()}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item name="name" label="字段名称" rules={[{ required: true, message: "请输入字段名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="ownerOrgId" label="归属组织" rules={[{ required: true, message: "请选择归属组织" }]}>
            <OrgSelect />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: "请选择状态" }]}>
            <Select options={lifecycleOptions} />
          </Form.Item>
          <Form.Item name="required" label="是否必填" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑字段绑定"
        open={bindingOpen}
        onCancel={() => setBindingOpen(false)}
        onOk={() => void submitBinding()}
      >
        <Form form={bindingForm} layout="vertical">
          <Form.Item name="businessFieldCode" label="字段" rules={[{ required: true, message: "请选择字段" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={fieldDrawerFields.map((field) => ({
                label: `${field.name}（${field.scope === "GLOBAL" ? "公共字段" : "页面字段"}）`,
                value: field.code
              }))}
            />
          </Form.Item>
          <Form.Item name="pageElementId" label="元素" rules={[{ required: true, message: "请选择元素" }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={fieldDrawerElements.map((element) => ({
                label: element.logicName,
                value: element.id
              }))}
            />
          </Form.Item>
          <Form.Item name="required" label="是否必填" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={requestMenu ? `${requestMenuActionMeta.label}：${requestMenu.menuName}` : requestMenuActionMeta.label}
        open={Boolean(requestMenu)}
        confirmLoading={requestSubmitting}
        onCancel={() => setRequestMenuId(undefined)}
        onOk={() => void submitRequest()}
        okText={requestMenuActionMeta.confirmText}
        okButtonProps={requestAction === "DISABLE" ? { danger: true } : undefined}
      >
        <Form form={requestForm} layout="vertical">
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 12 }}
            message={requestAction === "ENABLE" ? "当前账号有权限，可启用能力" : "当前账号有权限，可停用能力"}
          />
          <Form.Item
            name="capabilityTypes"
            label={requestAction === "ENABLE" ? "启用能力" : "停用能力"}
            rules={[{ required: true, message: "请至少选择一个能力" }]}
          >
            <Checkbox.Group
              options={[
                {
                  label:
                    requestAction === "ENABLE"
                      ? `智能提示（${requestMenu ? capabilityStatusMeta[requestMenu.promptStatus].label : "-"})`
                      : "智能提示（已开通）",
                  value: "PROMPT",
                  disabled: requestMenu ? (requestAction === "ENABLE" ? requestMenu.promptStatus !== "DISABLED" : requestMenu.promptStatus !== "ENABLED") : true
                },
                {
                  label:
                    requestAction === "ENABLE"
                      ? `作业编排（${requestMenu ? capabilityStatusMeta[requestMenu.jobStatus].label : "-"})`
                      : "作业编排（已开通）",
                  value: "JOB",
                  disabled: requestMenu ? (requestAction === "ENABLE" ? requestMenu.jobStatus !== "DISABLED" : requestMenu.jobStatus !== "ENABLED") : true
                }
              ]}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label={requestAction === "ENABLE" ? "启用说明" : "停用说明"}
            rules={[
              { required: true, message: requestAction === "ENABLE" ? "请填写启用说明" : "请填写停用说明" },
              { min: 10, message: requestAction === "ENABLE" ? "启用说明至少 10 个字，便于后续追溯" : "停用说明至少 10 个字，便于后续追溯" }
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={300}
              placeholder={
                requestAction === "ENABLE"
                  ? "例如：贷款审核菜单近期需要启用提示与作业能力，降低人工漏检风险。"
                  : "例如：当前菜单能力已接入新版方案，暂时停用旧能力以避免重复触发。"
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
