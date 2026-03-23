import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getRoleTypeRecommendedResourcePaths } from "../permissionPolicy";
import { configCenterService } from "../services/configCenterService";
import { backendRequest, getBackendAuthContext, setBackendAuthContext } from "../services/backendApi";
import { ROLE_PERMISSIONS_CHANGED_EVENT } from "./sessionEvents";
import type { RoleItem } from "../types";

export const isMockModeEnabled = import.meta.env.VITE_ENABLE_MOCK_MODE === "true";

const FORMAL_SESSION_STORAGE_KEY = "config-center:formal-session";

type FormalSessionState = {
  userId: string;
  orgId: string;
  roleTypes: RoleItem["roleType"][];
  resourcePaths: string[];
};

type BackendSessionMeView = {
  userId: string;
  orgId: string;
  roles: Array<{ roleType: RoleItem["roleType"] }>;
  resourcePaths: string[];
};

type BackendLoginView = {
  idToken: string;
  expiresAtEpochSecond: number;
  userId: string;
  orgId: string;
  roleIds: string[];
};

export type MockUserPersona =
  | "CONFIG_OPERATOR_BRANCH"
  | "PERMISSION_ADMIN_BRANCH"
  | "PERMISSION_ADMIN_HEAD"
  | "CONFIG_OPERATOR_HEAD"
  | "TECH_SUPPORT_HEAD"
  | "CONFIG_USER"
  | "PUBLISH_MANAGER"
  | "MENU_ADMIN";

export type MockUserPersonaMeta = {
  label: string;
  description: string;
  defaultPath: string;
  roleType: RoleItem["roleType"];
  orgScopeId: string;
  operatorId: string;
  resourcePaths: string[];
  deprecated?: boolean;
};

export type MockViewerContext = Pick<MockUserPersonaMeta, "orgScopeId" | "roleType" | "operatorId">;

function buildPersonaResourcePaths(roleType: RoleItem["roleType"], orgScopeId: string) {
  return getRoleTypeRecommendedResourcePaths(roleType, orgScopeId);
}

function resolvePrimaryRoleType(roleTypes: RoleItem["roleType"][]): RoleItem["roleType"] {
  if (roleTypes.includes("PERMISSION_ADMIN")) {
    return "PERMISSION_ADMIN";
  }
  if (roleTypes.includes("TECH_SUPPORT")) {
    return "TECH_SUPPORT";
  }
  return "CONFIG_OPERATOR";
}

function resolveDefaultPath(roleType: RoleItem["roleType"]) {
  if (roleType === "PERMISSION_ADMIN") {
    return "/roles";
  }
  if (roleType === "TECH_SUPPORT") {
    return "/run-records";
  }
  return "/page-management";
}

function roleTypeLabel(roleType: RoleItem["roleType"]) {
  if (roleType === "PERMISSION_ADMIN") {
    return "权限管理员";
  }
  if (roleType === "TECH_SUPPORT") {
    return "技术支持";
  }
  return "配置运营";
}

function normalizeRoleTypes(values: unknown[]): RoleItem["roleType"][] {
  return Array.from(
    new Set(
      values.filter((value): value is RoleItem["roleType"] => {
        return value === "CONFIG_OPERATOR" || value === "PERMISSION_ADMIN" || value === "TECH_SUPPORT";
      })
    )
  );
}

function normalizeResourcePaths(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

function isSameStringArray(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => item === right[index]);
}

function isSameFormalSession(left: FormalSessionState | null, right: FormalSessionState) {
  if (!left) {
    return false;
  }
  return (
    left.userId === right.userId &&
    left.orgId === right.orgId &&
    isSameStringArray(left.roleTypes, right.roleTypes) &&
    isSameStringArray(left.resourcePaths, right.resourcePaths)
  );
}

function readFormalSessionFromStorage(): FormalSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FORMAL_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<FormalSessionState>;
    if (!parsed.userId || !parsed.orgId) {
      return null;
    }
    const roleTypes = normalizeRoleTypes(Array.isArray(parsed.roleTypes) ? parsed.roleTypes : []);
    if (roleTypes.length === 0) {
      return null;
    }
    return {
      userId: parsed.userId,
      orgId: parsed.orgId,
      roleTypes,
      resourcePaths: normalizeResourcePaths(Array.isArray(parsed.resourcePaths) ? parsed.resourcePaths : [])
    };
  } catch {
    return null;
  }
}

function persistFormalSession(next: FormalSessionState | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!next) {
      window.localStorage.removeItem(FORMAL_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(FORMAL_SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write failures.
  }
}

export const mockUserPersonaMetaMap: Record<MockUserPersona, MockUserPersonaMeta> = {
  CONFIG_OPERATOR_BRANCH: {
    label: "配置人员-华东",
    description: "负责业务配置、校验与发布，范围限定在华东机构。",
    defaultPath: "/page-management",
    roleType: "CONFIG_OPERATOR",
    orgScopeId: "branch-east",
    operatorId: "person-zhao-yi",
    resourcePaths: buildPersonaResourcePaths("CONFIG_OPERATOR", "branch-east")
  },
  PERMISSION_ADMIN_BRANCH: {
    label: "权限管理人员-华东",
    description: "负责角色授权管理，不承担业务发布执行。",
    defaultPath: "/roles",
    roleType: "PERMISSION_ADMIN",
    orgScopeId: "branch-east",
    operatorId: "person-wu-zhuguan",
    resourcePaths: buildPersonaResourcePaths("PERMISSION_ADMIN", "branch-east")
  },
  PERMISSION_ADMIN_HEAD: {
    label: "权限管理人员-总行",
    description: "可执行总行范围角色授权，并可分配高权限操作。",
    defaultPath: "/roles",
    roleType: "PERMISSION_ADMIN",
    orgScopeId: "head-office",
    operatorId: "person-head-admin-a",
    resourcePaths: buildPersonaResourcePaths("PERMISSION_ADMIN", "head-office")
  },
  CONFIG_OPERATOR_HEAD: {
    label: "配置人员-总行",
    description: "负责总行范围配置、校验与发布，并可执行菜单启用等高权限动作。",
    defaultPath: "/page-management",
    roleType: "CONFIG_OPERATOR",
    orgScopeId: "head-office",
    operatorId: "person-head-config-a",
    resourcePaths: buildPersonaResourcePaths("CONFIG_OPERATOR", "head-office")
  },
  TECH_SUPPORT_HEAD: {
    label: "技术支持人员-总行",
    description: "用于总行排障和审计查看，不参与业务配置发布。",
    defaultPath: "/run-records",
    roleType: "TECH_SUPPORT",
    orgScopeId: "head-office",
    operatorId: "person-platform-support-a",
    resourcePaths: buildPersonaResourcePaths("TECH_SUPPORT", "head-office")
  },
  CONFIG_USER: {
    label: "业务配置人员",
    description: "历史兼容身份，建议使用“配置人员-华东”。",
    defaultPath: "/page-management",
    roleType: "CONFIG_OPERATOR",
    orgScopeId: "branch-east",
    operatorId: "person-zhao-yi",
    resourcePaths: buildPersonaResourcePaths("CONFIG_OPERATOR", "branch-east"),
    deprecated: true
  },
  PUBLISH_MANAGER: {
    label: "发布管理员",
    description: "历史兼容身份，建议使用“配置人员-总行”。",
    defaultPath: "/page-management",
    roleType: "CONFIG_OPERATOR",
    orgScopeId: "head-office",
    operatorId: "person-head-config-a",
    resourcePaths: buildPersonaResourcePaths("CONFIG_OPERATOR", "head-office"),
    deprecated: true
  },
  MENU_ADMIN: {
    label: "菜单开通管理员",
    description: "历史兼容身份，建议使用“权限管理人员-总行”。",
    defaultPath: "/page-management",
    roleType: "PERMISSION_ADMIN",
    orgScopeId: "head-office",
    operatorId: "person-head-admin-a",
    resourcePaths: buildPersonaResourcePaths("PERMISSION_ADMIN", "head-office"),
    deprecated: true
  }
};

type MockSessionContextValue = {
  persona: MockUserPersona;
  setPersona: (persona: MockUserPersona) => void;
  effectiveResourcePaths: string[];
  isAuthenticated: boolean;
  authLoading: boolean;
  currentUserId: string;
  currentOrgId: string;
  login: (payload: { userId: string; password: string }) => Promise<void>;
  logout: () => void;
  formalSession: FormalSessionState | null;
};

export const mockUserPersonaOptions = (Object.entries(mockUserPersonaMetaMap) as Array<
  [MockUserPersona, MockUserPersonaMeta]
>)
  .filter(([, meta]) => !meta.deprecated)
  .map(([value, meta]) => ({
    value,
    label: meta.label
  }));

const MockSessionContext = createContext<MockSessionContextValue | null>(null);

export function MockSessionProvider({
  value,
  children
}: {
  value: Pick<MockSessionContextValue, "persona" | "setPersona">;
  children: React.ReactNode;
}) {
  const baseMeta = mockUserPersonaMetaMap[value.persona];
  const [effectiveResourcePaths, setEffectiveResourcePaths] = useState<string[]>([]);
  const [formalSession, setFormalSession] = useState<FormalSessionState | null>(() => readFormalSessionFromStorage());
  const [authLoading, setAuthLoading] = useState(false);

  const loadMockResourcePaths = useCallback(async () => {
    try {
      const [roles, bindings, resources] = await Promise.all([
        configCenterService.listRoles(),
        configCenterService.listUserRoleBindings(),
        configCenterService.listPermissionResources()
      ]);
      const activeRoleIds = new Set(roles.filter((role) => role.status === "ACTIVE").map((role) => role.id));
      const matchedRoleIds = Array.from(
        new Set(
          bindings
            .filter(
              (binding) =>
                binding.status === "ACTIVE" &&
                binding.userId === baseMeta.operatorId &&
                activeRoleIds.has(binding.roleId)
            )
            .map((binding) => binding.roleId)
        )
      );
      const grantGroups = await Promise.all(
        matchedRoleIds.map((roleId) => configCenterService.listRoleResourceGrants(roleId))
      );
      const activeResourcePathByCode = new Map(
        resources
          .filter((resource) => resource.status === "ACTIVE")
          .map((resource) => [resource.resourceCode, resource.resourcePath] as const)
      );
      const grantedPaths = grantGroups
        .flat()
        .map((grant) => activeResourcePathByCode.get(grant.resourceCode))
        .filter((resourcePath): resourcePath is string => Boolean(resourcePath));
      setEffectiveResourcePaths(Array.from(new Set(grantedPaths)));
    } catch {
      setEffectiveResourcePaths([]);
    }
  }, [baseMeta.operatorId]);

  const loadFormalSession = useCallback(
    async (payload: { userId: string; password?: string; orgIdHint?: string; silent?: boolean }) => {
      const normalizedUserId = payload.userId.trim();
      const normalizedPassword = payload.password ?? "";
      const normalizedOrgHint = payload.orgIdHint?.trim() ?? "";
      const silent = Boolean(payload.silent);
      if (!normalizedUserId) {
        throw new Error("登录账号不能为空");
      }
      if (!normalizedPassword && !silent) {
        throw new Error("请输入登录密码");
      }
      if (!silent) {
        setAuthLoading(true);
      }
      try {
        let idToken = "";
        let resolvedUserId = normalizedUserId;
        let resolvedOrgId = normalizedOrgHint;

        if (normalizedPassword) {
          const loginResult = await backendRequest<BackendLoginView>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
              userId: normalizedUserId,
              password: normalizedPassword
            })
          });
          idToken = loginResult.idToken?.trim() ?? "";
          if (!idToken) {
            throw new Error("登录失败，未获取到身份令牌，请稍后重试。");
          }
          resolvedUserId = loginResult.userId?.trim() || normalizedUserId;
          resolvedOrgId = loginResult.orgId?.trim() || normalizedOrgHint;
          const loginRoleTypes = normalizeRoleTypes(Array.isArray(loginResult.roleIds) ? loginResult.roleIds : []);
          setBackendAuthContext({
            idToken,
            userId: resolvedUserId,
            orgId: resolvedOrgId,
            roleIds: loginRoleTypes
          });
        } else {
          const existingAuth = getBackendAuthContext();
          idToken = existingAuth?.idToken?.trim() ?? "";
          if (!idToken) {
            throw new Error("登录态已失效，请重新输入账号密码登录。");
          }
          resolvedUserId = existingAuth?.userId?.trim() || normalizedUserId;
          resolvedOrgId = existingAuth?.orgId?.trim() || normalizedOrgHint;
        }

        if (!resolvedOrgId) {
          throw new Error("登录态缺少机构信息，请重新登录。");
        }

        const session = await backendRequest<BackendSessionMeView>(
          `/api/permissions/session/me?userId=${encodeURIComponent(resolvedUserId)}&orgId=${encodeURIComponent(resolvedOrgId)}`
        );
        const roleTypes = normalizeRoleTypes(
          Array.isArray(session.roles) ? session.roles.map((role) => role.roleType) : []
        );
        if (roleTypes.length === 0) {
          throw new Error("未查询到角色授权，请联系管理员分配角色后再登录。");
        }
        const normalized: FormalSessionState = {
          userId: session.userId?.trim() || resolvedUserId,
          orgId: session.orgId?.trim() || resolvedOrgId,
          roleTypes,
          resourcePaths: normalizeResourcePaths(Array.isArray(session.resourcePaths) ? session.resourcePaths : [])
        };
        setFormalSession((prev) => {
          if (isSameFormalSession(prev, normalized)) {
            return prev;
          }
          persistFormalSession(normalized);
          return normalized;
        });
        setEffectiveResourcePaths((prev) => {
          if (isSameStringArray(prev, normalized.resourcePaths)) {
            return prev;
          }
          return normalized.resourcePaths;
        });
        setBackendAuthContext({
          idToken,
          userId: normalized.userId,
          orgId: normalized.orgId,
          roleIds: normalized.roleTypes
        });
      } catch (error) {
        if (!silent) {
          setFormalSession(null);
          setEffectiveResourcePaths([]);
          persistFormalSession(null);
          setBackendAuthContext(null);
        }
        throw error;
      } finally {
        if (!silent) {
          setAuthLoading(false);
        }
      }
    },
    []
  );

  const login = useCallback(
    async (payload: { userId: string; password: string }) => {
      await loadFormalSession({
        userId: payload.userId,
        password: payload.password,
        silent: false
      });
    },
    [loadFormalSession]
  );

  const logout = useCallback(() => {
    setFormalSession(null);
    setEffectiveResourcePaths([]);
    persistFormalSession(null);
    setBackendAuthContext(null);
  }, []);

  useEffect(() => {
    let alive = true;

    async function initByMode() {
      if (isMockModeEnabled) {
        setBackendAuthContext(null);
        await loadMockResourcePaths();
        return;
      }

      if (formalSession) {
        setEffectiveResourcePaths(formalSession.resourcePaths);
        const existingAuth = getBackendAuthContext();
        if (existingAuth?.idToken) {
          setBackendAuthContext({
            idToken: existingAuth.idToken,
            userId: formalSession.userId,
            orgId: formalSession.orgId,
            roleIds: formalSession.roleTypes
          });
        } else {
          setBackendAuthContext(null);
        }
        try {
          await loadFormalSession({
            userId: formalSession.userId,
            orgIdHint: formalSession.orgId,
            silent: true
          });
        } catch {
          if (alive) {
            setFormalSession(null);
            setEffectiveResourcePaths([]);
            persistFormalSession(null);
            setBackendAuthContext(null);
          }
        }
      } else {
        setEffectiveResourcePaths([]);
        setBackendAuthContext(null);
      }
    }

    void initByMode();

    const handleRolesChanged = () => {
      if (isMockModeEnabled) {
        void loadMockResourcePaths();
        return;
      }
      if (formalSession) {
        void loadFormalSession({
          userId: formalSession.userId,
          orgIdHint: formalSession.orgId,
          silent: true
        }).catch(() => undefined);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(ROLE_PERMISSIONS_CHANGED_EVENT, handleRolesChanged);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(ROLE_PERMISSIONS_CHANGED_EVENT, handleRolesChanged);
      }
    };
  }, [baseMeta.operatorId, baseMeta.orgScopeId, baseMeta.roleType, formalSession, loadFormalSession, loadMockResourcePaths]);

  const contextValue = useMemo(
    () => ({
      ...value,
      effectiveResourcePaths,
      isAuthenticated: isMockModeEnabled ? true : Boolean(formalSession),
      authLoading,
      currentUserId: isMockModeEnabled ? baseMeta.operatorId : formalSession?.userId ?? "",
      currentOrgId: isMockModeEnabled ? baseMeta.orgScopeId : formalSession?.orgId ?? "",
      login,
      logout,
      formalSession
    }),
    [
      authLoading,
      baseMeta.operatorId,
      baseMeta.orgScopeId,
      effectiveResourcePaths,
      formalSession,
      login,
      logout,
      value
    ]
  );

  return <MockSessionContext.Provider value={contextValue}>{children}</MockSessionContext.Provider>;
}

export function useMockSession() {
  const context = useContext(MockSessionContext);
  if (!context) {
    throw new Error("useMockSession must be used within MockSessionProvider");
  }

  const meta: MockUserPersonaMeta = isMockModeEnabled
    ? mockUserPersonaMetaMap[context.persona]
    : (() => {
        const roleTypes = context.formalSession?.roleTypes ?? [];
        const roleType = resolvePrimaryRoleType(roleTypes);
        const userId = context.formalSession?.userId ?? "";
        const orgId = context.formalSession?.orgId ?? "";
        const resourcePaths = context.formalSession?.resourcePaths ?? [];
        const roleText = roleTypes.length > 0
          ? Array.from(new Set(roleTypes.map(roleTypeLabel))).join(" / ")
          : roleTypeLabel(roleType);
        return {
          label: userId || "未登录用户",
          description: orgId ? `机构：${orgId} · 角色：${roleText}` : "请登录后使用配置中心",
          defaultPath: resolveDefaultPath(roleType),
          roleType,
          orgScopeId: orgId,
          operatorId: userId,
          resourcePaths
        };
      })();

  const hasResource = (resourcePath: string) =>
    !isMockModeEnabled || context.effectiveResourcePaths.includes(resourcePath);

  return {
    ...context,
    meta,
    hasResource
  };
}

export function getMockPersonaMeta(persona: MockUserPersona): MockUserPersonaMeta {
  return mockUserPersonaMetaMap[persona];
}
