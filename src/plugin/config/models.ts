import { loadModelMapping } from "./model-mapping"
import type { ProviderModel } from "../types"

export interface ModelLimit {
  context: number
  output: number
}

export interface ModelModalities {
  input: string[]
  output: string[]
}

export interface OpencodeModelDefinition extends ProviderModel {
  name: string
  limit: ModelLimit
  modalities: ModelModalities
}

export type OpencodeModelDefinitions = Record<string, OpencodeModelDefinition>

const DEFAULT_MODALITIES: ModelModalities = {
  input: ["text", "image", "pdf"],
  output: ["text"],
}

// 由配置名生成展示名：antigravity-gemini-3.7-flash-high → Antigravity Gemini 3.7 Flash High
function deriveDisplayName(configName: string): string {
  return configName
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ")
}

/**
 * OpenCode 模型定义列表 —— 全部由 assets/model-mapping.json 派生。
 * 新增模型只需编辑映射 JSON，此文件零模型知识。
 */
export const OPENCODE_MODEL_DEFINITIONS: OpencodeModelDefinitions = Object.fromEntries(
  Object.entries(loadModelMapping()).map(([configName, entry]) => [
    configName,
    {
      name: deriveDisplayName(configName),
      limit: entry.limit,
      modalities: entry.modalities ?? DEFAULT_MODALITIES,
    },
  ]),
)
