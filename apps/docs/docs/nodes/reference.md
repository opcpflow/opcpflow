---
sidebar_position: 10
title: Nodes Reference
---

# Nodes Reference

OpcpFlow 提供 **11 种预设节点**，按 4 个分类编排 AI 工作流。

## 节点概览

| 分类 | 节点 | 说明 |
|------|------|------|
| **control** | `trigger` | DAG 触发起点 |
| | `task_decompose` | 命令拆解为并行子任务 |
| | `dynamic` | 动态兜底 + D4 进化 |
| | `output` | 最终交付物输出 |
| **ai** | `llm_call` | LLM 推理/生成 |
| | `knowledge` | 知识库（多源合并） |
| | `strategy` | Persona/规则/行为指南/Hooks |
| **integration** | `api_call` | HTTP API 调用 |
| | `mcp_tool` | MCP 协议工具调用 |
| | `merge` | 多类型素材合成 |
| **verification** | `verification` | SGV 对抗质检 |

---

## trigger

**分类**: control | **图标**: ▶ | **颜色**: `#10b981`

DAG 执行起点。每个 DAG 有且仅有一个 trigger 节点。

### 属性面板

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Command | textarea | ✅ | DAG 的执行指令，如 `Generate 3 marketing copy for spring campaign` |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `event` | string | Trigger 命令文本 |
| `triggered_at` | string | ISO 时间戳 |

---

## task_decompose

**分类**: control | **图标**: 🔀 | **颜色**: `#f59e0b`

将命令拆解为并行子任务。支持 LLM 拆解和基于规则的兜底。

### 属性面板

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Decomposition Rules | textarea | - | 拆解规则描述，留空则 LLM 自动拆解 |
| Model | select | ✅ | 用于拆解的 LLM 模型，可选注册模型或自定义 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `sub_tasks` | array | 拆解后的子任务列表 |
| `count` | number | 子任务数量 |
| `method` | string | 拆解方式: `llm` 或 `rule_based` |

---

## dynamic

**分类**: control | **图标**: ⚡ | **颜色**: `#f97316`

动态子任务处理器。捕获 task_decompose 无法匹配的子任务，运行时生成子 DAG（trigger → llm_call → output）并递归执行。支持 D4 自动进化。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| Execution Rules | textarea | ✅ | - | 如何处理未匹配子任务的描述 |
| Max Parallel Instances | number | - | `5` | 最大并行执行实例数 |
| Model | select | ✅ | - | 子 DAG 使用的 LLM 模型，可选注册模型或自定义 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `results` | array | 动态子任务执行结果（含实际内容） |
| `instance_count` | number | 执行的动态实例数 |
| `sub_dags` | array | 生成的子 DAG 描述（用于进化追踪） |

---

## output

**分类**: control | **图标**: 📤 | **颜色**: `#64748b`

最终交付物输出。支持所有媒体类型：视频、音频、图片、文档、混合媒体、JSON 数据等。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 选项 |
|------|------|------|--------|------|
| Output Type | select | ✅ | `auto` | auto / video / audio / image / document / mixed / text / json / markdown / code / file |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `result` | object | DAG 最终输出 |
| `format` | string | 输出格式类型 |
| `deliverable` | any | 实际交付内容（文件 URL、媒体引用、结构化数据等） |

---

## llm_call

**分类**: ai | **图标**: 🧠 | **颜色**: `#6366f1`

调用 LLM 进行推理或生成。自动从上游 knowledge + strategy 节点组装上下文。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| Instructions | textarea | ✅ | - | LLM 指令/prompt |
| Model | select | ✅ | - | LLM 模型，可选注册模型或自定义 |
| Temperature | number | - | `0.7` | 生成温度 (0.0 - 2.0) |
| Max Tokens | number | - | `2048` | 最大输出 token 数 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | string | LLM 响应文本 |
| `model` | string | 使用的模型 |
| `usage` | object | Token 使用统计 |

---

## knowledge

**分类**: ai | **图标**: 🔍 | **颜色**: `#8b5cf6`

组装知识供 agent 使用。支持直接输入或从上游节点（mcp/api/llm/db）自动收集。多源合并为统一知识包。

### 属性面板

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Direct Knowledge Input | textarea | - | 直接输入知识内容，可由上游补充 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `results` | array | 搜索结果条目 |
| `total` | number | 结果总数 |
| `inline_content` | string | 直接输入的知识文本 |
| `assembled` | boolean | 是否从多源组装 |

---

## strategy

**分类**: ai | **图标**: 📋 | **颜色**: `#14b8a6`

组装 agent 策略：persona、规则、指南和 hooks（执行前后回调）。支持直接输入和上游组装。

### 属性面板

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Persona | textarea | ✅ | Agent 角色定义：背景、专长 |
| Rules & Constraints | textarea | - | 硬性规则，如 "Always output in Chinese" |
| Guidelines | textarea | - | 行为指南：语气、风格、质量标准 |
| Pre-Hooks | textarea | - | 执行前回调，如 "Check budget before calling LLM" |
| Post-Hooks | textarea | - | 执行后回调，如 "Log output to audit" |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `persona` | string | Agent 角色定义 |
| `rules` | string | 硬性规则和约束 |
| `guidelines` | string | 行为指南 |
| `pre_hooks` | string | 执行前回调 |
| `post_hooks` | string | 执行后回调 |

---

## api_call

**分类**: integration | **图标**: 🌐 | **颜色**: `#f59e0b`

发起 HTTP 请求调用外部 REST API。自动将上游上下文注入请求 body 的 `_context` 字段。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| URL | text | ✅ | - | API 端点 URL |
| Method | select | ✅ | `GET` | GET / POST / PUT / DELETE / PATCH |
| Headers | json | - | - | 请求头，支持 `{{var}}` 模板 |
| Body | textarea | - | - | 请求体（JSON、表单编码或原始文本） |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | number | HTTP 状态码 |
| `data` | any | 响应数据 |
| `headers` | object | 响应头 |

---

## mcp_tool

**分类**: integration | **图标**: 🔧 | **颜色**: `#06b6d4`

调用 MCP（Model Context Protocol）工具获取外部能力。自动将上游上下文注入参数 `_context`。

### 属性面板

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Tool Name | text | ✅ | MCP 工具名称（如 web_search, database_query） |
| MCP Server Endpoint | text | ✅ | MCP 服务器地址 |
| Parameters | json | - | 工具参数 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `result` | any | MCP 工具执行结果 |

---

## merge

**分类**: integration | **图标**: 🔗 | **颜色**: `#8b5cf6`

多类型素材合成为最终交付物。支持三种合成管道：LLM（内容/文本组装）、MCP（媒体合成工具）、API（外部渲染服务）。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| Assembly Instructions | textarea | ✅ | - | 如何合成最终输出 |
| Output Format | select | ✅ | `mixed` | video / audio / image / document / mixed / json |
| Pipeline | select | ✅ | `llm` | llm / mcp / api |

#### MCP Pipeline（当 pipeline=mcp 时显示）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| MCP Tool Name | text | ✅ | 合成工具名称 |
| MCP Server Endpoint | text | ✅ | MCP 服务器地址 |
| Tool Parameters | json | - | 工具参数 |

#### API Pipeline（当 pipeline=api 时显示）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| API Endpoint | text | ✅ | 渲染服务地址 |
| HTTP Method | select | - | POST / PUT |
| Headers | json | - | 请求头 |

#### LLM Pipeline（当 pipeline=llm 时显示）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Model | select | ✅ | 用于内容组装的 LLM 模型，可选注册模型或自定义 |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `merged` | object | 合成后的最终交付物 |
| `sources` | array | 参与的源节点 ID |
| `format` | string | 输出格式 |
| `pipeline_used` | string | 使用的管道 |
| `composition_log` | array | 逐步合成日志 |

---

## verification

**分类**: verification | **图标**: ✅ | **颜色**: `#ec4899`

SGV（Self-Guided Verification）两步质检。**Blind 步骤**：在未见输出时自动生成质检标准。**Grounded 步骤**：用标准检查实际输出。支持自动生成和手动输入标准。

### 属性面板

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| Auto-Generate Criteria | boolean | - | `true` | 启用时自动从子任务上下文生成质检标准 |
| SGV Criteria | textarea | ✅* | - | *当 auto_generate=false 时必填，手动输入质检标准 |
| Minimum Score | number | - | `0.7` | 通过阈值 (0.0 - 1.0) |

### 输出

| 字段 | 类型 | 说明 |
|------|------|------|
| `verified` | boolean | 质检是否通过 |
| `score` | number | 质检评分 (0-1) |
| `feedback` | string | SGV 质检反馈 |
| `criteria_used` | string | 使用的质检标准（自动或手动） |
| `sgv_steps` | object | Blind + Grounded 步骤详情 |
