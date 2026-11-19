import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { FixtureFiles } from "@/shared/server/data-files";
import { lookupKeyOf } from "../../core/lookup-key";
import { CachedMissError, createCachedAdapter } from "./cached";
import { createAdapter } from "./factory";

const meta = {
  source: "live",
  provider: "p",
  model: "m",
  promptVersion: "letter-1",
  createdAt: "2026-11-19T10:00:00.000Z",
};
const PDF = new Uint8Array(
  readFileSync("data/fixtures/example-nordic-digital/cv.pdf"),
);
const PDF_TEXT_MARK = "frontend";

function fixture(overrides: Partial<FixtureFiles> = {}): FixtureFiles {
  return {
    id: "f",
    cvText: "Min CV\nmed to linjer",
    cvPdf: undefined,
    jobAd: "Annonsen",
    jobTitle: "Tittel",
    employer: "Firma",
    cachedLetters: [
      {
        tone: "Formell",
        file: "letter-formell.json",
        content: { data: { text: "Formell tekst" }, meta },
      },
      {
        tone: "Direkte",
        file: "letter-direkte.json",
        content: {
          data: { text: "Direkte tekst" },
          meta,
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      },
    ],
    ...overrides,
  };
}

const key = (overrides: Record<string, string> = {}) =>
  lookupKeyOf({
    task: "letter",
    cvText: "Min CV\nmed to linjer",
    jobAd: "Annonsen",
    jobTitle: "Tittel",
    employer: "Firma",
    tone: "Formell",
    ...overrides,
  });

const args = (lookupKey: string) => ({
  prompt: "ignored",
  lookupKey,
  signal: new AbortController().signal,
  maxRetries: 0,
  schema: z.unknown(),
});

describe("FR-27 cached adapter", () => {
  it("answers a recorded request with the raw data and null counts", async () => {
    const adapter = createCachedAdapter(async () => [fixture()]);
    expect(adapter.kind).toBe("cached");
    expect(await adapter.generate(args(key()))).toEqual({
      output: { text: "Formell tekst" },
      usage: { inputTokens: null, outputTokens: null },
    });
  });

  it("takes the counts from the file when it has them", async () => {
    const adapter = createCachedAdapter(async () => [fixture()]);
    const generated = await adapter.generate(args(key({ tone: "Direkte" })));
    expect(generated.output).toEqual({ text: "Direkte tekst" });
    expect(generated.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it("finds the same answer by white space differences (canon)", async () => {
    const adapter = createCachedAdapter(async () => [fixture()]);
    const generated = await adapter.generate(
      args(key({ cvText: "Min CV   med to linjer\r\n", jobAd: " Annonsen " })),
    );
    expect(generated.output).toEqual({ text: "Formell tekst" });
  });

  it.each([
    ["cvText", "En annen CV"],
    ["jobAd", "En annen annonse"],
    ["jobTitle", "Annen tittel"],
    ["employer", "Annen arbeidsgiver"],
    ["tone", "Personlig"],
    ["task", "gap"],
  ])("throws CachedMissError when %s differs", async (field, value) => {
    const adapter = createCachedAdapter(async () => [fixture()]);
    await expect(
      adapter.generate(args(key({ [field]: value }))),
    ).rejects.toBeInstanceOf(CachedMissError);
  });

  it("indexes the text of cv.pdf as well as cv.txt", async () => {
    const adapter = createCachedAdapter(async () => [fixture({ cvPdf: PDF })]);
    // The extracted PDF text is what a Student's upload gives.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const { text } = await extractText(
      await getDocumentProxy(new Uint8Array(PDF)),
      { mergePages: true },
    );
    expect(text.toLowerCase()).toContain(PDF_TEXT_MARK);
    const viaPdf = await adapter.generate(args(key({ cvText: text })));
    expect(viaPdf.output).toEqual({ text: "Formell tekst" });
    const viaTxt = await adapter.generate(args(key()));
    expect(viaTxt.output).toEqual({ text: "Formell tekst" });
  });

  it("skips a Fixture without Cached Letters and does not read its PDF", async () => {
    const adapter = createCachedAdapter(async () => [
      fixture({ cachedLetters: [], cvPdf: new Uint8Array([1, 2, 3]) }),
    ]);
    await expect(adapter.generate(args(key()))).rejects.toBeInstanceOf(
      CachedMissError,
    );
  });

  it("refuses two Fixtures that give the same lookup key", async () => {
    const adapter = createCachedAdapter(async () => [
      fixture({ id: "one" }),
      fixture({ id: "two" }),
    ]);
    await expect(adapter.generate(args(key()))).rejects.toThrow(
      "Duplicate Cached key: two/letter-formell.json",
    );
  });

  it("builds the index once", async () => {
    const load = vi.fn(async () => [fixture()]);
    const adapter = createCachedAdapter(load);
    await adapter.generate(args(key()));
    await adapter.generate(args(key({ tone: "Direkte" })));
    await expect(
      adapter.generate(args(key({ tone: "Personlig" }))),
    ).rejects.toBeInstanceOf(CachedMissError);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("tries again after a failed build", async () => {
    const load = vi
      .fn<() => Promise<FixtureFiles[]>>()
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValue([fixture()]);
    const adapter = createCachedAdapter(load);
    await expect(adapter.generate(args(key()))).rejects.toThrow("disk");
    await expect(adapter.generate(args(key()))).resolves.toBeDefined();
  });

  it("names the file, not its content, when a Cached file is not an AI output", async () => {
    const adapter = createCachedAdapter(async () => [
      fixture({
        cachedLetters: [
          {
            tone: "Formell",
            file: "letter-formell.json",
            content: { data: { text: "SECRET" }, meta: { source: "x" } },
          },
        ],
      }),
    ]);
    const error = await adapter.generate(args(key())).catch((e: Error) => e);
    expect((error as Error).message).toBe(
      "Invalid Cached response f/letter-formell.json: not an AI output",
    );
  });
});

describe("AD-3 createAdapter cached", () => {
  it("returns the shared cached adapter, also in a test run", () => {
    const first = createAdapter("cached", { isTestRun: true });
    expect(first.kind).toBe("cached");
    expect(createAdapter("cached", { isTestRun: false })).toBe(first);
  });
});
