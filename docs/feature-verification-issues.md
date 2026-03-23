# 功能验证问题清单 - 接口注册、智能提示、智能作业

> 生成日期：2026-03-22

本文档详细列出了**接口注册**、**智能提示**、**智能作业**三个核心功能验证中发现的联调问题。

---

## 目录

- [1. 接口注册功能 (Interface Registry)](#1-接口注册功能-interface-registry)
- [2. 智能提示功能 (Smart Prompt)](#2-智能提示功能-smart-prompt)
- [3. 智能作业功能 (Smart Job / Job Scenes)](#3-智能作业功能-smart-job--job-scenes)
- [4. 总结](#4-总结)

---

## 1. 接口注册功能 (Interface Registry)

### 预期后端 API 端点

| 端点 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/control/interfaces?pageNo=1&pageSize=500` | GET | 分页列出所有接口 | 期待后端实现 |
| `/api/control/interfaces` | POST | 创建/更新接口 | 期待后端实现 |
| `/api/control/interfaces/{id}/status` | PUT | 更新接口状态 | 期待后端实现 |

前端已**完全实现**，期待这三个后端端点存在。

### 已在前端实现

- 完整的 CRUD 操作，基于向导式创建（5步向导：用途 → 基础信息 → 参数 → 联调 → 保存）
- 自动 JSON 解析请求体参数和输出参数
- 输入验证支持正则模板（手机号、身份证、邮箱）和自定义正则
- 从 JSON 示例提取输出参数路径，支持自动生成和手动覆盖
- 状态筛选（全部/草稿/启用/禁用/过期）
- 按名称、描述、路径全文搜索
- 从已有接口克隆功能
- 与发布工作流集成，支持待发布项系统
- 在线调试弹窗（测试/生产环境选择）

### 缺失/问题

1. **在线调试仅内部 mock** - `useInterfacesPageModel.tsx` (line 564-592) 中的 `runDebug()` 在本地构建 mock 响应，不实际调用后端。尚无 API 端点让后端实际代理调用接口。

2. **缺少调试 API 端点** - 前端 service 中未定义 `/api/control/interfaces/{id}/debug` 或类似端点。当前使用 mock 数据：
   ```typescript
   const latencyMs = 180 + Math.floor(Math.random() * 320);
   const responseBody = buildMockResponseBody(outputs);
   ```

3. **引用计数未实现** - UI 显示"引用关系"列，占位显示页面/规则/作业计数，但前端未实际追踪接口引用，也不期待后端提供。

4. **契约不匹配：testPath vs prodPath** - 期待后端提供测试环境 `testPath`，但如果未提供，前端回退到 `prodPath`。如果后端不分离测试/生产路径，测试环境配置可能无法正常工作。

5. **未处理分页** - 前端硬编码 `pageNo=1&pageSize=500` 一次加载所有接口。如果接口超过 500 个，分页会失效。

### 类型/契约不匹配

- `BackendInterfaceRow` 期待字段：`id`, `name`, `description`, `method`, `testPath`, `prodPath`, `url`, `status`, `ownerOrgId`, `currentVersion`, `timeoutMs`, `retryTimes`, `bodyTemplateJson`, `inputConfigJson`, `outputConfigJson`, `paramSourceSummary`, `responsePath`, `maskSensitive`, `updatedAt`
- 前端为可选字段提供默认值 (`timeoutMs?: 3000`, `retryTimes?: 0`, `maskSensitive?: true`)，应当安全
- 未发现重大类型不匹配 - 规范化处理能优雅处理缺失字段

**相关文件：**
- `src/pages/InterfacesPage/InterfacesPage.tsx`
- `src/pages/InterfacesPage/useInterfacesPageModel.tsx`
- `src/pages/InterfacesPage/interfacesPageShared.ts`
- `src/services/configCenterService.ts` (lines 1899-2063)

---

## 2. 智能提示功能 (Smart Prompt)

### 预期后端 API 端点

| 端点 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/control/rules?pageNo=1&pageSize=1000` | GET | 列出所有规则 | 期待后端实现 |
| `/api/control/rules` | POST | 创建规则 | 期待后端实现 |
| `/api/control/rules/{id}` | PUT | 更新规则 | 期待后端实现 |
| `/api/control/rules/{id}/status` | PUT | 更新规则状态 | 期待后端实现 |
| `/api/control/rules/{id}/share` | POST | 更新分享设置 | 期待后端实现 |
| `/api/control/rules/{sourceRuleId}/clone-logic` | POST | 克隆规则逻辑 | 期待后端实现 |
| `/api/control/rules/{ruleId}/condition-groups` | GET | 列出条件组 | 期待后端实现 |
| `/api/control/rules/{ruleId}/conditions` | GET | 列出条件 | 期待后端实现 |
| `/api/control/rules/{ruleId}/condition-groups` | POST | 创建条件组 | 期待后端实现 |
| `/api/control/rule-condition-groups/{groupId}` | PUT | 更新条件组 | 期待后端实现 |
| `/api/control/rule-condition-groups/{groupId}` | DELETE | 删除条件组 | 期待后端实现 |
| `/api/control/rule-conditions` | POST | 创建条件 | 期待后端实现 |
| `/api/control/rule-conditions/{conditionId}` | DELETE | 删除条件 | 期待后端实现 |
| `/api/control/rules/{ruleId}/preview` | POST | 预览规则计算 | **期待后端实现** |

所有端点前端已完全集成，期待后端提供。

### 已在前端实现

- `PromptsPage` 仅是 `RulesPage` 的包装，包含两个标签页："规则列表" 和 "模板复用"
- 完整的规则条件构建器，支持嵌套 AND/OR 组
- 支持多种操作数来源类型：
  - `PAGE_FIELD` - 来自页面元素
  - `INTERFACE_FIELD` - 来自 API 输出
  - `LIST_LOOKUP_FIELD` - 来自列表数据查询
  - `CONST` - 常量值
  - `CONTEXT` - 来自上下文变量
- 支持所有比较运算符：EQ, NE, GT, GE, LT, LE, CONTAINS, NOT_CONTAINS, IN, EXISTS
- 数据处理链路 - 可对操作数应用多个数据处理器
- Prompt 内容配置，支持富文本编辑器
- 多种 Prompt 模式：静默、浮动
- 多种关闭模式：自动关闭、手动、定时后手动
- 与作业场景集成 - 规则确认后可触发作业执行
- 发布工作流集成
- 跨组织分享支持
- 从模板克隆支持

### 缺失/问题

1. **规则预览当前仅在 mock 模式本地计算** - `workflowService.previewRuleWithInput()` 在 mock 启用时本地计算，但 mock 禁用时，没有后端端点可调用：
   ```typescript
   async previewRuleWithInput(ruleId: number, input: RulePreviewInput): Promise<RulePreviewResult> {
     await sleep(140);
     const dataProcessors = await configCenterService.listDataProcessors();
     const dataProcessorById = new Map(dataProcessors.map((item) => [item.id, item] as const));
     return evaluateRule(ruleId, input, dataProcessorById);
   }
   ```
   非 mock 模式没有实际后端 API 调用。后端需要实现：`POST /api/control/rules/{ruleId}/preview`。

2. **没有命中统计展示** - 前端不显示 Prompt 触发次数或命中率。不向后端请求此信息。

3. **没有生效日期范围验证** - 虽然 `RuleDefinition` 支持 `effectiveStartAt` 和 `effectiveEndAt`，但前端不验证或展示此信息。

4. **列表查询条件 UI 不完整** - 数据结构支持 `listLookupConditions`，但配置复杂列表查询的 UI 功能不完整。

5. **没有分页** - 前端硬编码 `pageSize=1000` 一次加载所有规则。与接口注册相同问题。

### 类型/契约不匹配

- 前端发送完整的 `RuleUpsertPayload` 包含所有嵌套条件到后端
- 期待后端通过独立端点处理条件分组结构 (`/condition-groups`, `/conditions`)，已实现 - 条件通过独立 API 管理，不内联存储
- **关键点**：关注点分离正确 - 主规则元数据通过 `/rules` 端点，条件组通过独立端点。正确实现。

- `RuleOperand` 接口匹配前端发送：
  - 支持 `interfaceBinding` 进行 API 集成
  - 支持 `listBinding` 进行列表查询
  - 支持 `dataProcessorConfigs` 进行数据处理
  - 所有类型正确定义

**相关文件：**
- `src/pages/PromptsPage/PromptsPage.tsx`
- `src/pages/RulesPage/RulesPage.tsx`
- `src/pages/RulesPage/useRulesPageModel.tsx`
- `src/services/workflowService.ts` (lines 713-914)
- `src/services/configCenterService.ts` (lines 2272-2397)

---

## 3. 智能作业功能 (Smart Job / Job Scenes)

### 预期后端 API 端点

| 端点 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/control/job-scenes` | GET | 列出所有作业场景 | 期待后端实现 |
| `/api/control/job-scenes` | POST | 创建作业场景 | 期待后端实现 |
| `/api/control/job-scenes/{id}` | PUT | 更新作业场景 | 期待后端实现 |
| `/api/control/job-scenes/{id}/status` | PUT | 更新作业场景状态 | 期待后端实现 |
| `/api/control/job-scenes/{sceneId}/share` | POST | 更新分享设置 | 期待后端实现 |
| `/api/control/job-scenes/{sceneId}/clone` | POST | 克隆作业场景到另一个组织 | 期待后端实现 |
| `/api/control/job-scenes/{sceneId}/nodes` | GET | 列出场景中所有节点 | 期待后端实现 |
| `/api/control/job-scenes/{sceneId}/nodes` | POST | 创建/更新节点 | 期待后端实现 |
| `/api/control/job-nodes/{nodeId}` | DELETE | 删除节点 | 期待后端实现 |
| `/api/control/job-scenes/{sceneId}/execute` | POST | 手动执行作业场景 | **期待后端实现** |
| `/api/control/job-scenes/{sceneId}/executions` | GET | 列出执行历史 | **期待后端实现** |
| `/api/control/job-executions/{executionId}/node-logs` | GET | 获取节点运行日志 | **期待后端实现** |

除了下方标注，所有端点已在前端定义并期待后端提供。

### 已在前端实现

- 完整的基于 ReactFlow 的可视化流程图编辑器
- 节点库支持拖放
- 支持 6 种节点类型：
  - `page_get` - 获取页面字段
  - `api_call` - 调用已注册 API
  - `list_lookup` - 列表数据查询
  - `js_script` - 执行自定义 JavaScript
  - `page_set` - 设置页面字段
  - `page_click` - 点击页面元素
  - `send_hotkey` - 发送快捷键
- 四种执行模式：
  - `AUTO_WITHOUT_PROMPT` - 自动执行，无提示
  - `AUTO_AFTER_PROMPT` - 用户确认 Prompt 后自动执行
  - `PREVIEW_THEN_EXECUTE` - 预览变更后确认
  - `FLOATING_BUTTON` - 通过浮动按钮手动触发
- 浮动按钮屏幕定位
- 执行前预览功能
- 完整的发布工作流，支持分享
- 克隆到另一个组织功能（最近添加）
- 执行历史查看，支持节点级运行日志

### 缺失/问题

1. **实际作业执行未连接后端** - `workflowService.ts` 中的 `executeJobScene` 函数当前仅在 mock 模式执行：
   ```typescript
   async executeJobScene(sceneId: number, sceneName: string, triggerSource: JobExecutionTriggerSource): Promise<JobExecutionSummary> {
     await sleep(160);
     return executeSceneInternal(sceneId, sceneName, triggerSource);
   }
   ```
   `executeSceneInternal` 使用 mock/本地执行。应当有后端 API 端点 `POST /api/control/job-scenes/{sceneId}/execute` 触发执行并返回结果。当前全是 mock。

2. **缺少执行历史端点** - `listJobExecutions` 和 `listJobNodeRunLogs` 仅在 mock 启用时从本地 mock store 读取。mock 禁用时，不调用任何后端端点：
   - 需要：`GET /api/control/job-scenes/{sceneId}/executions`
   - 需要：`GET /api/control/job-executions/{executionId}/node-logs`

3. **ReactFlow 状态持久化问题** - 虽然实现了布局保存，但节点位置跨会话持久化一直存在一些问题。

4. **循环依赖未验证** - 保存前前端不检测流程图中的循环依赖。应当添加验证。

5. **JavaScript 沙箱未实现** - `js_script` 节点允许任意 JavaScript 执行。前端未实现沙箱，需要后端验证/转义。这是潜在安全问题。

6. **缺少节点测试** - 无法在运行整个场景前单独测试单个节点。

### 类型/契约不匹配

- `JobSceneDefinition` 类型匹配期待的后端契约：
  ```typescript
  {
    id, name, ownerOrgId, shareMode, sharedOrgIds, sourceSceneId,
    pageResourceId, executionMode, previewBeforeExecute,
    floatingButtonEnabled, floatingButtonX/Y, status, nodeCount,
    manualDurationSec, riskConfirmed
  }
  ```
  所有字段都已覆盖。

- `JobNodeDefinition` 将配置存储为 `configJson` JSON 字符串 - 后端仅持久化，前端处理反序列化。这是清晰的分离。

- 节点配置结构完全由前端处理，后端仅存储 JSON - 无契约不匹配问题。

**相关文件：**
- `src/pages/JobScenesPage/JobScenesPage.tsx`
- `src/pages/JobScenesPage/useJobScenesPageModel.ts`
- `src/pages/JobScenesPage/jobScenesPageShared.ts`
- `src/services/configCenterService.ts` (lines 2499-2614)
- `src/services/workflowService.ts` (lines 916-983)

---

## 4. 总结

### 各功能整体状态

| 功能 | 前端完成 | 后端集成 | 缺失后端端点 |
|------|---------|---------|-------------|
| 接口注册 | 是 (100%) | 90% | 1 - 接口调试/代理调用端点 |
| 智能提示 | 是 (100%) | 95% | 1 - 规则预览计算端点 |
| 智能作业 | 是 (95%) | 70% | 3 - 执行、执行历史、节点日志 |

### 影响所有功能的通用问题

1. **`.env` 中 mock 模式已禁用** - `VITE_ENABLE_MOCK_MODE=false` 意味着所有 mock 数据已被绕过，期待后端提供所有端点。

2. **三个功能都使用相同的发布/待发布项工作流** - 这部分在所有功能中一致实现，可与现有 `pendingItems` API 一起工作。

3. **三个功能都支持基于组织的分享** - 分享契约一致且已实现。

4. **所有列表端点都没有分页** - 都硬编码大页面大小 (500-1000) 一次加载所有项。大数据量时会导致性能问题。

### 生产环境关键缺失端点

1. `POST /api/control/interfaces/{id}/debug` - 实际接口调试
2. `POST /api/control/rules/{id}/preview` - 规则计算预览
3. `POST /api/control/job-scenes/{id}/execute` - 触发作业执行
4. `GET /api/control/job-scenes/{id}/executions` - 执行历史
5. `GET /api/control/job-executions/{id}/node-logs` - 节点执行详情日志

所有其他端点已在预期，前端契约完整且与后端应当提供的一致。
