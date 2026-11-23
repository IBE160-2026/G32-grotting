"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { MessageKey } from "@/shared/core/message-key";
import { callApi } from "@/shared/ui/api-client";
import { type ProfileView, profileViewSchema } from "../contracts";

// The one cache entry of the Student's Profile, shared by Profil and Søknad.
export const PROFILE_KEY = ["profile"] as const;

// A failed request, kept by its code so a page can tell an ended session from a
// network failure. Nothing of the answer is shown.
export class ProfileRequestError extends Error {
  readonly code: MessageKey;
  constructor(code: MessageKey) {
    super(code);
    this.code = code;
  }
}

// The Profile query (Stories 6.3, 6.6). `enabled: false` sends nothing, so a
// page that serves both modes asks only when accounts are on.
export function useProfile({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PROFILE_KEY,
    enabled,
    queryFn: async (): Promise<ProfileView> => {
      const result = await callApi("/api/profile", profileViewSchema);
      if (!result.ok) throw new ProfileRequestError(result.error.code);
      return result.data;
    },
  });
}

const noticeAnswerSchema = z.object({ noticeVersion: z.string() });

// «Godta og fortsett» with accounts on (Story 6.6): the version is stored on
// the Profile, so the notice is shown once per account. The mutation resolves
// with the envelope; on success the cache holds the version at once.
export function useAcceptAiNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noticeVersion: string) =>
      callApi("/api/profile/ai-notice", noticeAnswerSchema, {
        body: { noticeVersion },
      }),
    onSuccess: (answer) => {
      if (!answer.ok) return;
      queryClient.setQueryData<ProfileView>(PROFILE_KEY, (held) =>
        held === undefined
          ? held
          : { ...held, aiNoticeVersion: answer.data.noticeVersion },
      );
    },
  });
}
