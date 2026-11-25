import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import type { ApplicationEntry } from "../contracts";
import { CatalogueRegister } from "./catalogue-register";
import { EmptyState } from "./empty-state";

// Story 6.8, UX-DR21: the register as markup. The same entries are in a table
// and in an `<ol>`; the media query (not tested here) hides the other.

const entry = (patch: Partial<ApplicationEntry>): ApplicationEntry => ({
  id: "00000000-0000-4000-8000-000000000001",
  seq: 1,
  createdAt: "2026-11-17T10:00:00.000Z",
  score: 71,
  matchedCount: 5,
  totalCount: 7,
  jobTitle: "Frontendutvikler",
  employer: "Nordic Digital",
  hasLetter: true,
  ...patch,
});

const ENTRIES = [
  entry({
    id: "00000000-0000-4000-8000-000000000002",
    seq: 2,
    score: 42,
    matchedCount: 3,
    totalCount: 7,
    jobTitle: "Dataingeniør",
    employer: "Fjord Analytics",
    hasLetter: false,
  }),
  entry({}),
];

const html = renderToStaticMarkup(
  createElement(CatalogueRegister, {
    entries: ENTRIES,
    name: "Violet Hansen",
    captionRef: null,
  }),
);

const count = (pattern: RegExp) => (html.match(pattern) ?? []).length;

describe("the catalogue register", () => {
  it("has one table with a hidden caption, column headers and the job title as row header", () => {
    expect(count(/<table/g)).toBe(1);
    expect(html).toMatch(
      /<caption[^>]*class="sr-only"[^>]*>Alle søknadene dine, nyeste først<\/caption>/,
    );
    expect(count(/<th scope="col"/g)).toBe(5);
    expect(html).toContain("Handlinger");
    expect(count(/<th scope="row"/g)).toBe(2);
    expect(html).toMatch(/<th scope="row"[^>]*><a[^>]*>Dataingeniør<\/a>/);
  });

  it("has one ordered list beside it, one item per entry, and neither is shown by script", () => {
    expect(count(/<ol/g)).toBe(1);
    expect(count(/<li/g)).toBe(2);
    expect(html).toContain("max-640:hidden");
    expect(html).toContain("hidden list-none");
    expect(html).toContain("max-640:block");
  });

  it("shows the number, the employer, the date, the score sentence and the Verdict in words", () => {
    expect(html).toContain("JA-002");
    expect(html).toContain("JA-001");
    expect(html).toContain("Fjord Analytics");
    expect(html).toContain("42 % samsvar – 3 av 7 nøkkelord");
    expect(html).toContain("71 % samsvar – 5 av 7 nøkkelord");
    expect(html).toContain("Bør forbedres");
    expect(html).toContain("Sterkt samsvar");
    expect(html).toContain('dateTime="2026-11-17T10:00:00.000Z"');
  });

  it("links the title to the saved Application and gives each button an entry-specific name", () => {
    expect(html).toContain(
      'href="/historikk/00000000-0000-4000-8000-000000000001"',
    );
    expect(html).toContain('aria-label="Åpne JA-001"');
    expect(html).toContain('aria-label="Kopier brev for JA-001"');
    expect(html).toContain('aria-label="Last ned (.docx) for JA-001"');
    expect(html).toContain('aria-label="Åpne JA-002"');
  });

  it("switches the two Letter buttons off for an entry without a Letter, and says why", () => {
    const withoutLetter = renderToStaticMarkup(
      createElement(CatalogueRegister, {
        entries: [ENTRIES[0] as ApplicationEntry],
        name: null,
        captionRef: null,
      }),
    );
    expect(withoutLetter).toContain(messages.history.noLetter);
    const buttons = withoutLetter.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    for (const button of buttons) expect(button).toContain("disabled");
    // An entry with a Letter has them on.
    expect(html).toContain('aria-label="Kopier brev for JA-001"');
  });

  it("says a title or employer that could not be read, and a score without counts", () => {
    const unreadable = renderToStaticMarkup(
      createElement(CatalogueRegister, {
        entries: [
          entry({
            jobTitle: null,
            employer: null,
            matchedCount: null,
            totalCount: null,
          }),
        ],
        name: null,
        captionRef: null,
      }),
    );
    expect(unreadable).toContain("Kan ikke leses");
    expect(unreadable).toContain("71 % samsvar");
    expect(unreadable).not.toContain("nøkkelord");
  });
});

describe("the empty state", () => {
  const empty = renderToStaticMarkup(createElement(EmptyState));

  it("shows the ghost number hidden from assistive technology, the sentences and the primary button", () => {
    expect(empty).toMatch(/<p aria-hidden="true"[^>]*>JA-001<\/p>/);
    expect(empty).toContain(
      "Ingen søknader ennå. Start med din første stillingsannonse.",
    );
    expect(empty).toContain("Den første søknaden du lager, får nummer JA-001.");
    expect(empty).toMatch(
      /<a [^>]*href="\/soknad"[^>]*>Lag skreddersydd søknad<\/a>/,
    );
  });

  it("has no search, delete or rename", () => {
    for (const word of ["Søk", "Slett", "Gi nytt navn", "<input"]) {
      expect(empty).not.toContain(word);
      expect(html).not.toContain(word);
    }
  });
});

describe("the Historikk summary line", () => {
  it("gives the range and the count, newest first", () => {
    expect(messages.history.summary("JA-001", "JA-002", 2)).toBe(
      "JA-001–JA-002 · 2 søknader, nyeste først",
    );
    expect(messages.history.summary("JA-001", "JA-001", 1)).toBe(
      "JA-001 · 1 søknad, nyeste først",
    );
  });

  it("announces a page as «Side 3 av 4»", () => {
    expect(messages.history.pagination.page(3, 4)).toBe("Side 3 av 4");
  });
});
