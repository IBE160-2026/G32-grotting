import { CodeStrip } from "@/shared/ui/components/code-strip";
import { EvidenceQuote } from "@/shared/ui/components/evidence-quote";
import { messages } from "@/shared/ui/messages.nb";
import type { Gap } from "../contracts";
import { NoCopyNote } from "./no-copy-note";
import { SuggestionBox } from "./suggestion-box";

const ENTRY = "border-rule border-t py-6";
const KEYWORD = "flex flex-wrap items-baseline gap-x-3 gap-y-2 text-keyword";

// The `id` of the `h3` of the Gap at `index`: the target of «Se gapanalysen».
export function gapTargetId(index: number): string {
  return `gap-${index}`;
}

// One Gap (FR-13, FR-14). The `h3` is a focus target, as the Missing entries
// are. With `rewording` on (FR-16) a Rewordable gap shows its suggestion in a
// box after the citation, or the «no suggestion» line when FR-17 discarded it;
// with it off the suggestion is `null` and nothing stands in its place.
export function GapEntry({
  gap,
  index,
  rewording = false,
}: {
  gap: Gap;
  index: number;
  rewording?: boolean;
}) {
  const { explanation } = gap;
  // A downgraded or skipped Gap travels as the template key and shows only the
  // template line; nothing says it was downgraded. A Rewordable gap without a
  // citation cannot be shown as one, so it is shown the same way.
  const text = "text" in explanation ? explanation.text : null;
  const templateOnly =
    text === null || (gap.kind === "rewordable" && gap.citation === null);
  const rewordable = !templateOnly && gap.kind === "rewordable";
  return (
    <li className={ENTRY}>
      <h3 id={gapTargetId(index)} tabIndex={-1} className={KEYWORD}>
        {gap.keyword}
        <CodeStrip kind={rewordable ? "rewordable" : "missing"}>
          {rewordable
            ? messages.gaps.strip.rewordable
            : messages.gaps.strip.real}
        </CodeStrip>
      </h3>
      {templateOnly || text === null ? (
        <p className="mt-3 mb-0 text-body text-ink">
          {messages.gaps.template.REAL_GAP(
            "key" in explanation ? explanation.params.keyword : gap.keyword,
          )}
        </p>
      ) : (
        <>
          <p className="mt-3 mb-0 text-body text-ink">{text}</p>
          {rewordable && gap.citation !== null ? (
            <>
              <div className="mt-3">
                <EvidenceQuote
                  text={gap.citation}
                  source={messages.gaps.citationSource}
                />
              </div>
              {!rewording ? null : gap.suggestion !== null ? (
                <div className="mt-4">
                  <SuggestionBox
                    suggestion={gap.suggestion}
                    keyword={gap.keyword}
                  />
                </div>
              ) : (
                <p className="mt-4 mb-0 text-body text-ink">
                  {messages.gaps.suggestion.none}
                </p>
              )}
              <p className="mt-3 mb-0 text-body text-ink">
                {messages.gaps.hedge}
              </p>
            </>
          ) : (
            <NoCopyNote />
          )}
        </>
      )}
    </li>
  );
}
