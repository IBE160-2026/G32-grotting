import { z } from "zod";

// The Access code is at least this long on Hosted (AD-12, FR-31); the client
// checks it before any request, config.ts checks `ACCESS_CODE` itself.
export const ACCESS_CODE_MIN_LENGTH = 16;

export const ACCESS_COOKIE = "ja_access";

export const accessRequestSchema = z.object({ code: z.string() });
export type AccessRequest = z.infer<typeof accessRequestSchema>;

export const accessResponseSchema = z.object({ opened: z.literal(true) });
export type AccessResponse = z.infer<typeof accessResponseSchema>;
