import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import {
  checkAccessCode,
  checkLoginEmail,
  checkLoginPassword,
  checkName,
  checkNewEmail,
  checkNewPassword,
} from "./form-checks";

// UX-DR9: what the browser judges before a request.

describe("checkName", () => {
  it("asks for a name when empty or only spaces", () => {
    expect(checkName("")).toBe(messages.register.errors.nameRequired);
    expect(checkName("   ")).toBe(messages.register.errors.nameRequired);
  });

  it("accepts 1 to 200 trimmed characters", () => {
    expect(checkName("K")).toBeUndefined();
    expect(checkName(` ${"a".repeat(200)} `)).toBeUndefined();
  });

  it("refuses more than 200 characters", () => {
    expect(checkName("a".repeat(201))).toBe(
      messages.register.errors.nameTooLong,
    );
  });
});

describe("checkNewEmail", () => {
  it("asks for an address when empty", () => {
    expect(checkNewEmail("")).toBe(messages.register.errors.emailRequired);
    expect(checkNewEmail("  ")).toBe(messages.register.errors.emailRequired);
  });

  it("refuses text that is not an address", () => {
    for (const value of ["kari", "kari@", "@example.no", "kari @example.no"]) {
      expect(checkNewEmail(value)).toBe(messages.register.errors.emailInvalid);
    }
  });

  it("accepts an address, in any case and with spaces around it", () => {
    expect(checkNewEmail("kari@example.no")).toBeUndefined();
    expect(checkNewEmail("  Kari@Example.NO ")).toBeUndefined();
  });

  it("refuses an address longer than the server accepts", () => {
    expect(checkNewEmail(`${"a".repeat(250)}@example.no`)).toBe(
      messages.register.errors.emailInvalid,
    );
  });
});

describe("checkNewPassword", () => {
  it("needs 8 characters, counting spaces as typed", () => {
    expect(checkNewPassword("1234567")).toBe(
      messages.register.errors.passwordShort,
    );
    expect(checkNewPassword("")).toBe(messages.register.errors.passwordShort);
    expect(checkNewPassword("12345678")).toBeUndefined();
    expect(checkNewPassword("        ")).toBeUndefined();
  });

  it("stops at 1000 characters, as the server does", () => {
    expect(checkNewPassword("a".repeat(1000))).toBeUndefined();
    expect(checkNewPassword("a".repeat(1001))).toBe(
      messages.register.errors.passwordLong,
    );
  });
});

describe("checkAccessCode", () => {
  it("needs 16 characters, with the Access-code wording", () => {
    expect(checkAccessCode("a".repeat(15))).toBe(messages.access.tooShort);
    expect(messages.access.tooShort).toBe("Koden har minst 16 tegn.");
    expect(checkAccessCode("a".repeat(16))).toBeUndefined();
  });
});

describe("Logg inn checks", () => {
  it("judges nothing but emptiness", () => {
    expect(checkLoginEmail("")).toBe(messages.login.errors.emailRequired);
    expect(checkLoginEmail("  ")).toBe(messages.login.errors.emailRequired);
    expect(checkLoginEmail("not an address")).toBeUndefined();
    expect(checkLoginPassword("")).toBe(messages.login.errors.passwordRequired);
    expect(checkLoginPassword("x")).toBeUndefined();
  });

  it("never names which part of a wrong pair was wrong", () => {
    expect(messages.login.errors.credentials).toBe(
      "Feil e-post eller passord.",
    );
  });
});
