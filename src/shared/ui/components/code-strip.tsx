import type { ReactNode } from "react";

// «Funnet», «Mangler» and the verdict strips (UX-DR12). Real text on a code
// colour: the label alone carries the meaning, the colour only repeats it.
// Not interactive.
export type CodeStripKind =
  | "found"
  | "missing"
  | "outline"
  | "sand"
  | "rewordable";

const KIND: Record<CodeStripKind, string> = {
  found: "bg-moss text-ground",
  missing: "bg-rust text-ground",
  outline: "border border-edge bg-transparent text-ink",
  // The Test-mode banner (UX-DR16).
  sand: "bg-sand text-ground",
  // «Omformulerbart gap»: the CV already shows the Keyword in other words.
  rewordable: "bg-amber text-ground",
};

export function codeStripClasses(kind: CodeStripKind): string {
  return `code inline-block px-[9px] pt-[5px] pb-[4px] ${KIND[kind]}`;
}

export function CodeStrip({
  kind,
  children,
}: {
  kind: CodeStripKind;
  children: ReactNode;
}) {
  return <span className={codeStripClasses(kind)}>{children}</span>;
}
