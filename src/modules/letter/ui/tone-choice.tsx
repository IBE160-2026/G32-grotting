"use client";

import { messages } from "@/shared/ui/messages.nb";
import { TONES, type Tone } from "../contracts";

// The Tone of the Letter (FR-10, UX-DR25): one native radio group in a
// `fieldset`. The whole option is the label, so the whole option is the hit
// area; the arrow keys move within the group because the radios share a name.
// The focus ring is drawn inset on the option, not on the small square.
export function ToneChoice({
  value,
  onChange,
}: {
  value: Tone;
  onChange: (tone: Tone) => void;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 p-0 text-label text-ink">
        {messages.tone.legend}
      </legend>
      <div className="grid grid-cols-3 divide-x divide-edge border border-edge max-640:grid-cols-1 max-640:divide-x-0 max-640:divide-y">
        {TONES.map((tone) => {
          const option = messages.tone.options[tone];
          return (
            <label
              key={tone}
              className="flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3.5 hover:bg-hover has-checked:bg-lift has-checked:shadow-[inset_0_-3px_0_var(--color-amber)] has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-amber"
            >
              <input
                type="radio"
                name="tone"
                value={tone}
                checked={value === tone}
                onChange={() => onChange(tone)}
                className="mt-0.5 grid size-5 shrink-0 cursor-pointer appearance-none place-content-center border border-edge bg-field outline-none before:size-2.5 before:scale-0 before:bg-amber before:content-[''] checked:border-ink checked:before:scale-100"
              />
              <span className="flex flex-col">
                <span className="text-label text-ink">{option.name}</span>
                <span className="sr-only"> – </span>
                <span className="text-hint text-ink-2">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
