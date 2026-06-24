# Model Mapping

用户在 `opencode.json` 的 `provider.google.models` 里配置的模型名，到插件实际发送给 Google API（Antigravity `/v1internal:generateContent` 或 `streamingGenerateContent`）请求体 `model` 字段值的权威中文对照参考。

> 本文档以 `src/plugin/transform/model-resolver.ts`（解析器）与 `src/plugin/request.ts`（请求组装）的实际代码为事实基准，不是 README 的复述。若 README 与代码存在漂移，见文末「文档与代码差异」。

---

## 对照表

> 「实际 API 模型名」指 **默认（无 `variants` / 未命中变体）** 情况下，`resolveModelForHeaderStyle(rawModel, headerStyle)` 返回的 `actualModel`，即 `request.ts` 写入 Antigravity 请求体 `model` 字段的值（`src/plugin/request.ts:809-810`）。若你启用 opencode 的 `--variant=...`，该值可能被变体逻辑改写，详见下一节「转换规则」与 [docs/MODEL-VARIANTS.md](MODEL-VARIANTS.md)。

### Antigravity 配额组（恒走 Antigravity 头样式）

| 配置名 | 实际 API 模型名 | 配额池 | 思考支持类型 + 可用层级/变体 |
|---|---|---|---|
| `antigravity-gemini-3.5-flash` | `gemini-3.5-flash-low`（3.5 Flash 带 tier 后缀，默认 `-low`；真实层级由 variant 的 `thinkingLevel` 参数决定）`(model-resolver.ts:192-194)` | Antigravity（`explicitQuota=true`，不可回退）`(model-resolver.ts:174)` | `thinkingLevel` 字符串。Flash 支持 `low`/`medium`/`high` `(model-resolver.ts:30)` |
| `antigravity-gemini-3.1-pro` | `gemini-3.1-pro-low`（默认追加 `-low`；变体可改 `-high`）`(model-resolver.ts:195-196)` | Antigravity（`explicitQuota=true`，不可回退）`(model-resolver.ts:174)` | `thinkingLevel` 字符串。Pro 仅 `low`/`high` `(model-resolver.ts:30, 64)` |
| `antigravity-claude-sonnet-4-6-thinking` | `claude-sonnet-4-6-thinking`（默认 `thinkingBudget:32768`=high）`(model-resolver.ts:223, 236-245)` | Antigravity（`explicitQuota=true`，Claude 恒走 Antigravity）`(model-resolver.ts:168, 172-173)` | `thinkingBudget` 数字。默认 high=32768；低预算=8192 `(model-resolver.ts:19)` |
| `antigravity-claude-opus-4-6-thinking` | `claude-opus-4-6-thinking`（默认 `thinkingBudget:32768`=high）`(model-resolver.ts:223, 236-245)` | Antigravity（`explicitQuota=true`，Claude 恒走 Antigravity）`(model-resolver.ts:168, 172-173)` | `thinkingBudget` 数字。默认 high=32768；低预算=8192 `(model-resolver.ts:19)` |
| `antigravity-gpt-oss-120b-medium` | `gpt-oss-120b-medium`（`-medium` 属 API 名一部分，非 tier，不被剥离）`(model-resolver.ts:202-204, 80)` | Antigravity（`explicitQuota=true`）`(model-resolver.ts:174)` | 不支持思考（`supportsThinkingTiers` 对 gpt-oss 返回 false，`-medium` 保留）`(model-resolver.ts:82-89, 95-102)` |

### Gemini CLI 配额组（`cli_first:true` 时偏好 Gemini CLI，否则 Antigravity；可双向回退）

| 配置名 | 实际 API 模型名 | 配额池 | 思考支持类型 + 可用层级/变体 |
|---|---|---|---|
| `gemini-2.5-flash` | `gemini-2.5-flash`（别名表无命中，原样）`(model-resolver.ts:195-197)` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可在两池间回退 `(model-resolver.ts:172-173)` | `thinkingBudget` 数字。flash 预算：low=6144/medium=12288/high=24576 `(model-resolver.ts:21)` |
| `gemini-2.5-pro` | `gemini-2.5-pro`（别名表无命中，原样）`(model-resolver.ts:195-197)` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可回退 `(model-resolver.ts:172-173)` | `thinkingBudget` 数字。pro 预算：low=8192/medium=16384/high=32768 `(model-resolver.ts:20)` |
| `gemini-3-flash-preview` | `gemini-3-flash-preview`（别名表无命中；非 antigravity 前缀不走 skipAlias）`(model-resolver.ts:176-177, 195-197)`；默认 `thinkingLevel:"low"` `(model-resolver.ts:220-227)` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可回退 `(model-resolver.ts:172-173)` | `thinkingLevel` 字符串。Flash 支持 `minimal`/`low`/`medium`/`high` `(model-resolver.ts:30)` |
| `gemini-3-pro-preview` | `gemini-3-pro-preview`（非 antigravity 前缀不走 skipAlias，故不自动补 `-low`）`(model-resolver.ts:176-177, 195-197)`；默认 `thinkingLevel:"low"` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可回退 `(model-resolver.ts:172-173)` | `thinkingLevel` 字符串。Pro 仅 `low`/`high` `(model-resolver.ts:30, 64)` |
| `gemini-3.1-pro-preview` | `gemini-3.1-pro-preview`（同上规则）`(model-resolver.ts:176-177, 195-197)`；默认 `thinkingLevel:"low"` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可回退 `(model-resolver.ts:172-173)` | `thinkingLevel` 字符串。Pro 仅 `low`/`high` `(model-resolver.ts:30, 64)` |
| `gemini-3.1-pro-preview-customtools` | `gemini-3.1-pro-preview-customtools`（`-customtools` 不匹配 tier 正则，原样保留）`(model-resolver.ts:62, 176-177, 195-197)`；默认 `thinkingLevel:"low"` | 默认 Antigravity；`cli_first:true` 时偏好 Gemini CLI，可回退 `(model-resolver.ts:172-173)` | `thinkingLevel` 字符串。Pro 仅 `low`/`high` `(model-resolver.ts:30, 64)` |

---

## 转换规则

解析器入口为 `resolveModelForHeaderStyle(requestedModel, headerStyle)`（`src/plugin/request.ts:809` 调用），它按 `headerStyle` 分流到 `resolveModelWithTier` 或先做名字转换再调用。下面是 5 条核心规则，每条均给出代码定位。

### 规则 1 — `antigravity-` 前缀（显式配额）

- 正则：`QUOTA_PREFIX_REGEX = /^antigravity-/i` `(model-resolver.ts:63)`。
- 命中即剥离得到 `modelWithoutQuota`，并标记 `isAntigravity=true` → `explicitQuota=true` `(model-resolver.ts:161-162, 174)`。
- 显式配额意味着该请求**不允许**跨池回退（`explicitQuota` 在账号轮换层用于阻止 fallback）。
- 特例：`isAntigravity && isGemini3` 时 `skipAlias=true` `(model-resolver.ts:176-177)`，Antigravity 前缀的 Gemini 3 系列会绕过 `MODEL_ALIASES` 表，直接保留全名按 Pro/Flash 规则处理（见规则 3）。

### 规则 2 — `-preview` 后缀（Gemini CLI 形态）

- 无独立正则；`-preview` 仅作为名字的一部分参与匹配。
- 它是 Gemini CLI 形态的标志。在配额回退转换里，`-preview` 会被加上或剥离（见规则 5）。
- `-preview-customtools` 是 Gemini 3.1 Pro 的特殊变体（`gemini-3.1-pro-preview-customtools`），其尾部 `-customtools` 不属于 tier，不会被 tier 正则吞掉。

### 规则 3 — Tier 后缀（`-low` / `-medium` / `-high` / `-minimal`）

- 正则：`TIER_REGEX = /-(minimal|low|medium|high)$/` `(model-resolver.ts:62)`。
- 仅对「支持思考 tier 的模型」提取 tier：`supportsThinkingTiers` 返回 true 当且仅当名字含 `gemini-3` / `gemini-2.5` / `claude` 且含 `thinking` `(model-resolver.ts:82-89, 95-102)`。例如 `gpt-oss-120b-medium` 的 `-medium` 不会被剥离。
- 提取后得到 `baseName`（去 tier）与 `tier` `(model-resolver.ts:164-165)`。
- **skipAlias 分支**（`isAntigravity && isGemini3`，`model-resolver.ts:177, 187-193`）：
  - **Gemini 3 Pro** 无显式 tier 且非 image：自动追加 `-low`（默认 tier）`(model-resolver.ts:188-189)`。
  - **Gemini 3 Flash** 带 tier：剥掉 tier，保留 `baseName`（Flash 用 `thinkingLevel` 参数表达 tier，名字里不带）`(model-resolver.ts:190-192)`。
  - Flash 无 tier 时名字不变，后续 `thinkingLevel:"low"` 作为默认值填入 `(model-resolver.ts:220-227)`。
- **非 skipAlias 分支**（默认查别名表）：`actualModel = MODEL_ALIASES[modelWithoutQuota] || MODEL_ALIASES[baseName] || baseName` `(model-resolver.ts:195-197)`。
- tier 还决定思考预算的数值（Claude / Gemini 2.5）或层级字符串（Gemini 3）：
  - Claude/Gemini 2.5 数值预算见 `THINKING_TIER_BUDGETS` `(model-resolver.ts:18-23)`；无 tier 的 Claude thinking 默认 `high=32768` `(model-resolver.ts:231-238)`。
  - Gemini 3 无 tier 默认 `thinkingLevel:"low"` `(model-resolver.ts:218-227)`。

### 规则 4 — Image 生成模型（`/image|imagen/`）

- 正则：`IMAGE_GENERATION_MODELS = /image|imagen/i` `(model-resolver.ts:73)`。
- 命中即 `isImageModel=true`、`explicitQuota=true`，强制走 Antigravity（即便 `cli_first` 也不改）`(model-resolver.ts:167, 172, 174)`。
- image 模型**不支持思考**，解析器提前返回不带任何 thinking 配置的 `ResolvedModel` `(model-resolver.ts:204-212)`；`request.ts` 进一步注入 `imageConfig` 并删除 `thinkingConfig`/`tools` `(src/plugin/request.ts:972-1003)`。
- 代码注释明确：只有 `gemini-3-pro-image` 经 Antigravity 可用；`gemini-2.5-flash-image`（Nano Banana）不被 Antigravity 支持 `(model-resolver.ts:57-59)`。

### 规则 5 — 配额回退转换（`resolveModelForHeaderStyle`）

当账号轮换需要在 Antigravity 与 Gemini CLI 两池之间切换时，调用 `resolveModelForHeaderStyle(requestedModel, headerStyle)` 转换名字 `(model-resolver.ts:310-357)`。仅对 Gemini 3 系列做特殊处理，其它模型直接 `resolveModelWithTier` 透传 `(model-resolver.ts:317-319)`。

**切到 `antigravity` 头样式**（`headerStyle === "antigravity"`，`model-resolver.ts:321-338`）：
1. 依次剥除 `-preview-customtools` → `-preview` → `antigravity-` 前缀 `(model-resolver.ts:322-325)`。
2. 若剥后是 Gemini 3 Pro、无 tier 后缀、非 image：补 `-low` `(model-resolver.ts:327-334)`。
3. 重新加上 `antigravity-` 前缀并走 `resolveModelWithTier`（即进入 skipAlias 分支）`(model-resolver.ts:336-337)`。

示例：`gemini-3.1-pro-preview` → `antigravity-gemini-3.1-pro-low`。

**切到 `gemini-cli` 头样式**（`headerStyle === "gemini-cli"`，`model-resolver.ts:340-354`）：
1. 剥除 `antigravity-` 前缀与 `-low/-medium/-high` tier 后缀 `(model-resolver.ts:341-343)`。
2. 若没有 `-preview` 后缀，追加 `-preview` `(model-resolver.ts:345-348)`。
3. 走 `resolveModelWithTier` 后强制覆盖 `quotaPreference: "gemini-cli"` `(model-resolver.ts:350-353)`。

示例：`antigravity-gemini-3.5-flash` → `gemini-3.5-flash-preview`；`antigravity-gemini-3.1-pro-low` → `gemini-3.1-pro-preview`。

### 变体如何覆盖以上规则

opencode.json 的 `variants`（`thinkingLevel` 字符串 / `thinkingConfig.thinkingBudget` 数字）经 OpenCode 以 `providerOptions` 传入，`request.ts` 调 `extractVariantThinkingConfig` 解析为 `VariantConfig` `(src/plugin/request.ts:917-920, src/plugin/request-helpers.ts:807)`。变体优先级高于名字里的 tier：

- Gemini 3 + `variant.thinkingLevel` → 直接用作 `thinkingLevel`；若是 Antigravity Pro，名字会被同步改写为 `${base}-${level}` `(model-resolver.ts:384-403)`。
- Gemini 3 + `variant.thinkingBudget`（legacy 数字格式）→ 按 `≤8192→low / ≤16384→medium / >16384→high` 转成字符串，并打 deprecation 警告 `(src/plugin/request.ts:930-935, model-resolver.ts:295-299)`。
- Claude / Gemini 2.5 + `variant.thinkingBudget` → 直接作为数字预算 `(src/plugin/request.ts:936-939)`。

变体细节与推荐配置见 [docs/MODEL-VARIANTS.md](MODEL-VARIANTS.md)，本文不重复。

---

## 配置来源（代码 vs 运行时）

这 11 个模型名和映射规则，究竟是代码写死的还是配置文件定的？答案是**分层**：模型清单有代码默认值但可在用户配置覆盖；映射规则则纯代码写死、配置不可改。

### 代码源头（仓库内）

| 内容 | 源文件 | 关键位置 |
|---|---|---|
| 11 个模型默认清单（名/限额/变体） | `src/plugin/config/models.ts` | `OPENCODE_MODEL_DEFINITIONS` `:40-114` |
| 自动写入 opencode.json（覆盖式） | `src/plugin/config/updater.ts` | `updateOpencodeConfig()` `:107-177`；写入点 `:155` |
| 配置名→实际模型名映射规则 | `src/plugin/transform/model-resolver.ts` | `MODEL_ALIASES` `:40-60`、解析函数 `:160-411` |
| 变体接入（providerOptions→思考配置） | `src/plugin/request-helpers.ts` `:807` + `src/plugin/request.ts` `:917` | `extractVariantThinkingConfig` |
| 请求组装（写 `model` 字段） | `src/plugin/request.ts` | `:809-810`、`:841/:1280/:1498` |
| 插件行为配置 schema + 默认值 | `src/plugin/config/schema.ts` | `AntigravityConfigSchema` / `DEFAULT_CONFIG` |
| 行为配置加载（默认→用户→项目） | `src/plugin/config/loader.ts` | `loadConfig()` `:121-140` |
| 端点/UA/头样式/OAuth 凭据 | `src/constants.ts` | `:32-66` |

### 运行时文件（用户机器上）

| 文件 | 路径 | 谁写 |
|---|---|---|
| OpenCode 主配置 + 模型清单 | `~/.config/opencode/opencode.json`（或 `.jsonc`） | `updater.ts` 自动写入，或手动编辑 |
| 插件行为配置 | `~/.config/opencode/antigravity.json` | 用户手动 |
| 项目级覆盖（优先级最高） | `<项目>/.opencode/antigravity.json` | 用户手动 |
| 账号池（含 refresh token） | `~/.config/opencode/antigravity-accounts.json` | 插件 `storage.ts` |

> 路径可用 `OPENCODE_CONFIG_DIR` 环境变量覆盖 `(loader.ts:28-37)`。

### 三个要点

1. **自动配置是覆盖式**：`updater.ts:155` 用 `{ ...OPENCODE_MODEL_DEFINITIONS }` **整段替换** `provider.google.models`。手动加的自定义模型，再跑一次"Configure models"会被清掉。
2. **默认值 ≠ 生效值**：`models.ts` 的清单只是默认；真正生效的是 opencode.json 的内容（可任意改）。**映射规则始终在代码里，配置碰不到。**
3. **行为配置三级合并**：`DEFAULT_CONFIG` → 用户 `antigravity.json` → 项目 `.opencode/antigravity.json`（最高）`(loader.ts:121-140)`。

---

## 文档与代码差异

对照 README「Model Reference」两表（`README.md:113-130`）与解析器实际行为，发现以下漂移：

1. **Claude Opus 4.6 thinking 变体名 `max`**：README 表与 opencode.json 示例用 `low` / `max` 作为变体键，对应 `thinkingBudget: 8192` / `32768`（`README.md:196-199`）。但解析器内部 tier 体系只有 `low` / `medium` / `high` 三档（`ThinkingTier` 类型，`src/plugin/transform/types.ts:5`；`THINKING_TIER_BUDGETS.claude`，`model-resolver.ts:19`）。
   - **事实**：`max` 不是解析器识别的 tier，而是 opencode variant 的键名。变体路径直接用 `thinkingBudget` 数字覆盖（`request.ts:929, 938`），不经过 `ThinkingTier`。README 把 `max` 列为「Variant」值是 OpenCode variant 键，并非 resolver tier。用户若在模型名尾部直接写 `-max`（如 `claude-opus-4-6-thinking-max`），`TIER_REGEX` 不会匹配（`max` 不在 `minimal|low|medium|high`），会被当作 baseName 的一部分，导致名字异常。
   - **文档声明**：README 将 `low, max` 列为 variants 列。
   - **建议**：使用 opencode.json 的 `variants` 配置（`thinkingConfig.thinkingBudget`），不要在模型名后直接加 `-max` 后缀。

2. **Antigravity 配额组 Gemini 3.1 Pro 的「Variants」列写 `low, high`**（`README.md:116`）：
   - **事实**：与代码一致——Pro 仅支持 `low` / `high`（`GEMINI_3_THINKING_LEVELS` 含 4 档，但 Pro 走 `budgetToGemini3Level` 时 `medium` 仍可被 variant 传入，只是与 Antigravity 名字改写规则配合时仅 `low/high` 是文档推荐的；Flash 明确支持 4 档，`README.md:115` 与 `model-resolver.ts:30` 一致）。
   - **结论**：此条未发现实质性漂移，仅做一致性确认记录。

3. **README 路由行为声明**（`README.md:132-137`）称「Antigravity-first（默认）：Gemini 模型使用 Antigravity 配额」「CLI-first 时 Gemini 模型优先用 Gemini CLI」：
   - **事实**：与 `resolveModelWithTier` 的 `quotaPreference` 计算一致 `(model-resolver.ts:172-173)`。Claude/image 恒走 Antigravity 与代码一致 `(model-resolver.ts:168, 172)`。
   - **结论**：未发现漂移。

除上述第 1 条（`max` 是 variant 键而非 resolver tier）外，README 模型表的配额归属、变体层级、路由声明与解析器代码一致。

---

## See Also

- [README.md — Models](../README.md#models) — 11 个 canonical 名的来源与可复制 `opencode.json` 配置
- [docs/MODEL-VARIANTS.md](MODEL-VARIANTS.md) — `variants` 字段（`thinkingLevel` / `thinkingConfig.thinkingBudget`）的完整配置教程
- [docs/CONFIGURATION.md](CONFIGURATION.md) — 插件行为配置项（`cli_first`、`account_selection_strategy` 等）详解
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — 请求/响应整体流转、Claude thinking 策略、会话恢复
- [docs/ANTIGRAVITY_API_SPEC.md](ANTIGRAVITY_API_SPEC.md) — Antigravity API 字段参考
