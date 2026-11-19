import { describe, expect, it, vi } from "vitest";
import { generateLetter } from "./generate";

vi.mock("@/shared/server/log", () => ({ log: vi.fn() }));

const inputs = {
  cvText: `${"Erfaring med Python og SQL i tre år. ".repeat(8)}\nola@example.no`,
  jobAd: "Vi søker en utvikler med Python og SQL.",
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const CTX = { studentId: null, consent: null };

// A mock adapter of our own: a slice reaches `ai` only through its index.
type Adapter = NonNullable<
  NonNullable<Parameters<typeof generateLetter>[2]>["adapter"]
>;
function createMockAdapter(options: {
  respond?: (args: { prompt: string }) => unknown;
  error?: Error;
}): Adapter {
  return {
    kind: "mock",
    provider: "mock",
    model: "mock-1",
    async generate(args) {
      if (options.error) throw options.error;
      const output = options.respond ? options.respond(args) : { mock: true };
      return { output, usage: { inputTokens: null, outputTokens: null } };
    },
  };
}

function run(
  text: string,
  overrides: { previousRev?: number; tone?: "Formell" | "Direkte" } = {},
) {
  const respond = vi.fn((_args: { prompt: string }) => ({ text }));
  const adapter = createMockAdapter({ respond });
  const promise = generateLetter(
    {
      inputs,
      tone: overrides.tone ?? "Formell",
      matchedTerms: ["python", "sql"],
      previousRev: overrides.previousRev ?? 0,
    },
    CTX,
    { adapter, testMode: true },
  );
  return { promise, respond };
}

describe("FR-9 generateLetter", () => {
  it("makes one adapter call and returns the normalised Letter with rev 1", async () => {
    const { promise, respond } = run("Hei Nordic Digital.\n\nHilsen\nOla");
    const result = await promise;
    expect(respond).toHaveBeenCalledTimes(1);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.letter).toEqual({
      text: "Hei Nordic Digital.\n\nHilsen\n{{SIGNATUR}}",
      tone: "Formell",
      rev: 1,
    });
    expect(result.value.meta.source).toBe("mock");
    expect(result.value.meta.promptVersion).toBe("letter-1");
  });

  it("counts rev from previousRev", async () => {
    const result = await run("Hei.", { previousRev: 3 }).promise;
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.letter.rev).toBe(4);
  });

  it("sends a prompt for the Tone with the matched terms and no contact details", async () => {
    const { promise, respond } = run("Hei.", { tone: "Direkte" });
    await promise;
    const prompt = respond.mock.calls[0]?.[0].prompt ?? "";
    expect(prompt).toContain("Tone: Direkte.");
    expect(prompt).toContain("- python\n- sql");
    expect(prompt).not.toContain("ola@example.no");
  });

  it("passes an AiFailure through", async () => {
    const adapter = createMockAdapter({ error: new Error("boom") });
    const result = await generateLetter(
      { inputs, tone: "Formell", matchedTerms: [], previousRev: 0 },
      CTX,
      { adapter, testMode: true },
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
  });

  it("fails with a retryable provider error on a blank answer", async () => {
    const result = await run("  {{SIGNATUR}}  ").promise;
    expect(result).toEqual({
      ok: false,
      error: { code: "AI_PROVIDER_ERROR", retryable: true },
    });
  });

  it("fails when the answer has no text field", async () => {
    const adapter = createMockAdapter({ respond: () => ({ nope: 1 }) });
    const result = await generateLetter(
      { inputs, tone: "Formell", matchedTerms: [], previousRev: 0 },
      CTX,
      { adapter, testMode: true },
    );
    expect(result.ok).toBe(false);
  });
});
