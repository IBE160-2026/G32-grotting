// Pure helpers for the Bake-off record: cost and the results.md text. No
// output content goes in here, only file names, counts and error codes.

export type Task = "letter" | "gap";

export type Price = {
  readonly inPerMillion: number;
  readonly outPerMillion: number;
};

export type RequestRecord = {
  readonly fixture: string;
  readonly provider: string;
  readonly model: string;
  readonly task: Task;
  readonly status: "ok" | "failed";
  // File of the output, relative to the results.md folder (status ok only).
  readonly file?: string;
  // Words in a Letter (status ok, letter only).
  readonly words?: number;
  // Why a request failed (status failed only). Never a message.
  readonly errorCode?: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly durationMs: number;
};

type Usage = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
};

export function estimateCost(
  usage: Usage,
  price: Price | undefined,
): number | null {
  if (
    price === undefined ||
    usage.inputTokens === null ||
    usage.outputTokens === null
  ) {
    return null;
  }
  return (
    (usage.inputTokens * price.inPerMillion +
      usage.outputTokens * price.outPerMillion) /
    1_000_000
  );
}

export function formatUsd(cost: number | null): string {
  return cost === null ? "n/a" : `$${cost.toFixed(4)}`;
}

const count = (value: number | null) => (value === null ? "n/a" : `${value}`);

type Items = readonly (readonly [string, string])[];

export const LETTER_ITEMS: Items = [
  ["L1", "Bokmål throughout; no English sentences"],
  [
    "L2",
    "Every qualification, tool, employer, date and number exists in the CV text",
  ],
  ["L3", "No run of 8 or more words in a row copied from the ad"],
  ["L4", "Job title and employer are correct"],
  ["L5", "250-400 words (at most 300 for Direkte), 2-3 concrete CV examples"],
  ["L6", "The chosen Tone's rules hold and it reads as that Tone"],
  ["L7", "Every flag the integrity guard would raise is a real problem"],
  ["L8", "No emoji or exclamation marks, no needless English loanwords"],
];

export const GAP_ITEMS: Items = [
  ["G1", "Each rewordable gap's cited CV entry really shows the Keyword"],
  ["G2", "Every must-never-suggest item in the Answer key is a Real gap"],
  ["G3", "Real gaps are worded honestly and do not push to add the Keyword"],
  ["R1", "No suggestion adds a fact or upgrades the work or the role"],
];

function scoringTable(items: Items): string {
  return [
    "| Item | Check | Pass / fail |",
    "| --- | --- | --- |",
    ...items.map(([id, check]) => `| ${id} | ${check} | |`),
  ].join("\n");
}

export type ResultsMeta = {
  readonly date: string;
  readonly dry: boolean;
  readonly contenders: readonly {
    readonly provider: string;
    readonly model: string;
    readonly price: Price | undefined;
  }[];
};

function sumOf(
  records: readonly RequestRecord[],
  pick: (record: RequestRecord) => number | null,
): number | null {
  let total = 0;
  for (const record of records) {
    const value = pick(record);
    if (value === null) return null;
    total += value;
  }
  return total;
}

export function renderResults(
  meta: ResultsMeta,
  records: readonly RequestRecord[],
): string {
  const lines: string[] = [];
  lines.push(`# Bake-off results ${meta.date}`, "");
  if (meta.dry) {
    lines.push(
      "**Dry run:** the mock adapter answered. No provider was called and the numbers mean nothing.",
      "",
    );
  }
  lines.push(
    "Score each output by hand against PRD §9.2 and fill the Pass / fail cells. The decision is Helene's; follow `docs/qa/bake-off-runbook.md`.",
    "",
    "## Contenders",
    "",
    "| Provider | Model | Price in (USD per 1M tokens) | Price out (USD per 1M tokens) |",
    "| --- | --- | --- | --- |",
    ...meta.contenders.map(
      (c) =>
        `| ${c.provider} | ${c.model} | ${c.price?.inPerMillion ?? "not given"} | ${c.price?.outPerMillion ?? "not given"} |`,
    ),
    "",
    "## Cost per Application",
    "",
    "One Application is one Letter request and one Gap request for the same Fixture.",
    "",
    "| Fixture | Provider | Input tokens | Output tokens | Estimated cost |",
    "| --- | --- | --- | --- | --- |",
  );

  const fixtures = [...new Set(records.map((r) => r.fixture))];
  for (const fixture of fixtures) {
    for (const c of meta.contenders) {
      const pair = records.filter(
        (r) => r.fixture === fixture && r.provider === c.provider,
      );
      if (pair.length === 0) continue;
      const input = sumOf(pair, (r) => r.inputTokens);
      const output = sumOf(pair, (r) => r.outputTokens);
      const failed = pair.some((r) => r.status === "failed")
        ? " (a request failed)"
        : "";
      const cost = formatUsd(
        estimateCost({ inputTokens: input, outputTokens: output }, c.price),
      );
      lines.push(
        `| ${fixture} | ${c.provider} | ${count(input)} | ${count(output)} | ${cost}${failed} |`,
      );
    }
  }

  for (const fixture of fixtures) {
    lines.push("", `## ${fixture}`);
    for (const c of meta.contenders) {
      for (const task of ["letter", "gap"] as const) {
        const record = records.find(
          (r) =>
            r.fixture === fixture &&
            r.provider === c.provider &&
            r.task === task,
        );
        if (record === undefined) continue;
        lines.push(
          "",
          `### ${c.provider}: ${task === "letter" ? "Letter" : "Gap analysis"}`,
          "",
        );
        const cost = formatUsd(estimateCost(record, c.price));
        const facts = `Model ${record.model}. Input tokens ${count(record.inputTokens)}, output tokens ${count(record.outputTokens)}, estimated cost ${cost}, ${record.durationMs} ms.`;
        if (record.status === "failed") {
          lines.push(
            `**Request failed** with error code \`${record.errorCode ?? "UNEXPECTED"}\`. No output was saved. ${facts}`,
          );
          continue;
        }
        const words =
          record.words === undefined ? "" : ` Words: ${record.words}.`;
        lines.push(
          `Output: [${record.file}](${record.file}). ${facts}${words}`,
          "",
          scoringTable(task === "letter" ? LETTER_ITEMS : GAP_ITEMS),
        );
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}
