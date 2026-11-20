import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import { type RunMode, RunModeProvider } from "@/shared/ui/run-mode";
import { AiNotice } from "./ai-notice";

const runMode = (
  retentionDays: number | null,
  keywordFallback = false,
): RunMode => ({
  testMode: false,
  hosted: false,
  features: {
    accounts: false,
    gaps: false,
    rewording: false,
    keywordFallback,
  },
  aiNotice: { version: "v", providerName: "openrouter", retentionDays },
});

const render = (retentionDays: number | null = null, keywordFallback = false) =>
  renderToStaticMarkup(
    RunModeProvider({
      value: runMode(retentionDays, keywordFallback),
      children: createElement(AiNotice, {
        open: false,
        onAccept: () => {},
        onCancel: () => {},
        returnFocusRef: { current: null },
      }),
    }),
  );

describe("FR-24 AI notice content (UX-DR17)", () => {
  it("has the title from EXPERIENCE.md", () => {
    expect(render()).toContain(">Teksten din sendes til en KI-tjeneste</h2>");
  });

  it("names OpenRouter and the model host, and not Anthropic", () => {
    const html = render();
    expect(html).toContain("OpenRouter");
    expect(html).toContain("Google (Vertex AI) eller Amazon (Bedrock)");
    expect(html).not.toMatch(/Anthropic/);
  });

  it("says nothing is sent before acceptance", () => {
    expect(render()).toContain(
      "Ingenting er sendt ennå, og ingenting sendes før du godtar.",
    );
  });

  it("lists the five points: local score, stripping, no training and deletion, sensitive, once", () => {
    const html = render();
    expect(html).toContain("Samsvaret regnes ut her i appen, uten KI.");
    expect(html).toContain(
      "E-postadresser og telefonnumre fjernes før teksten sendes.",
    );
    expect(html).toContain("trener ikke på teksten og sletter den");
    expect(html).toContain(
      "Ta ikke med sensitive opplysninger som helse eller fødselsnummer.",
    );
    expect(html).toContain("Du blir bare spurt denne ene gangen");
    expect(html.match(/<li /g)).toHaveLength(5);
  });

  it("FR-5b, FR-26 says that the Job ad, never the CV, is sent for Keywords, only while the fallback is on", () => {
    const sentence =
      "For å hente ut nøkkelord sendes bare stillingsannonsen, aldri CV-en.";
    const on = render(null, true);
    expect(on).toContain(sentence);
    expect(on.match(/<li /g)).toHaveLength(6);
    expect(render(null, false)).not.toContain(sentence);
    expect(sentence).toBe(messages.aiNotice.points.keywords);
  });

  it("names the retention period when one is configured, else says at once", () => {
    expect(render(null)).toContain("sletter den så snart svaret er skrevet.");
    expect(render(30)).toContain("sletter den senest etter 30 dager.");
    expect(messages.aiNotice.retention(1)).toBe("senest etter 1 dag");
    expect(messages.aiNotice.retention(0)).toBe("så snart svaret er skrevet");
  });

  it("has «Godta og fortsett» first and «Avbryt» second, and no leftover placeholders", () => {
    const html = render();
    const accept = html.indexOf("Godta og fortsett");
    const cancel = html.indexOf(">Avbryt<");
    expect(accept).toBeGreaterThan(-1);
    expect(cancel).toBeGreaterThan(accept);
    expect(html).not.toMatch(/\[[Ll]everandør\]|\[periode\]|\{[^}]*\}/);
  });
});
