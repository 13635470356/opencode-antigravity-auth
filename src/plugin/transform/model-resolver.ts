/**
 * 模型解析 —— 纯查表（assets/model-mapping.json），零名称变换。
 *
 * 2.0.0 起删除 tier/variant/别名体系：配置名 → 实际 API 名由映射文件唯一决定，
 * 名称中的 -high/-thinking 等后缀是模型名的一部分，不做拆解或重组。
 * 未映射模型由 plugin 层快速失败（plugin.ts 的 createUnsupportedModelResponse）。
 */

import { resolveMappedModel } from "../config/model-mapping"
import type { ResolvedModel } from "./types"

// Claude thinking 模型的默认思考预算（延续旧版 tier 体系 claude 档位上限 32768 的行为）
const CLAUDE_DEFAULT_THINKING_BUDGET = 32768

// 名称末尾的思考级别后缀：仅用于设置请求体 thinkingLevel，不改变模型名
const THINKING_LEVEL_SUFFIX_REGEX = /-(minimal|low|medium|high)$/i

function isClaudeThinkingName(model: string): boolean {
  const lower = model.toLowerCase()
  return lower.includes("claude") && lower.includes("thinking")
}

/**
 * 解析配置模型名 → 实际 API 模型（纯查表）。
 *
 * 命中时附带由名称通用推导的思考配置（家族级行为，非模型特定知识）：
 * - gemini-3 系名称末尾带级别后缀 → thinkingLevel
 * - claude thinking 名称 → 默认 thinkingBudget
 *
 * 未映射返回 undefined，由调用方决定报错方式。
 */
export function resolveModel(requestedModel: string): ResolvedModel | undefined {
  const entry = resolveMappedModel(requestedModel)
  if (!entry) {
    return undefined
  }

  const actual = entry.actual
  const lower = actual.toLowerCase()
  const isGemini3 = lower.includes("gemini-3")
  const levelSuffix = actual.match(THINKING_LEVEL_SUFFIX_REGEX)?.[1]?.toLowerCase()
  const thinkingLevel = isGemini3 ? levelSuffix : undefined
  const thinkingBudget = isClaudeThinkingName(actual) ? CLAUDE_DEFAULT_THINKING_BUDGET : undefined

  return {
    actualModel: actual,
    thinkingLevel,
    thinkingBudget,
    isThinkingModel: lower.includes("thinking") || isGemini3,
    quotaPreference: entry.pool,
    explicitQuota: true,
  }
}

/**
 * 模型家族（quota 分组用）——通用名称检测。
 */
export function getModelFamily(model: string): "claude" | "gemini-flash" | "gemini-pro" {
  const lower = model.toLowerCase()
  if (lower.includes("claude")) {
    return "claude"
  }
  if (lower.includes("flash")) {
    return "gemini-flash"
  }
  return "gemini-pro"
}
