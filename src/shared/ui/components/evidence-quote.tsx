import { type MarkSpan, trimQuote } from "./trim-quote";

// A line word for word from the CV or the Job ad, in sjevroner, with the
// Keyword marked bold and underlined in amber, then a mono source line
// (UX-DR14). Never paraphrased: past about 160 characters only its ends are
// cut, at word boundaries, with «…».
export function EvidenceQuote({
  text,
  mark,
  source,
}: {
  text: string;
  mark?: MarkSpan;
  source: string;
}) {
  const quote = trimQuote(text, mark);
  const span = quote.mark;
  return (
    <figure className="m-0">
      <blockquote className="m-0 whitespace-pre-line text-quote text-ink">
        «
        {span === undefined || span.end <= span.start ? (
          quote.text
        ) : (
          <>
            {quote.text.slice(0, span.start)}
            <mark className="bg-transparent font-semibold text-ink underline decoration-2 decoration-amber underline-offset-4">
              {quote.text.slice(span.start, span.end)}
            </mark>
            {quote.text.slice(span.end)}
          </>
        )}
        »
      </blockquote>
      <figcaption className="mt-2 font-mono text-mono-meta text-ink-2">
        {source}
      </figcaption>
    </figure>
  );
}
