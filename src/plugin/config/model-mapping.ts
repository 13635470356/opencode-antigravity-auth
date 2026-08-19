/**
 * 模型映射加载器 —— assets/model-mapping.json 是模型事实的唯一来源。
 *
 * 以后新增/修改模型只需编辑该 JSON（键 = 配置名，值 = { actual, pool, limit }），
 * 不需要修改任何 ts 代码。加载期做 Zod 校验，非法文件在启动时即报错。
 */

import { existsSync, readFileSync, realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { z } from "zod"

// 候选路径覆盖两种布局：源码（src/plugin/config → 包根）与构建产物（dist/src/plugin/config → 包根）
const MAPPING_URL_CANDIDATES = [
  new URL("../../../assets/model-mapping.json", import.meta.url),
  new URL("../../../../assets/model-mapping.json", import.meta.url),
]

const ModelLimitSchema = z.object({
  context: z.number().int().positive(),
  output: z.number().int().positive(),
})

const ModelMappingEntrySchema = z.object({
  /** 实际发送到 Google API 的模型名 */
  actual: z.string().min(1),
  /** quota 池（决定 header style 与端点） */
  pool: z.enum(["antigravity", "gemini-cli"]),
  /** 上下文/输出限额（写入 OpenCode 模型定义） */
  limit: ModelLimitSchema,
  /** 可选：输入/输出模态，缺省用通用默认 */
  modalities: z
    .object({
      input: z.array(z.string()),
      output: z.array(z.string()),
    })
    .optional(),
})

const ModelMappingSchema = z.record(z.string(), ModelMappingEntrySchema)

export type ModelMappingEntry = z.infer<typeof ModelMappingEntrySchema>
export type ModelMapping = Record<string, ModelMappingEntry>

let cachedMapping: ModelMapping | undefined

/**
 * 校验已解析的映射对象，非法形状抛出含原因的错误。
 */
export function parseModelMapping(parsed: unknown): ModelMapping {
  const result = ModelMappingSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`模型映射内容校验失败: ${result.error.message}`)
  }
  if (Object.keys(result.data).length === 0) {
    throw new Error("模型映射内容为空：至少需要一条模型映射")
  }
  return result.data
}

/**
 * 按候选顺序定位映射文件，realpathSync 兜底 npm link / pnpm 符号链接布局。
 */
function resolveMappingFilePath(): string {
  for (const url of MAPPING_URL_CANDIDATES) {
    const candidatePath = fileURLToPath(url)
    if (existsSync(candidatePath)) {
      return realpathSync(candidatePath)
    }
  }
  throw new Error(
    `找不到模型映射文件，已尝试: ${MAPPING_URL_CANDIDATES.map((url) => url.pathname).join(", ")}`,
  )
}

/**
 * 读取并校验映射文件（模块级缓存）。
 * realpathSync 兜底 npm link / pnpm 符号链接布局。
 */
export function loadModelMapping(): ModelMapping {
  if (cachedMapping) {
    return cachedMapping
  }

  const filePath = resolveMappingFilePath()

  let raw: string
  try {
    raw = readFileSync(filePath, "utf8")
  } catch (error) {
    throw new Error(`无法读取模型映射文件 ${filePath}: ${String(error)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`模型映射文件不是合法 JSON（${filePath}）: ${String(error)}`)
  }

  const mapping = parseModelMapping(parsed)
  cachedMapping = mapping
  return cachedMapping
}

/**
 * 按配置名查表。未映射返回 undefined，由调用方决定报错方式。
 */
export function resolveMappedModel(name: string): ModelMappingEntry | undefined {
  return loadModelMapping()[name]
}

/**
 * 双池配额降级仅在两个池都有条目时才有意义。
 * 当前映射全为 antigravity 池 → 不降级；未来 JSON 出现 gemini-cli 条目后自动启用。
 */
export function hasBothQuotaPools(): boolean {
  const pools = new Set(Object.values(loadModelMapping()).map((entry) => entry.pool))
  return pools.has("antigravity") && pools.has("gemini-cli")
}

/**
 * 账号探测（ping）模型：第一个 antigravity 池的 gemini 条目。
 */
export function getPingModel(): string {
  const entry = Object.values(loadModelMapping()).find(
    (item) => item.pool === "antigravity" && item.actual.toLowerCase().includes("gemini"),
  )
  if (!entry) {
    throw new Error("模型映射中缺少可用于探测的 antigravity 池 gemini 模型")
  }
  return entry.actual
}
