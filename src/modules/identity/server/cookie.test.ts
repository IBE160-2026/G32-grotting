import { describe, expect, it } from "vitest";
import { SESSION_EXPIRES_HEADER as KERNEL_HEADER } from "@/shared/server/handle";
import { SESSION_EXPIRES_HEADER } from "../contracts";
import {
  clearedSessionCookie,
  readSessionToken,
  sessionCookie,
} from "./cookie";

const from = (cookie?: string) =>
  new Request("http://localhost/api/session", {
    headers: cookie === undefined ? {} : { cookie },
  });

describe("AD-12 session cookie", () => {
  it("is httpOnly, SameSite=Lax, with no Max-Age, and Secure only when hosted", () => {
    const local = sessionCookie("abc", false);
    expect(local).toBe("ja_sid=abc; Path=/; HttpOnly; SameSite=Lax");
    expect(sessionCookie("abc", true)).toContain("; Secure");
    expect(local).not.toContain("Max-Age");
    expect(clearedSessionCookie(false)).toContain("Max-Age=0");
  });

  it("reads the token among other cookies", () => {
    expect(readSessionToken(from("a=1; ja_sid=tok; b=2"))).toBe("tok");
    expect(readSessionToken(from("ja_sid=tok"))).toBe("tok");
    expect(readSessionToken(from("ja_sid=a=b"))).toBe("a=b");
  });

  it("finds nothing in a missing, empty or unrelated header", () => {
    expect(readSessionToken(from())).toBeUndefined();
    expect(readSessionToken(from("ja_sid="))).toBeUndefined();
    expect(readSessionToken(from("ja_sid_other=x; junk"))).toBeUndefined();
    expect(readSessionToken(from("xja_sid=x"))).toBeUndefined();
  });
});

describe("AD-12 the expiry header has one name", () => {
  it("is the same for the client contract and the server", () => {
    expect(SESSION_EXPIRES_HEADER).toBe(KERNEL_HEADER);
  });
});
