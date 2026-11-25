"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { callApi } from "@/shared/ui/api-client";
import { HISTORY_COUNT_KEY } from "@/shared/ui/use-history-count";
import { applicationLetterSchema, applicationListSchema } from "../contracts";
import { savedApplicationSchema } from "../saved-contracts";

// The Historikk list, one cache entry per page (Story 6.8). It lives in the
// TanStack cache only, never in browser storage. A saved Application
// invalidates `["applications"]` as a whole.
export const APPLICATION_LIST_KEY = ["applications", "list"] as const;

// A failed request, kept by its code so the page can tell an ended session
// (on its way to Logg inn) from a network failure. Nothing of an answer is kept.
export class ApplicationRequestError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function useApplicationList(page: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...APPLICATION_LIST_KEY, page],
    // The previous page stays on screen while the next one loads.
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    queryFn: async () => {
      const result = await callApi(
        `/api/applications?page=${page}`,
        applicationListSchema,
      );
      if (!result.ok) throw new ApplicationRequestError(result.error.code);
      // The app bar's count follows the list.
      queryClient.setQueryData(HISTORY_COUNT_KEY, result.data.total);
      return result.data;
    },
  });
}

// One reopened Application (Story 6.9), one cache entry per id. It holds
// decrypted text, so it lives in the TanStack cache only, never in browser
// storage or a URL. Always read again on mount: what the screen shows is what
// is stored now.
export function applicationDetailKey(id: string) {
  return ["applications", "detail", id] as const;
}

export function useSavedApplication(id: string) {
  return useQuery({
    queryKey: applicationDetailKey(id),
    refetchOnMount: "always",
    queryFn: async () => {
      const result = await callApi(
        `/api/applications/${id}`,
        savedApplicationSchema,
      );
      if (!result.ok) throw new ApplicationRequestError(result.error.code);
      return result.data;
    },
  });
}

// The stored Letter of one row, fetched on a press (the list carries no text).
// Null when it could not be had; the row says so.
export async function fetchLetterText(id: string): Promise<string | null> {
  const result = await callApi(
    `/api/applications/${id}/letter`,
    applicationLetterSchema,
  );
  return result.ok ? result.data.text : null;
}
