# 运行记录中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为智能提示和智能作业补齐“运行记录中心”，支持从业务页快捷跳转，并在独立页面中按名称、状态、时间、页面、机构查询记录列表。

**Architecture:** 采用“新页面 + 轻量页面模型 + 独立展示类型”的方式实现。记录中心不复用现有统计页的数据结构，而是在 `types.ts`、`mock/seeds.ts` 和 `configCenterService.ts` 中新增专用记录模型与查询接口，页面层通过 URL 参数接收业务页上下文默认筛选。

**Tech Stack:** React 18, React Router 6, Ant Design 5, styled-components, TypeScript, Vitest

---

## File Structure

### Create

- `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.tsx`
- `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\useRunRecordsPageModel.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\runRecordsPageShared.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\runRecordsPageShared.test.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.test.tsx`
- `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.runRecords.test.ts`

### Modify

- `C:\dev\projects\work\config-center-frontend\src\types.ts`
- `C:\dev\projects\work\config-center-frontend\src\mock\seeds.ts`
- `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- `C:\dev\projects\work\config-center-frontend\src\App.tsx`
- `C:\dev\projects\work\config-center-frontend\src\components\AppShell.tsx`
- `C:\dev\projects\work\config-center-frontend\src\permissionPolicy.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\PromptsPage\PromptsPage.tsx`
- `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\JobScenesPage.tsx`

### Responsibilities

- `types.ts`: 新增运行记录展示类型和查询参数类型。
- `mock/seeds.ts`: 提供提示命中记录、作业执行记录、权限资源和角色授权种子。
- `configCenterService.ts`: 提供运行记录查询接口和筛选逻辑。
- `runRecordsPageShared.ts`: 解析 URL 默认筛选、构建下拉选项、封装轻量格式化逻辑。
- `useRunRecordsPageModel.ts`: 负责页面状态、筛选联动、异步加载和错误处理。
- `RunRecordsPage.tsx`: 负责页面布局、双 Tab、筛选栏和列表渲染。
- `App.tsx` / `AppShell.tsx`: 挂载路由和菜单入口。
- `PromptsPage.tsx` / `JobScenesPage.tsx`: 增加快捷跳转入口并传递默认筛选参数。
- `permissionPolicy.ts` / `mock/seeds.ts`: 保证新增菜单和页面权限在 mock 权限模型中可见。

## Task 1: 定义运行记录类型与 Mock 数据

**Files:**
- Modify: `C:\dev\projects\work\config-center-frontend\src\types.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\mock\seeds.ts`
- Test: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.runRecords.test.ts`

- [ ] **Step 1: Write the failing service test for new record models**

```ts
import { describe, expect, it } from "vitest";
import { configCenterService } from "./configCenterService";

describe("configCenterService run records", () => {
  it("returns prompt hit records with prompt-only columns", async () => {
    const rows = await configCenterService.listPromptHitRecords({});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("ruleName");
    expect(rows[0]).toHaveProperty("promptContentSummary");
    expect(rows[0]).not.toHaveProperty("hitResult");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/configCenterService.runRecords.test.ts`

Expected: FAIL with `listPromptHitRecords is not a function` or missing type/seed errors.

- [ ] **Step 3: Add minimal types and mock seeds**

```ts
export interface PromptHitRecord {
  id: number;
  ruleId: number;
  ruleName: string;
  pageResourceId: number;
  pageResourceName: string;
  orgId: string;
  orgName: string;
  promptMode: PromptMode;
  promptContentSummary: string;
  sceneId?: number;
  sceneName?: string;
  triggerAt: string;
}

export interface JobExecutionRecord {
  id: number;
  sceneId: number;
  sceneName: string;
  pageResourceId: number;
  pageResourceName: string;
  orgId: string;
  orgName: string;
  triggerSource: ExecutionLogItem["triggerSource"];
  result: ExecutionLogItem["result"];
  failureReasonSummary?: string;
  startedAt: string;
  finishedAt: string;
}
```

在 `mock/seeds.ts` 中补充：

- `seedPromptHitRecords`
- `seedJobExecutionRecords`
- 新的权限资源 `menu_run_records`、`page_run_records_list`
- 对 `7001` 和 `7005` 等角色的默认授权

- [ ] **Step 4: Run the service test to verify models load**

Run: `npm test -- src/services/configCenterService.runRecords.test.ts`

Expected: FAIL from filtering method not implemented yet, but type import and seed bootstrapping errors are gone.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/mock/seeds.ts src/services/configCenterService.runRecords.test.ts
git commit -m "test: add run record model coverage"
```

## Task 2: 实现运行记录查询接口与筛选逻辑

**Files:**
- Modify: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\types.ts`
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\runRecordsPageShared.ts`
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\runRecordsPageShared.test.ts`
- Test: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.runRecords.test.ts`

- [ ] **Step 1: Expand tests to cover filters and URL defaults**

```ts
it("filters job execution records by result, pageResourceId, orgId, and keyword", async () => {
  const rows = await configCenterService.listJobExecutionRecords({
    keyword: "开户",
    result: "FAILED",
    pageResourceId: 2001,
    orgId: "branch-east"
  });
  expect(rows.every((row) => row.result === "FAILED")).toBe(true);
  expect(rows.every((row) => row.pageResourceId === 2001)).toBe(true);
  expect(rows.every((row) => row.orgId === "branch-east")).toBe(true);
});

it("parses query string into default run record filters", () => {
  const defaults = getRunRecordDefaults(new URLSearchParams("?tab=jobs&sceneId=5001&sceneName=开户作业"));
  expect(defaults.activeTab).toBe("jobs");
  expect(defaults.jobFilters.sceneId).toBe(5001);
});
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm test -- src/services/configCenterService.runRecords.test.ts src/pages/RunRecordsPage/runRecordsPageShared.test.ts`

Expected: FAIL because `listJobExecutionRecords` and `getRunRecordDefaults` are not implemented.

- [ ] **Step 3: Implement service filters and shared helpers**

```ts
async listPromptHitRecords(filters: PromptHitRecordFilters): Promise<PromptHitRecord[]> {
  await sleep(100);
  return clone(
    store.promptHitRecords
      .filter((item) => matchesPromptFilters(item, filters))
      .sort((a, b) => b.triggerAt.localeCompare(a.triggerAt))
  );
}

async listJobExecutionRecords(filters: JobExecutionRecordFilters): Promise<JobExecutionRecord[]> {
  await sleep(100);
  return clone(
    store.jobExecutionRecords
      .filter((item) => matchesJobFilters(item, filters))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  );
}
```

在 `runRecordsPageShared.ts` 中封装：

- `getRunRecordDefaults(searchParams)`
- `buildRunRecordPageOptions(resources)`
- `buildRunRecordOrgOptions(rows)`
- `formatDurationMs(ms)`

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm test -- src/services/configCenterService.runRecords.test.ts src/pages/RunRecordsPage/runRecordsPageShared.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/configCenterService.ts src/types.ts src/pages/RunRecordsPage/runRecordsPageShared.ts src/pages/RunRecordsPage/runRecordsPageShared.test.ts src/services/configCenterService.runRecords.test.ts
git commit -m "feat: add run record query services"
```

## Task 3: 搭建记录中心页面与页面模型

**Files:**
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.tsx`
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\useRunRecordsPageModel.ts`
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.test.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\enumLabels.ts`

- [ ] **Step 1: Write the failing page test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RunRecordsPage } from "./RunRecordsPage";

describe("RunRecordsPage", () => {
  it("renders prompt and job tabs with list-first layout", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/run-records?tab=jobs"]}>
        <RunRecordsPage />
      </MemoryRouter>
    );

    expect(html).toContain("提示记录");
    expect(html).toContain("作业记录");
    expect(html).toContain("执行结果");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/RunRecordsPage/RunRecordsPage.test.tsx`

Expected: FAIL because the page component does not exist.

- [ ] **Step 3: Implement minimal page and model**

```tsx
export function RunRecordsPage() {
  const {
    activeTab,
    setActiveTab,
    promptRows,
    jobRows,
    promptFilters,
    jobFilters,
    setPromptFilters,
    setJobFilters
  } = useRunRecordsPageModel();

  return (
    <div data-section="run-record-center">
      <Tabs
        activeKey={activeTab}
        onChange={(value) => setActiveTab(value as "prompts" | "jobs")}
        items={[
          { key: "prompts", label: "提示记录", children: <PromptRecordTable rows={promptRows} /> },
          { key: "jobs", label: "作业记录", children: <JobRecordTable rows={jobRows} /> }
        ]}
      />
    </div>
  );
}
```

页面实现要求：

- 顶部使用筛选区
- 双 Tab 共享容器风格
- 提示记录不展示 `命中结果`
- 作业记录不展示任何详情入口
- 查询失败时渲染统一错误提示

- [ ] **Step 4: Run page test to verify it passes**

Run: `npm test -- src/pages/RunRecordsPage/RunRecordsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/RunRecordsPage/RunRecordsPage.tsx src/pages/RunRecordsPage/useRunRecordsPageModel.ts src/pages/RunRecordsPage/RunRecordsPage.test.tsx src/enumLabels.ts
git commit -m "feat: add run record center page"
```

## Task 4: 接入路由、菜单、权限资源和业务页快捷入口

**Files:**
- Modify: `C:\dev\projects\work\config-center-frontend\src\App.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\components\AppShell.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\permissionPolicy.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\mock\seeds.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\PromptsPage\PromptsPage.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\JobScenesPage.tsx`
- Test: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.test.tsx`

- [ ] **Step 1: Extend the page test with navigation expectations**

```tsx
it("supports default filters from prompt and job shortcuts", () => {
  const promptHtml = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/run-records?tab=prompts&ruleId=4001&ruleName=贷款高风险强提示"]}>
      <RunRecordsPage />
    </MemoryRouter>
  );

  expect(promptHtml).toContain("提示记录");
  expect(promptHtml).toContain("贷款高风险强提示");
});
```

同时补一条 service 或 shared test 验证：

- 新权限路径 `/menu/run-records`
- 新页面路径 `/page/run-records/list`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/pages/RunRecordsPage/RunRecordsPage.test.tsx src/pages/RunRecordsPage/runRecordsPageShared.test.ts`

Expected: FAIL because route/menu/permission resources are not wired.

- [ ] **Step 3: Implement route, menu, permission seed, and shortcut actions**

```tsx
const RunRecordsPage = lazy(() =>
  import("./pages/RunRecordsPage/RunRecordsPage").then((m) => ({ default: m.RunRecordsPage }))
);

<Route path="/run-records" element={<RunRecordsPage />} />
```

```ts
{ key: "/run-records", label: "运行记录", icon: <ProfileOutlined />, menuResourcePath: "/menu/run-records" }
```

在业务页中添加跳转：

```tsx
navigate(`/run-records?tab=prompts&ruleId=${row.id}&ruleName=${encodeURIComponent(row.name)}`);
navigate(`/run-records?tab=jobs&sceneId=${row.id}&sceneName=${encodeURIComponent(row.name)}`);
```

并同步补齐：

- `permissionPolicy.ts` 的推荐资源路径
- `seedPermissionResources`
- `seedRoleResourceGrants`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/pages/RunRecordsPage/RunRecordsPage.test.tsx src/pages/RunRecordsPage/runRecordsPageShared.test.ts src/services/configCenterService.runRecords.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/AppShell.tsx src/permissionPolicy.ts src/mock/seeds.ts src/pages/PromptsPage/PromptsPage.tsx src/pages/JobScenesPage/JobScenesPage.tsx src/pages/RunRecordsPage/RunRecordsPage.test.tsx src/pages/RunRecordsPage/runRecordsPageShared.test.ts
git commit -m "feat: wire run record navigation"
```

## Task 5: 完整验证与收尾

**Files:**
- Verify: `C:\dev\projects\work\config-center-frontend\src\pages\RunRecordsPage\RunRecordsPage.tsx`
- Verify: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- Verify: `C:\dev\projects\work\config-center-frontend\src\App.tsx`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npm test -- src/services/configCenterService.runRecords.test.ts src/pages/RunRecordsPage/runRecordsPageShared.test.ts src/pages/RunRecordsPage/RunRecordsPage.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run full build verification**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build succeed with no new errors.

- [ ] **Step 3: Smoke-check the critical user paths manually**

Manual checklist:

- 打开 `/run-records` 默认显示最近 7 天记录
- 切换“提示记录 / 作业记录”不会丢失当前 Tab 的筛选状态
- 从智能提示页进入时自动带规则筛选
- 从智能作业页进入时自动带作业筛选
- 提示记录无“命中结果”列
- 作业记录无详情入口

- [ ] **Step 4: Update documentation if implementation deviates**

如果实现过程中与 [run-record-center-design.md](C:\dev\projects\work\config-center-frontend\docs\superpowers\specs\2026-03-20-run-record-center-design.md) 存在差异，先更新规格文档，再继续提交代码。

- [ ] **Step 5: Commit final verified work**

```bash
git add src/App.tsx src/components/AppShell.tsx src/mock/seeds.ts src/pages/PromptsPage/PromptsPage.tsx src/pages/JobScenesPage/JobScenesPage.tsx src/pages/RunRecordsPage src/permissionPolicy.ts src/services/configCenterService.ts src/services/configCenterService.runRecords.test.ts src/types.ts
git commit -m "feat: add run record center"
```

## Notes

- 不要在本次实现中追加详情抽屉、导出或联查能力。
- 优先复用现有 Ant Design 表格与筛选控件，不新引入状态管理库。
- 如果 `RunRecordsPage.tsx` 体积快速膨胀，优先把表格列配置拆到 `runRecordsPageShared.ts`，不要继续堆在单文件中。
- 页面筛选默认值来自 URL，但不要求把所有筛选状态实时写回 URL。
