import { describe, expect, it } from "vitest";
import { z } from "zod";
import { newId } from "./new-id";

// NFR-5, FR-24: the Application id must exist where `crypto.randomUUID` does
// not (the app opened over plain http on a phone).
describe("NFR-5 newId", () => {
  it("uses randomUUID when the browser has it", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(
      newId({ randomUUID: () => id, getRandomValues: crypto.getRandomValues }),
    ).toBe(id);
  });

  it("makes a valid UUID without randomUUID, as on an insecure origin", () => {
    const withoutRandomUUID = {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    };
    for (let i = 0; i < 50; i++) {
      expect(z.uuid().safeParse(newId(withoutRandomUUID)).success).toBe(true);
    }
  });

  it("sets the version and variant bits, whatever the bytes are", () => {
    const allOnes = {
      getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        (array as unknown as Uint8Array).fill(0xff);
        return array;
      },
    };
    expect(newId(allOnes)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("gives a different id each time", () => {
    const source = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    expect(newId(source)).not.toBe(newId(source));
  });
});
