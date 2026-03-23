import {
  ApiOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  BulbOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  MenuOutlined,
  RobotOutlined,
  SettingOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { Alert, Button, Card, Drawer, Form, Input, Layout, Menu, Select, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  MockSessionProvider,
  isMockModeEnabled,
  mockUserPersonaMetaMap,
  mockUserPersonaOptions,
  type MockUserPersona,
  useMockSession
} from "../session/mockSession";

const { Header, Sider, Content } = Layout;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  menuResourcePath: string;
};

const navItems: NavItem[] = [
  { key: "/page-management", label: "菜单管理", icon: <AppstoreOutlined />, menuResourcePath: "/menu/page-management" },
  { key: "/prompts", label: "智能提示", icon: <BulbOutlined />, menuResourcePath: "/menu/prompts" },
  { key: "/jobs", label: "作业编排", icon: <RobotOutlined />, menuResourcePath: "/menu/jobs" },
  { key: "/interfaces", label: "API注册", icon: <ApiOutlined />, menuResourcePath: "/menu/interfaces" },
  { key: "/run-records", label: "运行记录", icon: <FileSearchOutlined />, menuResourcePath: "/menu/run-records" },
  { key: "/public-fields", label: "公共字段", icon: <DatabaseOutlined />, menuResourcePath: "/menu/public-fields" },
  { key: "/roles", label: "角色管理", icon: <TeamOutlined />, menuResourcePath: "/menu/roles" },
  { key: "/advanced", label: "高级配置", icon: <SettingOutlined />, menuResourcePath: "/menu/advanced" }
];

const HeaderBar = styled(Header)`
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-top-region-bg);
  color: var(--color-top-region-text);
  padding: var(--space-12) var(--space-24);
  min-height: 76px;
  border-bottom: 1px solid var(--color-top-region-border);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
`;

const LogoBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
`;

const LogoPill = styled.span`
  width: fit-content;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: var(--font-12);
  line-height: var(--lh-12);
  letter-spacing: 0.6px;
  color: var(--color-primary);
  background: rgba(22, 119, 255, 0.08);
  border: 1px solid rgba(22, 119, 255, 0.2);
`;

const LogoTitle = styled(Typography.Text)`
  color: var(--color-top-region-text);
`;

const LogoSubtitle = styled(Typography.Text)`
  color: var(--color-top-region-text-muted);
  font-weight: 500;
`;

const ContentWrap = styled(Content)`
  margin: var(--space-24) var(--space-24) var(--space-24) var(--space-16);
  padding: var(--space-24);
  border-radius: var(--radius-16);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-1);

  @media (max-width: 1024px) {
    margin: var(--space-16);
    padding: var(--space-16);
  }
`;

const StyledSider = styled(Sider)`
  border-inline-end: 1px solid var(--color-border);
  background: var(--color-surface) !important;
  margin: var(--space-16) 0 var(--space-16) var(--space-16);
  border-radius: var(--radius-16);
  overflow: hidden;
  box-shadow: var(--shadow-1);

  @media (max-width: 1024px) {
    display: none;
  }
`;

const MainLayout = styled(Layout)`
  background: transparent;
`;

const ShellBody = styled(Layout)`
  background: transparent;
`;

const SiderInner = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-16) var(--space-8);
`;

const SideTitle = styled(Typography.Text)`
  color: var(--color-text-secondary);
  margin: 0 var(--space-8) var(--space-8);
`;

const SideMenu = styled(Menu)`
  border-inline-end: 0 !important;
  background: transparent !important;
`;

const MobileNavButton = styled(Button)`
  display: none;
  color: var(--color-top-region-text);
  background: #f8fafc;
  border-color: #d7e1ec;

  &:hover,
  &:focus {
    color: var(--color-top-region-text) !important;
    border-color: #b8c7da !important;
    background: #eef3fa !important;
  }

  @media (max-width: 1024px) {
    display: inline-flex;
  }
`;

const HeaderActions = styled(Space)`
  .ant-btn-default {
    color: var(--color-top-region-text);
    background: #f8fafc;
    border-color: #d7e1ec;
  }

  .ant-select-selector {
    background: #f8fafc !important;
    border-color: #d7e1ec !important;
    color: var(--color-top-region-text) !important;
  }

  .ant-select-selection-item,
  .ant-select-selection-placeholder {
    color: var(--color-top-region-text) !important;
  }

  .ant-select-arrow {
    color: var(--color-top-region-text);
  }
`;

const LoginLayout = styled.div`
  width: 100%;
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 460px;
  border-radius: 14px;
  box-shadow: var(--shadow-1);
`;

function normalizePath(pathname: string) {
  return pathname;
}

function getSelectedKey(pathname: string) {
  const normalized = normalizePath(pathname);
  const matched = navItems.find((item) => {
    return normalized.startsWith(item.key);
  });
  return matched?.key ?? "/page-management";
}

function renderMenuItems(items: NavItem[]) {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link to={item.key}>{item.label}</Link>
  }));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<MockUserPersona>(() => {
    const cached = window.localStorage.getItem("config-center:mock-persona");
    const legacyMap: Record<string, MockUserPersona> = {
      CONFIG_USER: "CONFIG_OPERATOR_BRANCH",
      PUBLISH_MANAGER: "CONFIG_OPERATOR_HEAD",
      MENU_ADMIN: "PERMISSION_ADMIN_HEAD"
    };
    if (cached && legacyMap[cached]) {
      return legacyMap[cached];
    }
    if (cached && cached in mockUserPersonaMetaMap) {
      return cached as MockUserPersona;
    }
    return "CONFIG_OPERATOR_BRANCH";
  });

  return (
    <MockSessionProvider value={{ persona, setPersona }}>
      <AppShellLayout>{children}</AppShellLayout>
    </MockSessionProvider>
  );
}

function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { persona, setPersona, hasResource, meta: currentMeta, isAuthenticated, login, logout, authLoading, currentUserId } =
    useMockSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm] = Form.useForm<{ userId: string; password: string }>();
  const selected = getSelectedKey(location.pathname);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => hasResource(item.menuResourcePath));
  }, [hasResource]);

  useEffect(() => {
    if (!isMockModeEnabled) {
      return;
    }
    window.localStorage.setItem("config-center:mock-persona", persona);
  }, [persona]);

  useEffect(() => {
    if (isMockModeEnabled || isAuthenticated) {
      return;
    }
    loginForm.setFieldsValue({
      userId: currentUserId
    });
  }, [currentUserId, isAuthenticated, loginForm]);

  useEffect(() => {
    if (!isMockModeEnabled && !isAuthenticated) {
      return;
    }
    const normalized = normalizePath(location.pathname);
    const canAccess = visibleNavItems.some((item) => {
      return normalized.startsWith(item.key);
    });
    if (!canAccess) {
      navigate(currentMeta.defaultPath, { replace: true });
    }
  }, [currentMeta.defaultPath, isAuthenticated, location.pathname, navigate, visibleNavItems]);

  async function handleFormalLogin(values: { userId: string; password: string }) {
    setLoginError("");
    try {
      await login(values);
      const target = visibleNavItems[0]?.key ?? currentMeta.defaultPath;
      navigate(target, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败，请核对账号与密码后重试";
      setLoginError(message);
    }
  }

  if (!isMockModeEnabled && !isAuthenticated) {
    return (
      <MainLayout style={{ minHeight: "100vh" }}>
        <HeaderBar>
          <LogoBlock>
            <LogoPill>CONFIG CENTER</LogoPill>
            <LogoTitle className="type-20">营小助配置中心</LogoTitle>
            <LogoSubtitle className="type-12">统一身份登录</LogoSubtitle>
          </LogoBlock>
        </HeaderBar>
        <LoginLayout>
          <LoginCard title="欢迎登录">
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              请输入登录账号与密码，系统将自动识别所属机构并加载可访问的功能模块。
            </Typography.Paragraph>
            {loginError ? (
              <Alert type="error" showIcon message={loginError} style={{ marginBottom: 12 }} />
            ) : null}
            <Form form={loginForm} layout="vertical" onFinish={handleFormalLogin}>
              <Form.Item name="userId" label="登录账号" rules={[{ required: true, message: "请输入登录账号" }]}>
                <Input placeholder="请输入登录账号" autoComplete="username" />
              </Form.Item>
              <Form.Item name="password" label="登录密码" rules={[{ required: true, message: "请输入登录密码" }]}>
                <Input.Password placeholder="请输入登录密码" autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={authLoading}>
                进入配置中心
              </Button>
            </Form>
          </LoginCard>
        </LoginLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout style={{ minHeight: "100vh" }}>
      <HeaderBar>
        <LogoBlock>
          <LogoPill>CONFIG CENTER</LogoPill>
          <LogoTitle className="type-20">营小助配置中心</LogoTitle>
          <LogoSubtitle className="type-12">
            {isMockModeEnabled
              ? `模拟身份：${currentMeta.label} · ${currentMeta.description}`
              : `当前用户：${currentMeta.label} · ${currentMeta.description}`}
          </LogoSubtitle>
        </LogoBlock>
        <HeaderActions size={8}>
          {isMockModeEnabled ? (
            <Select
              value={persona}
              size="small"
              style={{ minWidth: 172 }}
              onChange={(next) => setPersona(next as MockUserPersona)}
              options={mockUserPersonaOptions}
            />
          ) : null}
          {!isMockModeEnabled ? (
            <Button icon={<LogoutOutlined />} onClick={logout}>
              退出登录
            </Button>
          ) : null}
          <MobileNavButton icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)}>
            导航
          </MobileNavButton>
        </HeaderActions>
      </HeaderBar>
      <ShellBody>
        <StyledSider width={248} theme="light">
          <SiderInner>
            <SideTitle className="type-12">业务导航</SideTitle>
            <SideMenu mode="inline" selectedKeys={[selected]} items={renderMenuItems(visibleNavItems)} style={{ height: "100%" }} />
          </SiderInner>
        </StyledSider>
        <ContentWrap>{children}</ContentWrap>
      </ShellBody>
      <Drawer title="业务导航" placement="left" width={248} onClose={() => setDrawerOpen(false)} open={drawerOpen}>
        <SideMenu mode="inline" selectedKeys={[selected]} items={renderMenuItems(visibleNavItems)} onClick={() => setDrawerOpen(false)} />
      </Drawer>
    </MainLayout>
  );
}
