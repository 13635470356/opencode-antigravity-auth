# Model Mapping

用户在 `opencode.json` 的 `provider.google.models` 里配置的模型名，到插件实际发送给 Google API（Antigravity `/v1internal:generateContent` 或 `streamingGenerateContent`）请求体 `model` 字段值的权威中文对照参考。

> **2.0.0 重大变更**：模型映射从代码复杂规则改为纯查表机制。本文档是新的映射机制的权威参考。

---

## 概述

插件通过 `assets/model-mapping.json` 纯查表完成模型映射，是模型配置的**单一事实来源**：

- **键**：OpenCode 配置名（`opencode.json` 中的 `provider.google.models` 键），**精确匹配、大小写敏感**
- **值**：映射条目 `{ actual, pool, limit, modalities? }`
- **加载**：启动时读取并 Zod 校验，非法 JSON 或空映射启动即报错
- **修改**：编辑 JSON 文件即可，无需改动代码，重启生效

不再有 tier 后缀剥离、别名表、header-style 名称变换等复杂规则。名称里的 `-high` 或 `-thinking` 是模型名的一部分，不做任何拆解。

---

## 当前映射表

| 配置名 | 实际 API 模型名 | 配额池 | 上下文/输出限额 |
|---|---|---|---|
| `antigravity-gemini-3.7-flash-high` | `gemini-3.7-flash-high` | `antigravity` | 1048576 / 65536 |
| `antigravity-gemini-3.6-flash-high` | `gemini-3.6-flash-high` | `antigravity` | 1048576 / 65536 |
| `antigravity-claude-opus-4-6-thinking` | `claude-opus-4-6-thinking` | `antigravity` | 200000 / 64000 |
| `antigravity-claude-sonnet-4-6` | `claude-sonnet-4-6` | `antigravity` | 200000 / 64000 |

**配额池说明**：
- 当前所有 4 个模型都使用 `antigravity` 池（Electron-style User-Agent + 设备指纹）
- `gemini-cli` 池（`google-api-nodejs-client` UA）暂无条目
- 双池降级机制（`hasBothQuotaPools()`）在两个池都有条目时自动启用

---

## 字段说明

每个映射条目包含以下字段：

### `actual`（必需）

实际发送到 Google API 的模型名，**零变换**。

```json
{
  "antigravity-claude-sonnet-4-6": {
    "actual": "claude-sonnet-4-6"
  }
}
```

### `pool`（必需）

Quota 池，决定请求的 header style 与端点路由：

- `"antigravity"`：Electron-style User-Agent + 设备指纹，使用 Antigravity 配额
- `"gemini-cli"`：`google-api-nodejs-client` UA，使用 Gemini CLI 配额（仅限生产端点）

当前所有 4 个模型都使用 `antigravity` 池。

### `limit`（必需）

OpenCode 模型定义的上下文/输出限额：

```json
{
  "limit": { "context": 1048576, "output": 65536 }
}
```

### `modalities`（可选）

输入/输出模态，缺省为通用默认 `{ input: ["text", "image", "pdf"], output: ["text"] }`：

```json
{
  "modalities": {
    "input": ["text", "image", "pdf"],
    "output": ["text"]
  }
}
```

---

## 如何新增模型

只需编辑 `assets/model-mapping.json` 添加一条映射，无需改动任何 TypeScript 代码：

```json
{
  "antigravity-gemini-3.8-pro": {
    "actual": "gemini-3.8-pro",
    "pool": "antigravity",
    "limit": { "context": 1048576, "output": 65536 }
  }
}
```

添加后重启插件即可生效（或重新运行 `npm run build && npm test`）。

**配额池选择**：
- Claude 模型：必须用 `antigravity` 池
- Gemini 模型：默认 `antigravity` 池（可选 `gemini-cli` 池，启用双池降级）
- Image 模型：必须用 `antigravity` 池

---

## 未映射行为

当用户配置的模型名在映射表中不存在时，插件启动失败并抛出 `Unsupported model` 错误：

```
Unsupported model: antigravity-gemini-3.9-flash
Supported models: antigravity-gemini-3.7-flash-high, antigravity-gemini-3.6-flash-high, antigravity-claude-opus-4-6-thinking, antigravity-claude-sonnet-4-6
Please re-run "Configure models" to update your model list.
```

这确保用户配置与映射表一致，避免静默错误。

---

## 行为细节

### Claude thinking 默认预算

名称包含 `thinking` 的 Claude 模型（`antigravity-claude-opus-4-6-thinking`、`antigravity-claude-sonnet-4-6-thinking`）默认使用 `thinkingBudget: 32768`（high tier）。

此行为在请求组装阶段注入（`src/plugin/request.ts`），不涉及模型名变换。

### Gemini 3 thinkingLevel

名称包含 `gemini-3` 的模型（如 `gemini-3.7-flash-high`）根据后缀自动设置 `thinkingLevel`：

- `*-high` → `thinkingLevel: "high"`
- `*-medium` → `thinkingLevel: "medium"`
- `*-low` → `thinkingLevel: "low"`

这是**名称级家族行为**，不是模型特定代码逻辑。

---

## 移除的旧机制

以下机制在 2.0.0 中已移除：

### 1. Tier 后缀剥离

**旧机制**：`-low` / `-medium` / `-high` 后缀被剥离，tier 用于选择 thinking budget。

**新机制**：后缀是模型名的一部分，保留原样。

### 2. 别名表（`MODEL_ALIASES`）

**旧机制**：配置名通过别名表映射到实际模型名。

**新机制**：直接查表，配置名即实际模型名（或通过 `actual` 字段指定）。

### 3. Header-style 名称变换

**旧机制**：`antigravity-` 前缀与 `-preview` 后缀在配额池切换时互相转换。

**新机制**：配额池由 `pool` 字段直接指定，不做名称变换。

### 4. `THINKING_TIER_BUDGETS` 常量

**旧机制**：tier 字符串映射到数字预算的常量表。

**新机制**：Claude thinking 固定 32768，Gemini 3 用字符串 level。

---

## 迁移指引

### 从 1.x 升级到 2.0.0

**用户操作**：

1. 重新运行 `Configure models` 更新 `opencode.json` 模型清单
2. 删除任何 tier 后缀变体（如 `-low`、`-medium`、`-high`）
3. 删除 `variants` 配置（variant 体系已移除）

**配置示例**：

```json
{
  "provider": {
    "google": {
      "models": {
        "antigravity-claude-opus-4-6-thinking": {
          "name": "Claude Opus 4.6 Thinking",
          "limit": { "context": 200000, "output": 64000 }
        }
      }
    }
  }
}
```

**开发者操作**：

如需新增模型，编辑 `assets/model-mapping.json` 并运行测试：

```bash
npm run typecheck
npm test
```

---

## 代码参考

| 文件 | 职责 |
|---|---|
| `assets/model-mapping.json` | 模型映射查表（单一事实来源） |
| `src/plugin/config/model-mapping.ts` | 映射加载 + Zod 校验 |
| `src/plugin/request.ts` | 请求组装，注入 thinking 配置 |
| `src/plugin/config/schema.ts` | 配置 schema + 默认值 |

---

## See Also

- [README.md — Models](../README.md#models) — 模型配置示例
- [docs/CONFIGURATION.md](CONFIGURATION.md) — 插件行为配置（`cli_first`、账号轮换等）
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — 请求/响应流转、Claude thinking 策略
- [docs/ANTIGRAVITY_API_SPEC.md](ANTIGRAVITY_API_SPEC.md) — Antigravity API 参考
