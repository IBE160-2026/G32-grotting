import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Dialog } from "./dialog";

const render = (open: boolean) =>
  renderToStaticMarkup(
    createElement(Dialog, {
      open,
      title: "Tittel",
      onCancel: () => {},
      // biome-ignore lint/correctness/noChildrenProp: children is a render function here
      children: ({ descriptionId }) =>
        createElement("p", { id: descriptionId }, "Brødtekst"),
    }),
  );

describe("UX-DR17 native dialog component", () => {
  it("is a native dialog, closed until it is opened with showModal()", () => {
    const html = render(true);
    expect(html).toMatch(/^<dialog /);
    // `open` is never an attribute: only showModal() makes it modal.
    expect(html).not.toMatch(/<dialog[^>]* open[ =>]/);
  });

  it("is labelled by its title and described by its body", () => {
    const html = render(false);
    const labelled = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    const described = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(labelled).toBeDefined();
    expect(html).toContain(`<h2 id="${labelled}"`);
    expect(html).toContain(`<p id="${described}">Brødtekst</p>`);
  });

  it("makes the title focusable by script but not a tab stop", () => {
    expect(render(false)).toContain('tabindex="-1"');
  });

  it("has no close button and no click handler of its own for the scrim", () => {
    const html = render(false);
    expect(html).not.toContain("<button");
  });
});
