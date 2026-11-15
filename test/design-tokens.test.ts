import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const theme = css.slice(css.indexOf("@theme {"), css.indexOf("@theme inline"));

const COLOURS = [
  "board",
  "ground",
  "field",
  "hover",
  "lift",
  "lift-2",
  "alert-ground",
  "ink",
  "ink-2",
  "placeholder",
  "edge",
  "edge-hover",
  "rule",
  "mute",
  "plot-flat",
  "moss",
  "rust",
  "amber",
  "sand",
  "button-primary-hover",
  "disabled-ink",
  "disabled-edge",
  "scrim",
];

describe("UX-DR1 design tokens", () => {
  it("defines every DESIGN.md colour as a theme variable", () => {
    for (const name of COLOURS) {
      expect(theme, name).toMatch(new RegExp(`--color-${name}: #[0-9a-f]{6};`));
    }
  });

  it("sets every type size in rem", () => {
    const sizes = theme.match(/--text-(?:(?!--)[a-z0-9-])+: [^;]+;/g) ?? [];
    expect(sizes.length).toBeGreaterThan(30);
    for (const line of sizes) expect(line).toMatch(/: [\d.]+rem;/);
  });

  it("has one dark theme and no light variant", () => {
    expect(css.match(/color-scheme/g)).toHaveLength(1);
    expect(css).toContain("color-scheme: dark;");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("makes every corner square", () => {
    expect(theme).toContain("--radius: 0px;");
    expect(theme).toContain("--radius-none: 0px;");
  });

  it("defines the max-640 variant", () => {
    expect(css).toContain(
      "@custom-variant max-640 (@media (max-width: 640px));",
    );
  });

  it("keeps the spacing steps that differ from Tailwind's multiplier", () => {
    expect(theme).toContain("--spacing-7: 2rem;");
    expect(theme).toContain("--spacing-12: 4.5rem;");
  });
});

const DESIGN =
  "_bmad-output/planning-artifacts/ux-designs/ux-JobAssistant-2026-11-09/DESIGN.md";

// DESIGN.md is not in the Docker build context, so this runs on the host and
// in CI's checkout only.
describe.skipIf(!existsSync(DESIGN))("UX-DR1 colours match DESIGN.md", () => {
  it("uses the DESIGN.md hex for every colour token", () => {
    const front = readFileSync(DESIGN, "utf8").split("---")[1] ?? "";
    for (const name of COLOURS) {
      const wanted = front.match(
        new RegExp(`^  ${name}: '(#[0-9a-f]{6})'`, "m"),
      );
      expect(wanted, name).not.toBeNull();
      expect(theme, name).toContain(`--color-${name}: ${wanted?.[1]};`);
    }
  });
});

describe("NFR-3 reduced motion", () => {
  it("turns off smooth scrolling, transitions and animations", () => {
    const block = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(block).toContain("scroll-behavior: auto");
    expect(block).toContain("transition: none");
    expect(block).toContain("animation: none");
  });
});
