import type { QueryClient } from "@tanstack/react-query";
import { type ApiResult, callApi } from "@/shared/ui/api-client";
import type { SessionStorage } from "@/shared/ui/client-session";
import { forgetSessionForLogout, holdEnding } from "@/shared/ui/session-end";
import { type LogoutResponse, logoutResponseSchema } from "../contracts";

// «Logg ut» on Konto and in the expiry warning (FR-18, AD-16): the session on
// the server ends, and then the tab forgets what belongs to the Student.
//
// - the client session keeps only the Job ad, job title, employer and Tone (the
//   CV draft goes too);
// - the Query cache is emptied as a whole: the Profile (CV text), the saved
//   Applications (decrypted text), the entry count and the session view are
//   not keyed on the Student, so they must not outlive them (Story 6.3, 6.8,
//   6.9);
// - a request that answers SESSION_EXPIRED after this must not send the Student
//   to Logg inn instead of Hjem.
//
// A failure (the request got no answer) changes nothing: the Student is still
// logged in and may try again. The caller loads Hjem, with a full page load,
// once this has answered ok.
export async function logOutNow(
  queryClient: QueryClient,
  storage?: SessionStorage,
): Promise<ApiResult<LogoutResponse>> {
  const result = await callApi("/api/auth/logout", logoutResponseSchema, {
    method: "POST",
  });
  if (!result.ok) return result;
  holdEnding();
  forgetSessionForLogout(storage);
  // A query still on its way (the session view, the count) must not settle
  // after this and write the email back into the tab.
  await queryClient.cancelQueries();
  queryClient.clear();
  return result;
}
