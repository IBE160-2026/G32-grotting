import { createHash } from "node:crypto";
import { canon } from "@/shared/core/canon";

/**
 * The hash of a text's canon form (AD-15): a hex sha256. It is the key of a
 * saved Keyword list (`keyword_lists`) and of a Cached Keyword response, so two
 * pastes of the same ad that differ only in whitespace share one list.
 */
export function contentHash(text: string): string {
  return createHash("sha256").update(canon(text)).digest("hex");
}
