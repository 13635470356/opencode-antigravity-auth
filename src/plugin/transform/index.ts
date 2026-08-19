/**
 * Transform Module Index
 * 
 * Re-exports transform functions and types for request transformation.
 */

// Types
export type {
  ModelFamily,
  ThinkingTier,
  TransformContext,
  TransformResult,
  TransformDebugInfo,
  RequestPayload,
  ThinkingConfig,
  ResolvedModel,
  GoogleSearchConfig,
} from "./types";

// Model resolution（2.0.0 起纯查表：assets/model-mapping.json）
export {
  resolveModel,
  getModelFamily,
} from "./model-resolver";

// Claude transforms
export {
  isClaudeModel,
  isClaudeThinkingModel,
  configureClaudeToolConfig,
  buildClaudeThinkingConfig,
  ensureClaudeMaxOutputTokens,
  appendClaudeThinkingHint,
  normalizeClaudeTools,
  applyClaudeTransforms,
  CLAUDE_THINKING_MAX_OUTPUT_TOKENS,
  CLAUDE_INTERLEAVED_THINKING_HINT,
} from "./claude";
export type { ClaudeTransformOptions, ClaudeTransformResult } from "./claude";

// Gemini transforms
export {
  isGeminiModel,
  isGemini3Model,
  isGemini25Model,
  isImageGenerationModel,
  buildGemini3ThinkingConfig,
  buildGemini25ThinkingConfig,
  buildImageGenerationConfig,
  normalizeGeminiTools,
  applyGeminiTransforms,
} from "./gemini";
export type { GeminiTransformOptions, GeminiTransformResult, ImageConfig } from "./gemini";

// Cross-model sanitization
export {
  sanitizeCrossModelPayload,
  sanitizeCrossModelPayloadInPlace,
  getModelFamily as getCrossModelFamily,
  stripGeminiThinkingMetadata,
  stripClaudeThinkingFields,
} from "./cross-model-sanitizer";
export type { SanitizerOptions } from "./cross-model-sanitizer";
