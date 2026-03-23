# 前端后端联调问题清单

> 生成日期：2026-03-22

本文档列出了当前前端代码库与后端联调过程中发现的所有问题、不匹配项和未实现功能。

---

## 目录

1. [未实现功能 - 计划中但未完成后端开发](#1-未实现功能---计划中但未完成后端开发)
2. [前端已完成但后端未对齐](#2-前端已完成但后端未对齐)
3. [API端点不匹配](#3-api端点不匹配)
4. [类型不匹配](#4-类型不匹配)
5. [已删除功能需要后端清理](#5-已删除功能需要后端清理)
6. [总结](#6-总结)

---

## 1. 未实现功能 - 计划中但未完成后端开发

### 1.1 Control Plane Backend Alignment
**计划文件:** `docs/plans/2026-03-21-control-plane-backend-alignment.md`

**问题：**
- Page Resource Persistence：前端仍有 mock store 兜底，后端 DB 支持的 `/api/control/page-resources` 未完全实现
- Interface Registry Persistence：前端已有类型映射，但完整后端持久化未完成
- Rule Backend Persistence：规则在非 mock 模式仍依赖模拟数据
- Publish Backend Persistence：发布任务持久化未完全后端对齐
- 多个 control-plane 端点仍在前端预期，但后端未实现

### 1.2 Frontend-Backend Launch Alignment
**计划文件:** `docs/plans/2026-03-21-frontend-backend-launch-alignment.md`

**问题：**
- 缺少后端 controller/service：`MenuCapabilityController.java`, `JobSceneController.java`
- 缺少后端数据库表：`MenuCapabilityPolicyDO`, `MenuCapabilityRequestDO`, `JobSceneDO`
- 缺少 mappers：`MenuCapabilityPolicyMapper`, `MenuCapabilityRequestMapper`, `JobSceneMapper`
- 前端许多方法仍以 mock-based `store` 作为主要数据源，未完全切换到后端 API
- 尚未创建 `configCenterApi.ts` 客户端层，所有请求仍通过 `configCenterService.ts` 并带有 mock 兜底

### 1.3 General Config Merge
**计划文件:** `docs/plans/2026-03-22-general-config-merge.md`

**问题：**
- 后端 `general_config_item` 表和 controller/service 尚未实现
- 前端 `getPlatformRuntimeConfig()` 仍引用旧端点 `/api/governance/platform-runtime-config`，该端点将被移除
- 后端需要删除旧的 `PlatformRuntimeConfigDO` 和 `PlatformRuntimeConfigMapper`
- **类型不匹配：** 前端预期 `general-config-items` 端点，但后端尚未提供

### 1.4 Region Menu Consolidation (Removing Site Layer)
**计划文件:** `docs/plans/2026-03-22-region-menu-consolidation.md`

**问题：**
- **契约不匹配：** 后端菜单响应仍返回 `siteId`，但前端预期顶层为 `regionId` 且无 `siteId`
- 后端需要完全删除 `page_site` 表
- 前端已从 `types.ts` 中删除 `PageSite` 和 `PageRegion` 类型，如果后端仍返回这些类型会产生不匹配
- API 端点 `/api/control/page-menus` 预期后端返回 region-first 响应，但后端未更新

### 1.5 Region General Config Menu Selection
**计划文件:** `docs/plans/2026-03-22-region-general-config-menu-selection.md`

**问题：**
- 后端尚未在 `general-config-items` 组中植入 region 字典
- 前端菜单创建表单仍有硬编码的 region 兜底，需要从后端通用配置获取
- 多个页面中缺少 region label 映射

### 1.6 Job Scene Main Table Backend Integration
**计划文件:** `docs/plans/2026-03-22-job-scene-main-table.md`

**问题：**
- 后端缺少 `job_scene` 主表：`JobSceneDO`, `JobSceneMapper`, `JobSceneController`, `JobSceneService` 尚不存在
- 前端 `listJobScenes()` 仍主要使用 mock store，后端端点 `/api/control/job-scenes` （列表/详情/创建/更新/状态/分享/克隆）未实现
- **API端点缺失：** 所有 job scene 操作当前仅支持 mock

### 1.7 Rule Data Processor Refactor
**计划文件:** `docs/plans/2026-03-20-rule-data-processor-implementation.md`

**问题：**
- 前端已将 `PreprocessorDefinition` → `DataProcessorDefinition` 重命名，但后端未同步更新
- 预期后端端点 `/api/control/data-processors` 但未实现
- 前端已移除旧的内置预处理器 ID (3501/3502/3503)，但后端可能仍保留
- **类型不匹配：** 前端现在预期 `paramCount` 和 `functionCode` 字段，后端没有这些字段

### 1.8 Rule Publish Log Cleanup
**计划文件:** `docs/plans/2026-03-22-rule-publish-log-cleanup.md`

**问题：**
- 后端需要完全删除 `rule_version` 表
- 后端需要删除 `publish_task` 表并添加 `publish_operation_log` 表替代
- 前端预期 `/api/control/publish/logs` 端点仅用于操作日志，而非发布任务
- **API契约变更：** 现有发布任务端点将被移除，如果后端不更新会产生不匹配

### 1.9 Runtime Record Cleanup
**计划文件:** `docs/plans/2026-03-22-runtime-record-cleanup.md`

**问题：**
- 后端缺少 `prompt_hit_log` 和 `job_execution_record` 表及 controllers
- 前端已删除 `AuditMetricsPage.tsx`，但后端可能仍有统计端点
- **端点缺失：** `/api/runtime/prompt-hit-logs` 和 `/api/runtime/job-execution-records` 未实现

### 1.10 Smart Job Launch
**计划文件:** `docs/plans/2026-03-19-smart-job-launch-implementation.md`

**问题：**
- 大量前端重构尚未完成
- 后端集成检查点：持久化节点图存储、版本化场景发布契约、执行日志查询 API、最近运行汇总 API 全部缺失
- 所有图分析、变量助手、执行可观测性当前未实现

### 1.11 Shared Prompt / Shared Job Capability
**计划文件:** `docs/plans/2026-03-20-shared-prompt-job-implementation.md`

**问题：**
- 分享配置和克隆操作的后端端点未实现
- 前端已有类型和 mock 实现，但预期后端处理：
  - `updateRuleShareConfig`
  - `updateJobSceneShareConfig`
  - `cloneRuleToOrg`
  - `cloneJobSceneToOrg`
- **API缺失：** 这些共享访问端点后端尚不存在

### 1.12 Run Record Center
**计划文件:** `docs/plans/2026-03-20-run-record-center-implementation.md`

**问题：**
- 后端端点 `listPromptHitRecords` 和 `listJobExecutionRecords` 未实现
- 前端页面结构已创建，但预期后端支持分页和过滤
- prompt hit logs 和 job execution records 数据库表尚不存在

---

## 2. 前端已完成但后端未对齐

### 2.1 List Data Retirement
**设计文件:** `docs/specs/2026-03-20-advanced-list-data-retirement-design.md`

**状态：** 前端工作已完成，但：
- `ListDataPage.tsx` 已删除
- 后端可能仍保留 list data 表和端点 → 需要清理
- 前端已从类型中移除 `ListDataDefinition`，如果后端仍引用会产生不匹配

### 2.2 Data Processor Refactor
**设计文件:** `docs/specs/2026-03-20-rule-data-processor-design.md`

**状态：** 前端重构已完成，但：
- 后端仍使用 `preprocessor` 术语和 schema
- **破坏性变更：** 前端现在预期 `paramCount` 和 `functionCode`，需要后端 schema 变更
- 不保持向后兼容 - 后端必须更新

### 2.3 External Reference Binding Design
**设计文件:** `docs/specs/2026-03-21-external-reference-binding-design.md`

**问题：**
- 整个功能未实现
- 需要不存在的外部系统查询 API（菜单、页面、业务流程）
- 后端需要实现：菜单能力激活 CRUD、页面绑定 CRUD、业务流程配置 CRUD

### 2.4 Smart Prompt / Job Quick Filters
**设计文件:** `docs/specs/2026-03-21-smart-prompt-job-quick-filters-design.md`

**状态：** 已设计但未实现。prompt 和 job 列表的快速范围过滤器尚未编码。

---

## 3. API端点不匹配

| 前端端点 | 预期用途 | 状态 |
|---|---|---|
| `/api/control/page-menus` | 菜单列表 | 预期不返回 `siteId` 字段，但后端可能仍包含 |
| `/api/control/page-resources` | 页面资源 | 后端持久化未完成 |
| `/api/governance/general-config-items` | 通用配置 | 尚不存在 - 需要实现 |
| `/api/governance/platform-runtime-config` | 平台运行时 | 通用配置合并后将被移除 |
| `/api/governance/menu-sdk-policies` | 菜单 SDK 策略 | 前端已存在，需要后端验证 |
| `/api/control/interfaces` | API 接口 | 后端持久化未完成 |
| `/api/control/data-processors` | 数据处理器 | 前端已重构，端点与后端不匹配 |
| `/api/control/context-variables` | 上下文变量 | 应当存在但需要验证 |
| `/api/control/rules` | 规则 | 后端仍有前端已移除的版本概念 |
| `/api/control/job-scenes` | 作业场景 | 尚不存在 - 需要完整实现 |
| `/api/control/publish/logs` | 发布日志 | 后端需要表 schema 修改 |
| `/api/runtime/prompt-hit-logs` | Prompt 命中日志 | 未实现 |
| `/api/runtime/job-execution-records` | 作业执行记录 | 未实现 |

---

## 4. 类型不匹配

| 类型 | 前端变更 | 后端状态 |
|---|---|---|
| **PageMenu** | `regionId` 从 `number` → `string`，完全移除 `siteId` | 后端可能仍包含 `siteId` |
| **DataProcessor** | 从 `PreprocessorDefinition` 重命名，添加 `paramCount` 和 `functionCode`，移除 `processorType` 和 `ownerOrgId` | 后端仍使用旧结构 |
| **JobSceneDefinition** | 添加 `sourceSceneId`, `sourceSceneName`，完整分享字段 | 后端没有这些字段 |
| **RuleDefinition** | 移除 `currentVersion`（规则版本概念完全删除） | 后端可能仍预期此字段 |
| **PageSite / PageRegion** | 完全删除这些类型 | 后端必须也删除 |
| **ListDataDefinition** | 完全删除此类型 | 后端必须也删除 |

---

## 5. 已删除功能需要后端清理

- **AuditMetricsPage.tsx：** 已删除（按照 Runtime Record Cleanup 计划），但后端任何引用仍存在 → 需要清理
- **ListDataPage.tsx：** 已删除，但后端可能仍有表/端点
- **废弃页面路由重定向：** `App.tsx` 中已对废弃页面（rules → prompts, publish → page-management 等）进行重定向，后端仍存在这些页面，但前端无法从导航访问
- 多个端点在 `configCenterService.ts` 中已被调用，但后端许多端点尚不存在

---

## 6. 已发现并修复的前端Bug

### 6.1 API接口注册 - 编辑已有接口表单值丢失

**问题：** 编辑已有接口时，填写完所有信息仍然提示"请输入接口名称"、"请输入用途说明"并阻断。

**根因：** 抽屉使用 `destroyOnClose`，关闭会销毁 DOM。`openEdit` 在打开抽屉前调用 `form.setFieldsValue`，但此时 DOM 尚未渲染，导致值丢失。

**修复：** 在 `useEffect` 中抽屉打开后，如果是编辑状态，重新设置一遍表单值。

**修复文件：** `src/pages/InterfacesPage/InterfacesPage.tsx`

---

## 7. 总结

当前前端代码库处于**过渡状态**：
- 许多主要功能已在前端完成重构
- 类型系统已更新以匹配新的后端契约
- mock 数据已更新
- 但相应的后端实现、数据库 schema 变更和 API 端点**仍待完成**
- 前端已进行多个破坏性变更，需要后端协调更新

所有待办实现任务完整列表记录在 `docs/plans/` 目录下的 13 个计划文档中。

另外，针对接口注册、智能提示、智能作业三个核心功能的详细验证问题清单，请参考：`docs/feature-verification-issues.md`
