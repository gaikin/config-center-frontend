# 共享提示与共享作业 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为智能提示和智能作业增加统一的“私有 / 共享”能力，支持选择共享机构、他人只读查看、复制为自己的版本。

**Architecture:** 在现有规则和作业场景对象上直接扩展共享字段，而不是引入快照层。服务层负责列表可见性、共享字段读写和复制派生；页面层负责共享状态展示、只读态切换和“复制为我的版本”主路径。

**Tech Stack:** React 18, React Router 6, Ant Design 5, styled-components, TypeScript, Vitest

---

## File Structure

### Create

- `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.shared.test.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\rulesShareAccess.test.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\jobScenesShareAccess.test.ts`
- `C:\dev\projects\work\config-center-frontend\src\sharedAccess.ts`
- `C:\dev\projects\work\config-center-frontend\src\sharedAccess.test.ts`

### Modify

- `C:\dev\projects\work\config-center-frontend\src\types.ts`
- `C:\dev\projects\work\config-center-frontend\src\mock\seeds.ts`
- `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- `C:\dev\projects\work\config-center-frontend\src\session\mockSession.tsx`
- `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\useRulesPageModel.tsx`
- `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\RulesPage.tsx`
- `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\useJobScenesPageModel.ts`
- `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\JobScenesPage.tsx`

### Responsibilities

- `types.ts`: 规则和作业场景共享字段、共享模式、来源场景字段、共享设置入参类型。
- `mock/seeds.ts`: 增加共享对象示例，覆盖私有、共享到单机构、共享到多机构三种状态。
- `configCenterService.ts`: 实现共享可见性过滤、共享设置、取消共享、复制为我的版本。
- `sharedAccess.ts`: 抽出“是否可见 / 是否可编辑 / 是否只读共享对象”判断，供提示和作业复用。
- `mockSession.tsx`: 暴露当前操作者机构和角色上下文，供共享判断使用。
- `useRulesPageModel.tsx` / `useJobScenesPageModel.ts`: 注入共享字段、只读态、复制动作、共享设置动作。
- `RulesPage.tsx` / `JobScenesPage.tsx`: 渲染共享状态、共享范围、只读提示、共享设置入口和复制按钮。

## Task 1: 扩展共享数据模型与访问判定工具

**Files:**
- Create: `C:\dev\projects\work\config-center-frontend\src\sharedAccess.ts`
- Create: `C:\dev\projects\work\config-center-frontend\src\sharedAccess.test.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\types.ts`

- [ ] **Step 1: Write the failing access test**

```ts
import { describe, expect, it } from "vitest";
import { canAccessSharedObject, canEditSharedObject } from "./sharedAccess";

describe("sharedAccess", () => {
  it("allows shared object to be visible but not editable for target org viewers", () => {
    const target = {
      ownerOrgId: "branch-east",
      shareMode: "SHARED",
      sharedOrgIds: ["branch-south"]
    };

    expect(canAccessSharedObject(target, { orgScopeId: "branch-south", roleType: "CONFIG_OPERATOR" })).toBe(true);
    expect(canEditSharedObject(target, { orgScopeId: "branch-south", roleType: "CONFIG_OPERATOR" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/sharedAccess.test.ts`

Expected: FAIL because `sharedAccess.ts` and shared fields do not exist.

- [ ] **Step 3: Add minimal shared types and access helpers**

```ts
export type ShareMode = "PRIVATE" | "SHARED";

export interface ShareConfigFields {
  shareMode: ShareMode;
  sharedOrgIds: string[];
  sharedBy?: string;
  sharedAt?: string;
}

export function canAccessSharedObject(target: ShareConfigFields & { ownerOrgId: string }, viewer: ViewerContext) {
  if (target.shareMode === "PRIVATE") {
    return viewer.orgScopeId === target.ownerOrgId;
  }
  return viewer.orgScopeId === target.ownerOrgId || target.sharedOrgIds.includes(viewer.orgScopeId);
}
```

并同步补充：

- `RuleDefinition` 共享字段
- `JobSceneDefinition` 共享字段
- `JobSceneDefinition` 的 `sourceSceneId/sourceSceneName`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/sharedAccess.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/sharedAccess.ts src/sharedAccess.test.ts
git commit -m "feat: add shared object access model"
```

## Task 2: 实现服务层共享可见性、共享设置与复制派生

**Files:**
- Create: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.shared.test.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\mock\seeds.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\session\mockSession.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\sharedAccess.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
import { describe, expect, it } from "vitest";
import { configCenterService } from "./configCenterService";

describe("configCenterService shared prompt/job", () => {
  it("filters shared rules by viewer org scope", async () => {
    const rows = await configCenterService.listRules({ viewerOrgId: "branch-south" });
    expect(rows.some((row) => row.shareMode === "SHARED")).toBe(true);
  });

  it("clones shared job scene into viewer org as private copy", async () => {
    const created = await configCenterService.cloneJobSceneToOrg(5001, "branch-south");
    expect(created.ownerOrgId).toBe("branch-south");
    expect(created.shareMode).toBe("PRIVATE");
    expect(created.sourceSceneId).toBe(5001);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/configCenterService.shared.test.ts`

Expected: FAIL because filtered list APIs and clone APIs do not exist.

- [ ] **Step 3: Implement minimal shared service behavior**

实现内容：

- `seedRules` / `seedJobScenes` 增加共享样例字段
- `listRules(options?)` 支持按查看者机构过滤共享可见对象
- `listJobScenes(options?)` 支持按查看者机构过滤共享可见对象
- `updateRuleShareConfig(ruleId, payload, operator)`
- `updateJobSceneShareConfig(sceneId, payload, operator)`
- `cloneRuleToOrg(ruleId, targetOrgId, operator)`
- `cloneJobSceneToOrg(sceneId, targetOrgId, operator)`

复制规则：

- 新对象 `shareMode = "PRIVATE"`
- 新对象 `sharedOrgIds = []`
- 提示保留 `sourceRuleId/sourceRuleName`
- 作业设置 `sourceSceneId/sourceSceneName`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/configCenterService.shared.test.ts src/sharedAccess.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/mock/seeds.ts src/services/configCenterService.ts src/services/configCenterService.shared.test.ts src/session/mockSession.tsx src/sharedAccess.ts
git commit -m "feat: add shared prompt and job service flows"
```

## Task 3: 接入智能提示列表、只读态和复制入口

**Files:**
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\rulesShareAccess.test.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\useRulesPageModel.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\RulesPage.tsx`
- Modify: `C:\dev\projects\work\config-center-frontend\src\sharedAccess.ts`

- [ ] **Step 1: Write the failing RulesPage tests**

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RulesPage } from "./RulesPage";

describe("RulesPage shared mode", () => {
  it("shows shared status and copy action for readonly shared rules", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <RulesPage embedded mode="PAGE_RULE" />
      </MemoryRouter>
    );

    expect(html).toContain("已共享");
    expect(html).toContain("复制为我的版本");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/RulesPage/rulesShareAccess.test.ts`

Expected: FAIL because the page does not render share status or copy action.

- [ ] **Step 3: Implement RulesPage shared behavior**

实现要求：

- 列表新增“共享状态”“共享范围”列
- 无编辑权限的共享对象显示 `查看` 和 `复制为我的版本`
- 有共享权限的对象显示 `共享设置`
- 打开共享只读对象时：
  - 顶部渲染只读提示
  - 隐藏保存、发布、停用、删除动作
  - 条件配置只读
- 复制按钮走 `cloneRuleToOrg`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/RulesPage/rulesShareAccess.test.ts src/pages/RulesPage/rulesOperandRenderers.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/RulesPage/useRulesPageModel.tsx src/pages/RulesPage/RulesPage.tsx src/pages/RulesPage/rulesShareAccess.test.ts
git commit -m "feat: add shared rules readonly and clone flow"
```

## Task 4: 接入智能作业列表、编排只读态和复制入口

**Files:**
- Create: `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\jobScenesShareAccess.test.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\useJobScenesPageModel.ts`
- Modify: `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\JobScenesPage.tsx`

- [ ] **Step 1: Write the failing JobScenesPage tests**

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { JobScenesPage } from "./JobScenesPage";

describe("JobScenesPage shared mode", () => {
  it("shows readonly shared job scene actions", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <JobScenesPage />
      </MemoryRouter>
    );

    expect(html).toContain("已共享");
    expect(html).toContain("复制为我的版本");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/JobScenesPage/jobScenesShareAccess.test.ts`

Expected: FAIL because the page does not render shared scene behavior.

- [ ] **Step 3: Implement JobScenesPage shared behavior**

实现要求：

- 列表新增“共享状态”“共享范围”列
- 无编辑权限的共享场景显示 `查看` 和 `复制为我的版本`
- 打开共享只读场景时：
  - 画布禁止拖拽、连线、删除、保存
  - 属性面板全部只读
  - 顶部提示“当前对象来自共享，仅可查看”
- 复制按钮走 `cloneJobSceneToOrg`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/JobScenesPage/jobScenesShareAccess.test.ts src/pages/JobScenesPage/nodeInputSourceType.test.ts src/pages/JobScenesPage/nodeOutputReferences.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobScenesPage/useJobScenesPageModel.ts src/pages/JobScenesPage/JobScenesPage.tsx src/pages/JobScenesPage/jobScenesShareAccess.test.ts
git commit -m "feat: add shared job scenes readonly and clone flow"
```

## Task 5: 收尾验证与文档同步

**Files:**
- Verify: `C:\dev\projects\work\config-center-frontend\src\types.ts`
- Verify: `C:\dev\projects\work\config-center-frontend\src\services\configCenterService.ts`
- Verify: `C:\dev\projects\work\config-center-frontend\src\pages\RulesPage\RulesPage.tsx`
- Verify: `C:\dev\projects\work\config-center-frontend\src\pages\JobScenesPage\JobScenesPage.tsx`

- [ ] **Step 1: Run focused shared-feature tests**

Run:

```bash
npm test -- src/sharedAccess.test.ts src/services/configCenterService.shared.test.ts src/pages/RulesPage/rulesShareAccess.test.ts src/pages/JobScenesPage/jobScenesShareAccess.test.ts
```

Expected: PASS

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: all existing and new tests pass.

- [ ] **Step 3: Run build verification**

Run:

```bash
npm run build
```

Expected: TypeScript and production build succeed.

- [ ] **Step 4: Smoke-check the end-to-end flow**

Manual checklist:

- 使用创建者身份将提示对象设为共享并选择目标机构
- 使用目标机构身份能在列表中看到对象，但没有编辑能力
- 目标机构身份点击后进入只读视图
- 目标机构身份点击“复制为我的版本”后，生成本机构私有副本
- 作业场景的编排页在共享只读时无法编辑画布

- [ ] **Step 5: Commit final verified work**

```bash
git add src/types.ts src/mock/seeds.ts src/services/configCenterService.ts src/services/configCenterService.shared.test.ts src/session/mockSession.tsx src/sharedAccess.ts src/sharedAccess.test.ts src/pages/RulesPage/useRulesPageModel.tsx src/pages/RulesPage/RulesPage.tsx src/pages/RulesPage/rulesShareAccess.test.ts src/pages/JobScenesPage/useJobScenesPageModel.ts src/pages/JobScenesPage/JobScenesPage.tsx src/pages/JobScenesPage/jobScenesShareAccess.test.ts
git commit -m "feat: add shared prompt and job flows"
```

## Notes

- 不要在首期实现中追加审批、共享有效期或通知能力。
- 共享设置入口建议复用现有 `Modal` / `Drawer`，不要再新建一套独立页面。
- 如果 `RulesPage.tsx` 或 `JobScenesPage.tsx` 变得过大，优先把共享状态列和共享操作提取到独立 helper，不要继续向大文件堆逻辑。
- 复制为我的版本必须保持“新对象默认私有”，不能继承原对象的共享状态。
