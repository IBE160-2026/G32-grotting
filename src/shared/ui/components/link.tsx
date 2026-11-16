import NextLink from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses } from "./button";

// inline: inside a sentence. standalone: a link on its own line (24 px hit
// area, WCAG 2.5.8). nav: identified by position and focus ring, so it is the
// one kind without the underline (DESIGN.md, Link). button: a navigation that
// looks like the primary button, still a real <a href>.
type LinkProps = ComponentProps<typeof NextLink> & {
  kind?: "inline" | "standalone" | "nav" | "button";
};

const KIND = {
  inline:
    "text-ink underline decoration-edge decoration-1 underline-offset-4 hover:decoration-amber",
  standalone:
    "inline-flex min-h-6 items-center text-ink underline decoration-edge decoration-1 underline-offset-4 hover:decoration-amber",
  nav: "inline-flex min-h-touch-target items-center no-underline",
  button: buttonClasses("primary"),
} as const;

export function Link({ kind = "inline", className, ...rest }: LinkProps) {
  return (
    <NextLink
      {...rest}
      className={[KIND[kind], className].filter(Boolean).join(" ")}
    />
  );
}
