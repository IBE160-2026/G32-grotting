"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { callApi } from "./api-client";

// The count by «Historikk» in the app bar (Story 6.8). One cache entry, never
// browser storage. The server hands the count it knew when the page loaded; a
// saved Application, or the Historikk list, replaces it, so it stays right
// through client navigation. After a logout the next page load starts afresh.
export const HISTORY_COUNT_KEY = ["applications", "count"] as const;

const countSchema = z.object({ total: z.number().int().nonnegative() });

export function useHistoryCount({
  enabled,
  initial,
}: {
  enabled: boolean;
  initial?: number;
}) {
  return useQuery({
    queryKey: HISTORY_COUNT_KEY,
    enabled,
    initialData: initial,
    // The count is replaced when something changes it (the list, a save), not
    // by a request on every page.
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const result = await callApi("/api/applications/count", countSchema);
      if (!result.ok) throw new Error(result.error.code);
      return result.data.total;
    },
  });
}
