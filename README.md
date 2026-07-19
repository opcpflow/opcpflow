# OpcpFlow

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript" alt="TypeScript" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-monorepo-F69220?logo=pnpm" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/status-pre--release-yellow" alt="Pre-release" />
</p>

**智能化 DAG 编排工作流框架** — AI 代理组装、多类型素材合成、D4 自动进化的 TypeScript DAG 框架。

包含可视化编辑器、11 种 AI 编排节点、Ready Frontier 事件驱动引擎、ContextStore 三级记忆、D4EvolutionHook 自动进化。

> **为什么选择 OpcpFlow？**
>
> - **D4 自进化** — 工作流根据使用模式自动从静态进化到动态，而非一成不变
> - **Agent 装配模式** — 知识 + 策略 + 执行 + 质检的完整 AI Agent 范式，而非简单工具链
> - **Ready Frontier 引擎** — 依赖满足即执行，不等同层节点，消除等待浪费
> - **TypeScript 原生 + 可嵌入** — 非独立服务，`npm install` 即可嵌入任何 React 应用

```bash
npm install @opcpflow/core @opcpflow/nodes @opcpflow/react
```

---

## Packages

```
@opcpflow/core       DAG 类型、验证、拓扑排序、Ready Frontier 引擎、ContextStore、EventBus、D4进化
@opcpflow/nodes      11 种 AI 编排节点定义（颜色、图标、分类、表单字段）
@opcpflow/react      DAGEditor 可视化编辑器 + 沙盒执行
@opcpflow/engine     Ready Frontier 执行引擎、ContextStore、子图重规划、遥测
```

### 依赖流

```
react → nodes → core
engine → core
```

---

## 核心能力

| 能力 | 说明 |
|------|------|
| **11 种 AI 编排节点** | trigger / task_decompose / dynamic / llm_call / api_call / mcp_tool / knowledge / strategy / verification / merge / output |
| **Ready Frontier 引擎** | 依赖满足即执行，不等同层，消除等待浪费 |
| **ContextStore 三级记忆** | L1 节点临时 / L2 结构化状态 / L3 外部缓存，含冲突检测+新鲜度+源标记 |
| **EventBus 事件总线** | dag.* / node.* 全生命周期事件，支持可观测性+进化钩子 |
| **D4 自动进化** | 静态→半静态→动态→进化复用，dynamic 节点捕获未匹配子任务，自动生成子 DAG |
| **D4EvolutionHook** | 追踪动态节点频率、节点耗时，自动建议提升为静态节点 |
| **Token 预算控制** | 跟踪 Token 消耗，超限熔断 |
| **自动数据路由** | 连线即数据流，零配置输入输出 |
| **沙盒测试** | 编辑器内执行 DAG，节点实时变色 |
| **Headless CI** | `testDAG()` 无 UI 执行，适合 CI 流水线 |

---

## 节点类型（11 种）

| 分类 | 类型 | 说明 |
|------|------|------|
| **control** | `trigger` | DAG 触发起点 |
| | `task_decompose` | 命令拆解为并行子任务 |
| | `dynamic` | ⚡ 动态兜底 + D4 进化 |
| | `output` | 最终交付物输出 |
| **ai** | `llm_call` | LLM 推理/生成 |
| | `knowledge` | 知识库（三源合并） |
| | `strategy` | Persona/规则/行为指南 |
| **integration** | `api_call` | HTTP API 调用 |
| | `mcp_tool` | MCP 协议工具调用 |
| | `merge` | 多类型素材合成 |
| **verification** | `verification` | SGV 对抗质检 |

---

## D4 进化模型

```
L1: 全静态              L2: 半静态             L3: 动态              L4: 进化复用

用户画完整 DAG         用户画骨架 +          无预定义 DAG          历史最佳自动
全部节点明确编排        dynamic 兜底         完全动态生成          检索匹配适配
                        task_decompose 驱动  LLM 从零拆解          持续微进化
完全可预测              灵活度提升            学习路径              结构自优化

           ───→ 使用增多 ───→ 子任务路径稳定 ───→ D4EvolutionHook 建议提升
```

---

## 快速开始

```tsx
import { DAGEditor } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'

const registry = createDefaultRegistry()

export default function App() {
  return (
    <DAGEditor
      registry={registry}
      onSave={(doc) => console.log('Saved:', doc)}
    />
  )
}
```

### 编程执行 + D4 进化

```ts
import { DAGExecutionEngine, HandlerRegistry, D4EvolutionHook } from '@opcpflow/core'

const engine = new DAGExecutionEngine({ maxTokens: 100000 })
const evolution = new D4EvolutionHook()
const handlers = HandlerRegistry.createWithBuiltIns()

const report = await engine.execute(dag, handlers, {
  mode: 'live',
  onDAGComplete: (report) => {
    const insights = evolution.analyze('my-workflow', report)
    console.log('Suggestions:', insights.suggestions)
  },
})

console.log('Token usage:', engine.getStore().getTokenUsage())
```

---

## 开发

```bash
pnpm install
pnpm -r build
pnpm -r test
cd apps/demo && pnpm dev
```

## License

Apache 2.0
