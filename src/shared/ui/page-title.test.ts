import { describe, expect, it } from "vitest";
import { pageTitle } from "./page-title";

describe("UX-DR20 page title", () => {
  it("reads «{side} – JobAssistant»", () => {
    expect(pageTitle("Hjem")).toBe("Hjem – JobAssistant");
    expect(pageTitle("Fant ikke siden")).toBe("Fant ikke siden – JobAssistant");
  });
});
