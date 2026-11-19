const SLUG_MAX = 40;

const SPELLED: readonly (readonly [string, string])[] = [
  ["æ", "ae"],
  ["ø", "o"],
  ["å", "a"],
  ["ß", "ss"],
  ["ł", "l"],
  ["đ", "d"],
  ["ð", "d"],
  ["þ", "th"],
  ["œ", "oe"],
];

// ASCII only, at most 40 characters: æ, ø, å, ß and similar are spelled out,
// other diacritics are dropped, and every run of other characters becomes one
// hyphen.
function slug(value: string): string {
  let text = value.toLowerCase();
  for (const [from, to] of SPELLED) text = text.replaceAll(from, to);
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/**
 * The name of the downloaded Letter: `[name-]soknadsbrev-<employer>-<year>.docx`.
 * An empty name or employer part is left out.
 */
export function letterFileName(
  meta: { readonly employer: string; readonly year: number },
  name: string | null,
): string {
  const parts = [
    slug(name ?? ""),
    "soknadsbrev",
    slug(meta.employer),
    String(meta.year),
  ].filter((part) => part !== "");
  return `${parts.join("-")}.docx`;
}
