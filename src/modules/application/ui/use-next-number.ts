"use client";

import { useQuery } from "@tanstack/react-query";
import { callApi } from "@/shared/ui/api-client";
import { nextApplicationSchema } from "../contracts";

// The one cache entry of the next catalogue number (Story 6.7). It lives in the
// TanStack cache only, never in browser storage; a saved Application
// invalidates it.
export const NEXT_APPLICATION_KEY = ["applications", "next"] as const;

// `enabled: false` sends nothing, so Søknad asks only when accounts are on. A
// pending or failed load yields no number and the heading shows none.
export function useNextApplication({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: NEXT_APPLICATION_KEY,
    enabled,
    refetchOnMount: "always",
    queryFn: async () => {
      const result = await callApi(
        "/api/applications/next",
        nextApplicationSchema,
      );
      if (!result.ok) throw new Error(result.error.code);
      return result.data;
    },
  });
}
