import { messages } from "./messages.nb";

// «{side} – JobAssistant» (UX-DR20). A layout's title template skips the page
// beside it, so every page builds its title here instead.
export function pageTitle(page: string): string {
  return `${page} – ${messages.siteName}`;
}
