import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonClasses } from "./button";
import { Link } from "./link";

function markup(props: Parameters<typeof Button>[0]) {
  return renderToStaticMarkup(createElement(Button, props));
}

describe("UX-DR6 button variants", () => {
  it("renders primary as a parchment fill and secondary as an outline", () => {
    expect(markup({ children: "Send" })).toContain("bg-ink");
    expect(markup({ variant: "secondary", children: "Send" })).toContain(
      "border-edge",
    );
  });

  it("makes the small variant 44 px and the standard one 48 px", () => {
    expect(markup({ small: true, children: "Meny" })).toContain(
      "min-h-touch-target",
    );
    expect(markup({ children: "Send" })).toContain("min-h-control-height");
  });

  it("disabled uses the native attribute and the disabled colours", () => {
    const html = markup({ disabled: true, children: "Send" });
    expect(html).toMatch(/<button[^>]*\sdisabled(="")?[\s>]/);
    expect(html).toContain("text-disabled-ink");
  });

  it("busy keeps the label, sets aria-disabled and shows the glyph", () => {
    const html = markup({ busy: true, children: "Analyser" });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Analyser");
    expect(html).toContain("<svg");
    expect(html).toContain("cursor-progress");
  });

  it("idle shows no glyph and no aria-disabled", () => {
    const html = markup({ children: "Analyser" });
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain("<svg");
  });

  it("defaults to type button so it never submits a form by accident", () => {
    expect(markup({ children: "x" })).toContain('type="button"');
  });
});

describe("NFR-5 busy button ignores clicks", () => {
  it("runs the handler when idle and never when busy", () => {
    const onClick = vi.fn();
    const preventDefault = vi.fn();
    const event = { preventDefault } as never;

    const idle = Button({ onClick, children: "x" });
    idle.props.onClick(event);
    expect(onClick).toHaveBeenCalledTimes(1);

    const busy = Button({ busy: true, onClick, children: "x" });
    busy.props.onClick(event);
    busy.props.onClick(event);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });
});

describe("UX-DR34 one button look for Button and Link", () => {
  it("gives Button the classes buttonClasses builds", () => {
    // The exact string Button produced before buttonClasses was extracted.
    expect(markup({ children: "Send" })).toContain(
      'class="inline-flex items-center justify-center gap-2 border font-sans transition-colors duration-160 ease-out min-h-control-height px-5 text-button border-ink bg-ink text-ground hover:bg-button-primary-hover active:bg-sand"',
    );
    expect(markup({ children: "Send" })).toContain(
      `class="${buttonClasses("primary")}"`,
    );
    expect(
      markup({ variant: "secondary", small: true, children: "x" }),
    ).toContain(`class="${buttonClasses("secondary", { small: true })}"`);
    expect(markup({ disabled: true, children: "x" })).toContain(
      `class="${buttonClasses("primary", { disabled: true })}"`,
    );
  });

  it("renders Link kind button as an <a href> with the primary classes", () => {
    const html = renderToStaticMarkup(
      createElement(Link, { kind: "button", href: "/soknad" }, "Go"),
    );
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/soknad"');
    expect(html).toContain(buttonClasses("primary"));
    expect(html).not.toContain("underline");
  });

  it("leaves the existing link kinds without the button classes", () => {
    for (const kind of ["inline", "standalone", "nav"] as const) {
      const html = renderToStaticMarkup(
        createElement(Link, { kind, href: "/" }, "x"),
      );
      expect(html).not.toContain("min-h-control-height");
    }
  });
});
