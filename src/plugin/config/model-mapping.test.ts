import { describe, expect, it } from "vitest";

import {
  loadModelMapping,
  parseModelMapping,
  resolveMappedModel,
  hasBothQuotaPools,
  getPingModel,
} from "./model-mapping";

describe("model-mapping", () => {
  describe("loadModelMapping", () => {
    it("loads exactly 4 entries", () => {
      const mapping = loadModelMapping();
      expect(Object.keys(mapping)).toHaveLength(4);
    });

    it("contains expected entries with correct structure", () => {
      const mapping = loadModelMapping();

      // 抽样检查条目字段
      expect(mapping["antigravity-gemini-3.7-flash-high"]).toEqual({
        actual: "gemini-3.7-flash-high",
        pool: "antigravity",
        limit: { context: 1048576, output: 65536 },
      });

      expect(mapping["antigravity-claude-opus-4-6-thinking"]).toEqual({
        actual: "claude-opus-4-6-thinking",
        pool: "antigravity",
        limit: { context: 200000, output: 64000 },
      });
    });

    it("all entries have valid actual and pool fields", () => {
      const mapping = loadModelMapping();
      for (const [configName, entry] of Object.entries(mapping)) {
        expect(entry.actual).toBeTypeOf("string");
        expect(entry.actual.length).toBeGreaterThan(0);
        expect(["antigravity", "gemini-cli"]).toContain(entry.pool);
        expect(entry.limit.context).toBeTypeOf("number");
        expect(entry.limit.output).toBeTypeOf("number");
      }
    });
  });

  describe("resolveMappedModel", () => {
    it("returns entry for existing model", () => {
      const entry = resolveMappedModel("antigravity-gemini-3.7-flash-high");
      expect(entry).toBeDefined();
      expect(entry?.actual).toBe("gemini-3.7-flash-high");
    });

    it("returns undefined for non-existent model", () => {
      expect(resolveMappedModel("antigravity-gemini-3.1-pro")).toBeUndefined();
      expect(resolveMappedModel("nonexistent-model")).toBeUndefined();
    });
  });

  describe("hasBothQuotaPools", () => {
    it("returns false when all entries are antigravity pool", () => {
      expect(hasBothQuotaPools()).toBe(false);
    });
  });

  describe("getPingModel", () => {
    it("returns first antigravity pool gemini model", () => {
      expect(getPingModel()).toBe("gemini-3.7-flash-high");
    });
  });

  describe("parseModelMapping", () => {
    it("rejects missing actual field", () => {
      expect(() => parseModelMapping({
        "some-model": {
          pool: "antigravity",
          limit: { context: 100000, output: 10000 },
        },
      })).toThrowError(/actual/);
    });

    it("rejects invalid pool value", () => {
      expect(() => parseModelMapping({
        "some-model": {
          actual: "some-model-actual",
          pool: "foo",
          limit: { context: 100000, output: 10000 },
        },
      })).toThrowError(/pool/);
    });

    it("rejects missing output in limit", () => {
      expect(() => parseModelMapping({
        "some-model": {
          actual: "some-model-actual",
          pool: "antigravity",
          limit: { context: 100000 },
        },
      })).toThrowError(/limit/);
    });

    it("rejects negative limit values", () => {
      expect(() => parseModelMapping({
        "some-model": {
          actual: "some-model-actual",
          pool: "antigravity",
          limit: { context: -100000, output: 10000 },
        },
      })).toThrowError();
    });

    it("rejects non-object top-level type", () => {
      expect(() => parseModelMapping([])).toThrowError();
    });
  });
});
