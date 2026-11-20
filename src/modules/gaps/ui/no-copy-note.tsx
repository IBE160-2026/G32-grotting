import { messages } from "@/shared/ui/messages.nb";

// Under every Real gap that carries an AI explanation: the Student is never
// given text to insert, and says so (FR-14).
export function NoCopyNote() {
  return (
    <p className="mt-3 mb-0 text-hint text-ink-2">{messages.gaps.noCopy}</p>
  );
}
