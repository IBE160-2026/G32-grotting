import { z } from "zod";
import { profileNameSchema } from "@/modules/profile/contracts";

// The Access code is at least this long on Hosted (AD-12, FR-31); the client
// checks it before any request, config.ts checks `ACCESS_CODE` itself.
export const ACCESS_CODE_MIN_LENGTH = 16;

export const ACCESS_COOKIE = "ja_access";

export const accessRequestSchema = z.object({ code: z.string() });
export type AccessRequest = z.infer<typeof accessRequestSchema>;

export const accessResponseSchema = z.object({ opened: z.literal(true) });
export type AccessResponse = z.infer<typeof accessResponseSchema>;

// The session cookie (AD-12): an opaque token, httpOnly, SameSite=Lax, Secure
// when hosted, no Max-Age.
export const SESSION_COOKIE = "ja_sid";

// The response header every authenticated response carries: the end of the
// session as an ISO 8601 instant. The client times the expiry warning from it.
export const SESSION_EXPIRES_HEADER = "X-Session-Expires-At";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 1000;

// Plain text, lower-cased and trimmed (AD-11).
// 254 is the longest address SMTP allows.
export const EMAIL_MAX = 254;
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX)
  .pipe(z.email());

export const registerRequestSchema = z.object({
  name: profileNameSchema,
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  // Required on Hosted only; checked before anything else (FR-31).
  accessCode: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const registerResponseSchema = z.object({ studentId: z.uuid() });
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

// Any non-empty email text, so that an address that is not an address fails
// like an unknown one: the answer never says which part was wrong.
export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(EMAIL_MAX),
  password: z.string().min(1).max(PASSWORD_MAX),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const sessionViewSchema = z.object({
  studentId: z.uuid(),
  name: z.string(),
  email: z.string(),
  noticeVersion: z.string().nullable(),
  expiresAt: z.iso.datetime(),
});
export type SessionView = z.infer<typeof sessionViewSchema>;

export const logoutResponseSchema = z.object({ loggedOut: z.literal(true) });
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
