import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Each fixture is linted with the real biome.json (vcs off, so no git root is
// needed) in a throwaway tree; `violates` names the rule that must fire.
type Fixture = { path: string; code: string; violates: string | null };

const RESTRICTED = "lint/style/noRestrictedImports";
const CONSOLE = "lint/suspicious/noConsole";

const fixtures: Fixture[] = [
  {
    path: "src/modules/a/server/bad-deep.ts",
    code: 'import { x } from "@/modules/b/server/x";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/a/ui/bad-ui.ts",
    code: 'import { x } from "@/modules/b/ui/panel";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/a/server/bad-core.ts",
    code: 'import { x } from "@/modules/b/core/x";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/a/server/bad-relative.ts",
    code: 'import { x } from "../../../b/server/x";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/app/bad-app.ts",
    code: 'import { x } from "@/modules/b/server/x";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/shared/ui/bad-shared.ts",
    code: 'import { x } from "@/modules/b";\nexport const a = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/keywords/core/bad-slice.ts",
    code: 'import { x } from "@/modules/a/server/x";\nexport const k = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/keywords/core/bad-shared-server.ts",
    code: 'import { x } from "@/shared/server/config";\nexport const k = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/keywords/core/bad-relative.ts",
    code: 'import { x } from "../../../../shared/server/log";\nexport const k = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/keywords/core/bad-node.ts",
    code: 'import { readFileSync } from "node:fs";\nexport const k = readFileSync;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/keywords/core/bad-bare-node.ts",
    code: 'import { readFileSync } from "fs";\nexport const k = readFileSync;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/integrity/core/bad-slice.ts",
    code: 'import { x } from "@/modules/match/server/x";\nexport const i = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/modules/integrity/core/bad-relative.ts",
    code: 'import { x } from "../../keywords/server/x";\nexport const i = x;\n',
    violates: RESTRICTED,
  },
  {
    path: "src/shared/core/bad-console.ts",
    code: 'console.log("x");\n',
    violates: CONSOLE,
  },
  {
    path: "src/modules/a/server/ok-entries.ts",
    code: 'import { a } from "@/modules/b";\nimport { b } from "@/modules/b/contracts";\nimport { c } from "@/modules/b/ui";\nimport { d } from "@/modules/b/ui/index";\nimport { e } from "@/shared/core/canon";\nexport const all = [a, b, c, d, e];\n',
    violates: null,
  },
  {
    path: "src/modules/a/server/ok-own.ts",
    code: 'import { x } from "../core/x";\nimport { y } from "./y";\nexport const all = [x, y];\n',
    violates: null,
  },
  {
    path: "src/modules/match/server/ok-keywords-core.ts",
    code: 'import { k } from "@/modules/keywords/core";\nimport { k2 } from "@/modules/keywords/core/index";\nexport const m = [k, k2];\n',
    violates: null,
  },
  {
    path: "src/modules/keywords/core/ok-shared-core.ts",
    code: 'import { canon } from "@/shared/core/canon";\nimport { y } from "./stem/y";\nexport const k = [canon("x"), y];\n',
    violates: null,
  },
  {
    path: "src/modules/integrity/core/ok-keywords-core.ts",
    code: 'import { k } from "@/modules/keywords/core";\nimport { canon } from "@/shared/core/canon";\nexport const i = [k, canon("x")];\n',
    violates: null,
  },
  {
    path: "src/shared/server/log.ts",
    code: "export const log = (m: string) => console.log(m);\n",
    violates: null,
  },
];

let dir = "";
let output = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ja-lint-"));
  const config = JSON.parse(readFileSync("biome.json", "utf8"));
  config.vcs.enabled = false;
  writeFileSync(join(dir, "biome.json"), JSON.stringify(config));
  cpSync("package.json", join(dir, "package.json"));
  for (const f of fixtures) {
    mkdirSync(dirname(join(dir, f.path)), { recursive: true });
    writeFileSync(join(dir, f.path), f.code);
  }
  try {
    execFileSync(
      process.execPath,
      [
        join(process.cwd(), "node_modules/@biomejs/biome/bin/biome"),
        "lint",
        "--colors=off",
        "--max-diagnostics=500",
        ".",
      ],
      { cwd: dir, encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string };
    output = `${failed.stdout ?? ""}${failed.stderr ?? ""}`;
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function diagnosticRules(path: string): string[] {
  const needle = path.replaceAll("/", "\\");
  return output
    .split("\n")
    .filter((line) => line.startsWith(path) || line.startsWith(needle))
    .map((line) => line.split(/\s+/)[1] ?? "");
}

describe("NFR-11 lint boundaries (AD-1, AD-2)", () => {
  for (const f of fixtures) {
    it(f.violates ? `fails ${f.path}` : `passes ${f.path}`, () => {
      const rules = diagnosticRules(f.path);
      if (f.violates) {
        expect(rules).toContain(f.violates);
      } else {
        expect(rules).not.toContain(RESTRICTED);
        expect(rules).not.toContain(CONSOLE);
      }
    });
  }
});
