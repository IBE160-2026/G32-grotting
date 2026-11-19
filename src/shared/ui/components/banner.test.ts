import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { type RunMode, RunModeProvider } from "../run-mode";
import { Banner } from "./banner";

const runMode = (testMode: boolean): RunMode => ({
  testMode,
  hosted: false,
  features: {
    accounts: false,
    gaps: false,
    rewording: false,
    keywordFallback: false,
  },
  aiNotice: { version: "v", providerName: "p", retentionDays: null },
});

const render = (testMode: boolean) =>
  renderToStaticMarkup(
    RunModeProvider({
      value: runMode(testMode),
      children: createElement(Banner),
    }),
  );

describe("FR-27 Test-mode banner (UX-DR16)", () => {
  it("is a note with the sand strip and both texts in Test mode", () => {
    const html = render(true);
    expect(html).toContain('role="note"');
    expect(html).toContain("bg-sand");
    expect(html).toContain(">Testmodus</span>");
    expect(html).toContain("Testmodus – KI-svarene er forhåndslagret");
    expect(html).toContain("Samsvaret regnes likevel ut av koden.");
  });

  it("is not an alert and cannot be closed", () => {
    const html = render(true);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-live");
  });

  it("renders nothing when Test mode is off", () => {
    expect(render(false)).toBe("");
  });
});
