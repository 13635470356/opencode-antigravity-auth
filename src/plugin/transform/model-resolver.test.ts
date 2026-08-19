import { describe, it, expect } from "vitest"
import { resolveModel, getModelFamily } from "./model-resolver"
import { loadModelMapping } from "../config/model-mapping"

describe("resolveModel", () => {
  describe("遍历映射表中的所有模型", () => {
    it("每个配置名 resolveModel 后 actualModel === 条目 actual", () => {
      const mapping = loadModelMapping()

      for (const [configName, entry] of Object.entries(mapping)) {
        const result = resolveModel(configName)
        expect(result).toBeDefined()
        expect(result?.actualModel).toBe(entry.actual)
      }
    })
  })

  describe("未映射名称返回 undefined", () => {
    it("antigravity-gemini-3.1-pro 未映射", () => {
      const result = resolveModel("antigravity-gemini-3.1-pro")
      expect(result).toBeUndefined()
    })

    it("gemini-3-flash 未映射", () => {
      const result = resolveModel("gemini-3-flash")
      expect(result).toBeUndefined()
    })

    it("gpt-oss-120b 未映射", () => {
      const result = resolveModel("gpt-oss-120b")
      expect(result).toBeUndefined()
    })

    it("claude-opus-4-6-thinking 无前缀未映射", () => {
      const result = resolveModel("claude-opus-4-6-thinking")
      expect(result).toBeUndefined()
    })

    it("antigravity-gemini-3.5-flash 未映射", () => {
      const result = resolveModel("antigravity-gemini-3.5-flash")
      expect(result).toBeUndefined()
    })
  })

  describe("thinking 配置", () => {
    it("gemini 条目（含 -high 后缀） → thinkingLevel === 'high'", () => {
      const mapping = loadModelMapping()

      for (const [configName, entry] of Object.entries(mapping)) {
        if (entry.actual.includes("gemini-3") && entry.actual.endsWith("-high")) {
          const result = resolveModel(configName)
          expect(result?.thinkingLevel).toBe("high")
        }
      }
    })

    it("claude-opus-4-6-thinking → thinkingBudget === 32768", () => {
      const result = resolveModel("antigravity-claude-opus-4-6-thinking")
      expect(result?.thinkingBudget).toBe(32768)
    })

    it("claude-sonnet-4-6 → thinkingBudget/thinkingLevel 均 undefined", () => {
      const result = resolveModel("antigravity-claude-sonnet-4-6")
      expect(result?.thinkingBudget).toBeUndefined()
      expect(result?.thinkingLevel).toBeUndefined()
    })
  })

  describe("quota 配置", () => {
    it("所有映射模型的 quotaPreference === 'antigravity'", () => {
      const mapping = loadModelMapping()

      for (const [configName] of Object.entries(mapping)) {
        const result = resolveModel(configName)
        expect(result?.quotaPreference).toBe("antigravity")
      }
    })

    it("所有映射模型的 explicitQuota === true", () => {
      const mapping = loadModelMapping()

      for (const [configName] of Object.entries(mapping)) {
        const result = resolveModel(configName)
        expect(result?.explicitQuota).toBe(true)
      }
    })
  })

  describe("isThinkingModel 配置", () => {
    it("claude thinking 模型 isThinkingModel === true", () => {
      const result = resolveModel("antigravity-claude-opus-4-6-thinking")
      expect(result?.isThinkingModel).toBe(true)
    })

    it("gemini-3 模型 isThinkingModel === true", () => {
      const mapping = loadModelMapping()

      for (const [configName, entry] of Object.entries(mapping)) {
        if (entry.actual.includes("gemini-3")) {
          const result = resolveModel(configName)
          expect(result?.isThinkingModel).toBe(true)
        }
      }
    })

    it("非 thinking 模型 isThinkingModel === false", () => {
      const result = resolveModel("antigravity-claude-sonnet-4-6")
      expect(result?.isThinkingModel).toBe(false)
    })
  })
})

describe("getModelFamily", () => {
  describe("claude 模型家族", () => {
    it("claude-*.includes('claude') → 'claude'", () => {
      expect(getModelFamily("claude-opus-4-6")).toBe("claude")
      expect(getModelFamily("claude-sonnet-4-6")).toBe("claude")
      expect(getModelFamily("antigravity-claude-opus-4-6-thinking")).toBe("claude")
    })
  })

  describe("gemini-flash 模型家族", () => {
    it("gemini-*flash* → 'gemini-flash'", () => {
      expect(getModelFamily("gemini-3.7-flash-high")).toBe("gemini-flash")
      expect(getModelFamily("gemini-3.6-flash-high")).toBe("gemini-flash")
      expect(getModelFamily("gemini-2.5-flash")).toBe("gemini-flash")
    })
  })

  describe("gemini-pro 模型家族", () => {
    it("其他 gemini 模型 → 'gemini-pro'", () => {
      expect(getModelFamily("gemini-3.1-pro")).toBe("gemini-pro")
      expect(getModelFamily("gemini-3-pro")).toBe("gemini-pro")
      expect(getModelFamily("gemini-2.5-pro")).toBe("gemini-pro")
    })
  })
})
