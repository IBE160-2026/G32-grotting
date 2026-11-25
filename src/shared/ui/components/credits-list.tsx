// A horizontal `<dl>` under the catalogue heading: caps terms over body
// values (UX-DR14). Read-only. `stacked` is Konto's variant (UX-DR18): one row
// under the other, divided by the rule colour.
export type Credit = { readonly term: string; readonly value: string };

export function CreditsList({
  items,
  stacked = false,
}: {
  items: readonly Credit[];
  stacked?: boolean;
}) {
  return (
    <dl className={stacked ? "m-0" : "m-0 flex flex-wrap gap-x-10 gap-y-3"}>
      {items.map(({ term, value }) => (
        <div
          key={term}
          className={
            stacked ? "border-rule border-t py-3 last:border-b" : undefined
          }
        >
          <dt className="caps text-ink-2">{term}</dt>
          <dd className="m-0 text-body text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
