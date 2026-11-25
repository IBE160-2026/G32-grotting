import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import { Account } from "./account";

function render(entries: number) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(Account, { email: "kari@example.test", entries }),
    ),
  );
}

describe("UX-DR43 Konto", () => {
  it("shows the title, the stacked credits, one button and the four lines", () => {
    const html = render(2);
    expect(html).toContain(">Konto</h1>");
    expect(html).toContain(">E-post</dt>");
    expect(html).toContain(">kari@example.test</dd>");
    expect(html).toContain(">Katalog</dt>");
    expect(html).toContain(">2 søknader</dd>");
    expect(html).toContain(">Slik lagres dataene dine</h2>");
    for (const line of messages.account.storageLines) {
      expect(html).toContain(line);
    }
    expect(messages.account.storageLines).toHaveLength(4);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain(">Logg ut</button>");
  });

  it("offers no password change and no account deletion", () => {
    const html = render(0);
    expect(html).not.toMatch(/<input|<form|<textarea/);
    expect(html).not.toMatch(/Bytt passord|Slett konto|Slett kontoen/);
    expect(html).toContain(">Ingen søknader ennå</dd>");
  });

  it("counts one entry in the singular", () => {
    expect(messages.account.entries(1)).toBe("1 søknad");
    expect(messages.account.entries(21)).toBe("21 søknader");
  });
});
