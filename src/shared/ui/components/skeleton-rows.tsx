// Ruled rows that hold the place of text that is still loading (Profil). They
// are drawn in `--color-rule`, as the ruled lines of the AI placeholder, and
// do not move. They are decoration: the owner of the section sets `aria-busy`.
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ height: `${rows * 22}px` }}
      className="bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_21px,var(--color-rule)_21px,var(--color-rule)_22px)]"
    />
  );
}
