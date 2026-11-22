import { z } from "zod";

// The Student's name (FR-18): trimmed, 1 to 200 characters. It is stored only
// in `profiles.name`, encrypted (AD-10, AD-11).
export const PROFILE_NAME_MAX = 200;

export const profileNameSchema = z.string().trim().min(1).max(PROFILE_NAME_MAX);

// What other slices may ask the Profile for: the name and the accepted AI
// notice. Never the CV text.
export type ProfileSummary = {
  readonly name: string;
  readonly noticeVersion: string | null;
};
