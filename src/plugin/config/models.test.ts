import { describe, expect, it } from "vitest";

import { OPENCODE_MODEL_DEFINITIONS } from "./models";
import { loadModelMapping } from "./model-mapping";

const getModel = (name: string) => {
  const model = OPENCODE_MODEL_DEFINITIONS[name];
  if (!model) {
    throw new Error(`Missing model definition for ${name}`);
  }
  return model;
};

describe("OPENCODE_MODEL_DEFINITIONS", () => {
  it("keys match mapping file keys", () => {
    const definitionNames = Object.keys(OPENCODE_MODEL_DEFINITIONS).sort();
    const mappingNames = Object.keys(loadModelMapping()).sort();
    expect(definitionNames).toEqual(mappingNames);
  });

  it("derives all properties from mapping entries", () => {
    const mapping = loadModelMapping();

    for (const [configName, definition] of Object.entries(OPENCODE_MODEL_DEFINITIONS)) {
      const entry = mapping[configName];
      if (!entry) {
        throw new Error(`Missing mapping entry for ${configName}`);
      }

      // limit 原样来自映射
      expect(definition.limit).toEqual(entry.limit);

      // modalities 使用默认值（因为映射中未定义）
      expect(definition.modalities).toEqual({
        input: ["text", "image", "pdf"],
        output: ["text"],
      });
    }
  });

  it("derives display names correctly", () => {
    // 抽样检查首字母大写派生
    expect(getModel("antigravity-gemini-3.7-flash-high").name).toBe("Antigravity Gemini 3.7 Flash High");
    expect(getModel("antigravity-claude-opus-4-6-thinking").name).toBe("Antigravity Claude Opus 4 6 Thinking");
  });

  it("does not include variants property", () => {
    for (const definition of Object.values(OPENCODE_MODEL_DEFINITIONS)) {
      expect(definition).not.toHaveProperty("variants");
    }
  });
});
