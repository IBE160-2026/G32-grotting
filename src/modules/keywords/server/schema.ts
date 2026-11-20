import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One AI-proposed Keyword list per Job ad (FR-5b, AD-9, AD-10). The key is
// `contentHash(canon(ad))`. No Student id and no foreign key: the row holds
// words from the ad, never the CV, and is plain text by design (AD-11).
// `keywords` is the terms that passed `findKeyword` against the ad, in the
// order of their first position; the positions are found again on every read.
export const keywordLists = pgTable("keyword_lists", {
  contentHash: text("content_hash").primaryKey(),
  keywords: jsonb("keywords").$type<string[]>().notNull(),
  promptVersion: text("prompt_version").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
