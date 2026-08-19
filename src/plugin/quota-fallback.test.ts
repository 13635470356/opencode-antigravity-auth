import { beforeAll, describe, expect, it, vi } from "vitest";
import type { HeaderStyle, ModelFamily } from "./accounts";

type ResolveQuotaFallbackHeaderStyle = (input: {
  family: ModelFamily;
  headerStyle: HeaderStyle;
  alternateStyle: HeaderStyle | null;
}) => HeaderStyle | null;

type GetHeaderStyleFromUrl = (
  urlString: string,
  family: ModelFamily,
  cliFirst?: boolean,
) => HeaderStyle;

type ResolveHeaderRoutingDecision = (
  urlString: string,
  family: ModelFamily,
  config: unknown,
) => {
  cliFirst: boolean;
  preferredHeaderStyle: HeaderStyle;
  explicitQuota: boolean;
  allowQuotaFallback: boolean;
};

type CreateUnsupportedModelResponse = (modelName: string) => Response;

let resolveQuotaFallbackHeaderStyle: ResolveQuotaFallbackHeaderStyle | undefined;
let getHeaderStyleFromUrl: GetHeaderStyleFromUrl | undefined;
let resolveHeaderRoutingDecision: ResolveHeaderRoutingDecision | undefined;
let createUnsupportedModelResponse: CreateUnsupportedModelResponse | undefined;

beforeAll(async () => {
  vi.mock("@opencode-ai/plugin", () => ({
    tool: vi.fn(),
  }));

  const { __testExports } = await import("../plugin");
  resolveQuotaFallbackHeaderStyle = (__testExports as {
    resolveQuotaFallbackHeaderStyle?: ResolveQuotaFallbackHeaderStyle;
  }).resolveQuotaFallbackHeaderStyle;
  getHeaderStyleFromUrl = (__testExports as {
    getHeaderStyleFromUrl?: GetHeaderStyleFromUrl;
  }).getHeaderStyleFromUrl;
  resolveHeaderRoutingDecision = (__testExports as {
    resolveHeaderRoutingDecision?: ResolveHeaderRoutingDecision;
  }).resolveHeaderRoutingDecision;
  createUnsupportedModelResponse = (__testExports as {
    createUnsupportedModelResponse?: CreateUnsupportedModelResponse;
  }).createUnsupportedModelResponse;
});

describe("quota fallback direction", () => {
  it("falls back from gemini-cli to antigravity when alternate quota is available", () => {
    const result = resolveQuotaFallbackHeaderStyle?.({
      family: "gemini",
      headerStyle: "gemini-cli",
      alternateStyle: "antigravity",
    });

    expect(result).toBe("antigravity");
  });

  it("falls back from antigravity to gemini-cli when alternate quota is available", () => {
    const result = resolveQuotaFallbackHeaderStyle?.({
      family: "gemini",
      headerStyle: "antigravity",
      alternateStyle: "gemini-cli",
    });

    expect(result).toBe("gemini-cli");
  });

  it("returns null when no alternate quota is available", () => {
    const result = resolveQuotaFallbackHeaderStyle?.({
      family: "gemini",
      headerStyle: "antigravity",
      alternateStyle: null,
    });

    expect(result).toBeNull();
  });
});

describe("header style resolution", () => {
  it("uses gemini-cli for unsuffixed Gemini models when cli_first is enabled", () => {
    const headerStyle = getHeaderStyleFromUrl?.(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent",
      "gemini",
      true,
    );

    expect(headerStyle).toBe("gemini-cli");
  });

  it("keeps antigravity for unsuffixed Gemini models when cli_first is disabled", () => {
    const headerStyle = getHeaderStyleFromUrl?.(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent",
      "gemini",
      false,
    );

    expect(headerStyle).toBe("antigravity");
  });

  it("keeps antigravity for mapped antigravity-gemini model even when cli_first is enabled", () => {
    const headerStyle = getHeaderStyleFromUrl?.(
      "https://generativelanguage.googleapis.com/v1beta/models/antigravity-gemini-3.7-flash-high:streamGenerateContent",
      "gemini",
      true,
    );

    expect(headerStyle).toBe("antigravity");
  });

  it("keeps antigravity for Claude when cli_first is enabled", () => {
    const headerStyle = getHeaderStyleFromUrl?.(
      "https://generativelanguage.googleapis.com/v1beta/models/antigravity-claude-opus-4-6-thinking:streamGenerateContent",
      "claude",
      true,
    );

    expect(headerStyle).toBe("antigravity");
  });
});

describe("header routing decision", () => {
  it("defaults to antigravity-first for unsuffixed Gemini when cli_first is disabled", () => {
    const decision = resolveHeaderRoutingDecision?.(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent",
      "gemini",
      {
        cli_first: false,
      },
    );

    expect(decision).toMatchObject({
      cliFirst: false,
      preferredHeaderStyle: "antigravity",
      explicitQuota: false,
      allowQuotaFallback: false,
    });
  });

  it("uses gemini-cli-first for unsuffixed Gemini when cli_first is enabled", () => {
    const decision = resolveHeaderRoutingDecision?.(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent",
      "gemini",
      {
        cli_first: true,
      },
    );

    expect(decision).toMatchObject({
      cliFirst: true,
      preferredHeaderStyle: "gemini-cli",
      explicitQuota: false,
      allowQuotaFallback: false,
    });
  });

  it("keeps explicit antigravity-gemini as primary route while fallback remains unavailable", () => {
    const decision = resolveHeaderRoutingDecision?.(
      "https://generativelanguage.googleapis.com/v1beta/models/antigravity-gemini-3.7-flash-high:streamGenerateContent",
      "gemini",
      {
        cli_first: true,
      },
    );

    expect(decision).toMatchObject({
      cliFirst: true,
      preferredHeaderStyle: "antigravity",
      explicitQuota: true,
      allowQuotaFallback: false,
    });
  });

  it("ignores legacy quota_fallback when deciding Gemini fallback availability", () => {
    const decision = resolveHeaderRoutingDecision?.(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent",
      "gemini",
      {
        cli_first: false,
        quota_fallback: false,
      },
    );

    expect(decision).toMatchObject({
      cliFirst: false,
      preferredHeaderStyle: "antigravity",
      explicitQuota: false,
      allowQuotaFallback: false,
    });
  });
});

describe("unsupported model response", () => {
  it("returns error response listing supported models", async () => {
    const response = createUnsupportedModelResponse?.("antigravity-gemini-3.1-pro");
    expect(response).toBeDefined();

    const text = await response?.text();
    expect(text).toContain("Unsupported model");
    expect(text).toContain("antigravity-gemini-3.1-pro");
    expect(text).toContain("antigravity-gemini-3.7-flash-high");
    expect(text).toContain("antigravity-gemini-3.6-flash-high");
    expect(text).toContain("antigravity-claude-opus-4-6-thinking");
    expect(text).toContain("antigravity-claude-sonnet-4-6");
  });
});
