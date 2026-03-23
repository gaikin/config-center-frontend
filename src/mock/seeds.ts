import type {
  BusinessFieldDefinition,
  ContextVariableDefinition,
  DashboardOverview,
  GeneralConfigItem,
  JobExecutionRecord,
  PublishAuditLog,
  PublishPendingItem,
  PublishPendingSummary,
  InterfaceDefinition,
  JobExecutionSummary,
  JobNodeDefinition,
  JobNodeRunLog,
  JobSceneDefinition,
  MenuSdkPolicy,
  MenuCapabilityPolicy,
  MenuCapabilityRequest,
  PageElement,
  PageFieldBinding,
  PageMenu,
  PageResource,
  DataProcessorDefinition,
  PermissionResource,
  RoleItem,
  RoleResourceGrant,
  RuleCondition,
  RuleConditionGroup,
  RuleDefinition,
  PlatformRuntimeConfig,
  PromptHitRecord,
  UserRoleBinding
} from "../types";

const now = () => new Date().toISOString();

export const seedPageMenus: PageMenu[] = [
  {
    id: 101,
    regionId: "trade",
    menuName: "贷款申请",
    menuCode: "loan_apply",
    status: "ACTIVE",
    ownerOrgId: "branch-east"
  },
  {
    id: 102,
    regionId: "task",
    menuName: "贷款审核",
    menuCode: "loan_review",
    status: "ACTIVE",
    ownerOrgId: "branch-east"
  },
  {
    id: 201,
    regionId: "manage",
    menuName: "开户办理",
    menuCode: "open_account",
    status: "ACTIVE",
    ownerOrgId: "branch-south"
  },
  {
    id: 301,
    regionId: "business",
    menuName: "Loan Process",
    menuCode: "loan-process",
    status: "ACTIVE",
    ownerOrgId: "head-office"
  },
  {
    id: 302,
    regionId: "business",
    menuName: "Manual Review",
    menuCode: "manual-review",
    status: "ACTIVE",
    ownerOrgId: "head-office"
  }
];

export const seedPageResources: PageResource[] = [
  {
    id: 1001,
    menuCode: "loan-process",
    pageCode: "loan_apply_main",
    frameCode: "main-frame",
    name: "贷款申请主页面",
    status: "ACTIVE",
    ownerOrgId: "branch-east",
    currentVersion: 5,
    elementCount: 28,
    detectRulesSummary: "业务标识优先 + URL兜底",
    updatedAt: now()
  },
  {
    id: 1002,
    menuCode: "loan-process",
    pageCode: "loan_apply_collateral",
    frameCode: "collateral-iframe",
    name: "贷款申请抵押信息页",
    status: "ACTIVE",
    ownerOrgId: "branch-east",
    currentVersion: 3,
    elementCount: 12,
    detectRulesSummary: "pageCode + iframe 标记优先",
    updatedAt: now()
  },
  {
    id: 1003,
    menuCode: "manual-review",
    pageCode: "open_account_main",
    frameCode: "main-frame",
    name: "开户办理主页面",
    status: "DRAFT",
    ownerOrgId: "branch-south",
    currentVersion: 2,
    elementCount: 18,
    detectRulesSummary: "URL兜底",
    updatedAt: now()
  }
];

export const seedPageElements: PageElement[] = [
  {
    id: 12001,
    pageResourceId: 1001,
    logicName: "客户号",
    selector: "//*[@id='customer-id']",
    selectorType: "XPATH",
    frameLocation: "main-frame",
    updatedAt: now()
  },
  {
    id: 12002,
    pageResourceId: 1001,
    logicName: "客户证件号",
    selector: "#id-no",
    selectorType: "CSS",
    frameLocation: "main-frame",
    updatedAt: now()
  },
  {
    id: 12004,
    pageResourceId: 1001,
    logicName: "客户手机号",
    selector: "#mobile",
    selectorType: "CSS",
    frameLocation: "main-frame",
    updatedAt: now()
  },
  {
    id: 12005,
    pageResourceId: 1002,
    logicName: "抵押物类型",
    selector: "//*[@id='collateral-type']",
    selectorType: "XPATH",
    frameLocation: "collateral-iframe",
    updatedAt: now()
  },
  {
    id: 12003,
    pageResourceId: 1003,
    logicName: "开户用途",
    selector: "//*[@name='purpose']",
    selectorType: "XPATH",
    frameLocation: "main-frame",
    updatedAt: now()
  }
];

export const seedBusinessFields: BusinessFieldDefinition[] = [
  {
    id: 13001,
    code: "customer_id",
    name: "客户号",
    scope: "GLOBAL",
    valueType: "STRING",
    required: true,
    description: "跨菜单公共字段，用于客户唯一标识。",
    ownerOrgId: "head-office",
    status: "ACTIVE",
    currentVersion: 3,
    aliases: ["cust_id", "client_id"],
    updatedAt: now()
  },
  {
    id: 13002,
    code: "id_no",
    name: "证件号",
    scope: "GLOBAL",
    valueType: "STRING",
    required: true,
    description: "跨页面公共字段，用于接口入参与规则条件复用。",
    ownerOrgId: "head-office",
    status: "ACTIVE",
    currentVersion: 2,
    aliases: ["certificate_no"],
    updatedAt: now()
  },
  {
    id: 13003,
    code: "mobile",
    name: "手机号",
    scope: "GLOBAL",
    valueType: "STRING",
    required: false,
    description: "客户联系方式公共字段。",
    ownerOrgId: "head-office",
    status: "ACTIVE",
    currentVersion: 2,
    aliases: ["mobile_phone"],
    updatedAt: now()
  },
  {
    id: 13004,
    code: "collateral_type",
    name: "抵押物类型",
    scope: "PAGE_RESOURCE",
    pageResourceId: 1002,
    valueType: "STRING",
    required: false,
    description: "贷款申请抵押页特有字段。",
    ownerOrgId: "branch-east",
    status: "ACTIVE",
    currentVersion: 1,
    aliases: [],
    updatedAt: now()
  },
  {
    id: 13005,
    code: "account_purpose",
    name: "开户用途",
    scope: "PAGE_RESOURCE",
    pageResourceId: 1003,
    valueType: "STRING",
    required: false,
    description: "开户页面特有字段。",
    ownerOrgId: "branch-south",
    status: "ACTIVE",
    currentVersion: 1,
    aliases: [],
    updatedAt: now()
  }
];

export const seedPageFieldBindings: PageFieldBinding[] = [
  {
    id: 14001,
    pageResourceId: 1001,
    businessFieldCode: "customer_id",
    pageElementId: 12001,
    required: true,
    updatedAt: now()
  },
  {
    id: 14002,
    pageResourceId: 1001,
    businessFieldCode: "id_no",
    pageElementId: 12002,
    required: true,
    updatedAt: now()
  },
  {
    id: 14003,
    pageResourceId: 1001,
    businessFieldCode: "mobile",
    pageElementId: 12004,
    required: false,
    updatedAt: now()
  },
  {
    id: 14004,
    pageResourceId: 1002,
    businessFieldCode: "collateral_type",
    pageElementId: 12005,
    required: false,
    updatedAt: now()
  },
  {
    id: 14005,
    pageResourceId: 1003,
    businessFieldCode: "account_purpose",
    pageElementId: 12003,
    required: false,
    updatedAt: now()
  }
];

export const seedPlatformRuntimeConfig: PlatformRuntimeConfig = {
  promptStableVersion: "1.3.0",
  promptGrayDefaultVersion: "1.4.0-rc.2",
  jobStableVersion: "2.1.0",
  jobGrayDefaultVersion: "2.2.0-rc.1",
  updatedBy: "person-platform-admin"
};

export const seedGeneralConfigItems: GeneralConfigItem[] = [
  {
    id: 3701,
    groupKey: "platform-runtime",
    itemKey: "promptStableVersion",
    itemValue: seedPlatformRuntimeConfig.promptStableVersion,
    description: "智能提示正式版本",
    status: "ACTIVE",
    orderNo: 1,
    updatedAt: now()
  },
  {
    id: 3702,
    groupKey: "platform-runtime",
    itemKey: "promptGrayDefaultVersion",
    itemValue: seedPlatformRuntimeConfig.promptGrayDefaultVersion ?? "",
    description: "智能提示默认灰度版本",
    status: "ACTIVE",
    orderNo: 2,
    updatedAt: now()
  },
  {
    id: 3703,
    groupKey: "platform-runtime",
    itemKey: "jobStableVersion",
    itemValue: seedPlatformRuntimeConfig.jobStableVersion,
    description: "智能作业正式版本",
    status: "ACTIVE",
    orderNo: 3,
    updatedAt: now()
  },
  {
    id: 3704,
    groupKey: "platform-runtime",
    itemKey: "jobGrayDefaultVersion",
    itemValue: seedPlatformRuntimeConfig.jobGrayDefaultVersion ?? "",
    description: "智能作业默认灰度版本",
    status: "ACTIVE",
    orderNo: 4,
    updatedAt: now()
  },
  {
    id: 3705,
    groupKey: "region",
    itemKey: "trade",
    itemValue: "交易中心",
    description: "交易中心专区",
    status: "ACTIVE",
    orderNo: 1,
    updatedAt: now()
  },
  {
    id: 3706,
    groupKey: "region",
    itemKey: "task",
    itemValue: "任务中心",
    description: "任务中心专区",
    status: "ACTIVE",
    orderNo: 2,
    updatedAt: now()
  },
  {
    id: 3707,
    groupKey: "region",
    itemKey: "manage",
    itemValue: "管理中心",
    description: "管理中心专区",
    status: "ACTIVE",
    orderNo: 3,
    updatedAt: now()
  },
  {
    id: 3708,
    groupKey: "region",
    itemKey: "business",
    itemValue: "业务入口",
    description: "业务入口专区",
    status: "ACTIVE",
    orderNo: 4,
    updatedAt: now()
  }
];

export const seedMenuSdkPolicies: MenuSdkPolicy[] = [
  {
    id: 8201,
    menuId: 101,
    menuCode: "loan_apply",
    regionId: "trade",
    promptGrayEnabled: true,
    promptGrayVersion: "1.4.0-rc.2",
    promptGrayOrgIds: ["branch-east", "branch-east-sub1"],
    jobGrayEnabled: false,
    jobGrayVersion: undefined,
    jobGrayOrgIds: [],
    effectiveStart: "2026-03-14 09:00",
    effectiveEnd: "2026-03-31 23:59",
    status: "DRAFT",
    ownerOrgId: "head-office"
  },
  {
    id: 8202,
    menuId: 201,
    menuCode: "open_account",
    regionId: "manage",
    promptGrayEnabled: false,
    promptGrayVersion: undefined,
    promptGrayOrgIds: [],
    jobGrayEnabled: true,
    jobGrayVersion: "2.2.0-rc.1",
    jobGrayOrgIds: ["branch-south"],
    effectiveStart: "2026-03-14 09:00",
    effectiveEnd: "2026-12-31 23:59",
    status: "ACTIVE",
    ownerOrgId: "head-office"
  }
];

export const seedMenuCapabilityPolicies: MenuCapabilityPolicy[] = [
  {
    id: 8401,
    menuId: 101,
    promptStatus: "ENABLED",
    jobStatus: "ENABLED",
    status: "ACTIVE"
  },
  {
    id: 8402,
    menuId: 102,
    promptStatus: "DISABLED",
    jobStatus: "DISABLED",
    status: "DRAFT"
  },
  {
    id: 8403,
    menuId: 201,
    promptStatus: "DISABLED",
    jobStatus: "ENABLED",
    status: "DRAFT"
  }
];

export const seedMenuCapabilityRequests: MenuCapabilityRequest[] = [];

export const seedInterfaces: InterfaceDefinition[] = [
  {
    id: 3001,
    name: "客户风险评分查询",
    description: "查询客户风险评分并返回风险等级信息。",
    method: "POST",
    testPath: "/test/risk/score/query",
    prodPath: "/risk/score/query",
    url: "/risk/score/query",
    status: "ACTIVE",
    ownerOrgId: "branch-east",
    currentVersion: 3,
    timeoutMs: 3000,
    retryTimes: 1,
    bodyTemplateJson: "{\"customerId\":\"{{customer_id}}\"}",
    inputConfigJson:
      "{\"headers\":[],\"query\":[],\"path\":[],\"body\":[{\"id\":\"body-1\",\"name\":\"customerId\",\"description\":\"客户号\",\"valueType\":\"STRING\",\"validationConfig\":{\"required\":true,\"regexMode\":\"NONE\"}}]}",
    outputConfigJson:
      "[{\"id\":\"out-1\",\"name\":\"score\",\"path\":\"$.data.score\",\"description\":\"风险评分\",\"valueType\":\"NUMBER\"},{\"id\":\"out-2\",\"name\":\"riskLevel\",\"path\":\"$.data.riskLevel\",\"description\":\"风险等级\",\"valueType\":\"STRING\"}]",
    paramSourceSummary: "客户号来自页面元素 customer_id",
    responsePath: "$.data.score",
    maskSensitive: true,
    updatedAt: now()
  },
  {
    id: 3002,
    name: "客户基础信息查询",
    description: "查询客户基础资料，支持开户场景补全信息。",
    method: "POST",
    testPath: "/test/customer/profile/query",
    prodPath: "/customer/profile/query",
    url: "/customer/profile/query",
    status: "DRAFT",
    ownerOrgId: "branch-south",
    currentVersion: 1,
    timeoutMs: 3000,
    retryTimes: 0,
    bodyTemplateJson: "{\"idNo\":\"{{id_no}}\"}",
    inputConfigJson:
      "{\"headers\":[],\"query\":[],\"path\":[],\"body\":[{\"id\":\"body-2\",\"name\":\"idNo\",\"description\":\"证件号\",\"valueType\":\"STRING\",\"validationConfig\":{\"required\":true,\"regexMode\":\"NONE\"}}]}",
    outputConfigJson:
      "[{\"id\":\"out-3\",\"name\":\"profile\",\"path\":\"$.data.profile\",\"description\":\"客户档案\",\"valueType\":\"OBJECT\",\"children\":[{\"id\":\"out-3-1\",\"name\":\"name\",\"path\":\"$.data.profile.name\",\"description\":\"姓名\",\"valueType\":\"STRING\"},{\"id\":\"out-3-2\",\"name\":\"mobile\",\"path\":\"$.data.profile.mobile\",\"description\":\"手机号\",\"valueType\":\"STRING\"}]}]",
    paramSourceSummary: "身份证号来自页面元素 id_no",
    responsePath: "$.data.profile",
    maskSensitive: true,
    updatedAt: now()
  }
];

export const seedDataProcessors: DataProcessorDefinition[] = [
  {
    id: 3511,
    name: "字符串去空格",
    paramCount: 1,
    functionCode: "function transform(input) { return String(input ?? '').trim(); }",
    status: "ACTIVE",
    usedByCount: 22,
    updatedAt: now()
  },
  {
    id: 3512,
    name: "日期转 yyyy-MM-dd",
    paramCount: 1,
    functionCode:
      "function transform(input) { const d = new Date(String(input ?? '')); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }",
    status: "ACTIVE",
    usedByCount: 14,
    updatedAt: now()
  },
  {
    id: 3513,
    name: "手机号脱敏",
    paramCount: 1,
    functionCode:
      "function transform(input) { const digits = String(input ?? '').replace(/\\\\D/g, ''); return digits.length >= 7 ? `${digits.slice(0, 3)}****${digits.slice(-4)}` : String(input ?? ''); }",
    status: "DRAFT",
    usedByCount: 4,
    updatedAt: now()
  }
];

export const seedJobScenes: JobSceneDefinition[] = [];

export const seedJobNodes: JobNodeDefinition[] = [];

export const seedRules: RuleDefinition[] = [
  {
    id: 4001,
    name: "贷款高风险强提示",
    ruleScope: "SHARED",
    ruleSetCode: "loan_high_risk_prompt",
    priority: 950,
    promptMode: "FLOATING",
    closeMode: "MANUAL_CLOSE",
    promptContentConfigJson:
      "{\"version\":1,\"titleSuffix\":\"贷款高风险客户\",\"bodyTemplate\":\"检测到客户 {{customer_id}} 风险等级为 {{riskLevel}}，请核对证件信息并确认是否继续办理。\"}",
    hasConfirmButton: true,
    sceneId: 5001,
    sceneName: "贷款申请自动查数预填",
    shareMode: "SHARED",
    sharedOrgIds: ["branch-south"],
    sharedBy: "person-zhao-yi",
    sharedAt: "2026-03-12T09:00:00.000Z",
    effectiveStartAt: "2026-03-01 00:00",
    effectiveEndAt: "2026-12-31 23:59",
    status: "ACTIVE",
    currentVersion: 6,
    ownerOrgId: "branch-east",
    updatedAt: now()
  },
  {
    id: 4002,
    name: "开户信息完整性提醒",
    ruleScope: "PAGE_RESOURCE",
    ruleSetCode: "open_account_integrity_prompt",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    priority: 700,
    promptMode: "SILENT",
    closeMode: "AUTO_CLOSE",
    promptContentConfigJson:
      "{\"version\":1,\"titleSuffix\":\"开户资料补录\",\"bodyTemplate\":\"检测到开户用途缺失，请补充客户开户地址及用途说明后再继续提交。\"}",
    hasConfirmButton: false,
    shareMode: "PRIVATE",
    sharedOrgIds: [],
    status: "DRAFT",
    currentVersion: 1,
    ownerOrgId: "branch-south",
    updatedAt: now()
  }
];

export const seedRuleConditionGroups: RuleConditionGroup[] = [
  { id: 41001, ruleId: 4001, logicType: "AND", updatedAt: now() },
  { id: 41002, ruleId: 4001, logicType: "OR", parentGroupId: 41001, updatedAt: now() },
  { id: 42001, ruleId: 4002, logicType: "AND", updatedAt: now() }
];

export const seedRuleConditions: RuleCondition[] = [
  {
    id: 41101,
    ruleId: 4001,
    groupId: 41001,
    left: { sourceType: "INTERFACE_FIELD", key: "risk_score", dataProcessorIds: [] },
    operator: "GE",
    right: { sourceType: "CONST", key: "80", constValue: "80", dataProcessorIds: [] },
    updatedAt: now()
  },
  {
    id: 41102,
    ruleId: 4001,
    groupId: 41002,
    left: { sourceType: "CONTEXT", key: "user_role", dataProcessorIds: [] },
    operator: "EQ",
    right: { sourceType: "CONST", key: "new_staff", constValue: "new_staff", dataProcessorIds: [] },
    updatedAt: now()
  },
  {
    id: 41103,
    ruleId: 4001,
    groupId: 41002,
    left: {
      sourceType: "LIST_LOOKUP_FIELD",
      key: "risk_level",
      displayValue: "高风险客户名单.risk_level",
      valueType: "STRING",
      dataProcessorIds: [],
      listBinding: {
        listDataId: 6001,
        listDataName: "高风险客户名单",
        matchColumn: "customer_id",
        lookupSourceType: "PAGE_FIELD",
        lookupSourceValue: "customer_id",
        matchers: [
          { matchColumn: "customer_id", sourceType: "PAGE_FIELD", sourceValue: "customer_id" },
          { matchColumn: "id_no", sourceType: "PAGE_FIELD", sourceValue: "id_no" }
        ],
        resultField: "risk_level"
      }
    },
    operator: "EQ",
    right: { sourceType: "CONST", key: "HIGH", constValue: "HIGH", dataProcessorIds: [] },
    updatedAt: now()
  },
  {
    id: 42101,
    ruleId: 4002,
    groupId: 42001,
    left: { sourceType: "PAGE_FIELD", key: "account_purpose", dataProcessorIds: [3511] },
    operator: "EXISTS",
    updatedAt: now()
  }
];

export const seedPendingSummary: PublishPendingSummary = {
  draftCount: 5,
  expiringSoonCount: 1,
  validationFailedCount: 1,
  conflictCount: 0,
  riskConfirmPendingCount: 0
};

export const seedPendingItems: PublishPendingItem[] = [
  {
    id: 1,
    resourceType: "JOB_SCENE",
    resourceId: 5002,
    resourceName: "开户证件信息同步",
    status: "DRAFT",
    ownerOrgId: "branch-south",
    pendingType: "DRAFT",
    updatedAt: now()
  },
  {
    id: 2,
    resourceType: "RULE",
    resourceId: 4002,
    resourceName: "开户信息完整性提醒",
    status: "DRAFT",
    ownerOrgId: "branch-south",
    pendingType: "VALIDATION_FAILED",
    updatedAt: now()
  },
  {
    id: 3,
    resourceType: "RULE",
    resourceId: 4001,
    resourceName: "贷款高风险强提示",
    status: "ACTIVE",
    ownerOrgId: "branch-east",
    pendingType: "EXPIRING_SOON",
    updatedAt: now()
  },
  {
    id: 4,
    resourceType: "INTERFACE",
    resourceId: 3002,
    resourceName: "客户基础信息查询 API",
    status: "DRAFT",
    ownerOrgId: "branch-south",
    pendingType: "DRAFT",
    updatedAt: now()
  },
  {
    id: 5,
    resourceType: "PREPROCESSOR",
    resourceId: 3513,
    resourceName: "手机号脱敏",
    status: "DRAFT",
    ownerOrgId: "branch-east",
    pendingType: "DRAFT",
    updatedAt: now()
  },
  {
    id: 6,
    resourceType: "MENU_SDK_POLICY",
    resourceId: 8201,
    resourceName: "贷款申请菜单 SDK 灰度策略",
    status: "DRAFT",
    ownerOrgId: "head-office",
    pendingType: "DRAFT",
    updatedAt: now()
  }
];

export const seedContextVariables: ContextVariableDefinition[] = [
  {
    id: 3601,
    key: "org_id",
    label: "机构ID",
    valueSource: "STATIC",
    staticValue: "branch-east",
    status: "ACTIVE",
    ownerOrgId: "head-office",
    updatedAt: now()
  },
  {
    id: 3602,
    key: "operator_role",
    label: "操作员角色",
    valueSource: "SCRIPT",
    scriptContent: "return context.operator_role || context.user_role || '客户经理';",
    status: "ACTIVE",
    ownerOrgId: "head-office",
    updatedAt: now()
  },
  {
    id: 3603,
    key: "channel",
    label: "办理渠道",
    valueSource: "SCRIPT",
    scriptContent: "return context.channel || '柜面';",
    status: "ACTIVE",
    ownerOrgId: "head-office",
    updatedAt: now()
  },
  {
    id: 3604,
    key: "user_role",
    label: "用户角色",
    valueSource: "STATIC",
    staticValue: "新员工",
    status: "ACTIVE",
    ownerOrgId: "head-office",
    updatedAt: now()
  }
];

export const seedAuditLogs: PublishAuditLog[] = [
  {
    id: 9001,
    action: "PUBLISH",
    resourceType: "RULE",
    resourceId: 4001,
    resourceName: "贷款高风险强提示",
    operator: "person-li-manager",
    createdAt: now()
  },
  {
    id: 9002,
    action: "RISK_CONFIRM",
    resourceType: "JOB_SCENE",
    resourceId: 5001,
    resourceName: "贷款申请自动查数预填",
    operator: "person-wang-manager",
    createdAt: now()
  },
  {
    id: 9003,
    action: "ROLE_UPDATE",
    resourceType: "ROLE",
    resourceId: 7002,
    resourceName: "业务管理角色-华东",
    operator: "person-business-super-admin",
    createdAt: now()
  },
  {
    id: 9004,
    action: "VALIDATE",
    resourceType: "MENU_SDK_POLICY",
    resourceId: 8201,
    resourceName: "贷款申请菜单 SDK 灰度策略",
    operator: "person-business-manager-east",
    createdAt: now()
  }
];

export const seedPromptHitRecords: PromptHitRecord[] = [
  {
    id: 12001,
    ruleId: 4001,
    ruleName: "贷款高风险强提示",
    pageResourceId: 1001,
    pageResourceName: "贷款申请主页面",
    orgId: "branch-east",
    orgName: "华东分行",
    promptMode: "FLOATING",
    promptContentSummary: "检测到高风险客户，请核对风险评分并补充风险说明。",
    sceneId: 5001,
    sceneName: "贷款申请自动查数预填",
    triggerAt: now()
  },
  {
    id: 12002,
    ruleId: 4002,
    ruleName: "开户信息完整性提醒",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    orgId: "branch-south",
    orgName: "华南分行",
    promptMode: "SILENT",
    promptContentSummary: "开户用途缺失，请补录后继续办理。",
    sceneId: 5002,
    sceneName: "开户证件信息同步",
    triggerAt: now()
  }
];

export const seedJobExecutionRecords: JobExecutionRecord[] = [
  {
    id: 13001,
    sceneId: 5001,
    sceneName: "贷款申请自动查数预填",
    pageResourceId: 1001,
    pageResourceName: "贷款申请主页面",
    orgId: "branch-east",
    orgName: "华东分行",
    triggerSource: "PROMPT_CONFIRM",
    result: "SUCCESS",
    failureReasonSummary: "",
    startedAt: now(),
    finishedAt: now()
  },
  {
    id: 13002,
    sceneId: 5002,
    sceneName: "开户证件信息同步",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    orgId: "branch-south",
    orgName: "华南分行",
    triggerSource: "AUTO",
    result: "FAILED",
    failureReasonSummary: "页面元素缺失",
    startedAt: now(),
    finishedAt: now()
  },
  {
    id: 13003,
    sceneId: 5002,
    sceneName: "开户证件信息同步",
    pageResourceId: 1003,
    pageResourceName: "开户办理主页面",
    orgId: "branch-south",
    orgName: "华南分行",
    triggerSource: "MANUAL_RETRY",
    result: "FAILED",
    failureReasonSummary: "接口超时",
    startedAt: now(),
    finishedAt: now()
  }
];

export const seedJobExecutions: JobExecutionSummary[] = [];

export const seedJobNodeRunLogs: JobNodeRunLog[] = [];

export const seedRoles: RoleItem[] = [
  {
    id: 7001,
    name: "配置人员-华东",
    roleType: "CONFIG_OPERATOR",
    status: "ACTIVE",
    orgScopeId: "branch-east",
    memberCount: 16,
    updatedAt: now()
  },
  {
    id: 7002,
    name: "权限管理人员-华东",
    roleType: "PERMISSION_ADMIN",
    status: "ACTIVE",
    orgScopeId: "branch-east",
    memberCount: 8,
    updatedAt: now()
  },
  {
    id: 7003,
    name: "权限管理人员-总行",
    roleType: "PERMISSION_ADMIN",
    status: "ACTIVE",
    orgScopeId: "head-office",
    memberCount: 5,
    updatedAt: now()
  },
  {
    id: 7004,
    name: "技术支持人员-总行",
    roleType: "TECH_SUPPORT",
    status: "ACTIVE",
    orgScopeId: "head-office",
    memberCount: 4,
    updatedAt: now()
  },
  {
    id: 7005,
    name: "配置人员-总行",
    roleType: "CONFIG_OPERATOR",
    status: "ACTIVE",
    orgScopeId: "head-office",
    memberCount: 3,
    updatedAt: now()
  }
];

export const seedPermissionResources: PermissionResource[] = [
  {
    id: 91002,
    resourceCode: "menu_page_management",
    resourceName: "菜单管理菜单",
    resourceType: "MENU",
    resourcePath: "/menu/page-management",
    status: "ACTIVE",
    orderNo: 20,
    description: "导航入口：菜单管理",
    updatedAt: now()
  },
  {
    id: 91003,
    resourceCode: "menu_prompts",
    resourceName: "智能提示菜单",
    resourceType: "MENU",
    resourcePath: "/menu/prompts",
    status: "ACTIVE",
    orderNo: 30,
    description: "导航入口：智能提示",
    updatedAt: now()
  },
  {
    id: 91004,
    resourceCode: "menu_jobs",
    resourceName: "智能作业菜单",
    resourceType: "MENU",
    resourcePath: "/menu/jobs",
    status: "ACTIVE",
    orderNo: 40,
    description: "导航入口：智能作业",
    updatedAt: now()
  },
  {
    id: 91005,
    resourceCode: "menu_interfaces",
    resourceName: "API注册菜单",
    resourceType: "MENU",
    resourcePath: "/menu/interfaces",
    status: "ACTIVE",
    orderNo: 50,
    description: "导航入口：API注册",
    updatedAt: now()
  },
  {
    id: 91006,
    resourceCode: "menu_public_fields",
    resourceName: "公共字段菜单",
    resourceType: "MENU",
    resourcePath: "/menu/public-fields",
    status: "ACTIVE",
    orderNo: 60,
    description: "导航入口：公共字段",
    updatedAt: now()
  },
  {
    id: 91007,
    resourceCode: "menu_advanced",
    resourceName: "高级配置菜单",
    resourceType: "MENU",
    resourcePath: "/menu/advanced",
    status: "ACTIVE",
    orderNo: 70,
    description: "导航入口：高级配置",
    updatedAt: now()
  },
  {
    id: 91008,
    resourceCode: "menu_run_records",
    resourceName: "运行记录菜单",
    resourceType: "MENU",
    resourcePath: "/menu/run-records",
    status: "ACTIVE",
    orderNo: 65,
    description: "导航入口：运行记录",
    updatedAt: now()
  },
  {
    id: 91009,
    resourceCode: "menu_roles",
    resourceName: "角色管理菜单",
    resourceType: "MENU",
    resourcePath: "/menu/roles",
    status: "ACTIVE",
    orderNo: 68,
    description: "导航入口：角色管理",
    updatedAt: now()
  },
  {
    id: 91102,
    resourceCode: "page_page_management_list",
    resourceName: "菜单管理页面",
    resourceType: "PAGE",
    resourcePath: "/page/page-management/list",
    pagePath: "/page-management",
    status: "ACTIVE",
    orderNo: 120,
    description: "页面访问：菜单管理",
    updatedAt: now()
  },
  {
    id: 91103,
    resourceCode: "page_prompts_list",
    resourceName: "智能提示页面",
    resourceType: "PAGE",
    resourcePath: "/page/prompts/list",
    pagePath: "/prompts",
    status: "ACTIVE",
    orderNo: 130,
    description: "页面访问：智能提示",
    updatedAt: now()
  },
  {
    id: 91104,
    resourceCode: "page_jobs_list",
    resourceName: "智能作业页面",
    resourceType: "PAGE",
    resourcePath: "/page/jobs/list",
    pagePath: "/jobs",
    status: "ACTIVE",
    orderNo: 140,
    description: "页面访问：智能作业",
    updatedAt: now()
  },
  {
    id: 91105,
    resourceCode: "page_interfaces_list",
    resourceName: "API注册页面",
    resourceType: "PAGE",
    resourcePath: "/page/interfaces/list",
    pagePath: "/interfaces",
    status: "ACTIVE",
    orderNo: 150,
    description: "页面访问：API注册",
    updatedAt: now()
  },
  {
    id: 91106,
    resourceCode: "page_public_fields_list",
    resourceName: "公共字段页面",
    resourceType: "PAGE",
    resourcePath: "/page/public-fields/list",
    pagePath: "/public-fields",
    status: "ACTIVE",
    orderNo: 160,
    description: "页面访问：公共字段",
    updatedAt: now()
  },
  {
    id: 91107,
    resourceCode: "page_advanced_list",
    resourceName: "高级配置页面",
    resourceType: "PAGE",
    resourcePath: "/page/advanced/list",
    pagePath: "/advanced",
    status: "ACTIVE",
    orderNo: 170,
    description: "页面访问：高级配置",
    updatedAt: now()
  },
  {
    id: 91108,
    resourceCode: "page_run_records_list",
    resourceName: "运行记录页面",
    resourceType: "PAGE",
    resourcePath: "/page/run-records/list",
    pagePath: "/run-records",
    status: "ACTIVE",
    orderNo: 165,
    description: "页面访问：运行记录",
    updatedAt: now()
  },
  {
    id: 91109,
    resourceCode: "page_roles_list",
    resourceName: "角色管理页面",
    resourceType: "PAGE",
    resourcePath: "/page/roles/list",
    pagePath: "/roles",
    status: "ACTIVE",
    orderNo: 168,
    description: "页面访问：角色管理",
    updatedAt: now()
  },
  {
    id: 91201,
    resourceCode: "action_common_view",
    resourceName: "查看能力",
    resourceType: "ACTION",
    resourcePath: "/action/common/base/view",
    status: "ACTIVE",
    orderNo: 210,
    description: "基础查看权限",
    updatedAt: now()
  },
  {
    id: 91202,
    resourceCode: "action_common_config",
    resourceName: "配置能力",
    resourceType: "ACTION",
    resourcePath: "/action/common/base/config",
    status: "ACTIVE",
    orderNo: 220,
    description: "配置与编辑相关能力",
    updatedAt: now()
  },
  {
    id: 91203,
    resourceCode: "action_common_validate",
    resourceName: "校验能力",
    resourceType: "ACTION",
    resourcePath: "/action/common/base/validate",
    status: "ACTIVE",
    orderNo: 230,
    description: "校验和验证能力",
    updatedAt: now()
  },
  {
    id: 91204,
    resourceCode: "action_common_publish",
    resourceName: "发布能力",
    resourceType: "ACTION",
    resourcePath: "/action/common/base/publish",
    status: "ACTIVE",
    orderNo: 240,
    description: "发布能力",
    updatedAt: now()
  },
  {
    id: 91205,
    resourceCode: "action_common_audit_view",
    resourceName: "审计查看能力",
    resourceType: "ACTION",
    resourcePath: "/action/common/base/audit-view",
    status: "ACTIVE",
    orderNo: 250,
    description: "审计查看能力",
    updatedAt: now()
  },
  {
    id: 91206,
    resourceCode: "action_roles_manage",
    resourceName: "角色授权管理",
    resourceType: "ACTION",
    resourcePath: "/action/roles/list/manage",
    status: "ACTIVE",
    orderNo: 260,
    description: "角色管理与授权能力",
    updatedAt: now()
  },
  {
    id: 91207,
    resourceCode: "action_menu_capability_manage",
    resourceName: "菜单启用管理",
    resourceType: "ACTION",
    resourcePath: "/action/page-management/capability/manage",
    status: "ACTIVE",
    orderNo: 270,
    description: "菜单启用/停用等高权限操作",
    updatedAt: now()
  }
];

export const seedRoleResourceGrants: RoleResourceGrant[] = [
  { id: 92002, roleId: 7001, resourceCode: "menu_page_management", createdAt: now() },
  { id: 92003, roleId: 7001, resourceCode: "menu_prompts", createdAt: now() },
  { id: 92004, roleId: 7001, resourceCode: "menu_jobs", createdAt: now() },
  { id: 92005, roleId: 7001, resourceCode: "menu_interfaces", createdAt: now() },
  { id: 92006, roleId: 7001, resourceCode: "menu_public_fields", createdAt: now() },
  { id: 92019, roleId: 7001, resourceCode: "menu_run_records", createdAt: now() },
  { id: 92007, roleId: 7001, resourceCode: "menu_advanced", createdAt: now() },
  { id: 92009, roleId: 7001, resourceCode: "page_page_management_list", createdAt: now() },
  { id: 92010, roleId: 7001, resourceCode: "page_prompts_list", createdAt: now() },
  { id: 92011, roleId: 7001, resourceCode: "page_jobs_list", createdAt: now() },
  { id: 92012, roleId: 7001, resourceCode: "page_interfaces_list", createdAt: now() },
  { id: 92013, roleId: 7001, resourceCode: "page_public_fields_list", createdAt: now() },
  { id: 92020, roleId: 7001, resourceCode: "page_run_records_list", createdAt: now() },
  { id: 92014, roleId: 7001, resourceCode: "page_advanced_list", createdAt: now() },
  { id: 92015, roleId: 7001, resourceCode: "action_common_view", createdAt: now() },
  { id: 92016, roleId: 7001, resourceCode: "action_common_config", createdAt: now() },
  { id: 92017, roleId: 7001, resourceCode: "action_common_validate", createdAt: now() },
  { id: 92018, roleId: 7001, resourceCode: "action_common_publish", createdAt: now() },
  { id: 92103, roleId: 7002, resourceCode: "menu_advanced", createdAt: now() },
  { id: 92104, roleId: 7002, resourceCode: "menu_roles", createdAt: now() },
  { id: 92106, roleId: 7002, resourceCode: "page_advanced_list", createdAt: now() },
  { id: 92105, roleId: 7002, resourceCode: "page_roles_list", createdAt: now() },
  { id: 92107, roleId: 7002, resourceCode: "action_common_view", createdAt: now() },
  { id: 92108, roleId: 7002, resourceCode: "action_roles_manage", createdAt: now() },
  { id: 92203, roleId: 7003, resourceCode: "menu_advanced", createdAt: now() },
  { id: 92204, roleId: 7003, resourceCode: "menu_roles", createdAt: now() },
  { id: 92206, roleId: 7003, resourceCode: "page_advanced_list", createdAt: now() },
  { id: 92205, roleId: 7003, resourceCode: "page_roles_list", createdAt: now() },
  { id: 92207, roleId: 7003, resourceCode: "action_common_view", createdAt: now() },
  { id: 92208, roleId: 7003, resourceCode: "action_roles_manage", createdAt: now() },
  { id: 92209, roleId: 7003, resourceCode: "action_menu_capability_manage", createdAt: now() },
  { id: 92308, roleId: 7004, resourceCode: "menu_run_records", createdAt: now() },
  { id: 92309, roleId: 7004, resourceCode: "page_run_records_list", createdAt: now() },
  { id: 92305, roleId: 7004, resourceCode: "action_common_view", createdAt: now() },
  { id: 92306, roleId: 7004, resourceCode: "action_common_validate", createdAt: now() },
  { id: 92307, roleId: 7004, resourceCode: "action_common_audit_view", createdAt: now() },
  { id: 92402, roleId: 7005, resourceCode: "menu_page_management", createdAt: now() },
  { id: 92403, roleId: 7005, resourceCode: "menu_prompts", createdAt: now() },
  { id: 92404, roleId: 7005, resourceCode: "menu_jobs", createdAt: now() },
  { id: 92405, roleId: 7005, resourceCode: "menu_interfaces", createdAt: now() },
  { id: 92406, roleId: 7005, resourceCode: "menu_public_fields", createdAt: now() },
  { id: 92420, roleId: 7005, resourceCode: "menu_run_records", createdAt: now() },
  { id: 92407, roleId: 7005, resourceCode: "menu_advanced", createdAt: now() },
  { id: 92409, roleId: 7005, resourceCode: "page_page_management_list", createdAt: now() },
  { id: 92410, roleId: 7005, resourceCode: "page_prompts_list", createdAt: now() },
  { id: 92411, roleId: 7005, resourceCode: "page_jobs_list", createdAt: now() },
  { id: 92412, roleId: 7005, resourceCode: "page_interfaces_list", createdAt: now() },
  { id: 92413, roleId: 7005, resourceCode: "page_public_fields_list", createdAt: now() },
  { id: 92421, roleId: 7005, resourceCode: "page_run_records_list", createdAt: now() },
  { id: 92414, roleId: 7005, resourceCode: "page_advanced_list", createdAt: now() },
  { id: 92415, roleId: 7005, resourceCode: "action_common_view", createdAt: now() },
  { id: 92416, roleId: 7005, resourceCode: "action_common_config", createdAt: now() },
  { id: 92417, roleId: 7005, resourceCode: "action_common_validate", createdAt: now() },
  { id: 92418, roleId: 7005, resourceCode: "action_common_publish", createdAt: now() },
  { id: 92419, roleId: 7005, resourceCode: "action_menu_capability_manage", createdAt: now() }
];

export const seedUserRoleBindings: UserRoleBinding[] = [
  { id: 93001, userId: "person-zhao-yi", roleId: 7001, status: "ACTIVE", createdAt: now() },
  { id: 93002, userId: "person-qian-er", roleId: 7001, status: "ACTIVE", createdAt: now() },
  { id: 93003, userId: "person-sun-san", roleId: 7001, status: "ACTIVE", createdAt: now() },
  { id: 93004, userId: "person-zhou-zong", roleId: 7002, status: "ACTIVE", createdAt: now() },
  { id: 93005, userId: "person-wu-zhuguan", roleId: 7002, status: "ACTIVE", createdAt: now() },
  { id: 93006, userId: "person-head-admin-a", roleId: 7003, status: "ACTIVE", createdAt: now() },
  { id: 93007, userId: "person-head-admin-b", roleId: 7003, status: "ACTIVE", createdAt: now() },
  { id: 93008, userId: "person-platform-support-a", roleId: 7004, status: "ACTIVE", createdAt: now() },
  { id: 93009, userId: "person-head-config-a", roleId: 7005, status: "ACTIVE", createdAt: now() },
  { id: 93010, userId: "person-head-config-b", roleId: 7005, status: "ACTIVE", createdAt: now() }
];

export const seedRoleMembers: Record<number, string[]> = {
  7001: ["person-zhao-yi", "person-qian-er", "person-sun-san"],
  7002: ["person-zhou-zong", "person-wu-zhuguan"],
  7003: ["person-head-admin-a", "person-head-admin-b"],
  7004: ["person-platform-support-a"],
  7005: ["person-head-config-a", "person-head-config-b"]
};

export const seedDashboardOverview: DashboardOverview = {
  pageResourceCount: seedPageResources.length,
  activeRuleCount: seedRules.filter((it) => it.status === "ACTIVE").length,
  activeSceneCount: seedJobScenes.filter((it) => it.status === "ACTIVE").length,
  activeInterfaceCount: seedInterfaces.filter((it) => it.status === "ACTIVE").length,
  roleCount: seedRoles.length,
  pendingCount: seedPendingItems.length,
  metrics: {
    executionSuccessRate: 97.8,
    avgSavedSeconds: 36.5,
    expiredResourceCount: 3,
    expiringSoonResourceCount: 7
  }
};

