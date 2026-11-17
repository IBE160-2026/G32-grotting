// A horizontal `<dl>` under the catalogue heading: caps terms over body
// values (UX-DR14). Read-only.
export type Credit = { readonly term: string; readonly value: string };

export function CreditsList({ items }: { items: readonly Credit[] }) {
  return (
    <dl className="m-0 flex flex-wrap gap-x-10 gap-y-3">
      {items.map(({ term, value }) => (
        <div key={term}>
          <dt className="caps text-ink-2">{term}</dt>
          <dd className="m-0 text-body text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
