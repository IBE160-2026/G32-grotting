import { z } from "zod";
import { cvTextSchema } from "@/modules/cv/contracts";

// The Student's name (FR-18): trimmed, 1 to 200 characters. It is stored only
// in `profiles.name`, encrypted (AD-10, AD-11).
export const PROFILE_NAME_MAX = 200;

export const profileNameSchema = z.string().trim().min(1).max(PROFILE_NAME_MAX);

// `GET /api/profile` and the answer of `PUT` (Story 6.3): the name, read-only,
// the saved CV text, `null` until the first save, when it was saved (ISO, or
// null) and the AI notice version the Student has accepted (null = none, Story
// 6.6).
export const profileViewSchema = z.object({
  name: z.string(),
  cvText: z.string().nullable(),
  cvSavedAt: z.string().nullable(),
  aiNoticeVersion: z.string().nullable(),
});
export type ProfileView = z.infer<typeof profileViewSchema>;

// `PUT /api/profile`: the CV text replaces the old one. Other keys, the name
// among them, are ignored, so the name cannot be changed through it.
export const saveProfileRequestSchema = z.object({ cvText: cvTextSchema });
export type SaveProfileRequest = z.infer<typeof saveProfileRequestSchema>;

// `POST /api/profile/ai-notice` (Story 6.6): the notice version the Student has
// just accepted. The route accepts only the version the server runs.
export const aiNoticeRequestSchema = z.object({ noticeVersion: z.string() });
export type AiNoticeRequest = z.infer<typeof aiNoticeRequestSchema>;

// What other slices may ask the Profile for: the name and the accepted AI
// notice. Never the CV text.
export type ProfileSummary = {
  readonly name: string;
  readonly noticeVersion: string | null;
};
